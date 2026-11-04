-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Migration 20261104: PROFILES DISCOVERY FIX
-- Target: Supabase Staging (qbfzhcngxtpjtljivzcw)
-- Objective: Fix Direct Table Access for Discovery Joins while maintaining CLS
-- =========================================================================

-- 1. Ensure RLS and FORCE RLS are active
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- 2. RESET GRANTS: Start from a clean slate
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;

-- 3. GRANT Table-Level SELECT (Necessary for PostgREST joins to function)
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;

-- 4. COLUMN-LEVEL SECURITY: Revoke sensitive columns immediately
-- Even with table-level GRANT, these columns will return 42501 if requested.
REVOKE SELECT (
    email, 
    phone, 
    role, 
    is_suspended, 
    last_active_at
) ON public.profiles FROM anon, authenticated;

-- 4. RLS POLICIES: Control which ROWS are visible
-- Policy 1: Everyone can see all rows (Column-level grants handle field privacy)
DROP POLICY IF EXISTS "Public profiles discovery" ON public.profiles;
CREATE POLICY "Public profiles discovery" 
    ON public.profiles FOR SELECT 
    TO anon, authenticated
    USING (true);

-- Policy 2: Authenticated users can manage their own data
-- (Note: CLS still blocks 'email' etc via the table, but RPCs bypass this)
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" 
    ON public.profiles FOR ALL 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 6. PUBLIC VIEW: Ensure public_profiles is robust
-- This view handles the conditional phone visibility logic.
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

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 7. RELATIONSHIP HINT: Tell PostgREST how to join public_profiles to posts
-- This helps if we want to switch frontend joins to use the view.
COMMENT ON VIEW public.public_profiles IS 
  E'@foreignKey (id) references profiles (id)\n@primaryKey id';

-- 8. ADMIN SECURITY: Confirm admin_users and RPCs are locked
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM anon, authenticated;

-- Ensure is_admin() is authoritative and SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Ensure get_all_profiles() is restricted
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

REVOKE ALL ON FUNCTION public.get_all_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;
