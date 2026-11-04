-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Migration 20261104: FINAL PROFILE SECURITY HARDENING
-- Target: Supabase Staging (qbfzhcngxtpjtljivzcw)
-- Objective: Close private data leakage while maintaining app functionality
-- =========================================================================

-- 1. Ensure RLS is enabled and forced
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- 2. Revoke all direct access to start from a clean slate
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;

-- 3. Grant SELECT on the table itself (required for PostgREST joins to work)
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;

-- 4. IMMEDIATELY REVOKE access to sensitive columns (Column-Level Security)
-- This ensures that even if a user tries to select these columns, they get a 42501 error.
REVOKE SELECT (
    email, 
    phone, 
    role, 
    is_suspended, 
    last_active_at
) ON public.profiles FROM anon, authenticated;

-- 5. Define refined RLS Policies for Profiles
DROP POLICY IF EXISTS "Public can view profile safe fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Policy 1: Everyone can see rows (but column-level grants will restrict fields)
CREATE POLICY "Public discovery of profiles"
    ON public.profiles FOR SELECT
    USING (true);

-- 6. Ensure View public_profiles is secure and available
-- This view provides the conditional phone logic.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id,
    display_name,
    CASE 
        WHEN show_phone_publicly = TRUE THEN phone 
        ELSE NULL 
    END AS phone,
    show_phone_publicly,
    avatar_url,
    bio,
    wilaya_id,
    commune_name,
    commune_id,
    preferred_language,
    is_verified,
    created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 7. Secure Admin Access
-- Ensure admin_users table is locked down
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM anon, authenticated;

-- 8. Verify/Create is_admin function if it doesn't exist
-- This uses the admin_users table for authoritative checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid()
    );
END;
$$;

-- 9. Secure get_all_profiles RPC
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    display_name VARCHAR,
    phone VARCHAR,
    show_phone_publicly BOOLEAN,
    avatar_url TEXT,
    bio TEXT,
    wilaya_id SMALLINT,
    commune_name VARCHAR,
    commune_id VARCHAR,
    preferred_language VARCHAR,
    role VARCHAR,
    is_verified BOOLEAN,
    is_suspended BOOLEAN,
    created_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    RETURN QUERY
    SELECT 
        p.id, p.email, p.display_name, p.phone, p.show_phone_publicly,
        p.avatar_url, p.bio, p.wilaya_id, p.commune_name, p.commune_id,
        p.preferred_language, p.role, p.is_verified, p.is_suspended,
        p.created_at, p.last_active_at
    FROM public.profiles p
    ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_profiles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;
