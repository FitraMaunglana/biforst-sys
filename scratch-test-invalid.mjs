import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let url, key;
for (const line of env.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const supabase = createClient(url, key);

async function main() {
  const payload = {
    title: 'Test',
    description: 'Test',
    amount: 1,
    submitted_by: 'biforsttechnologysolution@gmail.com',
    expense_date: '2023-01-01',
    account_id: '12345678-1234-1234-1234-123456789012',
    status: 'COMPLETELY_INVALID_STATUS_999'
  };
  const { error } = await supabase.from('reimbursements').insert([payload]);
  console.log(error.message);
}
main();
