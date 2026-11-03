import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

async function testAllTables() {
  const tables = [
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
    'user_blocks',
    'public_profiles'
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table '${t}': ERROR -> ${error.message} (${error.code})`);
    } else {
      console.log(`Table '${t}': EXISTS (rows returned: ${data?.length || 0})`);
    }
  }
}

testAllTables();
