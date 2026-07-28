-- Migration: Add condition-specific pricing to product_imeis
ALTER TABLE product_imeis
ADD COLUMN cost_price numeric(12, 2) DEFAULT NULL,
ADD COLUMN sale_price numeric(12, 2) DEFAULT NULL,
ADD COLUMN wholesale_price numeric(12, 2) DEFAULT NULL;
