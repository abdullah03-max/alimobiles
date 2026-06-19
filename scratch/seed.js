import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hjeqmtdprvgetcskmfui.supabase.co';
const supabaseAnonKey = 'sb_publishable_2Te5Yng2FSslp5ABnNi9dg_-mSL8nzV';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const now = new Date().toISOString();

const categories = [
  { name: 'Mobiles', description: 'Smartphones and mobile phones', display_order: 1, status: 'active', show_in_pos: true, created_at: now },
  { name: 'Accessories', description: 'Phone accessories', display_order: 2, status: 'active', show_in_pos: true, created_at: now },
  { name: 'Tablets', description: 'Tablet devices', display_order: 3, status: 'active', show_in_pos: true, created_at: now },
  { name: 'Spare Parts', description: 'Mobile spare parts', display_order: 4, status: 'active', show_in_pos: true, created_at: now },
  { name: 'Cards', description: 'SIM cards and memory cards', display_order: 5, status: 'active', show_in_pos: true, created_at: now },
  { name: 'Chargers', description: 'Chargers and cables', display_order: 6, status: 'active', show_in_pos: true, created_at: now },
];

const brands = [
  { name: 'Apple', description: 'Premium smartphones', status: 'active', created_at: now },
  { name: 'Samsung', description: 'Android smartphones', status: 'active', created_at: now },
  { name: 'Xiaomi', description: 'Value smartphones', status: 'active', created_at: now },
  { name: 'Huawei', description: 'Chinese smartphones', status: 'active', created_at: now },
  { name: 'OPPO', description: 'Camera focused phones', status: 'active', created_at: now },
  { name: 'Vivo', description: 'Music focused phones', status: 'active', created_at: now },
  { name: 'Realme', description: 'Budget smartphones', status: 'active', created_at: now },
  { name: 'Infinix', description: 'Affordable smartphones', status: 'active', created_at: now },
];

const units = [
  { name: 'Piece', code: 'pc', description: 'Single item', status: 'active' },
  { name: 'Box', code: 'box', description: 'Box of items', status: 'active' },
  { name: 'Set', code: 'set', description: 'Complete set', status: 'active' },
  { name: 'Meter', code: 'm', description: 'Length in meters', status: 'active' },
  { name: 'Kilogram', code: 'kg', description: 'Weight in kg', status: 'active' },
];

async function seed() {
  console.log('Seeding categories...');
  const { error: cErr } = await supabase.from('categories').insert(categories);
  if (cErr) console.error('Categories seed error:', cErr);

  console.log('Seeding brands...');
  const { error: bErr } = await supabase.from('brands').insert(brands);
  if (bErr) console.error('Brands seed error:', bErr);

  console.log('Seeding units...');
  const { error: uErr } = await supabase.from('units').insert(units);
  if (uErr) console.error('Units seed error:', uErr);

  console.log('Seed finished.');
}

seed();
