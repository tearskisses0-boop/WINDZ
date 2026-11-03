import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Connecting to Supabase at:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

const EXPECTED_TABLES = [
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

async function runAudit() {
  const results: Record<string, any> = {};

  console.log('\n--- 1. TABLE EXISTENCE & ACCESS CHECK ---');
  for (const table of EXPECTED_TABLES) {
    try {
      const { count, error, data } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(2);

      if (error) {
        results[table] = {
          exists: error.code !== '42P01', // 42P01 is undefined_table
          errorCode: error.code,
          errorMessage: error.message,
          count: null,
          accessible: false
        };
      } else {
        results[table] = {
          exists: true,
          errorCode: null,
          count: count,
          sampleCount: data?.length || 0,
          accessible: true
        };
      }
    } catch (err: any) {
      results[table] = {
        exists: false,
        error: err.message,
        accessible: false
      };
    }
  }

  console.table(
    Object.entries(results).map(([table, res]) => ({
      Table: table,
      Exists: res.exists ? 'YES' : 'NO',
      Count: res.count !== null ? res.count : 'N/A',
      Accessible: res.accessible ? 'YES' : 'NO (RLS/Auth)',
      Error: res.errorMessage || res.errorCode || 'None'
    }))
  );

  console.log('\n--- 2. REFERENCE TABLES CHECK (wilayas, communes, categories) ---');
  const wilayaRes = await supabase.from('wilayas').select('id, name_ar, name_fr').limit(5);
  console.log('Wilayas sample:', wilayaRes.data?.length || 0, 'rows. Error:', wilayaRes.error?.message || 'none');
  
  const communeRes = await supabase.from('communes').select('id, name_ar, wilaya_id').limit(5);
  console.log('Communes sample:', communeRes.data?.length || 0, 'rows. Error:', communeRes.error?.message || 'none');

  const catRes = await supabase.from('categories').select('id, name_ar, code').limit(5);
  console.log('Categories sample:', catRes.data?.length || 0, 'rows. Error:', catRes.error?.message || 'none');

  console.log('\n--- 3. STORAGE BUCKET CHECK ---');
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    console.log('Buckets list result:', buckets ? buckets.map(b => ({ id: b.id, name: b.name, public: b.public })) : 'None', 'Error:', bErr?.message || 'none');
    
    // Also try getBucket
    const { data: postImagesBucket, error: pibErr } = await supabase.storage.getBucket('post-images');
    console.log('post-images bucket details:', postImagesBucket || 'Not found', 'Error:', pibErr?.message || 'none');
  } catch (stErr: any) {
    console.log('Storage check error:', stErr.message);
  }

  console.log('\n--- 4. RPC FUNCTIONS CHECK ---');
  try {
    const { data: adminCheck, error: rpcErr } = await supabase.rpc('is_admin');
    console.log('RPC is_admin() result:', adminCheck, 'Error:', rpcErr?.message || 'none');
  } catch (e: any) {
    console.log('RPC check failed:', e.message);
  }
}

runAudit().then(() => console.log('\nAudit complete.'));
