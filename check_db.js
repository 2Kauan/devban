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

async function check() {
  console.log("Checking requests...");
  const { data: reqs, error: e1 } = await supabase.from('project_access_requests').select('*');
  console.log("Requests:", reqs, e1);

  console.log("Checking members...");
  const { data: mems, error: e2 } = await supabase.from('project_members').select('*');
  console.log("Members:", mems, e2);
}

check();
