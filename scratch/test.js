import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hjeqmtdprvgetcskmfui.supabase.co';
const supabaseAnonKey = 'sb_publishable_2Te5Yng2FSslp5ABnNi9dg_-mSL8nzV';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const minimalItem = {
    purchase_id: 'ab374ee4-646e-49bf-ac50-57944e8ca827',
    product_id: '85bd1fcc-dd21-4b4e-86f0-079291b0b9cb',
    product_name: 'Google Pixel 6a – 128GB/12GB',
    quantity: 1,
    unit_cost: 45000,
    total: 45000
  };

  const { data: inserted, error: iErr } = await supabase
    .from('purchase_items')
    .insert(minimalItem)
    .select();

  if (iErr) {
    console.error('Error inserting minimal purchase item:', iErr);
  } else {
    console.log('Successfully inserted minimal item:', inserted);
  }
}

run();
