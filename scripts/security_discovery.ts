import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 1. Read /env.staging
const envPath = path.join(process.cwd(), 'env.staging');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    envVars[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
  }
}

const stagingUrl = envVars['VITE_SUPABASE_URL'];
const stagingAnonKey = envVars['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(stagingUrl, stagingAnonKey);

async function discover() {
  console.log('--- DATA DISCOVERY ON STAGING ---');
  
  // Try to find an admin in admin_users
  // Note: If RLS is working and we are anon, this might fail or return nothing.
  const { data: admins, error: adminErr } = await supabase.from('admin_users').select('user_id');
  if (adminErr) {
    console.log('admin_users (anon): Blocked as expected -', adminErr.message);
  } else {
    console.log('admin_users (anon): Found', admins?.length, 'rows (LEAK?)');
  }

  // Try to find a regular user
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, email, role').limit(20);
  if (profErr) {
    console.log('profiles (anon): Blocked -', profErr.message);
  } else {
    console.log('Found', profiles?.length, 'profiles');
    profiles?.forEach(p => console.log(`- ${p.email} (${p.role})`));
  }
  
  // Check RPC existence
  const { error: rpcErr } = await supabase.rpc('get_all_profiles').limit(1);
  console.log('RPC get_all_profiles existence check:', rpcErr ? rpcErr.message : 'EXISTS');
}

discover();
