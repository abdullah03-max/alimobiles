-- Add condition and pta_status columns to product_imeis table
ALTER TABLE product_imeis ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished', 'open_box'));
ALTER TABLE product_imeis ADD COLUMN IF NOT EXISTS pta_status TEXT DEFAULT 'approved' CHECK (pta_status IN ('approved', 'non-approved'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_imeis_condition ON product_imeis(condition);
CREATE INDEX IF NOT EXISTS idx_product_imeis_pta_status ON product_imeis(pta_status);
