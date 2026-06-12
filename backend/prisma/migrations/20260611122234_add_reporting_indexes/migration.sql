-- CreateIndex
CREATE INDEX "idx_order_items_category_id" ON "order_items"("category_id");

-- CreateIndex
CREATE INDEX "idx_order_items_sub_category_id" ON "order_items"("sub_category_id");

-- CreateIndex
CREATE INDEX "idx_order_items_grade" ON "order_items"("grade");

-- CreateIndex
CREATE INDEX "idx_order_items_price_per_kg" ON "order_items"("price_per_kg");

-- CreateIndex
CREATE INDEX "idx_order_items_summary_filters" ON "order_items"("category_id", "sub_category_id", "grade", "price_per_kg");

-- CreateIndex
CREATE INDEX "idx_orders_finished_date" ON "orders"("order_finished_date");

-- CreateIndex
CREATE INDEX "idx_orders_transaction_type" ON "orders"("transaction_type");

-- CreateIndex
CREATE INDEX "idx_orders_order_id" ON "orders"("order_id");

-- CreateIndex
CREATE INDEX "idx_sub_categories_category_id" ON "sub_categories"("category_id");
