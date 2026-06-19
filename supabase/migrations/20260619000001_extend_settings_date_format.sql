-- Allow both date formats used in the Settings UI
ALTER TABLE settings
  DROP CONSTRAINT IF EXISTS settings_date_format_check;

ALTER TABLE settings
  ADD CONSTRAINT settings_date_format_check
  CHECK (date_format IN ('dd/MM/yyyy', 'MM/dd/yyyy', 'YYYY-MM-DD'));
