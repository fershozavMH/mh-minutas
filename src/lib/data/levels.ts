import { canUseLevel, type Viewer } from "../access";
import { getDb } from "../db";

// Niveles que esta persona puede asignar al capturar: activos y hasta su nivel máximo.
export async function listLevelsFor(viewer: Viewer) {
  const levels = await getDb().level.findMany({ where: { active: true }, orderBy: { rank: "asc" } });
  return levels.filter((level) => canUseLevel(viewer, level));
}
