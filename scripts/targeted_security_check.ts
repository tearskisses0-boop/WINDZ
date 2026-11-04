import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPrivileges() {
  console.log('Checking profiles safe columns access...');
  const { data: profData, error: profErr } = await supabase
    .from('profiles')
    .select('id, display_name')
    .limit(1);
  
  if (profErr) {
    console.log('❌ Profiles safe columns: FAIL -', profErr.message);
  } else {
    console.log('✅ Profiles safe columns: PASS - Accessible');
  }

  console.log('\nChecking profiles sensitive columns access (email)...');
  const { data: emailData, error: emailErr } = await supabase
    .from('profiles')
    .select('email')
    .limit(1);
  
  if (emailErr) {
    console.log('✅ Profiles sensitive columns: PASS - Correctly Blocked -', emailErr.message);
  } else {
    console.log('❌ Profiles sensitive columns: FAIL - Accessible!');
  }

  console.log('\nChecking admin_users access...');
  const { data: adminData, error: adminErr } = await supabase
    .from('admin_users')
    .select('*')
    .limit(1);
  
  if (adminErr) {
    console.log('✅ admin_users access: PASS - Correctly Blocked -', adminErr.message);
  } else {
    console.log('❌ admin_users access: FAIL - Accessible!');
  }
}

checkPrivileges();
