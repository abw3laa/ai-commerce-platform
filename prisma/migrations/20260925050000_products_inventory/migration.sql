CREATE TABLE "products" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "product_code" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "cost" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_product_code_key" ON "products"("product_code");
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

CREATE TABLE "product_variants" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "size" TEXT,
  "color" TEXT,
  "stock_quantity" INTEGER NOT NULL DEFAULT 0,
  "price_override" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

ALTER TABLE "product_variants"
ADD CONSTRAINT "product_variants_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
