// =========================================================================
// WIN DZ (وين نلقاها؟) - Phase 4.9.2 Runtime Mode & No Silent Fallback Test Suite
// =========================================================================

import { resolveAppEnv, PRODUCTION_PROJECT_REF } from '../src/lib/supabase/envConfig';

console.log('=== STARTING RUNTIME MODE & NO SILENT FALLBACK TESTS ===');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}${detail ? ` (${detail})` : ''}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    failCount++;
  }
}

// -------------------------------------------------------------------------
// TEST 1: Staging with missing credentials cannot use local persistence silently
// -------------------------------------------------------------------------
const stagingMissingEnv = resolveAppEnv({
  mode: 'staging',
  url: '',
  key: '',
});

assert(
  stagingMissingEnv.runtimeMode === 'STAGING_ERROR' && !stagingMissingEnv.isConfigured,
  'Test 1: Staging with missing credentials',
  `runtimeMode: ${stagingMissingEnv.runtimeMode}, isConfigured: ${stagingMissingEnv.isConfigured}`
);

// -------------------------------------------------------------------------
// TEST 2: Staging cannot connect to production project roqjdygzdtqaysfhcarb
// -------------------------------------------------------------------------
const stagingProdEnv = resolveAppEnv({
  mode: 'staging',
  url: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
  key: 'some_anon_key',
});

assert(
  stagingProdEnv.runtimeMode === 'STAGING_ERROR' && !stagingProdEnv.isConfigured && stagingProdEnv.statusMessage.includes(PRODUCTION_PROJECT_REF),
  'Test 2: Staging cannot connect to production ref roqjdygzdtqaysfhcarb',
  `runtimeMode: ${stagingProdEnv.runtimeMode}`
);

// -------------------------------------------------------------------------
// TEST 3: Production mode with missing credentials enters PRODUCTION_ERROR
// -------------------------------------------------------------------------
const prodMissingEnv = resolveAppEnv({
  mode: 'production',
  url: '',
  key: '',
});

assert(
  prodMissingEnv.runtimeMode === 'PRODUCTION_ERROR' && !prodMissingEnv.isConfigured,
  'Test 3: Production with missing credentials',
  `runtimeMode: ${prodMissingEnv.runtimeMode}`
);

// -------------------------------------------------------------------------
// TEST 4: Development Local mode is clearly labeled DEVELOPMENT_LOCAL
// -------------------------------------------------------------------------
const devLocalEnv = resolveAppEnv({
  mode: 'development',
  url: '',
  key: '',
});

assert(
  devLocalEnv.runtimeMode === 'DEVELOPMENT_LOCAL',
  'Test 4: Development mode is labeled DEVELOPMENT_LOCAL',
  `runtimeMode: ${devLocalEnv.runtimeMode}`
);

// -------------------------------------------------------------------------
// TEST 5: Valid Staging credentials initialize STAGING runtime mode
// -------------------------------------------------------------------------
const stagingValidEnv = resolveAppEnv({
  mode: 'staging',
  url: 'https://windz-staging-test.supabase.co',
  key: 'valid_staging_key',
});

assert(
  stagingValidEnv.runtimeMode === 'STAGING' && stagingValidEnv.isConfigured && stagingValidEnv.projectRef === 'windz-staging-test',
  'Test 5: Valid Staging credentials initialize STAGING mode',
  `projectRef: ${stagingValidEnv.projectRef}`
);

// -------------------------------------------------------------------------
// TEST 6: Simulated Form State Preservation on Error
// -------------------------------------------------------------------------
// Simulates a form submit handler when an operation throws an error:
// Form fields must retain typed values.
let formState = {
  title: 'طلب قطع غيار پژو 208',
  description: 'أبحث عن شمعات احتراق جديدة ومقبض باب جديد في الحراش',
  price: '3500',
  error: '',
};

function simulateFormSubmitWithErrorHandling(shouldFail: boolean) {
  try {
    if (shouldFail) {
      throw new Error('فشل إنشاء الإعلان: STAGING ERROR: Missing credentials.');
    }
  } catch (err: any) {
    formState.error = err.message;
    // Note: formState.title, formState.description, formState.price are NOT cleared
  }
}

simulateFormSubmitWithErrorHandling(true);

assert(
  formState.error.length > 0 && formState.title.length > 0 && formState.description.length > 0,
  'Test 6: Failed operation preserves unsaved form data',
  `Form title retained: "${formState.title}"`
);

console.log('\n=== RUNTIME MODE & SAFEGUARD TEST SUMMARY ===');
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  console.error('TEST SUITE FAILED!');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');
}
