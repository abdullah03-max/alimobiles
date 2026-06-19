import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hjeqmtdprvgetcskmfui.supabase.co';
const supabaseAnonKey = 'sb_publishable_2Te5Yng2FSslp5ABnNi9dg_-mSL8nzV';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
