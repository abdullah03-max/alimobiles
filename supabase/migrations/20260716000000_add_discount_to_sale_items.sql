-- Add discount columns to sale_items table
ALTER TABLE sale_items
ADD COLUMN IF NOT EXISTS discount NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'amount';

-- Add comments for documentation
COMMENT ON COLUMN sale_items.discount IS 'Item-specific discount value';
COMMENT ON COLUMN sale_items.discount_type IS 'Discount type for the item (percent or amount)';
