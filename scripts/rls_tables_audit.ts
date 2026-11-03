import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function runRLSAudit() {
  console.log('=== DATABASE RLS AUDIT FOR PUBLIC SCHEMA ===\n');

  // Let's test read/write permissions for all 16 tables
  const tables = [
    'profiles',
    'wilayas',
    'communes',
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

  const tableAudit: Record<string, any> = {};

  for (const t of tables) {
    // 1. SELECT test
    const { count, error: sErr } = await client.from(t).select('*', { count: 'exact', head: true });
    
    // 2. INSERT probe (using dummy UUID)
    const { error: iErr } = await client.from(t).insert([{}]);

    tableAudit[t] = {
      selectAllowed: !sErr,
      selectNote: sErr ? sErr.code : `Public OK (${count ?? 0} rows)`,
      insertBlockedByRLS: iErr?.code === '42501',
      insertNote: iErr?.code === '42501' ? 'RLS Enforced (42501)' : (iErr?.code || 'Allowed')
    };
  }

  console.table(tableAudit);
}

runRLSAudit();
