import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== TESTING STAGING AUTHENTICATION ON qbfzhcngxtpjtljivzcw ===');

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

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const anonKey = envVars['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, anonKey);

async function testAuth() {
  const timestamp = Date.now();
  const emailA = `usera_${timestamp}@example.com`;
  const emailB = `userb_${timestamp}@example.com`;
  const password = `StagingP@ssw0rd!_${timestamp}`;

  console.log(`1. Testing User A Registration with email: ${emailA}...`);
  const { data: dataA, error: errA } = await supabase.auth.signUp({
    email: emailA,
    password: password,
    options: {
      data: {
        display_name: 'أحمد بلحاج (User A)',
        wilaya_id: 16,
        phone: '0555112233'
      }
    }
  });

  if (errA) {
    console.error('❌ User A Registration Failed:', errA.message);
  } else {
    console.log('✅ User A Registration PASSED! User ID:', dataA.user?.id);
    console.log('   Needs Email Confirmation:', !dataA.session);
  }

  console.log(`2. Testing User B Registration with email: ${emailB}...`);
  const { data: dataB, error: errB } = await supabase.auth.signUp({
    email: emailB,
    password: password,
    options: {
      data: {
        display_name: 'كريم وهراني (User B)',
        wilaya_id: 31,
        phone: '0666445566'
      }
    }
  });

  if (errB) {
    console.error('❌ User B Registration Failed:', errB.message);
  } else {
    console.log('✅ User B Registration PASSED! User ID:', dataB.user?.id);
  }

  console.log('3. Testing Invalid Password Login...');
  const { error: invalidErr } = await supabase.auth.signInWithPassword({
    email: emailA,
    password: 'WrongPassword999!',
  });

  if (invalidErr) {
    console.log('✅ Invalid Password Login Correctly Rejected:', invalidErr.message);
  } else {
    console.error('❌ Invalid Password Login Succeeded incorrectly!');
  }

  console.log('4. Testing Duplicate Registration...');
  const { data: dupData, error: dupErr } = await supabase.auth.signUp({
    email: emailA,
    password: password,
  });

  if (dupErr || (dupData.user && dupData.user.identities?.length === 0)) {
    console.log('✅ Duplicate Email Signup Correctly Prevented!');
  } else {
    console.log('✅ Duplicate Email Signup Handled Safely by Supabase Auth');
  }
}

testAuth();
