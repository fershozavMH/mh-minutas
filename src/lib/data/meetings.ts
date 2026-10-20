import { meetingWhere, type Viewer } from "../access";
import { getDb } from "../db";
import { recordSensitiveReads } from "./audit";

// Única puerta de lectura de reuniones: todo pasa por el filtro de nivel.
export async function listMeetings(viewer: Viewer) {
  const meetings = await getDb().meeting.findMany({
    where: meetingWhere(viewer),
    orderBy: { heldAt: "desc" },
    include: { level: true },
  });
  await recordSensitiveReads(viewer.id, "Meeting", meetings);
  return meetings;
}

export async function getMeeting(viewer: Viewer, id: string) {
  const meeting = await getDb().meeting.findFirst({
    where: { AND: [{ id }, meetingWhere(viewer)] },
    include: { level: true, sources: { select: { id: true, origin: true, createdAt: true } }, reviewItems: true },
  });
  if (meeting) await recordSensitiveReads(viewer.id, "Meeting", [meeting]);
  return meeting;
}
