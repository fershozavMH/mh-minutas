import { Prisma } from "../../generated/prisma/client";
import { actionWhere, meetingWhere, type Viewer } from "../access";
import { findSimilar } from "../similar-actions";
import { getDb } from "../db";
import { resolveOwner } from "./owner";
import { actionValueSchema, type Decision, textValueSchema } from "../review-schemas";

export type SimilarAction = {
  id: string;
  title: string;
  statusName: string;
  isClosed: boolean;
};

export type DecideResult =
  | { ok: true; actionId?: string; followUpActionId?: string }
  | { ok: false; error: "posible_duplicado"; similar: SimilarAction[] }
  | {
      ok: false;
      error:
        | "sin_permiso"
        | "no_existe"
        | "ya_decidido"
        | "valor_invalido"
        | "fecha_obligatoria"
        | "sin_estado"
        | "persona_invalida";
    };

type Card = {
  summary?: string;
  decisions?: string[];
  risks?: string[];
  nextSteps?: string[];
};

const cardKey = {
  DECISION: "decisions",
  RISK: "risks",
  NEXT_STEP: "nextSteps",
} as const;

// La IA propone y una persona decide. Aprobar una acción crea la acción oficial (con fecha obligatoria);
// lo demás pasa a la ficha oficial de la reunión. Una propuesta ya decidida no se vuelve a decidir.
export async function decideReview(viewer: Viewer, itemId: string, decision: Decision): Promise<DecideResult> {
  if (viewer.profile !== "ASSISTANT") return { ok: false, error: "sin_permiso" };

  const db = getDb();
  const item = await db.reviewItem.findFirst({
    where: { id: itemId, meeting: meetingWhere(viewer) },
    include: {
      meeting: { select: { id: true, levelId: true, officialCard: true } },
    },
  });
  if (!item) return { ok: false, error: "no_existe" };
  if (item.status !== "PENDING") return { ok: false, error: "ya_decidido" };

  const now = new Date();
  const decided = { decidedById: viewer.id, decidedAt: now };

  if (decision.decision === "reject") {
    const claimed = await db.reviewItem.updateMany({
      where: { id: itemId, status: "PENDING" },
      data: {
        status: "REJECTED",
        rejectionReason: decision.reason,
        ...decided,
      },
    });
    if (claimed.count === 0) return { ok: false, error: "ya_decidido" };
    await db.auditLog.create({
      data: {
        userId: viewer.id,
        kind: "CHANGE",
        entity: "ReviewItem",
        entityId: itemId,
      },
    });
    return { ok: true };
  }

  // Aprobar: se valida lo que quedó (lo editado o, si no se tocó, lo que propuso la IA).
  const finalValue = decision.value ?? (item.aiValue as Record<string, unknown>);
  // Elegir a la persona del registro no cuenta como edición por sí solo.
  const withoutOwnerId = (value: Record<string, unknown>) => JSON.stringify({ ...value, ownerId: undefined });
  const edited =
    decision.value !== undefined &&
    withoutOwnerId(decision.value) !== withoutOwnerId(item.aiValue as Record<string, unknown>);

  let actionValue: ReturnType<typeof actionValueSchema.parse> | undefined;
  let text: string | undefined;
  if (item.kind === "ACTION") {
    const parsed = actionValueSchema.safeParse(finalValue);
    if (!parsed.success) {
      const missingDate = parsed.error.issues.some((i) => i.path[0] === "dueDate");
      return {
        ok: false,
        error: missingDate ? "fecha_obligatoria" : "valor_invalido",
      };
    }
    const owner = await resolveOwner(parsed.data.ownerId, parsed.data.ownerName);
    if (!owner.ok) return { ok: false, error: "persona_invalida" };
    actionValue = {
      ...parsed.data,
      ownerId: owner.ownerId,
      ownerName: owner.ownerName,
    };
  } else {
    const parsed = textValueSchema.safeParse(finalValue);
    if (!parsed.success) return { ok: false, error: "valor_invalido" };
    text = parsed.data.text;
  }

  // Una acción repetida de otra junta se suma como avance de la existente (abierta o cerrada);
  // si parece repetida y la persona no lo resolvió, se le pregunta antes de crear otra.
  let appendTo: { id: string; levelId: string } | undefined;
  if (actionValue) {
    const resolution = decision.resolution;
    if (resolution?.mode === "append") {
      const target = await db.action.findFirst({
        where: {
          AND: [{ id: resolution.actionId }, actionWhere(viewer), { retiredAt: null }],
        },
        select: { id: true, levelId: true },
      });
      if (!target) return { ok: false, error: "no_existe" };
      appendTo = target;
    } else if (!resolution) {
      const candidates = await db.action.findMany({
        where: { AND: [actionWhere(viewer), { retiredAt: null }] },
        orderBy: { updatedAt: "desc" },
        take: 400,
        select: {
          id: true,
          title: true,
          status: { select: { name: true, isClosed: true } },
        },
      });
      const similar = findSimilar(actionValue.title, candidates);
      if (similar.length > 0) {
        return {
          ok: false,
          error: "posible_duplicado",
          similar: similar.map((a) => ({
            id: a.id,
            title: a.title,
            statusName: a.status.name,
            isClosed: a.status.isClosed,
          })),
        };
      }
    }
  }

  let statusId: string | undefined;
  if (actionValue && !appendTo) {
    const status = await db.actionStatus.findFirst({
      where: { active: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    if (!status) return { ok: false, error: "sin_estado" };
    statusId = status.id;
  }

  // Se toma la decisión de forma atómica: si dos personas aprueban a la vez, solo una gana.
  const claimed = await db.reviewItem.updateMany({
    where: { id: itemId, status: "PENDING" },
    data: {
      status: "APPROVED",
      ...decided,
      ...(edited
        ? {
            editedValue: (actionValue ?? { text }) as object,
            editedById: viewer.id,
            editedAt: now,
          }
        : {}),
    },
  });
  if (claimed.count === 0) return { ok: false, error: "ya_decidido" };

  try {
    let actionId: string | undefined;
    if (actionValue && appendTo) {
      const owner = actionValue.ownerName ? ` Responsable: ${actionValue.ownerName}.` : "";
      await db.followUp.create({
        data: {
          actionId: appendTo.id,
          authorId: viewer.id,
          body: `Mencionada de nuevo en la reunión: «${actionValue.title}».${owner} Compromiso: ${actionValue.dueDate}.`,
          noteDate: new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00.000Z`),
          meetingId: item.meeting.id,
        },
      });
      await db.auditLog.create({
        data: {
          userId: viewer.id,
          kind: "CHANGE",
          entity: "Action",
          entityId: appendTo.id,
        },
      });
      await db.auditLog.create({
        data: {
          userId: viewer.id,
          kind: "CHANGE",
          entity: "ReviewItem",
          entityId: itemId,
        },
      });
      return { ok: true, followUpActionId: appendTo.id };
    }
    if (actionValue && statusId) {
      const due = new Date(`${actionValue.dueDate}T12:00:00.000Z`);
      const action = await db.action.create({
        data: {
          title: actionValue.title,
          ownerName: actionValue.ownerName,
          ownerId: actionValue.ownerId,
          dueDate: due,
          actionDate: due,
          statusId,
          levelId: item.meeting.levelId,
          meetingId: item.meeting.id,
          createdById: viewer.id,
        },
      });
      actionId = action.id;
      await db.reviewItem.update({ where: { id: itemId }, data: { actionId } });
    } else if (text) {
      const card = ((item.meeting.officialCard as Card | null) ?? {}) as Card;
      const next: Card = { ...card };
      if (item.kind === "SUMMARY") next.summary = text;
      else if (item.kind in cardKey) {
        const key = cardKey[item.kind as keyof typeof cardKey];
        next[key] = [...(card[key] ?? []), text];
      }
      await db.meeting.update({
        where: { id: item.meeting.id },
        data: { officialCard: next },
      });
    }
    await db.auditLog.create({
      data: {
        userId: viewer.id,
        kind: "CHANGE",
        entity: "ReviewItem",
        entityId: itemId,
      },
    });
    return { ok: true, actionId };
  } catch (error) {
    // Si algo falla después de tomar la decisión, la propuesta vuelve a quedar pendiente.
    await db.reviewItem.updateMany({
      where: { id: itemId, status: "APPROVED", actionId: null },
      data: {
        status: "PENDING",
        decidedById: null,
        decidedAt: null,
        editedValue: Prisma.DbNull,
        editedById: null,
        editedAt: null,
      },
    });
    throw error;
  }
}
