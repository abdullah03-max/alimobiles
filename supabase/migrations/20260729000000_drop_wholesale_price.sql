-- Migration: Drop wholesale_price columns from products and product_imeis
ALTER TABLE products DROP COLUMN IF EXISTS wholesale_price;
ALTER TABLE product_imeis DROP COLUMN IF EXISTS wholesale_price;
