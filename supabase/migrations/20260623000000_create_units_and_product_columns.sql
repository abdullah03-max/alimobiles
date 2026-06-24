-- Create units table if missing
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  description text,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add common product columns that the app expects
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS brand_id uuid,
  ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock_level integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_in_pos boolean DEFAULT true;

-- Optional: create index on barcode/skus for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
