ALTER TABLE "conversations"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN "assigned_admin_user_id" TEXT,
  ADD COLUMN "handoff_reason" TEXT,
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "summary_updated_at" TIMESTAMP(3);
CREATE INDEX "conversations_status_idx" ON "conversations"("status");
CREATE INDEX "conversations_assigned_admin_user_id_idx" ON "conversations"("assigned_admin_user_id");
