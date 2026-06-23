import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env manually
const envText = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, ''); // strip optional quotes
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSettings() {
  const { data, error } = await supabase.from('settings').select('*');
  if (error) {
    console.error("Error retrieving settings:", error);
  } else {
    console.log("Settings Rows in Database:", data);
  }
}

checkSettings();
