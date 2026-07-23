const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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
  const { data: cards, error } = await supabase.from('cards').select('*');
  if (error) return;
  
  const { data: columns } = await supabase.from('columns').select('*');
  
  const subtasks = cards.filter(c => c.parent_id !== null);
  console.log("Total subtasks:", subtasks.length);
  
  subtasks.forEach(sub => {
    const colExists = columns.some(col => col.id === sub.column_id);
    console.log(`Subtask "${sub.title}" (parent: ${sub.parent_id}) -> column_id: ${sub.column_id} (Exists in database? ${colExists})`);
  });
}

check();
