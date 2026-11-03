import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function verifyLive() {
  console.log('--- Checking current database state ---');
  const tables = ['wilayas', 'communes', 'categories', 'profiles', 'posts'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table ${t}: ${count} rows (Error: ${error?.message || 'none'})`);
  }
}

verifyLive();
