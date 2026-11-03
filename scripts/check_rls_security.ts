import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function checkAuthAndRLS() {
  console.log('Testing RLS rejection on posts with user_id...');
  
  // 1. Unauthenticated insertion attempt on posts
  const { data: pData, error: pErr } = await client
    .from('posts')
    .insert([{
      user_id: '00000000-0000-0000-0000-000000000001',
      title: 'Unauthenticated Test Post',
      description: 'Test description',
      post_type: 'NEED',
      category_id: 'cat-products',
      wilaya_id: 16
    }])
    .select();

  console.log('Unauthenticated Insert Result:');
  console.log('  Success:', Boolean(pData && pData.length > 0));
  console.log('  Error code:', pErr?.code);
  console.log('  Error message:', pErr?.message);

  // 2. Unauthenticated insertion attempt on profiles
  const { data: profData, error: profErr } = await client
    .from('profiles')
    .insert([{
      id: '00000000-0000-0000-0000-000000000001',
      email: 'hacker@malicious.com',
      display_name: 'Hacker',
      role: 'admin'
    }])
    .select();

  console.log('\nUnauthenticated Profile Insert Result:');
  console.log('  Success:', Boolean(profData && profData.length > 0));
  console.log('  Error code:', profErr?.code);
  console.log('  Error message:', profErr?.message);

  // 3. Unauthenticated insertion attempt on messages
  const { data: msgData, error: msgErr } = await client
    .from('messages')
    .insert([{
      conversation_id: '00000000-0000-0000-0000-000000000001',
      sender_id: '00000000-0000-0000-0000-000000000001',
      content: 'Unauthorized message'
    }])
    .select();

  console.log('\nUnauthenticated Message Insert Result:');
  console.log('  Success:', Boolean(msgData && msgData.length > 0));
  console.log('  Error code:', msgErr?.code);
  console.log('  Error message:', msgErr?.message);

  // 4. Unauthenticated insertion attempt on reports
  const { data: repData, error: repErr } = await client
    .from('reports')
    .insert([{
      post_id: '00000000-0000-0000-0000-000000000001',
      reason: 'spam',
      details: 'Spam test'
    }])
    .select();

  console.log('\nUnauthenticated Report Insert Result:');
  console.log('  Success:', Boolean(repData && repData.length > 0));
  console.log('  Error code:', repErr?.code);
  console.log('  Error message:', repErr?.message);
}

checkAuthAndRLS();
