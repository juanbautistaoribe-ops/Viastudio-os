-- Propuestas comerciales con link público (modelo Proposal en schema.prisma).
-- Solo agrega una tabla nueva; no modifica las existentes.
CREATE TABLE IF NOT EXISTS "proposals" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "lead_id" TEXT,
  "client_name" TEXT NOT NULL,
  "business" TEXT,
  "items" JSONB NOT NULL DEFAULT '[]',
  "diagnosis" TEXT,
  "solution" TEXT,
  "timeline" TEXT,
  "payment_terms" TEXT,
  "notes" TEXT,
  "exchange_rate" DOUBLE PRECISION,
  "valid_until" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'borrador',
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "sent_at" TIMESTAMP(3),
  "first_viewed_at" TIMESTAMP(3),
  "accepted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "proposals_slug_key" ON "proposals"("slug");
