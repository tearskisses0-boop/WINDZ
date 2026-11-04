import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'env.staging' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing staging credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testJoin() {
  console.log('--- Phase 1: Direct View Query ---');
  const { data: directData, error: directError } = await supabase
    .from('public_profiles')
    .select('id, display_name')
    .limit(1);
  
  if (directError) {
    console.log('Direct query on public_profiles failed:', directError.message);
  } else {
    console.log('Direct query on public_profiles SUCCEEDED!');
    console.log('Sample:', directData);
  }

  console.log('\n--- Phase 2: Join with profiles (Current State) ---');
  const { data: joinProf, error: errProf } = await supabase
    .from('posts')
    .select('id, profiles:user_id(id, display_name)')
    .limit(1);
  
  if (errProf) {
    console.log('Join with profiles failed:', errProf.message);
  } else {
    console.log('Join with profiles SUCCEEDED! (Current state works because anon has SELECT on profiles)');
    console.log('Sample:', JSON.stringify(joinProf, null, 2));
  }

  console.log('\n--- Phase 3: Join with public_profiles ---');
  // Note: PostgREST usually doesn't allow joining views unless the view has a defined relationship
  // or we use the specific table name in the select.
  const { data: joinView, error: errView } = await supabase
    .from('posts')
    .select('id, public_profiles:user_id(id, display_name)')
    .limit(1);

  if (errView) {
    console.log('Join with public_profiles failed:', errView.message);
  } else {
    console.log('Join with public_profiles SUCCEEDED!');
    console.log('Sample:', JSON.stringify(joinView, null, 2));
  }
}

testJoin();
