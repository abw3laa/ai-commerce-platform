CREATE TABLE "knowledge_articles" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "knowledge_articles_is_active_idx" ON "knowledge_articles"("is_active");
