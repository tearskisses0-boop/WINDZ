// =========================================================================
// WIN DZ (وين نلقاها؟) - Environment Manager Safeguards Test Script
// Proves Staging Mode Cannot Connect to Production Database
// =========================================================================

import { resolveAppEnv, PRODUCTION_PROJECT_REF } from '../src/lib/supabase/envConfig';

console.log('=== STARTING ENVIRONMENT SAFEGUARD TESTS ===');

// 1. Test Staging Mode + Production URL -> MUST BE BLOCKED
const stagingProdAttempt = resolveAppEnv({
  mode: 'staging',
  url: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
  key: 'sb_publishable_production_key_mock_123',
});

if (!stagingProdAttempt.isConfigured && stagingProdAttempt.maskedUrl.includes('BLOCKED')) {
  console.log('TEST 1 PASSED: Staging mode connection to production project reference was successfully BLOCKED.');
} else {
  console.error('TEST 1 FAILED: Staging mode failed to block connection to production project!');
  process.exit(1);
}

// 2. Test Staging Mode + Missing Credentials -> MUST BE BLOCKED
const stagingMissingAttempt = resolveAppEnv({
  mode: 'staging',
  url: '',
  key: '',
});

if (!stagingMissingAttempt.isConfigured && stagingMissingAttempt.maskedUrl.includes('Missing')) {
  console.log('TEST 2 PASSED: Staging mode with missing credentials defaulted to unconfigured (local storage).');
} else {
  console.error('TEST 2 FAILED: Staging mode with missing credentials did not block!');
  process.exit(1);
}

// 3. Test Staging Mode + Valid Separate Staging Credentials -> MUST BE ACCEPTED
const stagingValidAttempt = resolveAppEnv({
  mode: 'staging',
  url: 'https://windz-staging-dz99.supabase.co',
  key: 'sb_publishable_staging_key_xyz123',
});

if (stagingValidAttempt.isConfigured && stagingValidAttempt.projectRef === 'windz-staging-dz99') {
  console.log('TEST 3 PASSED: Valid staging credentials correctly initialized staging connection.');
} else {
  console.error('TEST 3 FAILED: Valid staging credentials failed to initialize!');
  process.exit(1);
}

console.log('=== ALL ENVIRONMENT SAFEGUARD TESTS PASSED SUCCESSFULLY ===');
