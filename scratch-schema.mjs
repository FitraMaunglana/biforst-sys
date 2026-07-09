import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let url, key;
for (const line of env.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

async function main() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
  const data = await res.json();
  console.log(Object.keys(data.definitions).filter(k => k.includes('reimburs')));
  
  if (data.definitions.reimbursements) {
    console.log("Cols:", Object.keys(data.definitions.reimbursements.properties));
  }
}
main();
