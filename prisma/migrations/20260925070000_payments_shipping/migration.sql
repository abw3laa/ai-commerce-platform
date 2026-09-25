CREATE TABLE "payments" (
 "id" TEXT NOT NULL,
 "order_id" TEXT NOT NULL,
 "method" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'pending',
 "amount" INTEGER NOT NULL,
 "reference" TEXT,
 "rejection_reason" TEXT,
 "verified_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey"
 FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "shipments" (
 "id" TEXT NOT NULL,
 "order_id" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'pending',
 "carrier" TEXT,
 "tracking_code" TEXT,
 "tracking_url" TEXT,
 "shipped_at" TIMESTAMP(3),
 "delivered_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");
CREATE INDEX "shipments_status_idx" ON "shipments"("status");
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey"
 FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
