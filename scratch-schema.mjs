import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('reimbursement_attachments').insert({
    reimbursement_id: '00000000-0000-0000-0000-000000000000',
    file_path: 'test',
    file_name: 'test.jpg'
  });
  console.log("Error with file_path:", error);
}
run();
