-- Alias de personas: otros nombres con que se les menciona en las reuniones. Aditiva.
-- Reversa: ALTER TABLE "Person" DROP COLUMN "aliases";
ALTER TABLE "Person" ADD COLUMN "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
