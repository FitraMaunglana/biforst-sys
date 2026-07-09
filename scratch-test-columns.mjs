import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let url, key;
for (const line of env.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const supabase = createClient(url, key);

async function testColumn(colName) {
  const payload = {
    title: 'Test',
    description: 'Test desc',
    amount: 100,
    status: 'Pending'
  };
  payload[colName] = 'biforsttechnologysolution@gmail.com';
  
  const { data, error } = await supabase.from('reimbursements').insert([payload]);
  if (error) {
    console.log(`Failed for ${colName}:`, error.message);
  } else {
    console.log(`SUCCESS for ${colName}!`);
  }
}

async function main() {
  const columns = ['email', 'user_id', 'created_by', 'founder_name', 'account_id', 'pic_name', 'user_email'];
  for (const col of columns) {
    await testColumn(col);
  }
}
main();
