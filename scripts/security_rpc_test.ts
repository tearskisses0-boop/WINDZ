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

async function runTests() {
  console.log('--- SECURITY INTEGRATION TESTS ---');
  
  // Test regular user rejection
  const emailReg = `sec.${Math.random().toString(36).substring(2)}@windz.temp`;
  const { data, error } = await supabase.auth.signUp({
    email: emailReg,
    password: 'Password123!',
  });

  if (error) {
    console.log('Signup error:', error.message);
  } else {
    // Attempt RPC
    const { error: rpcErr } = await supabase.rpc('get_all_profiles');
    console.log('Regular User RPC Result:', rpcErr ? `${rpcErr.code} - ${rpcErr.message}` : 'SUCCESS');
  }
}

runTests();
