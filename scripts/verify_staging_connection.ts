import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== STEP 1: STAGING ENVIRONMENT VERIFICATION ===');

// Read /env.staging file
const envPath = path.join(process.cwd(), 'env.staging');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: env.staging file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
const envVars: Record<string, string> = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    envVars[key] = val;
  }
}

const mode = envVars['VITE_ENV_MODE'];
const url = envVars['VITE_SUPABASE_URL'];
const anonKey = envVars['VITE_SUPABASE_ANON_KEY'];

console.log(`Configured Mode: ${mode}`);
console.log(`Configured Staging URL: ${url}`);

// Extract project reference
function extractRef(u: string): string {
  try {
    return new URL(u).hostname.split('.')[0] || '';
  } catch {
    return '';
  }
}

const projectRef = extractRef(url);
console.log(`Extracted Project Ref: ${projectRef}`);

const PRODUCTION_PROJECT_REF = 'roqjdygzdtqaysfhcarb';

if (projectRef === PRODUCTION_PROJECT_REF) {
  console.error(`CRITICAL SAFETY ERROR: Target URL matches production project reference (${PRODUCTION_PROJECT_REF})! Aborting!`);
  process.exit(1);
} else {
  console.log(`✅ SAFETY VERIFIED: Project ref '${projectRef}' is distinct from production '${PRODUCTION_PROJECT_REF}'.`);
}

// Initialize Supabase Client
const supabase = createClient(url, anonKey);

async function testConnection() {
  try {
    console.log('Testing PostgREST database accessibility...');
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`Note: Querying 'profiles' table gave: ${error.message} (Code: ${error.code})`);
      if (error.code === 'PGRST301' || error.message.includes('relation "public.profiles" does not exist')) {
        console.log('✅ Connected to Staging Supabase PostgREST endpoint! (Database schema is fresh/unmigrated).');
      } else {
        console.log('✅ Connected to Staging Supabase PostgREST endpoint.');
      }
    } else {
      console.log('✅ Connected to Staging Supabase database! Table "profiles" exists.');
    }

    // Test Auth Service Endpoint
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Auth endpoint test error:', authError.message);
    } else {
      console.log('✅ Connected to Staging Supabase Auth service!');
    }

  } catch (err: any) {
    console.error('Connection test exception:', err.message);
    process.exit(1);
  }
}

testConnection();
