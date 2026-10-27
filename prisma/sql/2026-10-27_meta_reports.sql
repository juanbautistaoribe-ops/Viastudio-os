-- Reportes mensuales de Meta Ads por cliente (modelo MetaReport en schema.prisma).
-- Agrega una columna a "clients" y una tabla nueva; no modifica datos existentes.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "meta_ad_account_id" TEXT;

CREATE TABLE IF NOT EXISTS "meta_reports" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "summary" TEXT,
  "status" TEXT NOT NULL DEFAULT 'borrador',
  "sent_at" TIMESTAMP(3),
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "first_viewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meta_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "meta_reports_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "meta_reports_slug_key" ON "meta_reports"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "meta_reports_client_id_period_key" ON "meta_reports"("client_id", "period");
ALTER TABLE "meta_reports" ENABLE ROW LEVEL SECURITY;
