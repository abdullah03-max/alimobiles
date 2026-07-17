-- Create the product_imeis table for storing IMEI data in Supabase
-- This replaces browser localStorage as the primary IMEI storage

CREATE TABLE IF NOT EXISTS product_imeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  imei TEXT NOT NULL,
  imei1 TEXT NOT NULL,
  imei2 TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold')),
  color TEXT,
  ram TEXT,
  storage TEXT,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint on imei1 (primary IMEI must be globally unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_imeis_imei1 ON product_imeis(imei1);
-- Index on imei2 for search
CREATE INDEX IF NOT EXISTS idx_product_imeis_imei2 ON product_imeis(imei2);
-- Index for product lookup
CREATE INDEX IF NOT EXISTS idx_product_imeis_product_id ON product_imeis(product_id);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_product_imeis_status ON product_imeis(status);

-- Enable RLS
ALTER TABLE product_imeis ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated" ON product_imeis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow all operations for anon users (since the app uses anon key)
CREATE POLICY "Allow all for anon" ON product_imeis
  FOR ALL TO anon USING (true) WITH CHECK (true);
