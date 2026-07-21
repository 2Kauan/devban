import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) {
    env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function test() {
  // Let's try to query project_favorites
  console.log("Fetching project_favorites...");
  const { data, error } = await supabase.from('project_favorites').select('*');
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
