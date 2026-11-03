import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function testFailureAndRecovery() {
  console.log('=== SECTION 5: FAILURE & RECOVERY TESTS ===\n');

  // 1. Invalid Image Upload (Wrong MIME type)
  console.log('Test 5.1: Invalid MIME Type Upload...');
  const textBuffer = Buffer.from('This is a text file, not an image');
  const { error: mimeErr } = await client.storage
    .from('post-images')
    .upload('test/invalid.txt', textBuffer, { contentType: 'text/plain' });
  console.log('Result:', mimeErr ? `HANDLED (${mimeErr.message})` : 'FAILED');

  // 2. Oversized Image Upload (Over 5 MB limit)
  console.log('\nTest 5.2: Oversized Image Upload (> 5 MB)...');
  const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, 0); // 6 MB
  const { error: sizeErr } = await client.storage
    .from('post-images')
    .upload('test/oversized.jpg', oversizedBuffer, { contentType: 'image/jpeg' });
  console.log('Result:', sizeErr ? `HANDLED (${sizeErr.message})` : 'FAILED');

  // 3. Search With No Results
  console.log('\nTest 5.3: Empty Search Results Query...');
  const { data: emptyData, error: emptyErr } = await client
    .from('posts')
    .select('*')
    .ilike('title', '%xyznonexistentquery12345%');
  console.log('Result:', emptyErr ? `Error: ${emptyErr.message}` : `HANDLED (Returned 0 rows gracefully: ${emptyData?.length})`);

  // 4. Invalid foreign key insertion
  console.log('\nTest 5.4: Invalid Wilaya ID Foreign Key Rejection...');
  const { error: fkErr } = await client
    .from('posts')
    .insert([{
      user_id: '9cf23ce2-1153-43b1-8c6c-0bf262dafd34',
      title: 'Invalid Wilaya Post',
      description: 'Testing FK constraint',
      post_type: 'NEED',
      category_id: 'cat-products',
      wilaya_id: 999 // Non-existent wilaya ID
    }]);
  console.log('Result:', fkErr ? `HANDLED (${fkErr.code}: ${fkErr.message})` : 'FAILED');
}

testFailureAndRecovery();
