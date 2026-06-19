-- Allow MM/DD/YYYY date format in settings
ALTER TABLE settings
  DROP CONSTRAINT IF EXISTS settings_date_format_check;

ALTER TABLE settings
  ADD CONSTRAINT settings_date_format_check
  CHECK (date_format IN ('dd/MM/yyyy', 'MM/dd/yyyy', 'YYYY-MM-DD'));

-- Ensure settings can be updated from the app (anon/authenticated roles)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read settings" ON settings;
CREATE POLICY "Allow public read settings"
  ON settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public update settings" ON settings;
CREATE POLICY "Allow public update settings"
  ON settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert settings" ON settings;
CREATE POLICY "Allow public insert settings"
  ON settings FOR INSERT
  WITH CHECK (true);
