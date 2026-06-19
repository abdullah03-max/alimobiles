-- Allow JazzCash and EasyPaisa on sales (matches POS payment method settings)
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_payment_method_check;

ALTER TABLE sales
  ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN (
    'cash',
    'card',
    'bank_transfer',
    'jazzcash',
    'easypaisa',
    'credit'
  ));
