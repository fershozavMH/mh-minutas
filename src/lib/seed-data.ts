// Datos de prueba. Los niveles definitivos los definen Daray y Majo.
export const testLevels = [
  { name: "Público", rank: 1, isSensitive: false },
  { name: "Interno", rank: 2, isSensitive: false },
  { name: "Directivo", rank: 3, isSensitive: false },
  { name: "Sensible", rank: 4, isSensitive: true },
] as const;

// Estándar de estados recibido el 21 oct 2026 (sin confirmar como definitivo).
// En espera y Cancelado piden una nota: qué se espera, o la decisión de no hacerla.
export const testStatuses = [
  { name: "Pendiente", position: 1, isClosed: false, requiresNote: false },
  { name: "En progreso", position: 2, isClosed: false, requiresNote: false },
  { name: "En revisión", position: 3, isClosed: false, requiresNote: false },
  { name: "En espera", position: 4, isClosed: false, requiresNote: true },
  { name: "Completado", position: 5, isClosed: true, requiresNote: false },
  { name: "Cancelado", position: 6, isClosed: true, requiresNote: true },
] as const;
