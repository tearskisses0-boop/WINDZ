import { createClient } from '@supabase/supabase-js';
import { activeEnvConfig } from './envConfig';

export const isSupabaseConfigured = activeEnvConfig.isConfigured;

export const supabase = isSupabaseConfigured 
  ? createClient(activeEnvConfig.supabaseUrl, activeEnvConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }) 
  : null;

if (typeof window !== 'undefined') {
  console.log(`[WIN DZ ENVIRONMENT] ${activeEnvConfig.statusMessage} (URL: ${activeEnvConfig.maskedUrl})`);
}
