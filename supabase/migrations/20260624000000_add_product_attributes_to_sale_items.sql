-- Add product attribute columns to sale_items table
ALTER TABLE sale_items
ADD COLUMN IF NOT EXISTS color VARCHAR(100),
ADD COLUMN IF NOT EXISTS storage VARCHAR(100),
ADD COLUMN IF NOT EXISTS ram VARCHAR(100),
ADD COLUMN IF NOT EXISTS pta_status VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN sale_items.color IS 'Product color variant';
COMMENT ON COLUMN sale_items.storage IS 'Product storage capacity';
COMMENT ON COLUMN sale_items.ram IS 'Product RAM amount';
COMMENT ON COLUMN sale_items.pta_status IS 'PTA approval status (approved/non-approved)';
