-- Migration: Add cost_price to sale_items table and backfill from product_imeis or base products cost_price
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- Backfill existing rows
UPDATE sale_items si
SET cost_price = COALESCE(
  (
    SELECT pi.cost_price 
    FROM product_imeis pi
    WHERE (pi.imei = si.imei OR pi.imei1 = si.imei1 OR pi.imei2 = si.imei2)
      AND pi.cost_price IS NOT NULL AND pi.cost_price > 0
    LIMIT 1
  ),
  (
    SELECT p.cost_price
    FROM products p
    WHERE p.id = si.product_id
  ),
  0
);
