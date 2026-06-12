CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id VARCHAR(50) NOT NULL UNIQUE,
  category_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_category_id VARCHAR(50) NOT NULL UNIQUE,
  category_id VARCHAR(50) NOT NULL,
  sub_category_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_sub_categories_category
    FOREIGN KEY (category_id)
    REFERENCES categories(category_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(100) NOT NULL UNIQUE,
  order_finished_date DATE NOT NULL,
  transaction_type VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_orders_transaction_type
    CHECK (transaction_type IN ('BUY', 'SELL'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(100) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  sub_category_id VARCHAR(50) NOT NULL,
  grade VARCHAR(1) NOT NULL,
  quantity_kg NUMERIC(14, 2) NOT NULL DEFAULT 0,
  price_per_kg NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id)
    REFERENCES orders(order_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT fk_order_items_category
    FOREIGN KEY (category_id)
    REFERENCES categories(category_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_order_items_sub_category
    FOREIGN KEY (sub_category_id)
    REFERENCES sub_categories(sub_category_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT chk_order_items_grade
    CHECK (grade IN ('A', 'B', 'C', 'D')),

  CONSTRAINT chk_order_items_quantity_non_negative
    CHECK (quantity_kg >= 0),

  CONSTRAINT chk_order_items_price_non_negative
    CHECK (price_per_kg >= 0),

  CONSTRAINT chk_order_items_total_non_negative
    CHECK (total_amount >= 0)
);

CREATE OR REPLACE VIEW product_summary_view AS
SELECT
  oi.category_id,
  c.category_name,
  oi.sub_category_id,
  sc.sub_category_name,
  oi.grade,

  SUM(CASE WHEN o.transaction_type = 'BUY' THEN oi.quantity_kg ELSE 0 END) AS buy_quantity_kg,
  SUM(CASE WHEN o.transaction_type = 'BUY' THEN oi.total_amount ELSE 0 END) AS buy_total_amount,

  SUM(CASE WHEN o.transaction_type = 'SELL' THEN oi.quantity_kg ELSE 0 END) AS sell_quantity_kg,
  SUM(CASE WHEN o.transaction_type = 'SELL' THEN oi.total_amount ELSE 0 END) AS sell_total_amount,

  SUM(CASE WHEN o.transaction_type = 'BUY' THEN oi.quantity_kg ELSE 0 END)
    - SUM(CASE WHEN o.transaction_type = 'SELL' THEN oi.quantity_kg ELSE 0 END) AS remaining_quantity_kg,

  SUM(CASE WHEN o.transaction_type = 'BUY' THEN oi.total_amount ELSE 0 END)
    - SUM(CASE WHEN o.transaction_type = 'SELL' THEN oi.total_amount ELSE 0 END) AS remaining_amount
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
JOIN categories c ON c.category_id = oi.category_id
JOIN sub_categories sc ON sc.sub_category_id = oi.sub_category_id
GROUP BY
  oi.category_id,
  c.category_name,
  oi.sub_category_id,
  sc.sub_category_name,
  oi.grade;

CREATE INDEX IF NOT EXISTS idx_sub_categories_category_id
  ON sub_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_orders_finished_date
  ON orders(order_finished_date);

CREATE INDEX IF NOT EXISTS idx_orders_transaction_type
  ON orders(transaction_type);

CREATE INDEX IF NOT EXISTS idx_orders_order_id_pattern
  ON orders(order_id varchar_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_order_items_category_id
  ON order_items(category_id);

CREATE INDEX IF NOT EXISTS idx_order_items_sub_category_id
  ON order_items(sub_category_id);

CREATE INDEX IF NOT EXISTS idx_order_items_grade
  ON order_items(grade);

CREATE INDEX IF NOT EXISTS idx_order_items_price_per_kg
  ON order_items(price_per_kg);

CREATE INDEX IF NOT EXISTS idx_order_items_summary_filters
  ON order_items(category_id, sub_category_id, grade, price_per_kg);
