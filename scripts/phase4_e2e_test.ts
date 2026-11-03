import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function runE2E() {
  console.log('=== PHASE 4: FULL INTEGRATION & END-TO-END AUDIT ===\n');

  // 1. Reference Data Verification
  console.log('--- 1. Reference Tables Audit ---');
  const { data: wilayas, count: wCount } = await client.from('wilayas').select('id, name_ar, name_fr, region', { count: 'exact' });
  const { data: communes, count: cCount } = await client.from('communes').select('id, name_ar, wilaya_id', { count: 'exact' }).limit(5);
  const { data: categories, count: kCount } = await client.from('categories').select('*', { count: 'exact' });

  console.log(`Wilayas count: ${wCount}/69 (Sample: ${wilayas?.[15]?.name_ar} - Alger)`);
  console.log(`Communes count: ${cCount}/1541`);
  console.log(`Categories count: ${kCount}/5 (${categories?.map(c => c.code).join(', ')})`);

  // 2. Storage Bucket MIME & Size & RLS Enforcement
  console.log('\n--- 2. Storage Security Verification ---');
  // 2.1 MIME Enforcement
  const { error: mimeErr } = await client.storage.from('post-images').upload('probe.txt', Buffer.from('test'), { contentType: 'text/plain' });
  console.log('MIME Type rejection (text/plain):', mimeErr ? `BLOCKED (${mimeErr.message})` : 'FAILED');

  // 2.2 Anonymous Upload Enforcement
  const { error: anonErr } = await client.storage.from('post-images').upload('probe.webp', Buffer.from('RIFF_WEBP'), { contentType: 'image/webp' });
  console.log('Anonymous WebP upload rejection:', anonErr ? `BLOCKED (${anonErr.message})` : 'FAILED');

  // 2.3 Public Image URL generation check
  const { data: pubUrl } = client.storage.from('post-images').getPublicUrl('sample_user/sample.webp');
  console.log('Public image URL format:', pubUrl.publicUrl);

  // 3. Testing Authentication & Profile Trigger
  console.log('\n--- 3. Testing Auth & Trigger ---');
  const testEmailA = `test.pilot.a.${Date.now()}@windz.dz`;
  const testPass = 'DzPassword2026!Secure';

  const { data: authA, error: aErr } = await client.auth.signUp({
    email: testEmailA,
    password: testPass,
    options: {
      data: {
        display_name: 'سفيان العاصمي',
        wilaya_id: 16,
        phone: '0555001122'
      }
    }
  });

  if (aErr) {
    console.log('Auth SignUp Notice:', aErr.message);
  } else {
    console.log('Auth User A created:', authA.user?.id, 'Confirmed:', Boolean(authA.user?.confirmed_at));
    // Check if trigger created profile
    if (authA.user?.id) {
      const { data: profA } = await client.from('profiles').select('*').eq('id', authA.user.id).maybeSingle();
      console.log('Profile created by trigger for User A:', profA ? 'YES' : 'NO (Pending email confirm or trigger)');
    }
  }

  // 4. Test RLS on Posts Table
  console.log('\n--- 4. Posts CRUD & RLS Verification ---');
  // Attempt unauthenticated post creation
  const { error: unauthPostErr } = await client.from('posts').insert([{
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Unauthorized Test Post',
    description: 'Should fail with 42501',
    post_type: 'NEED',
    category_id: 'cat-products',
    wilaya_id: 16
  }]);
  console.log('Unauthenticated Post Insert rejection:', unauthPostErr?.code === '42501' ? 'BLOCKED (42501 RLS Enforcement)' : unauthPostErr?.message);

  // Public Query for published posts
  const { data: publicPosts, error: postQueryErr } = await client.from('posts').select('*').limit(5);
  console.log('Public posts query result: Status OK, rows:', publicPosts?.length, 'Error:', postQueryErr?.message || 'none');

  // 5. Test RLS on Messages & Conversations
  console.log('\n--- 5. Messaging & Privacy RLS ---');
  const { error: msgErr } = await client.from('messages').insert([{
    conversation_id: '00000000-0000-0000-0000-000000000001',
    sender_id: '00000000-0000-0000-0000-000000000001',
    content: 'Hack message'
  }]);
  console.log('Unauthenticated Message rejection:', msgErr?.code === '42501' ? 'BLOCKED (42501 RLS Privacy)' : msgErr?.message);

  // 6. Test Reports System
  console.log('\n--- 6. Content Reporting Verification ---');
  // Anonymous / Public reporting is permitted by policy "Citizens can insert reports"
  // Let's verify report insertion
  const { data: repData, error: repErr } = await client.from('reports').insert([{
    reason: 'spam',
    details: 'Spam report verification test'
  }]).select('id');
  console.log('Citizen report submission:', repErr ? `Error: ${repErr.message}` : `SUCCESS (Report ID: ${repData?.[0]?.id})`);

  // Verify that anonymous users CANNOT read reports (Admin only)
  const { data: repList, error: repListErr } = await client.from('reports').select('*');
  console.log('Citizen report list reading (should be empty/blocked for non-admins):', repList?.length === 0 ? 'PROTECTED (0 rows visible to citizen)' : `Rows: ${repList?.length}`);
}

runE2E();
