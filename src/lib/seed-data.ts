// Datos de prueba. Los niveles y estados definitivos los definen Daray y Majo.
export const testLevels = [
  { name: "Público", rank: 1, isSensitive: false },
  { name: "Interno", rank: 2, isSensitive: false },
  { name: "Directivo", rank: 3, isSensitive: false },
  { name: "Sensible", rank: 4, isSensitive: true },
] as const;

export const testStatuses = [
  { name: "Pendiente", position: 1, isClosed: false },
  { name: "En proceso", position: 2, isClosed: false },
  { name: "Bloqueado", position: 3, isClosed: false },
  { name: "Hecho", position: 4, isClosed: true },
  { name: "Cancelado", position: 5, isClosed: true },
] as const;
