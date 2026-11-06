-- Tipos de pendiente, avances con fecha, prioridad, repetición y «agendar».
-- Solo agrega tablas y columnas con valor por defecto; no toca datos existentes.
-- Reversa manual: ALTER TABLE "Action" DROP COLUMN "typeId", DROP COLUMN "priority", DROP COLUMN "repeat", DROP COLUMN "needsScheduling";
--   DROP TABLE "FollowUp"; DROP TABLE "ActionType"; DROP TYPE "Priority"; DROP TYPE "Repeat";

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "Repeat" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "ActionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "noteDate" TIMESTAMP(3) NOT NULL,
    "meetingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "typeId" TEXT,
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "repeat" "Repeat" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "needsScheduling" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "ActionType_name_key" ON "ActionType"("name");

-- CreateIndex
CREATE INDEX "FollowUp_actionId_idx" ON "FollowUp"("actionId");

-- CreateIndex
CREATE INDEX "Action_typeId_idx" ON "Action"("typeId");

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ActionType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Tipos iniciales (referencia: el modelo de Daray, 21 oct 2026; editables en catálogos).
INSERT INTO "ActionType" ("id", "name", "position") VALUES
  ('type_hacer', 'Yo lo hago', 1),
  ('type_recordar', 'Recordar a mi jefe/a', 2),
  ('type_jefe', 'Lo hace mi jefe/a', 3),
  ('type_seguimiento', 'Dar seguimiento', 4),
  ('type_verificar', 'Verificar que ocurra', 5),
  ('type_escalar', 'Escalar bloqueo', 6),
  ('type_decision', 'Decisión de mi jefe/a', 7)
ON CONFLICT ("name") DO NOTHING;
