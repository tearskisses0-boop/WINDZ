import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function testProfilesQuery() {
  console.log('--- Testing Current Profiles Select ---');
  const { data: pData, error: pErr } = await client.from('profiles').select('id, display_name, email');
  console.log('Select profiles (id, display_name, email):', pData, 'Error:', pErr?.message);

  console.log('\n--- Testing Posts Joined Profiles ---');
  const { data: postData, error: postErr } = await client.from('posts').select('*, profiles:user_id(id, display_name, wilaya_id, phone, avatar_url)');
  console.log('Posts joined profiles:', postData, 'Error:', postErr?.message);
}

testProfilesQuery();
