// =========================================================================
// WIN DZ — Stage 1 Comprehensive Live Staging Database Audit (READ-ONLY)
// Target: windz-staging (https://qbfzhcngxtpjtljivzcw.supabase.co)
// =========================================================================

import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://qbfzhcngxtpjtljivzcw.supabase.co';
const STAGING_ANON_KEY = 'sb_publishable_9nmXZer_8dpgHxIkXOBXbA_64UWJnJ4';

const client = createClient(STAGING_URL, STAGING_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runAudit() {
  console.log('--- WIN DZ: STAGING AUDIT START ---');
  console.log('Target URL:', STAGING_URL);
  
  // 1. Check Tables row counts
  const tables = [
    'wilayas', 'communes', 'categories', 'profiles', 'public_profiles',
    'posts', 'post_images', 'conversations', 'conversation_participants',
    'messages', 'favorites', 'notifications', 'saved_searches',
    'reports', 'admin_users', 'moderation_actions', 'user_blocks'
  ];

  console.log('\n=== 1. TABLE ROW COUNTS & ACCESS CHECK (anon) ===');
  for (const table of tables) {
    try {
      const { count, error, status } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table '${table}': STATUS ${status} - Error: ${error.message} (Code: ${error.code})`);
      } else {
        console.log(`Table '${table}': STATUS ${status} - Row count: ${count}`);
      }
    } catch (e: any) {
      console.log(`Table '${table}': Exception - ${e.message}`);
    }
  }

  // 2. Inspect Categories
  console.log('\n=== 2. CATEGORIES AUDIT ===');
  const { data: categories, error: catErr } = await client
    .from('categories')
    .select('id, code, name_ar, name_fr, name_en, sort_order')
    .order('sort_order', { ascending: true });
  if (catErr) {
    console.log('Categories error:', catErr.message);
  } else {
    console.log(`Found ${categories?.length} categories:`);
    categories?.forEach(c => console.log(`  - [${c.id}] code: ${c.code} | ar: "${c.name_ar}" | sort: ${c.sort_order}`));
  }

  // 3. Inspect Wilayas and Communes
  console.log('\n=== 3. WILAYAS & COMMUNES AUDIT ===');
  const { count: wilayaCount } = await client.from('wilayas').select('*', { count: 'exact', head: true });
  const { count: communeCount } = await client.from('communes').select('*', { count: 'exact', head: true });
  console.log(`Wilayas count: ${wilayaCount} (Expected: 69)`);
  console.log(`Communes count: ${communeCount} (Expected: 1541)`);

  // 4. Inspect Profiles (via public_profiles)
  console.log('\n=== 4. PROFILES & TEST ACCOUNTS AUDIT (via public_profiles) ===');
  const { data: publicProfiles, error: profErr } = await client
    .from('public_profiles')
    .select('*');
  
  if (profErr) {
    console.log('public_profiles query error:', profErr.message);
  } else {
    console.log(`Found ${publicProfiles?.length || 0} profiles in public_profiles:`);
    for (const p of publicProfiles || []) {
      // Check related records count for each profile
      const { count: postCount } = await client.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', p.id);
      const { count: favCount } = await client.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', p.id);
      console.log(`  - Profile ID: ${p.id}`);
      console.log(`    Display Name: "${p.display_name}"`);
      console.log(`    Wilaya ID: ${p.wilaya_id} | Commune: ${p.commune_name || 'N/A'}`);
      console.log(`    Phone (public view): ${p.phone === null ? 'NULL (Hidden/Consent=False)' : '[PRESENT]'}`);
      console.log(`    show_phone_publicly: ${p.show_phone_publicly}`);
      console.log(`    Created At: ${p.created_at}`);
      console.log(`    Associated Posts count: ${postCount || 0}`);
      console.log(`    Associated Favorites count: ${favCount || 0}`);
    }
  }

  // 5. Inspect Posts
  console.log('\n=== 5. POSTS IN STAGING ===');
  const { data: posts, error: postErr } = await client
    .from('posts')
    .select('id, user_id, title, post_type, category_id, wilaya_id, availability_status, created_at, profiles:user_id(id, display_name, wilaya_id, avatar_url)');
  
  if (postErr) {
    console.log('Posts query error:', postErr.message);
  } else {
    console.log(`Found ${posts?.length || 0} posts:`);
    posts?.forEach(p => {
      console.log(`  - Post [${p.id}]: "${p.title}" | Type: ${p.post_type} | Wilaya: ${p.wilaya_id} | Status: ${p.availability_status} | Owner: ${JSON.stringify(p.profiles)}`);
    });
  }

  // 6. Test Column-Level Security (CLS) on Profiles
  console.log('\n=== 6. COLUMN LEVEL SECURITY (CLS) PRIVACY AUDIT ===');
  const sensitiveColumns = ['email', 'phone', 'role', 'is_suspended', 'last_active_at'];
  for (const col of sensitiveColumns) {
    const { data, error, status } = await client.from('profiles').select(col).limit(1);
    const blocked = error && (status === 401 || error.code === '42501' || error.message.includes('permission denied'));
    console.log(`Checking '${col}': Status ${status} - ${blocked ? '✅ BLOCKED (Protected by CLS)' : `❌ LEAKED or Accessible! Data: ${JSON.stringify(data)}`}`);
  }

  // Safe columns check
  const safeCols = 'id, display_name, avatar_url, wilaya_id';
  const { data: safeData, error: safeErr, status: safeStatus } = await client.from('profiles').select(safeCols).limit(1);
  console.log(`Checking safe columns (${safeCols}): Status ${safeStatus} - ${safeErr ? `❌ Error: ${safeErr.message}` : `✅ Accessible: ${JSON.stringify(safeData)}`}`);

  // 7. Check admin_users table
  console.log('\n=== 7. ADMIN USERS TABLE SECURITY ===');
  const { data: adminUsers, error: adminErr, status: adminStatus } = await client.from('admin_users').select('*');
  console.log(`Direct SELECT on admin_users: Status ${adminStatus} - ${adminErr ? `✅ BLOCKED (${adminErr.message})` : `⚠️ Accessible! Count: ${adminUsers?.length}`}`);

  // 8. Test RPC functions
  console.log('\n=== 8. RPC FUNCTIONS SECURITY ===');
  const { data: rpcProfiles, error: rpcProfErr, status: rpcProfStatus } = await client.rpc('get_all_profiles');
  console.log(`RPC get_all_profiles() as anon: Status ${rpcProfStatus} - ${rpcProfErr ? `✅ REJECTED (${rpcProfErr.message})` : '❌ UNPROTECTED!'}`);

  const { data: rpcIsAdmin, error: rpcAdminErr, status: rpcAdminStatus } = await client.rpc('is_admin');
  console.log(`RPC is_admin() as anon: Status ${rpcAdminStatus} - Result: ${rpcIsAdmin} (Error: ${rpcAdminErr?.message || 'none'})`);

  const { data: rpcMyProf, error: rpcMyProfErr, status: rpcMyProfStatus } = await client.rpc('get_my_profile');
  console.log(`RPC get_my_profile() as anon: Status ${rpcMyProfStatus} - Result: ${rpcMyProf ? 'returned' : 'null'} (Error: ${rpcMyProfErr?.message || 'none'})`);

  // 9. Storage Buckets
  console.log('\n=== 9. STORAGE BUCKET & PERMISSIONS ===');
  const { data: buckets, error: bucketErr } = await client.storage.listBuckets();
  if (bucketErr) {
    console.log('listBuckets error:', bucketErr.message);
  } else {
    console.log('Buckets:', buckets?.map(b => ({ id: b.id, name: b.name, public: b.public })));
  }

  // Test anon upload
  const testBuffer = Buffer.from('test');
  const { data: uploadData, error: uploadErr } = await client.storage
    .from('post-images')
    .upload(`audit_test_${Date.now()}.png`, testBuffer, { contentType: 'image/png' });
  console.log(`Anon upload to post-images: ${uploadErr ? `✅ BLOCKED (${uploadErr.message})` : '❌ Upload succeeded! Should be blocked.'}`);

  console.log('\n--- WIN DZ: STAGING AUDIT COMPLETE ---');
}

runAudit();
