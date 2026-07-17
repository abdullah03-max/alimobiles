-- Add customer phone and address columns to sales table
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Add comments for documentation
COMMENT ON COLUMN sales.customer_phone IS 'Manually entered phone number of the customer';
COMMENT ON COLUMN sales.customer_address IS 'Manually entered address of the customer';
