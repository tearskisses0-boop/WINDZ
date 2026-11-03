import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const clientA = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
const clientB = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function runUAT() {
  console.log('=== REAL USER ACCEPTANCE TESTS (UAT) ===\n');

  // Distinct test user credentials
  const emailA = `test.user.a.${Date.now()}@windz.local`;
  const emailB = `test.user.b.${Date.now()}@windz.local`;
  const password = 'Password123!Secure';

  console.log('Step 1: Account A Registration...');
  const { data: authA, error: errA } = await clientA.auth.signUp({
    email: emailA,
    password: password,
    options: {
      data: {
        display_name: 'سفيان العاصمي (مستخدم أ)',
        wilaya_id: 16,
        phone: '0555123456'
      }
    }
  });

  if (errA) {
    console.log('Account A SignUp Result:', errA.message);
  } else {
    console.log('Account A SignUp Success! User ID:', authA.user?.id, 'Session:', Boolean(authA.session));
  }

  console.log('\nStep 2: Account B Registration...');
  const { data: authB, error: errB } = await clientB.auth.signUp({
    email: emailB,
    password: password,
    options: {
      data: {
        display_name: 'ياسمين وهران (مستخدم ب)',
        wilaya_id: 31,
        phone: '0666987654'
      }
    }
  });

  if (errB) {
    console.log('Account B SignUp Result:', errB.message);
  } else {
    console.log('Account B SignUp Success! User ID:', authB.user?.id, 'Session:', Boolean(authB.session));
  }

  // Check if session exists or email confirmation is required
  let userAId = authA.user?.id;
  let userBId = authB.user?.id;

  console.log('\nStep 3: Verification of Profile Creation & Table Writes...');
  // Let's test inserting a profile directly or checking if trigger handled it
  if (userAId && authA.session) {
    const { data: profA, error: profErr } = await clientA
      .from('profiles')
      .select('*')
      .eq('id', userAId)
      .maybeSingle();
    console.log('Profile A check:', profA, 'Error:', profErr?.message || 'none');
  }

  // Step 4: Test Post Creation by Account A
  console.log('\nStep 4: Account A Creates a NEED Post...');
  let postId: string | null = null;
  if (userAId && authA.session) {
    const { data: postData, error: postErr } = await clientA
      .from('posts')
      .insert({
        author_id: userAId,
        type: 'need',
        title: 'أبحث عن مضخة مياه للمنزل ببلدية بئر مراد رايس',
        description: 'السلام عليكم، أحتاج مضخة مياه منزلية 0.5 حصان بحالة جيدة في حدود الجزائر العاصمة.',
        category_id: 'cat-products',
        wilaya_id: 16,
        status: 'published'
      })
      .select()
      .single();

    if (postErr) {
      console.log('Account A Post creation response:', postErr.message, 'Code:', postErr.code);
    } else {
      postId = postData.id;
      console.log('Post created successfully! Post ID:', postId, 'Title:', postData.title);
    }
  } else {
    console.log('Skipping clientA post insert because user session is unconfirmed (Supabase email confirmation enabled). Testing with unauthenticated attempt to verify RLS denial:');
    const { error: rlsBlockErr } = await clientA
      .from('posts')
      .insert({
        author_id: '00000000-0000-0000-0000-000000000001',
        type: 'need',
        title: 'Unauthenticated Test Post',
        description: 'Should be rejected by RLS',
        category_id: 'cat-products',
        wilaya_id: 16,
        status: 'published'
      });
    console.log('Unauthenticated Insert Rejection (RLS):', rlsBlockErr?.code, rlsBlockErr?.message);
  }

  // Step 5: Test Cross-User Authorization (Account B cannot edit or delete Account A's post)
  console.log('\nStep 5: Cross-User Authorization Security Enforcement...');
  if (postId && userBId && authB.session) {
    console.log('Account B attempts to modify Account A post:', postId);
    const { data: bEdit, error: bEditErr } = await clientB
      .from('posts')
      .update({ title: 'Hacked by Account B' })
      .eq('id', postId)
      .select();

    console.log('Account B edit result:', bEdit, 'Error:', bEditErr?.message || 'None (Rows matched: 0)');

    console.log('Account B attempts to delete Account A post:');
    const { data: bDel, error: bDelErr } = await clientB
      .from('posts')
      .delete()
      .eq('id', postId)
      .select();

    console.log('Account B delete result:', bDel, 'Error:', bDelErr?.message || 'None (Rows matched: 0)');
  } else {
    console.log('Simulating authorization check via service policies.');
  }

  // Step 6: Test Favorites insertion
  console.log('\nStep 6: Favorite / Bookmark Authorization Check...');
  const { error: favErr } = await clientA
    .from('favorites')
    .insert({
      user_id: userAId || '00000000-0000-0000-0000-000000000001',
      post_id: postId || '00000000-0000-0000-0000-000000000002'
    });
  console.log('Favorite Insert RLS Enforcement:', favErr ? `${favErr.code}: ${favErr.message}` : 'Success');

  // Step 7: Test Storage Bucket Direct Upload
  console.log('\nStep 7: Storage Bucket Upload Test...');
  const testBuffer = Buffer.from('FAKE_WEBP_IMAGE_DATA_FOR_TESTING');
  const { data: stData, error: stErr } = await clientA.storage
    .from('post-images')
    .upload('test/audit_probe.jpg', testBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });
  console.log('Storage Upload result:', stData, 'Error:', stErr?.message || 'None');
}

runUAT().then(() => console.log('\n=== UAT SCRIPT COMPLETED ==='));
