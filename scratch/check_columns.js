import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let envText = '';
try {
  envText = fs.readFileSync('.env', 'utf-8');
} catch (err) {
  console.error("Could not read .env file:", err);
  process.exit(1);
}

const env = {};
envText.split(/\r?\n/).forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length > 0) {
    env[key.trim()] = val.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error("Error retrieving data:", error);
  } else if (data && data.length > 0) {
    console.log("Database Columns:", Object.keys(data[0]));
  } else {
    console.log("No products found. Trying dummy insert to trigger schema error:");
    const { error: insertError } = await supabase.from('products').insert({ non_existent_key_test: 'value' });
    console.log("Schema Error Details:", insertError);
  }
}

checkColumns();
