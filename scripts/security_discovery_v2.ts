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
  console.log('--- PUBLIC PROFILES DISCOVERY ---');
  
  // Try public_profiles view
  const { data: pubProfiles, error: pubErr } = await supabase
    .from('public_profiles')
    .select('id, display_name, is_verified')
    .limit(10);
    
  if (pubErr) {
    console.log('public_profiles (anon): Blocked -', pubErr.message);
  } else {
    console.log('Found', pubProfiles?.length, 'public profiles');
    pubProfiles?.forEach(p => console.log(`- ${p.display_name} (${p.id})`));
  }
}

discover();
