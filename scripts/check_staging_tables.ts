import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== CHECKING STAGING TABLES & SCHEMA ===');

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

const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['VITE_SUPABASE_ANON_KEY']);

const tablesToTest = [
  'wilayas',
  'communes',
  'profiles',
  'categories',
  'posts',
  'post_images',
  'conversations',
  'conversation_participants',
  'messages',
  'favorites',
  'notifications',
  'saved_searches',
  'reports',
  'admin_users',
  'moderation_actions',
  'user_blocks'
];

async function checkTables() {
  const statusReport: Record<string, string> = {};

  for (const table of tablesToTest) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      statusReport[table] = `Error/Missing (${error.message})`;
    } else {
      statusReport[table] = 'EXISTS & ACCESSIBLE';
    }
  }

  console.log('Staging Database Tables Status:');
  console.table(statusReport);

  // Check public_profiles view
  const { error: viewError } = await supabase.from('public_profiles').select('count', { count: 'exact', head: true });
  console.log('public_profiles view status:', viewError ? `Missing (${viewError.message})` : 'EXISTS & ACCESSIBLE');

  // Check storage buckets
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.log('Storage Buckets Check Error:', bucketError.message);
  } else {
    console.log('Storage Buckets Found:', buckets ? buckets.map(b => b.name) : []);
  }
}

checkTables();
