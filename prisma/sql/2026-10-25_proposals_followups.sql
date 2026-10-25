-- Seguimiento de propuestas enviadas por el bot (modelo Proposal en schema.prisma).
-- Solo agrega columnas nuevas a "proposals"; no modifica datos existentes.
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "sent_to_chat" TEXT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "followups" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "last_followup_at" TIMESTAMP(3);
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "contact_clicked_at" TIMESTAMP(3);
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "stop_followups" BOOLEAN NOT NULL DEFAULT false;
