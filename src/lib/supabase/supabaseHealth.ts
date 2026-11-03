import { supabase, isSupabaseConfigured } from './client';

export interface SupabaseConnectionStatus {
  isConfigured: boolean;
  status: 'connected' | 'not_configured' | 'connection_error' | 'invalid_url';
  supabaseUrl: string;
  hasAnonKey: boolean;
  storageMode: 'supabase_cloud' | 'local_storage';
  errorMessage?: string;
  latencyMs?: number;
  lastChecked: string;
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured || !supabase || !rawUrl || !rawKey) {
    return {
      isConfigured: false,
      status: 'not_configured',
      supabaseUrl: rawUrl || '(لم يتم ضبط VITE_SUPABASE_URL)',
      hasAnonKey: Boolean(rawKey),
      storageMode: 'local_storage',
      errorMessage: 'المتغيرات البيئية VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY غير مهيأة أو فارغة.',
      lastChecked: now,
    };
  }

  // Validate URL format
  if (!rawUrl.startsWith('https://') && !rawUrl.startsWith('http://')) {
    return {
      isConfigured: false,
      status: 'invalid_url',
      supabaseUrl: rawUrl,
      hasAnonKey: Boolean(rawKey),
      storageMode: 'local_storage',
      errorMessage: 'عنوان VITE_SUPABASE_URL يجب أن يبدأ بـ https://',
      lastChecked: now,
    };
  }

  const startTime = Date.now();
  try {
    // Attempt ping to Supabase Auth or database
    const { data, error } = await supabase.from('categories').select('id', { head: true, count: 'exact' });
    const latency = Date.now() - startTime;

    if (error) {
      // Check if it's an RLS or table issue vs connection failure
      return {
        isConfigured: true,
        status: 'connection_error',
        supabaseUrl: rawUrl,
        hasAnonKey: true,
        storageMode: 'local_storage',
        errorMessage: `خطأ في الاتصال بقاعدة بيانات Supabase: ${error.message}`,
        latencyMs: latency,
        lastChecked: now,
      };
    }

    return {
      isConfigured: true,
      status: 'connected',
      supabaseUrl: rawUrl,
      hasAnonKey: true,
      storageMode: 'supabase_cloud',
      latencyMs: latency,
      lastChecked: now,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      status: 'connection_error',
      supabaseUrl: rawUrl,
      hasAnonKey: true,
      storageMode: 'local_storage',
      errorMessage: err.message || 'فشل الاتصال بالخادم السحابي لـ Supabase',
      latencyMs: Date.now() - startTime,
      lastChecked: now,
    };
  }
}
