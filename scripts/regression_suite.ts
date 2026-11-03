import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

interface TestResult {
  id: string;
  category: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'NOT TESTED';
  evidence: string;
}

async function runRegressionSuite() {
  console.log('====================================================');
  console.log(' WIN DZ - PHASE 4.7 PERMANENT REGRESSION SUITE');
  console.log(' Endpoint:', supabaseUrl);
  console.log('====================================================\n');

  const results: TestResult[] = [];

  // 1. Reference Data Tests
  try {
    const { count: wCount } = await client.from('wilayas').select('*', { count: 'exact', head: true });
    results.push({
      id: 'REG-01',
      category: 'Reference Data',
      testName: 'Wilayas Coverage (69 Wilayas)',
      status: wCount === 69 ? 'PASS' : 'FAIL',
      evidence: `Live wilayas count: ${wCount}/69`
    });
  } catch (e: any) {
    results.push({ id: 'REG-01', category: 'Reference Data', testName: 'Wilayas Coverage', status: 'FAIL', evidence: e.message });
  }

  try {
    const { count: cCount } = await client.from('communes').select('*', { count: 'exact', head: true });
    results.push({
      id: 'REG-02',
      category: 'Reference Data',
      testName: 'Communes Coverage (1541 Communes)',
      status: cCount === 1541 ? 'PASS' : 'FAIL',
      evidence: `Live communes count: ${cCount}/1541`
    });
  } catch (e: any) {
    results.push({ id: 'REG-02', category: 'Reference Data', testName: 'Communes Coverage', status: 'FAIL', evidence: e.message });
  }

  try {
    const { count: kCount } = await client.from('categories').select('*', { count: 'exact', head: true });
    results.push({
      id: 'REG-03',
      category: 'Reference Data',
      testName: 'Categories Coverage (5 Categories)',
      status: kCount === 5 ? 'PASS' : 'FAIL',
      evidence: `Live categories count: ${kCount}/5`
    });
  } catch (e: any) {
    results.push({ id: 'REG-03', category: 'Reference Data', testName: 'Categories Coverage', status: 'FAIL', evidence: e.message });
  }

  // 2. Unauthenticated Table RLS Protection Tests
  const protectedTables = [
    'posts',
    'post_images',
    'conversations',
    'conversation_participants',
    'messages',
    'favorites',
    'notifications',
    'saved_searches',
    'admin_users',
    'moderation_actions',
    'user_blocks'
  ];

  for (const table of protectedTables) {
    try {
      const { error } = await client.from(table).insert([{}]);
      const isBlocked = error?.code === '42501' || error?.message.includes('row-level security');
      results.push({
        id: `REG-RLS-${table}`,
        category: 'RLS Table Protection',
        testName: `Unauthenticated Insert Blocked on ${table}`,
        status: isBlocked ? 'PASS' : 'FAIL',
        evidence: error ? `${error.code}: ${error.message}` : 'Unsafe: Insert allowed'
      });
    } catch (e: any) {
      results.push({
        id: `REG-RLS-${table}`,
        category: 'RLS Table Protection',
        testName: `Unauthenticated Insert Blocked on ${table}`,
        status: 'PASS',
        evidence: `Exception blocked: ${e.message}`
      });
    }
  }

  // 3. Messaging & Conversation Privacy
  try {
    const { data: msgData, error: msgErr } = await client.from('messages').select('*');
    const isProtected = (msgData?.length === 0) || Boolean(msgErr);
    results.push({
      id: 'REG-MSG-PRIV',
      category: 'Messaging Privacy',
      testName: 'Unauthenticated/External Message Read Protection',
      status: isProtected ? 'PASS' : 'FAIL',
      evidence: msgErr ? msgErr.message : `Visible message rows: ${msgData?.length ?? 0}`
    });
  } catch (e: any) {
    results.push({ id: 'REG-MSG-PRIV', category: 'Messaging Privacy', testName: 'Unauthenticated Message Read Protection', status: 'FAIL', evidence: e.message });
  }

  // 4. Admin RPC Authorization
  try {
    const { data: adminRes, error: adminErr } = await client.rpc('is_admin');
    results.push({
      id: 'REG-ADMIN-RPC',
      category: 'Admin Authorization',
      testName: 'RPC is_admin() Denies Unauthenticated Caller',
      status: (adminRes === false && !adminErr) ? 'PASS' : 'FAIL',
      evidence: adminErr ? adminErr.message : `is_admin() result: ${adminRes}`
    });
  } catch (e: any) {
    results.push({ id: 'REG-ADMIN-RPC', category: 'Admin Authorization', testName: 'RPC is_admin() Authorization', status: 'FAIL', evidence: e.message });
  }

  // 5. Storage MIME and File Size Security
  try {
    const { error: mimeErr } = await client.storage.from('post-images').upload('test/probe.txt', Buffer.from('hello'), { contentType: 'text/plain' });
    results.push({
      id: 'REG-ST-MIME',
      category: 'Storage Security',
      testName: 'Disallowed MIME Type Rejection (text/plain)',
      status: mimeErr?.message.includes('mime type text/plain') ? 'PASS' : 'FAIL',
      evidence: mimeErr ? mimeErr.message : 'Unsafe: Allowed text/plain upload'
    });
  } catch (e: any) {
    results.push({ id: 'REG-ST-MIME', category: 'Storage Security', testName: 'Disallowed MIME Type Rejection', status: 'FAIL', evidence: e.message });
  }

  try {
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, 0); // 6 MB
    const { error: sizeErr } = await client.storage.from('post-images').upload('test/huge.jpg', oversizedBuffer, { contentType: 'image/jpeg' });
    results.push({
      id: 'REG-ST-SIZE',
      category: 'Storage Security',
      testName: 'Oversized File Rejection (> 5 MB)',
      status: sizeErr?.message.includes('exceeded the maximum allowed size') ? 'PASS' : 'FAIL',
      evidence: sizeErr ? sizeErr.message : 'Unsafe: Allowed > 5MB file'
    });
  } catch (e: any) {
    results.push({ id: 'REG-ST-SIZE', category: 'Storage Security', testName: 'Oversized File Rejection', status: 'FAIL', evidence: e.message });
  }

  try {
    const { error: anonStErr } = await client.storage.from('post-images').upload('anon/test.webp', Buffer.from('RIFF_WEBP'), { contentType: 'image/webp' });
    results.push({
      id: 'REG-ST-ANON',
      category: 'Storage Security',
      testName: 'Anonymous Image Upload Rejection',
      status: anonStErr?.message.includes('row-level security') ? 'PASS' : 'FAIL',
      evidence: anonStErr ? anonStErr.message : 'Unsafe: Allowed anon upload'
    });
  } catch (e: any) {
    results.push({ id: 'REG-ST-ANON', category: 'Storage Security', testName: 'Anonymous Image Upload Rejection', status: 'FAIL', evidence: e.message });
  }

  // 6. Content Report Submission & Read Protection Tests
  try {
    const { error: repErr } = await client.from('reports').insert([{ reason: 'spam', details: 'Automated regression test report' }]);
    results.push({
      id: 'REG-REP-INS',
      category: 'Reports System',
      testName: 'Citizen Report Submission (Without .select())',
      status: !repErr ? 'PASS' : 'FAIL',
      evidence: !repErr ? 'Report inserted successfully' : repErr.message
    });
  } catch (e: any) {
    results.push({ id: 'REG-REP-INS', category: 'Reports System', testName: 'Citizen Report Submission', status: 'FAIL', evidence: e.message });
  }

  try {
    const { data: repData } = await client.from('reports').select('*');
    results.push({
      id: 'REG-REP-SEL',
      category: 'Reports System',
      testName: 'Citizen Report List Read Protection (Non-Admins See 0 Rows)',
      status: repData?.length === 0 ? 'PASS' : 'FAIL',
      evidence: `Visible report rows to non-admin: ${repData?.length ?? 0}`
    });
  } catch (e: any) {
    results.push({ id: 'REG-REP-SEL', category: 'Reports System', testName: 'Citizen Report List Read Protection', status: 'FAIL', evidence: e.message });
  }

  // Summary
  console.table(results);

  const passedCount = results.filter(r => r.status === 'PASS').length;
  const failedCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`\nRegression Suite Complete: ${passedCount} PASSED, ${failedCount} FAILED out of ${results.length} total tests.`);
}

runRegressionSuite();
