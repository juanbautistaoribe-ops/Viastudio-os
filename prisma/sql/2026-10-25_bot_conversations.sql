-- Tabla para métricas del bot de WhatsApp (modelo BotConversation en schema.prisma).
-- Solo agrega una tabla nueva; no modifica las existentes.
CREATE TABLE IF NOT EXISTS "bot_conversations" (
  "id" TEXT NOT NULL,
  "chat_id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT,
  "first_message" TEXT,
  "source" TEXT NOT NULL DEFAULT 'general',
  "status" TEXT NOT NULL DEFAULT 'activo',
  "messages" INTEGER NOT NULL DEFAULT 0,
  "followups" INTEGER NOT NULL DEFAULT 0,
  "qualified_at" TIMESTAMP(3),
  "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bot_conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "bot_conversations_chat_id_key" ON "bot_conversations"("chat_id");
