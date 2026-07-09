import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let url, key;
for (const line of env.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
}

const supabase = createClient(url, key);
async function main() {
  const { data, error } = await supabase.from('reimbursements').select('*').limit(1);
  if (data) {
    console.log(data.length ? Object.keys(data[0]) : "No data, but success");
  } else {
    console.log(error);
  }
}
main();
