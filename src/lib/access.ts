import type { Prisma } from "../generated/prisma/client";

// Lo mínimo que hace falta saber de quien mira.
export type Viewer = {
  id: string;
  profile: "ASSISTANT" | "DIRECTOR" | "ADMIN";
  maxLevel: { rank: number };
};

// Ningún resultado: Administración administra, no lee el contenido de reuniones ni acciones.
const nothing = { id: { in: [] as string[] } };

// Reuniones que puede ver. Nunca de un nivel superior al suyo, y solo lo propio
// (asistente) o lo que capturan sus asistentes (directivo).
export function meetingWhere(viewer: Viewer): Prisma.MeetingWhereInput {
  const withinLevel = { level: { rank: { lte: viewer.maxLevel.rank } } };
  switch (viewer.profile) {
    case "ASSISTANT":
      return { ...withinLevel, createdById: viewer.id };
    case "DIRECTOR":
      return { ...withinLevel, createdBy: { bossId: viewer.id } };
    default:
      return nothing;
  }
}

export function actionWhere(viewer: Viewer): Prisma.ActionWhereInput {
  const withinLevel = { level: { rank: { lte: viewer.maxLevel.rank } } };
  switch (viewer.profile) {
    case "ASSISTANT":
      return { ...withinLevel, createdById: viewer.id };
    case "DIRECTOR":
      return { ...withinLevel, createdBy: { bossId: viewer.id } };
    default:
      return nothing;
  }
}
