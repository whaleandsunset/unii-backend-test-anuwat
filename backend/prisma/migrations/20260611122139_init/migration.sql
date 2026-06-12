-- DropIndex
DROP INDEX "idx_order_items_category_id";

-- DropIndex
DROP INDEX "idx_order_items_grade";

-- DropIndex
DROP INDEX "idx_order_items_price_per_kg";

-- DropIndex
DROP INDEX "idx_order_items_sub_category_id";

-- DropIndex
DROP INDEX "idx_order_items_summary_filters";

-- DropIndex
DROP INDEX "idx_orders_finished_date";

-- DropIndex
DROP INDEX "idx_orders_order_id_pattern";

-- DropIndex
DROP INDEX "idx_orders_transaction_type";

-- DropIndex
DROP INDEX "idx_sub_categories_category_id";

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sub_categories" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- RenameForeignKey
ALTER TABLE "order_items" RENAME CONSTRAINT "fk_order_items_category" TO "order_items_category_id_fkey";

-- RenameForeignKey
ALTER TABLE "order_items" RENAME CONSTRAINT "fk_order_items_order" TO "order_items_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "order_items" RENAME CONSTRAINT "fk_order_items_sub_category" TO "order_items_sub_category_id_fkey";

-- RenameForeignKey
ALTER TABLE "sub_categories" RENAME CONSTRAINT "fk_sub_categories_category" TO "sub_categories_category_id_fkey";
