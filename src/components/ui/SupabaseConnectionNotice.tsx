import React, { useEffect, useState } from 'react';
import { activeEnvConfig } from '../../lib/supabase/envConfig';
import { checkSupabaseConnection, SupabaseConnectionStatus } from '../../lib/supabase/supabaseHealth';
import { Database, AlertTriangle, ShieldAlert, ChevronRight, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SupabaseConnectionNotice: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('windz_supabase_banner_dismissed') === 'true';
  });

  useEffect(() => {
    checkSupabaseConnection().then(setHealthStatus);
  }, []);

  const runtimeMode = activeEnvConfig.runtimeMode;

  // 1. DEVELOPMENT_LOCAL mode: Persistent banner clearly informing local demo status
  if (runtimeMode === 'DEVELOPMENT_LOCAL') {
    if (isDismissed) return null;
    return (
      <aside aria-label="وضع التطوير المحلي" className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                [LOCAL DEMO MODE]
              </span>
              <span className="text-amber-800 dark:text-amber-200">
                التطبيق يعمل بنمط التطوير المحلي (Local Demo Storage). البيانات والحسابات محلية وغير متزامنة مع خادم Supabase.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/secure-admin"
              className="font-bold underline hover:text-amber-600 dark:hover:text-amber-100 flex items-center gap-0.5"
            >
              <span>تشخيص البيئة</span>
              <ChevronRight className="w-3 h-3 rtl:rotate-180" />
            </Link>
            <button
              onClick={() => {
                setIsDismissed(true);
                sessionStorage.setItem('windz_supabase_banner_dismissed', 'true');
              }}
              className="p-1 rounded-md hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 cursor-pointer"
              title="إخفاء التنبيه لهذه الجلسة"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 2. STAGING_ERROR mode: Red sticky error banner preventing silent fallback
  if (runtimeMode === 'STAGING_ERROR') {
    return (
      <aside aria-label="خطأ في بيئة الإعداد" className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <ShieldAlert className="w-4 h-4 text-white shrink-0 animate-pulse" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-white/20 px-2 py-0.5 rounded">
                [STAGING MODE ERROR]
              </span>
              <span>
                {activeEnvConfig.statusMessage}
              </span>
            </div>
          </div>

          <Link
            to="/secure-admin"
            className="shrink-0 underline hover:text-rose-100 flex items-center gap-0.5 bg-black/20 px-2.5 py-1 rounded-lg"
          >
            <span>لوحة التشخيص</span>
            <ChevronRight className="w-3 h-3 rtl:rotate-180" />
          </Link>
        </div>
      </aside>
    );
  }

  // 3. PRODUCTION_ERROR mode: Red sticky error banner
  if (runtimeMode === 'PRODUCTION_ERROR') {
    return (
      <aside aria-label="خطأ في بيئة الإنتاج" className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <ShieldAlert className="w-4 h-4 text-white shrink-0 animate-pulse" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-white/20 px-2 py-0.5 rounded">
                [PRODUCTION MODE ERROR]
              </span>
              <span>
                {activeEnvConfig.statusMessage}
              </span>
            </div>
          </div>

          <Link
            to="/secure-admin"
            className="shrink-0 underline hover:text-rose-100 flex items-center gap-0.5 bg-black/20 px-2.5 py-1 rounded-lg"
          >
            <span>لوحة التشخيص</span>
            <ChevronRight className="w-3 h-3 rtl:rotate-180" />
          </Link>
        </div>
      </aside>
    );
  }

  // 4. STAGING mode: Green / Teal notification
  if (runtimeMode === 'STAGING') {
    if (isDismissed) return null;
    return (
      <aside aria-label="بيئة الإعداد" className="bg-teal-600/15 border-b border-teal-500/30 text-teal-900 dark:text-teal-200 px-4 py-2 text-xs transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <Database className="w-4 h-4 text-teal-500 shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-800 dark:text-teal-300">
                [STAGING MODE]
              </span>
              <span>
                متصل بقاعدة بيانات الإعداد المستقلة (windz-staging): {activeEnvConfig.maskedUrl} [{activeEnvConfig.projectRef}]
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsDismissed(true);
              sessionStorage.setItem('windz_supabase_banner_dismissed', 'true');
            }}
            className="p-1 rounded-md hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 cursor-pointer"
            title="إخفاء التنبيه"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // 5. PRODUCTION mode: Return null (or handle health errors if connected client fails)
  if (healthStatus && (healthStatus.status === 'connection_error' || healthStatus.status === 'invalid_url')) {
    return (
      <aside aria-label="انقطاع اتصال قاعدة البيانات" className="bg-rose-500/10 border-b border-rose-500/30 text-rose-800 dark:text-rose-200 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>تعذر الاتصال بقاعدة البيانات السحابية: {healthStatus.errorMessage}</span>
          </div>
        </div>
      </aside>
    );
  }

  return null;
};
