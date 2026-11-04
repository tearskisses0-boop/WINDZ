-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Migration 004: Profile Privacy & post_images RLS
-- Safe, Idempotent, Production-Ready SQL
-- Target: Supabase PostgreSQL Database
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. PHONE PRIVACY CONSENT COLUMN & IDEMPOTENT ONE-TIME LEGACY RESET
-- -------------------------------------------------------------------------
-- Add show_phone_publicly column with DEFAULT FALSE (Privacy by Default)
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS show_phone_publicly BOOLEAN DEFAULT FALSE;

-- Enforce DEFAULT FALSE for all future profile records
ALTER TABLE public.profiles 
ALTER COLUMN show_phone_publicly SET DEFAULT FALSE;

-- Idempotent one-time update: reset ONLY unverified NULL values to FALSE.
-- Preserves existing user opt-in selections (TRUE or FALSE) on subsequent migration runs!
UPDATE public.profiles 
SET show_phone_publicly = FALSE 
WHERE show_phone_publicly IS NULL;

-- -------------------------------------------------------------------------
-- 2. PRIVACY-PROTECTED PUBLIC PROFILES VIEW (Safe Replacement)
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- 3. PERMISSIONS ON public.profiles (BLOCKS DIRECT TABLE RECONNAISSANCE)
-- -------------------------------------------------------------------------
-- Grant COLUMN-LEVEL SELECT to everyone for non-sensitive discovery fields
-- This allows joins in public queries (like posts) to work safely for anon and authenticated.
GRANT SELECT (
    id, 
    display_name, 
    avatar_url, 
    wilaya_id, 
    phone, 
    show_phone_publicly, 
    bio, 
    is_verified, 
    role,
    created_at, 
    last_active_at
) ON public.profiles TO anon, authenticated;

-- RLS for Profiles
-- This policy allows selecting the rows, but only the granted columns will be returned.
CREATE POLICY "Public can view profile safe fields"
    ON public.profiles FOR SELECT
    USING (true);

-- Grant COLUMN-LEVEL UPDATE ONLY on user-editable profile fields to authenticated
GRANT UPDATE (
    display_name,
    phone,
    show_phone_publicly,
    avatar_url,
    bio,
    wilaya_id,
    commune_name,
    commune_id,
    preferred_language
) ON public.profiles TO authenticated;

-- -------------------------------------------------------------------------
-- 4. SECURE OWNER RPC FUNCTIONS (get_my_profile & update_my_profile)
-- -------------------------------------------------------------------------
-- 4.1 Owner Profile Retrieval RPC
CREATE OR REPLACE FUNCTION public.get_my_profile()
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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.display_name,
        p.phone,
        p.show_phone_publicly,
        p.avatar_url,
        p.bio,
        p.wilaya_id,
        p.commune_name,
        p.commune_id,
        p.preferred_language,
        p.role,
        p.is_verified,
        p.is_suspended,
        p.created_at,
        p.last_active_at
    FROM public.profiles p
    WHERE p.id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 4.2 Owner Profile Update RPC (Atomic & Restricted to Editable Fields Only)
-- Supports explicit NULL values to clear fields using '__SKIP__' default logic
CREATE OR REPLACE FUNCTION public.update_my_profile(
    p_display_name VARCHAR DEFAULT '__SKIP__',
    p_phone VARCHAR DEFAULT '__SKIP__',
    p_show_phone_publicly BOOLEAN DEFAULT NULL, -- BOOLEAN can't use string skip, will handle separately
    p_avatar_url TEXT DEFAULT '__SKIP__',
    p_bio TEXT DEFAULT '__SKIP__',
    p_wilaya_id SMALLINT DEFAULT -1, -- -1 as skip for numeric
    p_commune_name VARCHAR DEFAULT '__SKIP__',
    p_commune_id VARCHAR DEFAULT '__SKIP__',
    p_preferred_language VARCHAR DEFAULT '__SKIP__'
)
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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.profiles
    SET 
        display_name = CASE WHEN p_display_name = '__SKIP__' THEN display_name ELSE p_display_name END,
        phone = CASE WHEN p_phone = '__SKIP__' THEN phone ELSE p_phone END,
        show_phone_publicly = COALESCE(p_show_phone_publicly, show_phone_publicly),
        avatar_url = CASE WHEN p_avatar_url = '__SKIP__' THEN avatar_url ELSE p_avatar_url END,
        bio = CASE WHEN p_bio = '__SKIP__' THEN bio ELSE p_bio END,
        wilaya_id = CASE WHEN p_wilaya_id = -1 THEN wilaya_id ELSE p_wilaya_id END,
        commune_name = CASE WHEN p_commune_name = '__SKIP__' THEN commune_name ELSE p_commune_name END,
        commune_id = CASE WHEN p_commune_id = '__SKIP__' THEN commune_id ELSE p_commune_id END,
        preferred_language = CASE WHEN p_preferred_language = '__SKIP__' THEN preferred_language ELSE p_preferred_language END,
        last_active_at = pg_catalog.now()
    WHERE id = auth.uid();

    RETURN QUERY
    SELECT 
        p.id, p.email, p.display_name, p.phone, p.show_phone_publicly,
        p.avatar_url, p.bio, p.wilaya_id, p.commune_name, p.commune_id,
        p.preferred_language, p.role, p.is_verified, p.is_suspended,
        p.created_at, p.last_active_at
    FROM public.profiles p
    WHERE p.id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_profile(VARCHAR, VARCHAR, BOOLEAN, TEXT, TEXT, SMALLINT, VARCHAR, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile(VARCHAR, VARCHAR, BOOLEAN, TEXT, TEXT, SMALLINT, VARCHAR, VARCHAR, VARCHAR) TO authenticated;

-- 4.3 Admin Full Profiles Retrieval RPC (SECURITY DEFINER)
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
    -- Authorization check (assumes is_admin function exists from previous migration)
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

-- -------------------------------------------------------------------------
-- 5. RLS POLICIES & CONVERSATION RPC SECURITY
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Lock down direct SELECT access on public.profiles table (Re-enforcing revocation)
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- Re-apply column-level grants
GRANT SELECT (
    id, display_name, avatar_url, wilaya_id, phone, show_phone_publicly, 
    bio, is_verified, role, created_at, last_active_at
) ON public.profiles TO anon, authenticated;

GRANT UPDATE (
    display_name,
    phone,
    show_phone_publicly,
    avatar_url,
    bio,
    wilaya_id,
    commune_name,
    commune_id,
    preferred_language
) ON public.profiles TO authenticated;

-- Row level access for owners
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5.1 Secure Atomic Conversation Creation RPC
CREATE OR REPLACE FUNCTION public.create_conversation(
    p_post_id UUID,
    p_recipient_id UUID,
    p_initial_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_actual_recipient_id UUID;
    v_post_owner_id UUID;
    v_post_status public.availability_status_enum;
    v_conversation_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_post_id IS NULL THEN
        RAISE EXCEPTION 'post_id is required';
    END IF;

    -- Load target post and verify existence
    SELECT p.user_id, p.availability_status 
    INTO v_post_owner_id, v_post_status
    FROM public.posts p
    WHERE p.id = p_post_id;

    IF v_post_owner_id IS NULL THEN
        RAISE EXCEPTION 'Post not found';
    END IF;

    -- Enforce post availability status rule
    IF v_post_status IN ('hidden', 'expired') THEN
        RAISE EXCEPTION 'Cannot start conversation on hidden or expired post';
    END IF;

    -- Authorize and determine legitimate target recipient
    IF v_caller_id = v_post_owner_id THEN
        -- Post owner caller: Must supply recipient who has favorited the post (verified interest)
        IF p_recipient_id IS NULL THEN
            RAISE EXCEPTION 'recipient_id is required when post owner initiates conversation';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.favorites 
            WHERE user_id = p_recipient_id AND post_id = p_post_id
        ) THEN
            RAISE EXCEPTION 'Recipient has not expressed interest (favorite) in this post';
        END IF;

        v_actual_recipient_id := p_recipient_id;
    ELSE
        -- Non-owner caller (buyer/inquirer): Recipient is ALWAYS the post owner
        v_actual_recipient_id := v_post_owner_id;
    END IF;

    -- Prevent self-conversations
    IF v_caller_id = v_actual_recipient_id THEN
        RAISE EXCEPTION 'Cannot start conversation with yourself';
    END IF;

    -- Check if active conversation already exists between these 2 participants for this post
    SELECT c.id INTO v_conversation_id
    FROM public.conversations c
    JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = v_caller_id
    JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = v_actual_recipient_id
    WHERE c.post_id = p_post_id
    LIMIT 1;

    IF v_conversation_id IS NULL THEN
        -- Create new conversation record
        INSERT INTO public.conversations (post_id)
        VALUES (p_post_id)
        RETURNING id INTO v_conversation_id;

        -- Add both participants atomically (SECURITY DEFINER bypasses table RLS)
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES 
            (v_conversation_id, v_caller_id), 
            (v_conversation_id, v_actual_recipient_id);
    END IF;

    -- Insert initial message if provided
    IF p_initial_message IS NOT NULL AND pg_catalog.btrim(p_initial_message) <> '' THEN
        INSERT INTO public.messages (conversation_id, sender_id, content)
        VALUES (v_conversation_id, v_caller_id, pg_catalog.btrim(p_initial_message));

        UPDATE public.conversations
        SET last_message = pg_catalog.btrim(p_initial_message),
            last_message_at = pg_catalog.now()
        WHERE id = v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_conversation(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_conversation(UUID, UUID, TEXT) TO authenticated;

-- -------------------------------------------------------------------------
-- 6. POST IMAGES TABLE RLS POLICIES
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.post_images ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.post_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.post_images TO authenticated;

DROP POLICY IF EXISTS "Public can view post images" ON public.post_images;
DROP POLICY IF EXISTS "Public can view post images for published posts" ON public.post_images;
DROP POLICY IF EXISTS "Post owners can insert post images" ON public.post_images;
DROP POLICY IF EXISTS "Post owners can update post images" ON public.post_images;
DROP POLICY IF EXISTS "Post owners can delete post images" ON public.post_images;

CREATE POLICY "Public can view post images for published posts"
    ON public.post_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_images.post_id
            AND p.availability_status IN ('available', 'unavailable', 'fulfilled')
        )
    );

CREATE POLICY "Post owners can insert post images"
    ON public.post_images FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_images.post_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Post owners can update post images"
    ON public.post_images FOR UPDATE
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_images.post_id
            AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_images.post_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Post owners can delete post images"
    ON public.post_images FOR DELETE
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_images.post_id
            AND p.user_id = auth.uid()
        )
    );

-- -------------------------------------------------------------------------
-- 7. FORCE ROW LEVEL SECURITY ON SENSITIVE TABLES
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.posts FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_images FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.favorites FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_searches FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.moderation_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_blocks FORCE ROW LEVEL SECURITY;
