-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Phase 4.11 FINAL COMPLETE SECURITY AUDIT SUITE
-- Rigorous SQL Security Assertions (Strict RAISE EXCEPTION on Failure)
-- Target Database: STAGING (qbfzhcngxtpjtljivzcw) ONLY
-- =========================================================================

DO $$
DECLARE
    v_assertion_count INTEGER := 0;
    v_bool_val BOOLEAN;
    v_int_val INTEGER;
BEGIN
    RAISE NOTICE '=== STARTING PHASE 4.11 FINAL SECURITY AUDIT TEST SUITE ===';

    -- -------------------------------------------------------------------------
    -- 1. PROFILES & PRIVACY (7 Assertions)
    -- -------------------------------------------------------------------------
    -- 1.1 SELECT on sensitive columns must be REVOKED for anon
    IF has_column_privilege('anon', 'public.profiles', 'email', 'SELECT') OR
       has_column_privilege('anon', 'public.profiles', 'phone', 'SELECT') OR
       has_column_privilege('anon', 'public.profiles', 'role', 'SELECT') THEN
        RAISE EXCEPTION 'ASSERTION 1.1 FAILED: Sensitive columns in profiles MUST BE REVOKED for anon!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 1.2 SELECT on sensitive columns must be REVOKED for authenticated
    IF has_column_privilege('authenticated', 'public.profiles', 'email', 'SELECT') OR
       has_column_privilege('authenticated', 'public.profiles', 'phone', 'SELECT') OR
       has_column_privilege('authenticated', 'public.profiles', 'role', 'SELECT') THEN
        RAISE EXCEPTION 'ASSERTION 1.2 FAILED: Sensitive columns in profiles MUST BE REVOKED for authenticated!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 1.3 SELECT on public_profiles view granted to anon & authenticated
    IF NOT has_table_privilege('anon', 'public.public_profiles', 'SELECT') OR 
       NOT has_table_privilege('authenticated', 'public.public_profiles', 'SELECT') THEN
        RAISE EXCEPTION 'ASSERTION 1.3 FAILED: SELECT on public_profiles view MUST BE GRANTED!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 1.4 View public.public_profiles enforces phone privacy logic
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'public_profiles' AND view_definition LIKE '%show_phone_publicly%') THEN
        RAISE EXCEPTION 'ASSERTION 1.4 FAILED: public_profiles view MUST enforce phone privacy!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 1.5 Sensitive profile updates denied (role)
    IF has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION 1.5 FAILED: Role update MUST BE DENIED!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 1.6 Sensitive profile updates denied (is_verified)
    IF has_column_privilege('authenticated', 'public.profiles', 'is_verified', 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION 1.6 FAILED: is_verified update MUST BE DENIED!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 1.7 display_name update granted
    IF NOT has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION 1.7 FAILED: display_name update MUST BE GRANTED!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- -------------------------------------------------------------------------
    -- 2. SECURITY DEFINER FUNCTIONS (7 Assertions)
    -- -------------------------------------------------------------------------
    -- 2.1 is_admin() owner and security
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'is_admin' AND p.prosecdef = true) THEN
        RAISE EXCEPTION 'ASSERTION 2.1 FAILED: is_admin() MUST be SECURITY DEFINER!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 2.2 is_admin() search_path check
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND proconfig @> ARRAY['search_path=']) THEN
        RAISE EXCEPTION 'ASSERTION 2.2 FAILED: is_admin() MUST have empty search_path!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 2.3 create_conversation() owner and security
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'create_conversation' AND p.prosecdef = true) THEN
        RAISE EXCEPTION 'ASSERTION 2.3 FAILED: create_conversation() MUST be SECURITY DEFINER!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 2.4 create_conversation() favorite interest check
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_conversation' AND prosrc LIKE '%favorites%') THEN
        RAISE EXCEPTION 'ASSERTION 2.4 FAILED: create_conversation() MUST check favorites for owner-initiation!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 2.5 is_conversation_participant() parameter hardening (Exactly 1 arg)
    SELECT pronargs INTO v_int_val FROM pg_proc WHERE proname = 'is_conversation_participant';
    IF v_int_val <> 1 THEN
        RAISE EXCEPTION 'ASSERTION 2.5 FAILED: is_conversation_participant() MUST have exactly 1 parameter! Found: %', v_int_val;
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 2.6 update_my_profile() skip logic check
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_my_profile' AND prosrc LIKE '%__SKIP__%') THEN
        RAISE EXCEPTION 'ASSERTION 2.6 FAILED: update_my_profile() MUST support __SKIP__ defaults!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 2.7 handle_new_user() security
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND prosecdef = true) THEN
        RAISE EXCEPTION 'ASSERTION 2.7 FAILED: handle_new_user() MUST be SECURITY DEFINER!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- -------------------------------------------------------------------------
    -- 3. RLS & PERMISSIONS (6 Assertions)
    -- -------------------------------------------------------------------------
    -- 3.1 conversation_participants INSERT revoked
    IF has_table_privilege('authenticated', 'public.conversation_participants', 'INSERT') THEN
        RAISE EXCEPTION 'ASSERTION 3.1 FAILED: Direct INSERT on conversation_participants MUST BE REVOKED!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 3.2 reports INSERT enforced (reporter_id = auth.uid())
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND cmd = 'INSERT' AND with_check LIKE '%reporter_id = auth.uid()%') THEN
        RAISE EXCEPTION 'ASSERTION 3.2 FAILED: reports policy MUST enforce reporter_id!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 3.3 messages sender_id enforced
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND cmd = 'INSERT' AND with_check LIKE '%auth.uid() = sender_id%') THEN
        RAISE EXCEPTION 'ASSERTION 3.3 FAILED: messages policy MUST enforce sender_id!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 3.4 FORCE RLS check (All core tables)
    SELECT count(*) INTO v_int_val FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relforcerowsecurity = true;
    IF v_int_val < 13 THEN
        RAISE EXCEPTION 'ASSERTION 3.4 FAILED: FORCE RLS MUST be on at least 13 tables! Found: %', v_int_val;
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 3.5 storage.objects RLS check
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'INSERT') THEN
        RAISE EXCEPTION 'ASSERTION 3.5 FAILED: Storage policies MUST exist!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 3.6 is_admin() execute grant
    IF NOT has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE') THEN
        RAISE EXCEPTION 'ASSERTION 3.6 FAILED: authenticated MUST have EXECUTE on is_admin()!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- -------------------------------------------------------------------------
    -- 4. DATASET & INTEGRITY (6 Assertions)
    -- -------------------------------------------------------------------------
    -- 4.1 Wilaya count (69)
    SELECT count(*) INTO v_int_val FROM public.wilayas;
    IF v_int_val <> 69 THEN
        RAISE EXCEPTION 'ASSERTION 4.1 FAILED: wilayas count MUST be 69! Found: %', v_int_val;
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 4.2 Commune count (1,541)
    SELECT count(*) INTO v_int_val FROM public.communes;
    IF v_int_val <> 1541 THEN
        RAISE EXCEPTION 'ASSERTION 4.2 FAILED: communes count MUST be 1541! Found: %', v_int_val;
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 4.3 Commune FK validity
    IF EXISTS (SELECT 1 FROM public.communes WHERE wilaya_id NOT IN (SELECT id FROM public.wilayas)) THEN
        RAISE EXCEPTION 'ASSERTION 4.3 FAILED: Found communes with invalid wilaya_id!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 4.4 Category count (5)
    SELECT count(*) INTO v_int_val FROM public.categories;
    IF v_int_val < 5 THEN
        RAISE EXCEPTION 'ASSERTION 4.4 FAILED: categories count MUST be at least 5!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 4.5 wilayas Arabic name check
    IF NOT EXISTS (SELECT 1 FROM public.wilayas WHERE name_ar = 'الجزائر' AND id = 16) THEN
        RAISE EXCEPTION 'ASSERTION 4.5 FAILED: Wilaya 16 (Alger) seed data mismatch!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 4.6 communes postal code presence
    IF NOT EXISTS (SELECT 1 FROM public.communes WHERE postal_code IS NOT NULL) THEN
        RAISE EXCEPTION 'ASSERTION 4.6 FAILED: Communes MUST have postal codes!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- -------------------------------------------------------------------------
    -- 5. CONSTRAINTS & INDEXES (4 Assertions)
    -- -------------------------------------------------------------------------
    -- 5.1 profiles.email uniqueness
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key' OR (contype = 'u' AND conname LIKE '%email%')) THEN
        -- Check if it's a unique index instead
        IF NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON i.indexrelid = c.oid WHERE c.relname LIKE '%profiles_email%' AND i.indisunique = true) THEN
           RAISE EXCEPTION 'ASSERTION 5.1 FAILED: profiles.email MUST be unique!';
        END IF;
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 5.2 conversation_participants PK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_participants_pkey') THEN
        RAISE EXCEPTION 'ASSERTION 5.2 FAILED: conversation_participants MUST have a PK!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 5.3 posts GIN index for search
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_am a ON c.relam = a.oid WHERE c.relname LIKE '%posts_search%' AND a.amname = 'gin') THEN
        RAISE EXCEPTION 'ASSERTION 5.3 FAILED: posts table MUST have a GIN search index!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    -- 5.4 wilayas code uniqueness
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%wilayas_code_key%') THEN
        RAISE EXCEPTION 'ASSERTION 5.4 FAILED: wilayas.code MUST be unique!';
    END IF;
    v_assertion_count := v_assertion_count + 1;

    RAISE NOTICE '=== ALL % ASSERTIONS PASSED SUCCESSFULLY ===', v_assertion_count;
END $$;
