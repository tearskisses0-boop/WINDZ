// =========================================================================
// WIN DZ (وين نلقاها؟) - Environment Manager & Production Safeguard
// Isolated Staging vs Production Selector with Zero Secrets Exposure
// =========================================================================

export const PRODUCTION_PROJECT_REF = 'roqjdygzdtqaysfhcarb';

export type EnvironmentMode = 'development' | 'staging' | 'production';

export type RuntimeMode = 
  | 'DEVELOPMENT_LOCAL' 
  | 'STAGING' 
  | 'PRODUCTION' 
  | 'STAGING_ERROR' 
  | 'PRODUCTION_ERROR';

export interface AppEnvConfig {
  mode: EnvironmentMode;
  runtimeMode: RuntimeMode;
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
  isProduction: boolean;
  isStaging: boolean;
  projectRef: string;
  maskedUrl: string;
  statusMessage: string;
}

const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  return '';
};

export const maskUrl = (url: string): string => {
  if (!url) return '[Not Configured]';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const parts = host.split('.');
    if (parts.length > 0 && parts[0].length > 6) {
      parts[0] = parts[0].substring(0, 4) + '***' + parts[0].substring(parts[0].length - 2);
    }
    return `${parsed.protocol}//${parts.join('.')}`;
  } catch {
    return url.substring(0, 10) + '...';
  }
};

export const extractProjectRef = (url: string): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.split('.')[0] || '';
  } catch {
    return '';
  }
};

export const resolveAppEnv = (overrideVars?: {
  mode?: string;
  url?: string;
  key?: string;
}): AppEnvConfig => {
  const rawUrl = overrideVars?.url ?? getEnvVar('VITE_SUPABASE_URL');
  const rawKey = overrideVars?.key ?? getEnvVar('VITE_SUPABASE_ANON_KEY');

  const url = (rawUrl && !rawUrl.includes('YOUR_SUPABASE')) ? rawUrl.trim() : '';
  const key = (rawKey && !rawKey.includes('YOUR_SUPABASE')) ? rawKey.trim() : '';
  const projectRef = extractProjectRef(url);

  const isProductionRef = projectRef === PRODUCTION_PROJECT_REF;
  const isStagingRef = projectRef === 'qbfzhcngxtpjtljivzcw';

  const modeVar = overrideVars?.mode || getEnvVar('VITE_ENV_MODE') || (isStagingRef ? 'staging' : (getEnvVar('MODE') || 'development'));
  const mode: EnvironmentMode = (modeVar === 'staging' || modeVar === 'production') ? modeVar : 'development';

  // 1. STAGING MODE VALIDATION & SAFEGUARDS
  if (mode === 'staging') {
    // SAFEGUARD: If staging mode is selected, URL MUST NOT point to production project!
    if (isProductionRef) {
      console.error(
        `[WIN DZ ENVIRONMENT SAFEGUARD] STAGING CONFIGURATION BLOCKED: ` +
        `Target URL points to production project (${PRODUCTION_PROJECT_REF}). ` +
        `Staging connection aborted to protect production database.`
      );
      return {
        mode: 'staging',
        runtimeMode: 'STAGING_ERROR',
        supabaseUrl: '',
        supabaseAnonKey: '',
        isConfigured: false,
        isProduction: false,
        isStaging: true,
        projectRef: '',
        maskedUrl: '[BLOCKED — Production Ref Detected]',
        statusMessage: `STAGING ERROR: Connection to production project (${PRODUCTION_PROJECT_REF}) is blocked in staging mode. Please provide windz-staging credentials.`,
      };
    }

    if (!url || !key) {
      return {
        mode: 'staging',
        runtimeMode: 'STAGING_ERROR',
        supabaseUrl: '',
        supabaseAnonKey: '',
        isConfigured: false,
        isProduction: false,
        isStaging: true,
        projectRef: '',
        maskedUrl: '[Missing Credentials]',
        statusMessage: 'STAGING ERROR: Staging credentials (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing. Backend operations are halted.',
      };
    }

    return {
      mode: 'staging',
      runtimeMode: 'STAGING',
      supabaseUrl: url,
      supabaseAnonKey: key,
      isConfigured: true,
      isProduction: false,
      isStaging: true,
      projectRef,
      maskedUrl: maskUrl(url),
      statusMessage: `Connected to STAGING project [${projectRef}]`,
    };
  }

  // 2. PRODUCTION MODE VALIDATION
  if (mode === 'production') {
    if (!url || !key) {
      return {
        mode: 'production',
        runtimeMode: 'PRODUCTION_ERROR',
        supabaseUrl: '',
        supabaseAnonKey: '',
        isConfigured: false,
        isProduction: true,
        isStaging: false,
        projectRef: '',
        maskedUrl: '[Missing Credentials]',
        statusMessage: 'PRODUCTION ERROR: Production credentials (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing. Backend operations are halted.',
      };
    }

    return {
      mode: 'production',
      runtimeMode: 'PRODUCTION',
      supabaseUrl: url,
      supabaseAnonKey: key,
      isConfigured: true,
      isProduction: true,
      isStaging: false,
      projectRef,
      maskedUrl: maskUrl(url),
      statusMessage: `Connected to PRODUCTION project [${projectRef}]`,
    };
  }

  // 3. DEVELOPMENT_LOCAL MODE (Local Demo Mode)
  const isConfigured = Boolean(url && key);
  return {
    mode: 'development',
    runtimeMode: 'DEVELOPMENT_LOCAL',
    supabaseUrl: url,
    supabaseAnonKey: key,
    isConfigured,
    isProduction: isProductionRef,
    isStaging: false,
    projectRef,
    maskedUrl: maskUrl(url),
    statusMessage: isConfigured 
      ? `DEVELOPMENT_LOCAL mode: Connected to development database [${projectRef}]`
      : 'DEVELOPMENT_LOCAL mode: Running with persistent local storage (Local Demo)',
  };
};

export const activeEnvConfig = resolveAppEnv();
