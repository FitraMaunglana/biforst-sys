import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let url, key;
for (const line of env.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

async function fetchSchema() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  const reimbursements = data.definitions?.reimbursements || data.components?.schemas?.reimbursements;
  if (reimbursements) {
    console.log(JSON.stringify(reimbursements.properties.status, null, 2));
  } else {
    console.log(Object.keys(data.definitions || data.components?.schemas || {}));
  }
}

fetchSchema();
