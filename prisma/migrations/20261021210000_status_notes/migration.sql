-- Notas de estado: solo agrega columnas con valor por defecto; no toca datos existentes.
-- Reversa manual: ALTER TABLE "Action" DROP COLUMN "statusNote"; ALTER TABLE "ActionStatus" DROP COLUMN "requiresNote";

-- AlterTable
ALTER TABLE "ActionStatus" ADD COLUMN     "requiresNote" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "statusNote" TEXT;
