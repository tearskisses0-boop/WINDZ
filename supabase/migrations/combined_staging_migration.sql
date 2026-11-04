-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Phase 4.11 FINAL Combined Migration Script
-- Consolidated Schema, RLS, RPCs, Storage & Algerian Dataset
-- Target Database: STAGING (qbfzhcngxtpjtljivzcw) ONLY
-- =========================================================================

-- >>> BEGIN FILE: supabase/migrations/20261103000000_win_dz_schema.sql <<<
-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Official Database Schema Migration
-- Complete PostgreSQL Schema with 16 Tables, RLS Policies, Indexes & Triggers
-- =========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -------------------------------------------------------------------------
-- 1. WILAYAS TABLE (69 Algerian Wilayas)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wilayas (
    id SMALLINT PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,
    name_ar VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    region VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 2. COMMUNES TABLE (Verified Algerian Communes)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS communes (
    id VARCHAR(10) PRIMARY KEY,
    wilaya_id SMALLINT NOT NULL REFERENCES wilayas(id) ON DELETE RESTRICT,
    name_ar VARCHAR(120) NOT NULL,
    name_fr VARCHAR(120) NOT NULL,
    name_en VARCHAR(120) NOT NULL,
    postal_code VARCHAR(10),
    is_seat BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communes_wilaya ON communes(wilaya_id);

-- -------------------------------------------------------------------------
-- 3. PROFILES TABLE (Supabase Auth Users Sync)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    phone VARCHAR(30),
    avatar_url TEXT,
    bio TEXT,
    wilaya_id SMALLINT REFERENCES wilayas(id) ON DELETE SET NULL,
    commune_name VARCHAR(120),
    commune_id VARCHAR(10),
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'fr', 'en')),
    show_phone_publicly BOOLEAN NOT NULL DEFAULT FALSE,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_wilaya ON profiles(wilaya_id);

-- -------------------------------------------------------------------------
-- 4. CATEGORIES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(120) NOT NULL,
    name_fr VARCHAR(120) NOT NULL,
    name_en VARCHAR(120) NOT NULL,
    description_ar TEXT,
    description_fr TEXT,
    description_en TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'Package',
    color VARCHAR(20) NOT NULL DEFAULT '#0d9488',
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 5. POSTS TABLE (NEED and OFFER Listings)
-- -------------------------------------------------------------------------
CREATE TYPE post_type_enum AS ENUM ('NEED', 'OFFER');
CREATE TYPE availability_status_enum AS ENUM ('available', 'unavailable', 'fulfilled', 'expired', 'hidden');
CREATE TYPE contact_preference_enum AS ENUM ('chat_only', 'phone_allowed');

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    post_type post_type_enum NOT NULL,
    category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory_id VARCHAR(50),
    wilaya_id SMALLINT NOT NULL REFERENCES wilayas(id) ON DELETE RESTRICT,
    commune_id VARCHAR(10) REFERENCES communes(id) ON DELETE SET NULL,
    commune_name VARCHAR(120),
    price NUMERIC(12, 2) CHECK (price >= 0),
    budget_max NUMERIC(12, 2) CHECK (budget_max >= 0),
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    availability_status availability_status_enum NOT NULL DEFAULT 'available',
    contact_preference contact_preference_enum NOT NULL DEFAULT 'chat_only',
    condition VARCHAR(50),
    last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    views_count INTEGER NOT NULL DEFAULT 0,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full text search and composite discovery indexes
CREATE INDEX IF NOT EXISTS idx_posts_type_status ON posts(post_type, availability_status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id, availability_status);
CREATE INDEX IF NOT EXISTS idx_posts_wilaya ON posts(wilaya_id, availability_status);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN(to_tsvector('simple', title || ' ' || description));

-- -------------------------------------------------------------------------
-- 6. POST IMAGES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);

-- -------------------------------------------------------------------------
-- 7. CONVERSATIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    last_message TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 8. CONVERSATION PARTICIPANTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);

-- -------------------------------------------------------------------------
-- 9. MESSAGES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);

-- -------------------------------------------------------------------------
-- 10. FAVORITES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- -------------------------------------------------------------------------
-- 11. NOTIFICATIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    related_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    related_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- -------------------------------------------------------------------------
-- 12. SAVED SEARCHES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    query VARCHAR(255),
    post_type post_type_enum,
    category_id VARCHAR(50) REFERENCES categories(id) ON DELETE SET NULL,
    wilaya_id SMALLINT REFERENCES wilayas(id) ON DELETE SET NULL,
    is_free BOOLEAN,
    notify_on_new_match BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 13. CONTENT REPORTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reporter_name VARCHAR(120),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
    admin_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- -------------------------------------------------------------------------
-- 14. ADMIN USERS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 15. MODERATION ACTIONS AUDIT LOG TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    admin_name VARCHAR(120) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 16. USER BLOCKS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 1. Posts RLS
CREATE POLICY "Public visitors can view active posts"
    ON posts FOR SELECT
    USING (availability_status NOT IN ('hidden', 'expired') OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create posts"
    ON posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
    ON posts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
    ON posts FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Profiles Security & View
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- Grant COLUMN-LEVEL SELECT to everyone for non-sensitive discovery fields
-- This allows joins in public queries (like posts) to work safely for anon and authenticated.
GRANT SELECT (
    id, 
    display_name, 
    avatar_url, 
    wilaya_id, 
    show_phone_publicly, 
    bio, 
    is_verified, 
    created_at, 
    last_active_at
) ON public.profiles TO anon, authenticated;

-- RLS for Profiles
-- This policy allows selecting the rows, but only the granted columns will be returned.
CREATE POLICY "Public can view profile safe fields"
    ON public.profiles FOR SELECT
    USING (true);

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
    created_at,
    last_active_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- RLS Policies for SELECT
-- Note: is_admin() check might need to be defined before this, 
-- but in Supabase policies can be created even if the function doesn't exist yet (late binding).
-- However, for combined migration reliability, we ensure is_admin() is available or use EXISTS.

-- Users can view own profile (Full row access for owner)
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 3. Messages & Conversations RLS Helper Function (Bypasses Table RLS Recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
    p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.conversation_participants
        WHERE conversation_id = p_conversation_id 
          AND user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_conversation_participant(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID) TO authenticated;

-- 3. Messages & Conversations RLS Policies
REVOKE ALL ON TABLE public.conversations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.conversations TO authenticated;

CREATE POLICY "Participants can view their conversations"
    ON conversations FOR SELECT
    USING (public.is_conversation_participant(id));

REVOKE ALL ON TABLE public.conversation_participants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.conversation_participants TO authenticated;

CREATE POLICY "Participants can view conversation participants"
    ON conversation_participants FOR SELECT
    USING (public.is_conversation_participant(conversation_id));

-- Note: INSERT on conversation_participants is restricted to SECURITY DEFINER RPCs only.

REVOKE ALL ON TABLE public.messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;

CREATE POLICY "Participants can read messages"
    ON messages FOR SELECT
    USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "Participants can send messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id AND public.is_conversation_participant(conversation_id));

-- 4. Notifications RLS
REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

CREATE POLICY "Users can read own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- 5. Favorites RLS
REVOKE ALL ON TABLE public.favorites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;

CREATE POLICY "Users can manage their own favorites"
    ON favorites FOR ALL
    USING (auth.uid() = user_id);

-- 6. Saved Searches RLS
REVOKE ALL ON TABLE public.saved_searches FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;

CREATE POLICY "Users can manage their own saved searches"
    ON saved_searches FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. User Blocks RLS
REVOKE ALL ON TABLE public.user_blocks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_blocks TO authenticated;

CREATE POLICY "Users can manage blocks"
    ON user_blocks FOR ALL
    USING (auth.uid() = blocker_id);

-- 8. Admin and Moderation RLS
REVOKE ALL ON TABLE public.reports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.reports TO authenticated;

CREATE POLICY "Admins have full access to reports"
    ON reports FOR ALL
    USING (public.is_admin());

CREATE POLICY "Citizens can insert reports"
    ON reports FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND reporter_id = auth.uid()
        AND status = 'pending'
    );

-- 8.1 Admin Users Table RLS
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;

CREATE POLICY "Admins can view admin_users"
    ON public.admin_users FOR SELECT
    USING (public.is_admin());

-- 8.2 Admin Full Profiles Retrieval RPC (SECURITY DEFINER)
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

-- 9. Baseline Permissions for Public Reference Tables
GRANT SELECT ON public.wilayas TO anon, authenticated;
GRANT SELECT ON public.communes TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT SELECT ON public.post_images TO anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 10. Disable broad PUBLIC access by default (Privacy First)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;

-- <<< END FILE: supabase/migrations/20261103000000_win_dz_schema.sql <<<

-- >>> BEGIN FILE: supabase/migrations/20261103000001_storage_and_enhancements.sql <<<
-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Migration 002: Storage Policies & Schema Enhancements
-- Safe, Incremental, Idempotent Migration
-- =========================================================================

-- 1. Safely add commune_id to profiles for referential integrity
ALTER TABLE IF EXISTS profiles 
    ADD COLUMN IF NOT EXISTS commune_id VARCHAR(10) REFERENCES communes(id) ON DELETE SET NULL;

-- 2. Safely add images array to posts table for high-performance direct listing queries
ALTER TABLE IF EXISTS posts 
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 3. Safely add detailed search parameters to saved_searches
ALTER TABLE IF EXISTS saved_searches 
    ADD COLUMN IF NOT EXISTS commune_id VARCHAR(10) REFERENCES communes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS subcategory_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS filter_state JSONB;

-- 4. Server-Side Admin Authorization Helper Function (Zero Trust on Client Role)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 5. Hardened Server-Side RLS for Admin Operations
DROP POLICY IF EXISTS "Admins have full access to reports" ON reports;
CREATE POLICY "Admins have full access to reports"
    ON reports FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view audit logs" ON moderation_actions;
CREATE POLICY "Admins can view audit logs"
    ON moderation_actions FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON moderation_actions;
CREATE POLICY "Admins can insert audit logs"
    ON moderation_actions FOR INSERT
    WITH CHECK (public.is_admin());

-- 6. Supabase Storage Setup for 'post-images' Bucket
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        -- Create bucket if not exists
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'post-images', 
            'post-images', 
            true, 
            5242880, -- 5 MB limit
            ARRAY['image/jpeg', 'image/png', 'image/webp']
        )
        ON CONFLICT (id) DO UPDATE SET 
            public = true,
            file_size_limit = 5242880,
            allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

        -- Storage RLS Policies
        DROP POLICY IF EXISTS "Public can view post images" ON storage.objects;
        CREATE POLICY "Public can view post images"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'post-images');

        DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
        CREATE POLICY "Authenticated users can upload post images"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'post-images' 
                AND auth.role() = 'authenticated'
            );

        DROP POLICY IF EXISTS "Users can update/delete their own post images" ON storage.objects;
        CREATE POLICY "Users can update/delete their own post images"
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'post-images' 
                AND auth.uid() = owner
            );
    END IF;
END $$;

-- <<< END FILE: supabase/migrations/20261103000001_storage_and_enhancements.sql <<<

-- >>> BEGIN FILE: supabase/migrations/20261103000002_fix_rls_and_triggers.sql <<<
-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Migration 003: Hardened Storage Security & Auth Trigger
-- Safe, Idempotent, Production-Ready SQL
-- Target: Supabase PostgreSQL Database
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. PUBLIC READ ACCESS TO REFERENCE TABLES (Unauthenticated Citizens)
-- -------------------------------------------------------------------------
-- Ensures all citizens can browse Algerian wilayas, communes, and categories without sign-in
ALTER TABLE IF EXISTS public.wilayas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view wilayas" ON public.wilayas;
CREATE POLICY "Public can view wilayas" 
    ON public.wilayas FOR SELECT 
    USING (true);

ALTER TABLE IF EXISTS public.communes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view communes" ON public.communes;
CREATE POLICY "Public can view communes" 
    ON public.communes FOR SELECT 
    USING (true);

ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" 
    ON public.categories FOR SELECT 
    USING (true);

-- -------------------------------------------------------------------------
-- 2. PROFILE INSERT POLICY FOR AUTHENTICATED USERS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- -------------------------------------------------------------------------
-- 3. HARDENED AUTOMATIC PROFILE CREATION TRIGGER (SECURITY DEFINER)
-- -------------------------------------------------------------------------
-- Security Features:
-- - SET search_path = '' (empty search path prevents search_path hijacking)
-- - Standard SQL keywords: SMALLINT, INTEGER, TEXT type declarations and casts
-- - Standard SQL expressions: NULLIF and COALESCE
-- - Explicit schema-qualification for ordinary built-in functions: pg_catalog.btrim, split_part, now
-- - Safe regex validation of wilaya_id metadata (1..69) before casting
-- - Preserves existing profile data on conflict (non-destructive)
-- - Atomic transaction: failure rolls back Auth to prevent orphaned/inconsistent records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_wilaya_id SMALLINT := 16; -- Default safely to Alger (16)
  v_raw_wilaya TEXT;
  v_display_name TEXT;
  v_phone TEXT;
  v_pref_lang TEXT;
BEGIN
  -- 1. Safely extract and validate wilaya_id from metadata before casting
  v_raw_wilaya := new.raw_user_meta_data->>'wilaya_id';
  IF v_raw_wilaya IS NOT NULL AND v_raw_wilaya ~ '^[0-9]+$' THEN
    IF (v_raw_wilaya::INTEGER BETWEEN 1 AND 69) THEN
      v_wilaya_id := v_raw_wilaya::SMALLINT;
    END IF;
  END IF;

  -- 2. Safely resolve metadata strings using valid PostgreSQL SQL expressions and functions
  v_display_name := NULLIF(pg_catalog.btrim(new.raw_user_meta_data->>'display_name'), '');
  IF v_display_name IS NULL THEN
    v_display_name := pg_catalog.split_part(new.email, '@', 1);
  END IF;

  v_phone := NULLIF(pg_catalog.btrim(new.raw_user_meta_data->>'phone'), '');
  v_pref_lang := COALESCE(NULLIF(pg_catalog.btrim(new.raw_user_meta_data->>'preferred_language'), ''), 'ar');

  -- 3. Atomic insert with non-destructive conflict handling
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    wilaya_id,
    phone,
    show_phone_publicly,
    role,
    preferred_language,
    created_at,
    last_active_at
  )
  VALUES (
    new.id,
    new.email,
    v_display_name,
    v_wilaya_id,
    v_phone,
    FALSE,
    'user',
    v_pref_lang,
    pg_catalog.now(),
    pg_catalog.now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name),
    wilaya_id = COALESCE(public.profiles.wilaya_id, EXCLUDED.wilaya_id),
    phone = COALESCE(NULLIF(public.profiles.phone, ''), EXCLUDED.phone),
    show_phone_publicly = COALESCE(public.profiles.show_phone_publicly, FALSE),
    last_active_at = pg_catalog.now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------------------
-- 4. SEED 5 ESSENTIAL CATEGORIES (Idempotent)
-- -------------------------------------------------------------------------
INSERT INTO public.categories (id, code, name_ar, name_fr, name_en, icon, color, sort_order)
VALUES 
    ('cat-products', 'products', 'المنتجات وقطع الغيار', 'Produits & Pièces détachées', 'Products & Spare Parts', 'Package', '#0284c7', 1),
    ('cat-services', 'services', 'الخدمات المهنية والمحلية', 'Services Professionnels & Locaux', 'Professional & Local Services', 'Wrench', '#0d9488', 2),
    ('cat-opportunities', 'opportunities', 'الفرص والتكوين المهني', 'Opportunités & Formation', 'Opportunities & Training', 'GraduationCap', '#6366f1', 3),
    ('cat-places', 'places', 'الأماكن والمرافق والمحلات', 'Lieux, Commerces & Infrastructures', 'Places, Shops & Facilities', 'MapPin', '#e11d48', 4),
    ('cat-community-help', 'community_help', 'المساعدة المجتمعية والتضامن', 'Entraide Communautaire & Solidarité', 'Community Assistance & Solidarity', 'HeartHandshake', '#16a34a', 5)
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name_ar = EXCLUDED.name_ar,
    name_fr = EXCLUDED.name_fr,
    name_en = EXCLUDED.name_en,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order;

-- -------------------------------------------------------------------------
-- 5. STORAGE BUCKET CONFIGURATION & HARDENED RLS POLICIES (post-images)
-- -------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        -- 1. Create or safely configure bucket: Public reading, 5MB limit, JPEG/PNG/WebP only
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'post-images', 
            'post-images', 
            true, 
            5242880, 
            ARRAY['image/jpeg', 'image/png', 'image/webp']
        )
        ON CONFLICT (id) DO UPDATE SET 
            public = true,
            file_size_limit = 5242880,
            allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

        -- 2. Drop all previous policy variants to prevent permissive OR bypasses
        DROP POLICY IF EXISTS "Public can view post images" ON storage.objects;
        DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update/delete their own post images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update their own post images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;

        -- 3. Public image retrieval (Public can view images)
        CREATE POLICY "Public can view post images"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'post-images');

        -- 4. Authenticated image upload restricted to user's own folder (<user_id>/filename)
        CREATE POLICY "Authenticated users can upload post images"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'post-images' 
                AND auth.role() = 'authenticated'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );

        -- 5. Author image update restricted to file owner (both USING and WITH CHECK)
        CREATE POLICY "Users can update their own post images"
            ON storage.objects FOR UPDATE
            USING (
                bucket_id = 'post-images' 
                AND auth.role() = 'authenticated'
                AND (storage.foldername(name))[1] = auth.uid()::text
            )
            WITH CHECK (
                bucket_id = 'post-images' 
                AND auth.role() = 'authenticated'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );

        -- 6. Author image deletion restricted to file owner
        CREATE POLICY "Users can delete their own post images"
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'post-images' 
                AND auth.role() = 'authenticated'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;

-- <<< END FILE: supabase/migrations/20261103000002_fix_rls_and_triggers.sql <<<

-- >>> BEGIN FILE: supabase/migrations/20261103000003_secure_profiles_and_post_images.sql <<<
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

-- 3. PERMISSIONS ON public.profiles (Standardized above in section 2)

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

-- -------------------------------------------------------------------------
-- 5. RLS POLICIES & CONVERSATION RPC SECURITY
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Lock down direct SELECT access on public.profiles table
-- 2. Profiles Security (Redundant block removed, using standardized permissions from section 2 above)

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
ALTER TABLE IF EXISTS public.wilayas FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.communes FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories FORCE ROW LEVEL SECURITY;
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

-- <<< END FILE: supabase/migrations/20261103000003_secure_profiles_and_post_images.sql <<<

-- >>> BEGIN FILE: supabase/migrations/20261103000004_add_show_phone_publicly.sql <<<
-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Migration 005: Add show_phone_publicly Setting
-- Safe, Idempotent, Production-Ready SQL
-- Target: Supabase PostgreSQL Database
-- =========================================================================

-- 1. Add show_phone_publicly column to public.profiles if it does not exist (DEFAULT FALSE)
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS show_phone_publicly BOOLEAN DEFAULT FALSE;

-- Ensure default is set to FALSE
ALTER TABLE public.profiles 
ALTER COLUMN show_phone_publicly SET DEFAULT FALSE;

-- Idempotent one-time update: reset ONLY unverified NULL values to FALSE
UPDATE public.profiles 
SET show_phone_publicly = FALSE 
WHERE show_phone_publicly IS NULL;

-- 2. Update public.public_profiles view cleanly using CREATE OR REPLACE VIEW
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

-- <<< END FILE: supabase/migrations/20261103000004_add_show_phone_publicly.sql <<<

-- >>> BEGIN FILE: supabase/migrations/20261103000005_seed_wilayas_and_communes.sql <<<
-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Migration 006: Seed 69 Wilayas and 1,541 Communes
-- Safe, Idempotent, Complete Location Dataset
-- Target: Supabase PostgreSQL Database
-- =========================================================================

-- 1. SEED ALL 69 ALGERIAN WILAYAS
INSERT INTO public.wilayas (id, code, name_ar, name_fr, name_en, region)
VALUES
  (1, '01', 'أدرار', 'Adrar', 'Adrar', 'South'),
  (2, '02', 'الشلف', 'Chlef', 'Chlef', 'West'),
  (3, '03', 'الأغواط', 'Laghouat', 'Laghouat', 'Highlands'),
  (4, '04', 'أم البواقي', 'Oum El Bouaghi', 'Oum El Bouaghi', 'East'),
  (5, '05', 'باتنة', 'Batna', 'Batna', 'East'),
  (6, '06', 'بجاية', 'Bejaia', 'Bejaia', 'East'),
  (7, '07', 'بسكرة', 'Biskra', 'Biskra', 'South'),
  (8, '08', 'بشار', 'Bechar', 'Bechar', 'South'),
  (9, '09', 'البليدة', 'Blida', 'Blida', 'Center'),
  (10, '10', 'البويرة', 'Bouira', 'Bouira', 'Center'),
  (11, '11', 'تمنراست', 'Tamanrasset', 'Tamanrasset', 'South'),
  (12, '12', 'تبسة', 'Tebessa', 'Tebessa', 'East'),
  (13, '13', 'تلمسان', 'Tlemcen', 'Tlemcen', 'West'),
  (14, '14', 'تيارت', 'Tiaret', 'Tiaret', 'Highlands'),
  (15, '15', 'تيزي وزو', 'Tizi Ouzou', 'Tizi Ouzou', 'Center'),
  (16, '16', 'الجزائر', 'Alger', 'Alger', 'Center'),
  (17, '17', 'الجلفة', 'Djelfa', 'Djelfa', 'Highlands'),
  (18, '18', 'جيجل', 'Jijel', 'Jijel', 'East'),
  (19, '19', 'سطيف', 'Setif', 'Setif', 'East'),
  (20, '20', 'سعيدة', 'Saida', 'Saida', 'West'),
  (21, '21', 'سكيكدة', 'Skikda', 'Skikda', 'East'),
  (22, '22', 'سيدي بلعباس', 'Sidi Bel Abbes', 'Sidi Bel Abbes', 'West'),
  (23, '23', 'عنابة', 'Annaba', 'Annaba', 'East'),
  (24, '24', 'قالمة', 'Guelma', 'Guelma', 'East'),
  (25, '25', 'قسنطينة', 'Constantine', 'Constantine', 'East'),
  (26, '26', 'المدية', 'Medea', 'Medea', 'Center'),
  (27, '27', 'مستغانم', 'Mostaganem', 'Mostaganem', 'West'),
  (28, '28', 'المسيلة', 'M''Sila', 'M''Sila', 'Highlands'),
  (29, '29', 'معسكر', 'Mascara', 'Mascara', 'West'),
  (30, '30', 'ورقلة', 'Ouargla', 'Ouargla', 'South'),
  (31, '31', 'وهران', 'Oran', 'Oran', 'West'),
  (32, '32', 'البيض', 'El Bayadh', 'El Bayadh', 'Highlands'),
  (33, '33', 'إليزي', 'Illizi', 'Illizi', 'South'),
  (34, '34', 'برج بوعريريج', 'Bordj Bou Arreridj', 'Bordj Bou Arreridj', 'Highlands'),
  (35, '35', 'بومرداس', 'Boumerdes', 'Boumerdes', 'Center'),
  (36, '36', 'الطارف', 'El Tarf', 'El Tarf', 'East'),
  (37, '37', 'تندوف', 'Tindouf', 'Tindouf', 'South'),
  (38, '38', 'تسمسيلت', 'Tissemsilt', 'Tissemsilt', 'Highlands'),
  (39, '39', 'الوادي', 'El Oued', 'El Oued', 'South'),
  (40, '40', 'خنشلة', 'Khenchela', 'Khenchela', 'East'),
  (41, '41', 'سوق أهراس', 'Souk Ahras', 'Souk Ahras', 'East'),
  (42, '42', 'تيبازة', 'Tipaza', 'Tipaza', 'Center'),
  (43, '43', 'ميلة', 'Mila', 'Mila', 'East'),
  (44, '44', 'عين الدفلى', 'Ain Defla', 'Ain Defla', 'Center'),
  (45, '45', 'النعامة', 'Naama', 'Naama', 'Highlands'),
  (46, '46', 'عين تموشنت', 'Ain Temouchent', 'Ain Temouchent', 'West'),
  (47, '47', 'غرداية', 'Ghardaia', 'Ghardaia', 'South'),
  (48, '48', 'غليزان', 'Relizane', 'Relizane', 'West'),
  (49, '49', 'تيميمون', 'Timimoun', 'Timimoun', 'South'),
  (50, '50', 'برج باجي مختار', 'Bordj Badji Mokhtar', 'Bordj Badji Mokhtar', 'South'),
  (51, '51', 'أولاد جلال', 'Ouled Djellal', 'Ouled Djellal', 'South'),
  (52, '52', 'بني عباس', 'Beni Abbes', 'Beni Abbes', 'South'),
  (53, '53', 'عين صالح', 'In Salah', 'In Salah', 'South'),
  (54, '54', 'عين قزام', 'In Guezzam', 'In Guezzam', 'South'),
  (55, '55', 'تقرت', 'Touggourt', 'Touggourt', 'South'),
  (56, '56', 'جانت', 'Djanet', 'Djanet', 'South'),
  (57, '57', 'المغير', 'El M''Ghair', 'El M''Ghair', 'South'),
  (58, '58', 'المنيعة', 'El Meniaa', 'El Meniaa', 'South'),
  (59, '59', 'أفلو', 'Aflou', 'Aflou', 'Highlands'),
  (60, '60', 'بريكة', 'Barika', 'Barika', 'East'),
  (61, '61', 'القنطرة', 'El Kantara', 'El Kantara', 'East'),
  (62, '62', 'بئر العاتر', 'Bir El Ater', 'Bir El Ater', 'East'),
  (63, '63', 'العريشة', 'El Aricha', 'El Aricha', 'West'),
  (64, '64', 'قصر الشلالة', 'Ksar Chellala', 'Ksar Chellala', 'Highlands'),
  (65, '65', 'عين وسارة', 'Ain Oussara', 'Ain Oussara', 'Highlands'),
  (66, '66', 'مسعد', 'Messaad', 'Messaad', 'Highlands'),
  (67, '67', 'قصر البخاري', 'Ksar El Boukhari', 'Ksar El Boukhari', 'Center'),
  (68, '68', 'بوسعادة', 'Bou Saada', 'Bou Saada', 'Highlands'),
  (69, '69', 'الأبيض سيدي الشيخ', 'El Abiodh Sidi Cheikh', 'El Abiodh Sidi Cheikh', 'Highlands')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name_ar = EXCLUDED.name_ar,
  name_fr = EXCLUDED.name_fr,
  name_en = EXCLUDED.name_en,
  region = EXCLUDED.region;

-- 2. SEED ALL 1,541 ALGERIAN COMMUNES
INSERT INTO public.communes (id, wilaya_id, name_ar, name_fr, name_en, postal_code, is_seat)
VALUES
  ('0105', 1, 'تيمقتن', 'Timekten', 'Timekten', '01013', FALSE),
  ('0106', 1, 'تيت', 'Tit', 'Tit', '01006', FALSE),
  ('0107', 1, 'اقبلي', 'Akabli', 'Akabli', '01019', FALSE),
  ('0108', 1, 'أولف', 'Aoulef', 'Aoulef', '01012', FALSE),
  ('0109', 1, 'بودة', 'Bouda', 'Bouda', '01022', FALSE),
  ('0110', 1, 'أولاد أحمد تيمي', 'Ouled Ahmed Timmi', 'Ouled Ahmed Timmi', '01021', FALSE),
  ('0101', 1, 'أدرار', 'Adrar', 'Adrar', '01000', TRUE),
  ('0104', 1, 'فنوغيل', 'Fenoughil', 'Fenoughil', '01003', FALSE),
  ('0111', 1, 'تامست', 'Tamest', 'Tamest', '01002', FALSE),
  ('0112', 1, 'تامنطيط', 'Tamantit', 'Tamantit', '01000', FALSE),
  ('0113', 1, 'إن زغمير', 'In Zghmir', 'In Zghmir', '01005', FALSE),
  ('0103', 1, 'زاوية كنتة', 'Zaouiat Kounta', 'Zaouiat Kounta', '01008', FALSE),
  ('0102', 1, 'رقان', 'Reggane', 'Reggane', '01005', FALSE),
  ('0114', 1, 'سالي', 'Sali', 'Sali', '01018', FALSE),
  ('0115', 1, 'السبع', 'Sebaa', 'Sebaa', '01026', FALSE),
  ('0116', 1, 'تسابيت', 'Tsabit', 'Tsabit', '01008', FALSE),
  ('0205', 2, 'تلعصة', 'Talassa', 'Talassa', '02014', FALSE),
  ('0206', 2, 'تاجنة', 'Tadjena', 'Tadjena', '02005', FALSE),
  ('0207', 2, 'أبو الحسن', 'Abou El Hassane', 'Abou El Hassane', '02022', FALSE),
  ('0208', 2, 'الزبوجة', 'Zeboudja', 'Zeboudja', '02020', FALSE),
  ('0209', 2, 'بوزغاية', 'Bouzeghaia', 'Bouzeghaia', '02031', FALSE),
  ('0210', 2, 'بنايرية', 'Benairia', 'Benairia', '02003', FALSE),
  ('0211', 2, 'الحجاج', 'El Hadjadj', 'El Hadjadj', '27014', FALSE),
  ('0212', 2, 'أولاد بن عبد القادر', 'Ouled Ben Abdelkader', 'Ouled Ben Abdelkader', '02030', FALSE),
  ('0213', 2, 'عين مران', 'Ain Merane', 'Ain Merane', '02032', FALSE),
  ('0214', 2, 'الهرانفة', 'Herenfa', 'Herenfa', '02015', FALSE),
  ('0215', 2, 'بريرة', 'Breira', 'Breira', '02034', FALSE),
  ('0216', 2, 'بني حواء', 'Beni Haoua', 'Beni Haoua', '02007', FALSE),
  ('0217', 2, 'وادي قوسين', 'Oued Goussine', 'Oued Goussine', '02016', FALSE),
  ('0218', 2, 'أولاد عباس', 'Ouled Abbes', 'Ouled Abbes', '02018', FALSE),
  ('0219', 2, 'وادي الفضة', 'Oued Fodda', 'Oued Fodda', '02029', FALSE),
  ('0220', 2, 'بني راشد', 'Beni Rached', 'Beni Rached', '02013', FALSE),
  ('0221', 2, 'المرسى', 'El Marsa', 'El Marsa', '21038', FALSE),
  ('0222', 2, 'مصدق', 'Moussadek', 'Moussadek', '02026', FALSE),
  ('0201', 2, 'الشلف', 'Chlef', 'Chlef', '02000', TRUE),
  ('0223', 2, 'أم الدروع', 'Oum Drou', 'Oum Drou', '02033', FALSE),
  ('0224', 2, 'سنجاس', 'Sendjas', 'Sendjas', '02019', FALSE),
  ('0225', 2, 'سيدي عبد الرحمن', 'Sidi Abderrahmane', 'Sidi Abderrahmane', '14038', FALSE),
  ('0226', 2, 'سيدي عكاشة', 'Sidi Akkacha', 'Sidi Akkacha', '02011', FALSE),
  ('0227', 2, 'تنس', 'Tenes', 'Tenes', '02002', FALSE),
  ('0228', 2, 'بني بوعتاب', 'Beni  Bouattab', 'Beni  Bouattab', '02035', FALSE),
  ('0229', 2, 'الكريمية', 'El Karimia', 'El Karimia', '02004', FALSE),
  ('0230', 2, 'حرشون', 'Harchoun', 'Harchoun', '02009', FALSE),
  ('0231', 2, 'تاوقريت', 'Taougrit', 'Taougrit', '02006', FALSE),
  ('0232', 2, 'الظهرة', 'Dahra', 'Dahra', '02017', FALSE),
  ('0233', 2, 'الشطية', 'Chettia', 'Chettia', '02024', FALSE),
  ('0204', 2, 'أولاد فارس', 'Ouled Fares', 'Ouled Fares', '02011', FALSE),
  ('0234', 2, 'الأبيض مجاجة', 'Labiod Medjadja', 'Labiod Medjadja', '02028', FALSE),
  ('0203', 2, 'بوقادير', 'Boukadir', 'Boukadir', '02008', FALSE),
  ('0202', 2, 'واد سلي', 'Oued Sly', 'Oued Sly', '02013', FALSE),
  ('0235', 2, 'الصبحة', 'Sobha', 'Sobha', '02008', FALSE),
  ('0304', 3, 'تاجموت', 'Tadjemout', 'Tadjemout', '03008', FALSE),
  ('0305', 3, 'تاجرونة', 'Tadjrouna', 'Tadjrouna', '03018', FALSE),
  ('0306', 3, 'عين ماضي', 'Ain Madhi', 'Ain Madhi', '03000', FALSE),
  ('0307', 3, 'الحويطة', 'El Haouita', 'El Haouita', '03000', FALSE),
  ('0308', 3, 'الخنق', 'Kheneg', 'Kheneg', '03009', FALSE),
  ('0301', 3, 'الأغواط', 'Laghouat', 'Laghouat', '03000', TRUE),
  ('0302', 3, 'قصر الحيران', 'Ksar El Hirane', 'Ksar El Hirane', '03004', FALSE),
  ('0309', 3, 'بن ناصر بن شهرة', 'Benacer Benchohra', 'Benacer Benchohra', '03003', FALSE),
  ('0310', 3, 'العسافية', 'El Assafia', 'El Assafia', '03020', FALSE),
  ('0303', 3, 'سيدي مخلوف', 'Sidi Makhlouf', 'Sidi Makhlouf', '03012', FALSE),
  ('0311', 3, 'حاسي الدلاعة', 'Hassi Delaa', 'Hassi Delaa', '03005', FALSE),
  ('0312', 3, 'حاسي الرمل', 'Hassi R’Mel', 'Hassi R’Mel', '03006', FALSE),
  ('0403', 4, 'فكيرينة', 'Fkirina', 'Fkirina', '04016', FALSE),
  ('0404', 4, 'وادي نيني', 'Oued Nini', 'Oued Nini', '04023', FALSE),
  ('0405', 4, 'الفجوج بوغرارة سعودي', 'El Fedjoudj Boughrara Sa', 'El Fedjoudj Boughrara Sa', '04019', FALSE),
  ('0406', 4, 'عين فكرون', 'Ain Fekroun', 'Ain Fekroun', '04025', FALSE),
  ('0407', 4, 'الرحية', 'Rahia', 'Rahia', '04026', FALSE),
  ('0408', 4, 'مسكيانة', 'Meskiana', 'Meskiana', '04024', FALSE),
  ('0409', 4, 'البلالة', 'El Belala', 'El Belala', '04007', FALSE),
  ('0410', 4, 'بحير الشرقي', 'Behir Chergui', 'Behir Chergui', '04004', FALSE),
  ('0411', 4, 'قصر الصباحي', 'Ksar Sbahi', 'Ksar Sbahi', '04022', FALSE),
  ('0412', 4, 'سوق نعمان', 'Souk Naamane', 'Souk Naamane', '04017', FALSE),
  ('0413', 4, 'أولاد زواي', 'Ouled Zouai', 'Ouled Zouai', '04020', FALSE),
  ('0414', 4, 'بئر الشهداء', 'Bir Chouhada', 'Bir Chouhada', '04021', FALSE),
  ('0401', 4, 'أم البواقي', 'Oum El Bouaghi', 'Oum El Bouaghi', '04000', TRUE),
  ('0415', 4, 'عين الزيتون', 'Ain Zitoun', 'Ain Zitoun', '04027', FALSE),
  ('0416', 4, 'عين ببوش', 'Ain Babouche', 'Ain Babouche', '04008', FALSE),
  ('0417', 4, 'عين الديس', 'Ain Diss', 'Ain Diss', '04015', FALSE),
  ('0402', 4, 'عين البيضاء', 'Aïn Beïda', 'Aïn Beïda', '04200', FALSE),
  ('0418', 4, 'بريش', 'Berriche', 'Berriche', '04009', FALSE),
  ('0419', 4, 'الزرق', 'Zorg', 'Zorg', '04018', FALSE),
  ('0420', 4, 'عين مليلة', 'Ain M''lila', 'Ain M''lila', '04003', FALSE),
  ('0421', 4, 'أولاد قاسم', 'Ouled Gacem', 'Ouled Gacem', '04028', FALSE),
  ('0422', 4, 'أولاد حملة', 'Ouled Hamla', 'Ouled Hamla', '04010', FALSE),
  ('0423', 4, 'العامرية', 'El Amiria', 'El Amiria', '46019', FALSE),
  ('0424', 4, 'سيقوس', 'Sigus', 'Sigus', '04006', FALSE),
  ('0425', 4, 'الضلعة', 'Dhalaa', 'Dhalaa', '04011', FALSE),
  ('0426', 4, 'الجازية', 'El Djazia', 'El Djazia', '04014', FALSE),
  ('0427', 4, 'عين كرشة', 'Ain Kercha', 'Ain Kercha', '04012', FALSE),
  ('0428', 4, 'الحرملية', 'El Harmilia', 'El Harmilia', '04029', FALSE),
  ('0429', 4, 'هنشير تومغني', 'Hanchir Toumghani', 'Hanchir Toumghani', '04013', FALSE),
  ('0505', 5, 'معافة', 'Maafa', 'Maafa', '05003', FALSE),
  ('0502', 5, 'عين التوتة', 'Aïn Touta', 'Aïn Touta', '05008', FALSE),
  ('0506', 5, 'بني فضالة الحقانية', 'Beni Fedhala El Hakania', 'Beni Fedhala El Hakania', '05032', FALSE),
  ('0507', 5, 'أولاد عوف', 'Ouled Aouf', 'Ouled Aouf', '05040', FALSE),
  ('0508', 5, 'القصبات', 'Gosbat', 'Gosbat', '05039', FALSE),
  ('0509', 5, 'تالخمت', 'Talkhamt', 'Talkhamt', '05034', FALSE),
  ('0510', 5, 'رأس العيون', 'Ras El Aioun', 'Ras El Aioun', '05051', FALSE),
  ('0511', 5, 'الرحبات', 'Rahbat', 'Rahbat', '05025', FALSE),
  ('0512', 5, 'أولاد سلام', 'Ouled Sellem', 'Ouled Sellem', '05020', FALSE),
  ('0513', 5, 'القيقبة', 'Guigba', 'Guigba', '05010', FALSE),
  ('0514', 5, 'تيمقاد', 'Timgad', 'Timgad', '05050', FALSE),
  ('0515', 5, 'أولاد فاضل', 'Ouled Fadel', 'Ouled Fadel', '05049', FALSE),
  ('0516', 5, 'تاكسلانت', 'Taxlent', 'Taxlent', '05038', FALSE),
  ('0517', 5, 'أولاد سي سليمان', 'Ouled Si Slimane', 'Ouled Si Slimane', '05053', FALSE),
  ('0518', 5, 'لمسان', 'Lemsane', 'Lemsane', '05027', FALSE),
  ('0519', 5, 'ثنية العابد', 'Teniet El Abed', 'Teniet El Abed', '05047', FALSE),
  ('0520', 5, 'شير', 'Chir', 'Chir', '05052', FALSE),
  ('0521', 5, 'وادي الطاقة', 'Oued Taga', 'Oued Taga', '05048', FALSE),
  ('0501', 5, 'باتنة', 'Batna', 'Batna', '05000', TRUE),
  ('0522', 5, 'فسديس', 'Fesdis', 'Fesdis', '05023', FALSE),
  ('0523', 5, 'وادي الشعبة', 'Oued Chaaba', 'Oued Chaaba', '05037', FALSE),
  ('0524', 5, 'حيدوسة', 'Hidoussa', 'Hidoussa', '05046', FALSE),
  ('0525', 5, 'قصر بلزمة', 'Ksar Belezma', 'Ksar Belezma', '05028', FALSE),
  ('0503', 5, 'مروانة', 'Merouana', 'Merouana', '05004', FALSE),
  ('0526', 5, 'وادي الماء', 'Oued El Ma', 'Oued El Ma', '05033', FALSE),
  ('0527', 5, 'لازرو', 'Lazrou', 'Lazrou', '05058', FALSE),
  ('0528', 5, 'سريانة', 'Seriana', 'Seriana', '05005', FALSE),
  ('0529', 5, 'زانة البيضاء', 'Zana El Beida', 'Zana El Beida', '05054', FALSE),
  ('0530', 5, 'منعة', 'Menaa', 'Menaa', '28039', FALSE),
  ('0531', 5, 'تغرغار', 'Tigherghar', 'Tigherghar', '05021', FALSE),
  ('0532', 5, 'عين ياقوت', 'Ain Yagout', 'Ain Yagout', '05022', FALSE),
  ('0533', 5, 'بومية', 'Boumia', 'Boumia', '05059', FALSE),
  ('0534', 5, 'جرمة', 'Djerma', 'Djerma', '05013', FALSE),
  ('0535', 5, 'المعذر', 'Elmadher', 'Elmadher', '05007', FALSE),
  ('0536', 5, 'عيون العصافير', 'Ouyoun El Assafir', 'Ouyoun El Assafir', '05012', FALSE),
  ('0504', 5, 'تازولت', 'Tazoult', 'Tazoult', '05007', FALSE),
  ('0537', 5, 'بومقر', 'Boumagueur', 'Boumagueur', '05041', FALSE),
  ('0538', 5, 'نقاوس', 'N’Gaous', 'N’Gaous', '05009', FALSE),
  ('0539', 5, 'سفيان', 'Sefiane', 'Sefiane', '05024', FALSE),
  ('0540', 5, 'أريس', 'Arris', 'Arris', '05016', FALSE),
  ('0541', 5, 'تيغانمين', 'Tighanimine', 'Tighanimine', '05026', FALSE),
  ('0542', 5, 'عين جاسر', 'Ain Djasser', 'Ain Djasser', '05019', FALSE),
  ('0543', 5, 'الحاسي', 'El Hassi', 'El Hassi', '48033', FALSE),
  ('0544', 5, 'فم الطوب', 'Foum Toub', 'Foum Toub', '05031', FALSE),
  ('0545', 5, 'إشمول', 'Ichmoul', 'Ichmoul', '05030', FALSE),
  ('0546', 5, 'إينوغيسن', 'Inoughissene', 'Inoughissene', '05011', FALSE),
  ('0547', 5, 'بوزينة', 'Bouzina', 'Bouzina', '05035', FALSE),
  ('0548', 5, 'لارباع', 'Larbaa', 'Larbaa', '38016', FALSE),
  ('0549', 5, 'بولهيلات', 'Boulhilat', 'Boulhilat', '05060', FALSE),
  ('0550', 5, 'الشمرة', 'Chemora', 'Chemora', '05036', FALSE),
  ('0551', 5, 'غسيرة', 'Ghassira', 'Ghassira', '05002', FALSE),
  ('0552', 5, 'كيمل', 'Kimmel', 'Kimmel', '05017', FALSE),
  ('0553', 5, 'تكوت', 'T’Kout', 'T’Kout', '05044', FALSE),
  ('0605', 6, 'سيدي عياد', 'Sidi Ayad', 'Sidi Ayad', '06021', FALSE),
  ('0606', 6, 'الفلاي', 'Leflaye', 'Leflaye', '06043', FALSE),
  ('0604', 6, 'سيدي عيش', 'Sidi Aïch', 'Sidi Aïch', '06008', FALSE),
  ('0607', 6, 'تيفرة', 'Tifra', 'Tifra', '06014', FALSE),
  ('0608', 6, 'تينبدار', 'Tinebdar', 'Tinebdar', '06000', FALSE),
  ('0609', 6, 'برباشة', 'Barbacha', 'Barbacha', '06034', FALSE),
  ('0610', 6, 'كنديرة', 'Kendira', 'Kendira', '06013', FALSE),
  ('0611', 6, 'القصر', 'El Kseur', 'El Kseur', '06040', FALSE),
  ('0612', 6, 'فناية الماثن', 'Fenaia Il Maten', 'Fenaia Il Maten', '06000', FALSE),
  ('0613', 6, 'توجة', 'Toudja', 'Toudja', '06019', FALSE),
  ('0614', 6, 'ذراع القايد', 'Dra El Caid', 'Dra El Caid', '06045', FALSE),
  ('0615', 6, 'خراطة', 'Kherrata', 'Kherrata', '06044', FALSE),
  ('0601', 6, 'بجاية', 'Béjaïa', 'Béjaïa', '06000', TRUE),
  ('0616', 6, 'وادي غير', 'Oued Ghir', 'Oued Ghir', '06051', FALSE),
  ('0617', 6, 'بني معوش', 'Benimaouche', 'Benimaouche', '06050', FALSE),
  ('0618', 6, 'بني جليل', 'Beni Djellil', 'Beni Djellil', '06000', FALSE),
  ('0619', 6, 'فرعون', 'Feraoun', 'Feraoun', '06003', FALSE),
  ('0620', 6, 'سمعون', 'Smaoun', 'Smaoun', '06012', FALSE),
  ('0603', 6, 'أميزور', 'Amizour', 'Amizour', '06003', FALSE),
  ('0621', 6, 'تيمزريت', 'Timezrit', 'Timezrit', '06007', FALSE),
  ('0622', 6, 'مالبو', 'Melbou', 'Melbou', '06041', FALSE),
  ('0623', 6, 'سوق لإثنين', 'Souk El Tenine', 'Souk El Tenine', '06000', FALSE),
  ('0624', 6, 'تامريجت', 'Tamridjet', 'Tamridjet', '06046', FALSE),
  ('0625', 6, 'بوخليفة', 'Boukhelifa', 'Boukhelifa', '06048', FALSE),
  ('0626', 6, 'تالة حمزة', 'Tala Hamza', 'Tala Hamza', '06033', FALSE),
  ('0627', 6, 'تيشي', 'Tichy', 'Tichy', '06011', FALSE),
  ('0628', 6, 'أيت رزين', 'Ait R''zine', 'Ait R''zine', '06028', FALSE),
  ('0629', 6, 'إغيل علي', 'Ighil-Ali', 'Ighil-Ali', '06017', FALSE),
  ('0630', 6, 'أيت إسماعيل', 'Ait-Smail', 'Ait-Smail', '06047', FALSE),
  ('0631', 6, 'درقينة', 'Darguina', 'Darguina', '06020', FALSE),
  ('0632', 6, 'تاسكريوت', 'Taskriout', 'Taskriout', '06031', FALSE),
  ('0633', 6, 'أوقاس', 'Aokas', 'Aokas', '06022', FALSE),
  ('0634', 6, 'تيزي نبربر', 'Tizi-N''berber', 'Tizi-N''berber', '06049', FALSE),
  ('0635', 6, 'أدكار', 'Adekar', 'Adekar', '06024', FALSE),
  ('0636', 6, 'بني كسيلة', 'Beni K''sila', 'Beni K''sila', '06035', FALSE),
  ('0637', 6, 'تاوريرت إغيل', 'Taourit Ighil', 'Taourit Ighil', '06004', FALSE),
  ('0602', 6, 'أقبو', 'Akbou', 'Akbou', '06001', FALSE),
  ('0638', 6, 'شلاطة', 'Chellata', 'Chellata', '06005', FALSE),
  ('0639', 6, 'اغرم', 'Ighram', 'Ighram', '06015', FALSE),
  ('0640', 6, 'تامقرة', 'Tamokra', 'Tamokra', '06006', FALSE),
  ('0641', 6, 'أمالو', 'Amalou', 'Amalou', '06016', FALSE),
  ('0642', 6, 'بوحمزة', 'Bouhamza', 'Bouhamza', '06037', FALSE),
  ('0643', 6, 'مسيسنة', 'M''cisna', 'M''cisna', '06009', FALSE),
  ('0644', 6, 'صدوق', 'Seddouk', 'Seddouk', '06026', FALSE),
  ('0645', 6, 'بني مليكش', 'Beni-Mallikeche', 'Beni-Mallikeche', '06038', FALSE),
  ('0646', 6, 'بو جليل', 'Boudjellil', 'Boudjellil', '06052', FALSE),
  ('0647', 6, 'تازمالت', 'Tazmalt', 'Tazmalt', '06027', FALSE),
  ('0648', 6, 'أكفادو', 'Akfadou', 'Akfadou', '06042', FALSE),
  ('0649', 6, 'شميني', 'Chemini', 'Chemini', '06029', FALSE),
  ('0650', 6, 'سوق اوفلا', 'Souk Oufella', 'Souk Oufella', '06030', FALSE),
  ('0651', 6, 'طيبان', 'Tibane', 'Tibane', '06032', FALSE),
  ('0652', 6, 'أوزلاقن', 'Ouzellaguen', 'Ouzellaguen', '06036', FALSE),
  ('0704', 7, 'الفيض', 'El Feidh', 'El Feidh', '07016', FALSE),
  ('0705', 7, 'خنقة سيدي ناجي', 'Khangat Sidi Nadji', 'Khangat Sidi Nadji', '07000', FALSE),
  ('0706', 7, 'زريبة الوادي', 'Zeribet El Oued', 'Zeribet El Oued', '07015', FALSE),
  ('0707', 7, 'المزيرعة', 'Meziraa', 'Meziraa', '07028', FALSE),
  ('0708', 7, 'ليشانة', 'Lichana', 'Lichana', '07023', FALSE),
  ('0709', 7, 'بوشقرون', 'Bouchagroun', 'Bouchagroun', '07029', FALSE),
  ('0710', 7, 'برج بن عزوز', 'Bordj Ben Azzouz', 'Bordj Ben Azzouz', '07027', FALSE),
  ('0702', 7, 'طولقة', 'Tolga', 'Tolga', '07004', FALSE),
  ('0711', 7, 'مخادمة', 'Mekhadma', 'Mekhadma', '07030', FALSE),
  ('0712', 7, 'مليلي', 'M’Lili', 'M’Lili', '07025', FALSE),
  ('0713', 7, 'أورلال', 'Ourlal', 'Ourlal', '07024', FALSE),
  ('0714', 7, 'أوماش', 'Oumache', 'Oumache', '07002', FALSE),
  ('0715', 7, 'ليوة', 'Lioua', 'Lioua', '07022', FALSE),
  ('0701', 7, 'بسكرة', 'Biskra', 'Biskra', '07000', TRUE),
  ('0716', 7, 'الحاجب', 'El Hadjeb', 'El Hadjeb', '07032', FALSE),
  ('0717', 7, 'فوغالة', 'Foughala', 'Foughala', '07026', FALSE),
  ('0718', 7, 'الغروس', 'El Ghrous', 'El Ghrous', '29041', FALSE),
  ('0719', 7, 'عين الناقة', 'Ain Naga', 'Ain Naga', '07014', FALSE),
  ('0720', 7, 'شتمة', 'Chetma', 'Chetma', '07004', FALSE),
  ('0721', 7, 'الحوش', 'El Haouch', 'El Haouch', '07013', FALSE),
  ('0703', 7, 'سيدي عقبة', 'Sidi Okba', 'Sidi Okba', '07002', FALSE),
  ('0722', 7, 'مشونش', 'M’Chouneche', 'M’Chouneche', '07012', FALSE),
  ('0801', 8, 'بشار', 'Béchar', 'Béchar', '08000', TRUE),
  ('0804', 8, 'بوكايس', 'Boukais', 'Boukais', '08015', FALSE),
  ('0805', 8, 'لحمر', 'Lahmar', 'Lahmar', '08006', FALSE),
  ('0806', 8, 'موغل', 'Mogheul', 'Mogheul', '08016', FALSE),
  ('0807', 8, 'المريجة', 'Meridja', 'Meridja', '08004', FALSE),
  ('0802', 8, 'القنادسة', 'Kenadsa', 'Kenadsa', '08001', FALSE),
  ('0803', 8, 'تاغيت', 'Taghit', 'Taghit', '08003', FALSE),
  ('0808', 8, 'العبادلة', 'Abadla', 'Abadla', '08017', FALSE),
  ('0809', 8, 'عرق فراج', 'Erg-Ferradj', 'Erg-Ferradj', '08002', FALSE),
  ('0810', 8, 'مشرع هواري بومدين', 'Machraa-Houari-Boumediene', 'Machraa-Houari-Boumediene', '08000', FALSE),
  ('0811', 8, 'بني ونيف', 'Beni-Ounif', 'Beni-Ounif', '08021', FALSE),
  ('0812', 8, 'تبلبالة', 'Tabelbala', 'Tabelbala', '08012', FALSE),
  ('0905', 9, 'بني مراد', 'Beni Mered', 'Beni Mered', '09025', FALSE),
  ('0904', 9, 'أولاد يعيش', 'Ouled Yaïch', 'Ouled Yaïch', '09002', FALSE),
  ('0906', 9, 'الشريعة', 'Chrea', 'Chrea', '09008', FALSE),
  ('0907', 9, 'اولاد سلامة', 'Ouled Slama', 'Ouled Slama', '09019', FALSE),
  ('0908', 9, 'حمام ملوان', 'Hammam Elouane', 'Hammam Elouane', '09012', FALSE),
  ('0909', 9, 'بوقرة', 'Bougara', 'Bougara', '14040', FALSE),
  ('0910', 9, 'موزاية', 'Mouzaia', 'Mouzaia', '09016', FALSE),
  ('0911', 9, 'الشفة', 'Chiffa', 'Chiffa', '09011', FALSE),
  ('0912', 9, 'عين الرمانة', 'Ain Romana', 'Ain Romana', '09028', FALSE),
  ('0913', 9, 'صوحان', 'Souhane', 'Souhane', '09017', FALSE),
  ('0914', 9, 'الأربعاء', 'Larbaa', 'Larbaa', '38016', FALSE),
  ('0915', 9, 'الصومعة', 'Soumaa', 'Soumaa', '09014', FALSE),
  ('0916', 9, 'قرواو', 'Guerrouaou', 'Guerrouaou', '09027', FALSE),
  ('0902', 9, 'بوفاريك', 'Boufarik', 'Boufarik', '09001', FALSE),
  ('0917', 9, 'مفتاح', 'Meftah', 'Meftah', '09018', FALSE),
  ('0918', 9, 'جبابرة', 'Djebabra', 'Djebabra', '09029', FALSE),
  ('0919', 9, 'وادي جر', 'Oued  Djer', 'Oued  Djer', '09022', FALSE),
  ('0903', 9, 'العفرون', 'El Affroun', 'El Affroun', '09008', FALSE),
  ('0920', 9, 'وادي العلايق', 'Oued El Alleug', 'Oued El Alleug', '09004', FALSE),
  ('0921', 9, 'بن خليل', 'Benkhelil', 'Benkhelil', '09000', FALSE),
  ('0922', 9, 'بني تامو', 'Beni-Tamou', 'Beni-Tamou', '09023', FALSE),
  ('0923', 9, 'الشبلي', 'Chebli', 'Chebli', '09002', FALSE),
  ('0924', 9, 'بوعينان', 'Bouinan', 'Bouinan', '09003', FALSE),
  ('0925', 9, 'بوعرفة', 'Bouarfa', 'Bouarfa', '09024', FALSE),
  ('0901', 9, 'البليدة', 'Blida', 'Blida', '09000', TRUE),
  ('1004', 10, 'عين العلوي', 'Ain Laloui', 'Ain Laloui', '10041', FALSE),
  ('1005', 10, 'عين الحجر', 'Ain El Hadjar', 'Ain El Hadjar', '20003', FALSE),
  ('1006', 10, 'عين بسام', 'Ain-Bessem', 'Ain-Bessem', '10035', FALSE),
  ('1007', 10, 'الحجرة الزرقاء', 'Hadjera Zerga', 'Hadjera Zerga', '10042', FALSE),
  ('1008', 10, 'مزدور', 'Mezdour', 'Mezdour', '10011', FALSE),
  ('1009', 10, 'تاقديت', 'Taguedite', 'Taguedite', '10000', FALSE),
  ('1010', 10, 'برج أوخريص', 'Bordj Okhriss', 'Bordj Okhriss', '10018', FALSE),
  ('1011', 10, 'ريدان', 'Ridane', 'Ridane', '10032', FALSE),
  ('1012', 10, 'المعمورة', 'Maamora', 'Maamora', '20011', FALSE),
  ('1013', 10, 'الحاكمية', 'El-Hakimia', 'El-Hakimia', '10020', FALSE),
  ('1014', 10, 'ديرة', 'Dirah', 'Dirah', '10007', FALSE),
  ('1015', 10, 'الدشمية', 'Dechmia', 'Dechmia', '10031', FALSE),
  ('1003', 10, 'سور الغزلان', 'Sour El Ghozlane', 'Sour El Ghozlane', '10004', FALSE),
  ('1016', 10, 'أهل القصر', 'Ahl El Ksar', 'Ahl El Ksar', '10022', FALSE),
  ('1017', 10, 'بشلول', 'Bechloul', 'Bechloul', '10033', FALSE),
  ('1018', 10, 'العجيبة', 'El Adjiba', 'El Adjiba', '10019', FALSE),
  ('1019', 10, 'الأسنام', 'El Asnam', 'El Asnam', '10002', FALSE),
  ('1020', 10, 'أولاد راشد', 'Ouled Rached', 'Ouled Rached', '10040', FALSE),
  ('1021', 10, 'آث  منصور', 'Ath Mansour', 'Ath Mansour', '10043', FALSE),
  ('1022', 10, 'سحاريج', 'Saharidj', 'Saharidj', '10030', FALSE),
  ('1023', 10, 'أمشدالة', 'M Chedallah', 'M Chedallah', '10037', FALSE),
  ('1024', 10, 'حنيف', 'Hanif', 'Hanif', '10006', FALSE),
  ('1025', 10, 'شرفة', 'Chorfa', 'Chorfa', '29043', FALSE),
  ('1026', 10, 'أغبالو', 'Aghbalou', 'Aghbalou', '10027', FALSE),
  ('1027', 10, 'روراوة', 'Raouraoua', 'Raouraoua', '10010', FALSE),
  ('1028', 10, 'الخبوزية', 'El Khabouzia', 'El Khabouzia', '10021', FALSE),
  ('1029', 10, 'بئر غبالو', 'Bir Ghbalou', 'Bir Ghbalou', '10036', FALSE),
  ('1001', 10, 'البويرة', 'Bouira', 'Bouira', '10000', TRUE),
  ('1030', 10, 'عين الترك', 'Ain Turk', 'Ain Turk', '31009', FALSE),
  ('1031', 10, 'أيت لعزيز', 'Ait Laaziz', 'Ait Laaziz', '10008', FALSE),
  ('1032', 10, 'المقراني', 'El-Mokrani', 'El-Mokrani', '10044', FALSE),
  ('1033', 10, 'سوق الخميس', 'Souk El Khemis', 'Souk El Khemis', '13048', FALSE),
  ('1034', 10, 'أعمر', 'Aomar', 'Aomar', '10016', FALSE),
  ('1035', 10, 'جباحية', 'Djebahia', 'Djebahia', '10026', FALSE),
  ('1036', 10, 'قادرية', 'Kadiria', 'Kadiria', '10005', FALSE),
  ('1037', 10, 'الهاشمية', 'El Hachimia', 'El Hachimia', '10015', FALSE),
  ('1038', 10, 'وادي البردي', 'Oued El Berdi', 'Oued El Berdi', '10045', FALSE),
  ('1039', 10, 'حيزر', 'Haizer', 'Haizer', '10012', FALSE),
  ('1040', 10, 'تاغزوت', 'Taghzout', 'Taghzout', '10009', FALSE),
  ('1041', 10, 'بودربالة', 'Bouderbala', 'Bouderbala', '10023', FALSE),
  ('1042', 10, 'بوكرم', 'Boukram', 'Boukram', '10034', FALSE),
  ('1043', 10, 'قرومة', 'Guerrouma', 'Guerrouma', '10003', FALSE),
  ('1002', 10, 'الأخضرية', 'Lakhdaria', 'Lakhdaria', '10001', FALSE),
  ('1044', 10, 'معلة', 'Maala', 'Maala', '10014', FALSE),
  ('1045', 10, 'زبربر', 'Z''barbar (El Isseri )', 'Z''barbar (El Isseri )', '10024', FALSE),
  ('1102', 11, 'تاظروك', 'Tazrouk', 'Tazrouk', '11006', FALSE),
  ('1103', 11, 'أدلس', 'Idles', 'Idles', '11005', FALSE),
  ('1104', 11, 'ابلسة', 'Abelsa', 'Abelsa', '11002', FALSE),
  ('1101', 11, 'تمنراست', 'Tamanrasset', 'Tamanrasset', '11000', TRUE),
  ('1105', 11, 'عين امقل', 'Ain Amguel', 'Ain Amguel', '11000', FALSE),
  ('1202', 12, 'الحويجبات', 'Lahouidjbet', 'Lahouidjbet', '12006', FALSE),
  ('1204', 12, 'الماء الابيض', 'El Ma Labiod', 'El Ma Labiod', '12020', FALSE),
  ('1205', 12, 'العوينات', 'El Aouinet', 'El Aouinet', '26057', FALSE),
  ('1206', 12, 'بوخضرة', 'Boukhadra', 'Boukhadra', '12018', FALSE),
  ('1207', 12, 'بئر مقدم', 'Bir Mokkadem', 'Bir Mokkadem', '12000', FALSE),
  ('1208', 12, 'قريقر', 'Gourrigueur', 'Gourrigueur', '12000', FALSE),
  ('1209', 12, 'الحمامات', 'Hammamet', 'Hammamet', '16024', FALSE),
  ('1210', 12, 'بئر الذهب', 'Bir Dheheb', 'Bir Dheheb', '12000', FALSE),
  ('1211', 12, 'مرسط', 'Morsott', 'Morsott', '12012', FALSE),
  ('1212', 12, 'صفصاف الوسرى', 'Safsaf El Ouesra', 'Safsaf El Ouesra', '12007', FALSE),
  ('1213', 12, 'أم علي', 'Oum Ali', 'Oum Ali', '12021', FALSE),
  ('1214', 12, 'بكارية', 'Bekkaria', 'Bekkaria', '12017', FALSE),
  ('1215', 12, 'بولحاف الدير', 'Boulhaf Dyr', 'Boulhaf Dyr', '12025', FALSE),
  ('1216', 12, 'الكويف', 'El Kouif', 'El Kouif', '12011', FALSE),
  ('1203', 12, 'الونزة', 'Ouenza', 'Ouenza', '12003', FALSE),
  ('1217', 12, 'المريج', 'El Meridj', 'El Meridj', '12024', FALSE),
  ('1218', 12, 'عين الزرقاء', 'Ain Zerga', 'Ain Zerga', '12023', FALSE),
  ('1219', 12, 'سطح قنطيس', 'Stah Guentis', 'Stah Guentis', '12004', FALSE),
  ('1220', 12, 'العقلة', 'El Ogla', 'El Ogla', '39025', FALSE),
  ('1221', 12, 'المزرعة', 'El Mezeraa', 'El Mezeraa', '12027', FALSE),
  ('1222', 12, 'بجن', 'Bedjene', 'Bedjene', '12026', FALSE),
  ('1223', 12, 'ثليجان', 'Thlidjene', 'Thlidjene', '12022', FALSE),
  ('1224', 12, 'الشريعة', 'Cheria', 'Cheria', '09008', FALSE),
  ('1201', 12, 'تبسة', 'Tébessa', 'Tébessa', '12000', TRUE),
  ('1305', 13, 'باب العسة', 'Bab El Assa', 'Bab El Assa', '13018', FALSE),
  ('1306', 13, 'سوق الثلاثاء', 'Souk Thlata', 'Souk Thlata', '13033', FALSE),
  ('1307', 13, 'السواني', 'Souani', 'Souani', '13008', FALSE),
  ('1308', 13, 'تيرني بني هديل', 'Tirni Beni Hediel', 'Tirni Beni Hediel', '13023', FALSE),
  ('1303', 13, 'منصورة', 'Mansourah', 'Mansourah', '13001', FALSE),
  ('1309', 13, 'بني مستر', 'Beni Mester', 'Beni Mester', '13002', FALSE),
  ('1310', 13, 'عين غرابة', 'Ain Ghoraba', 'Ain Ghoraba', '13049', FALSE),
  ('1311', 13, 'شتوان', 'Chetouane', 'Chetouane', '13050', FALSE),
  ('1312', 13, 'عمير', 'Amieur', 'Amieur', '13014', FALSE),
  ('1313', 13, 'عين فزة', 'Ain Fezza', 'Ain Fezza', '13012', FALSE),
  ('1314', 13, 'هنين', 'Honaine', 'Honaine', '13044', FALSE),
  ('1315', 13, 'بني خلاد', 'Beni Khellad', 'Beni Khellad', '13000', FALSE),
  ('1316', 13, 'ندرومة', 'Nedroma', 'Nedroma', '13040', FALSE),
  ('1317', 13, 'جبالة', 'Djebala', 'Djebala', '13009', FALSE),
  ('1318', 13, 'مسيردة الفواقة', 'Msirda Fouaga', 'Msirda Fouaga', '13030', FALSE),
  ('1319', 13, 'مرسى بن مهيدي', 'Marsa Ben M’Hidi', 'Marsa Ben M’Hidi', '13039', FALSE),
  ('1320', 13, 'سيدي مجاهد', 'Sidi Medjahed', 'Sidi Medjahed', '13037', FALSE),
  ('1321', 13, 'بني بوسعيد', 'Beni Boussaid', 'Beni Boussaid', '13038', FALSE),
  ('1322', 13, 'سبدو', 'Sebdou', 'Sebdou', '13035', FALSE),
  ('1323', 13, 'بوحلو', 'Bouhlou', 'Bouhlou', '13047', FALSE),
  ('1324', 13, 'صبرة', 'Sabra', 'Sabra', '13006', FALSE),
  ('1302', 13, 'مغنية', 'Maghnia', 'Maghnia', '13002', FALSE),
  ('1325', 13, 'حمام بوغرارة', 'Hammam Boughrara', 'Hammam Boughrara', '13028', FALSE),
  ('1326', 13, 'زناتة', 'Zenata', 'Zenata', '13016', FALSE),
  ('1327', 13, 'أولاد رياح', 'Ouled Riyah', 'Ouled Riyah', '13046', FALSE),
  ('1328', 13, 'الحناية', 'Hennaya', 'Hennaya', '13026', FALSE),
  ('1329', 13, 'سيدي العبدلي', 'Sidi Abdelli', 'Sidi Abdelli', '13034', FALSE),
  ('1330', 13, 'بن سكران', 'Bensekrane', 'Bensekrane', '13024', FALSE),
  ('1331', 13, 'فلاوسن', 'Fellaoucene', 'Fellaoucene', '13020', FALSE),
  ('1332', 13, 'عين الكبيرة', 'Ain Kebira', 'Ain Kebira', '19002', FALSE),
  ('1333', 13, 'عين فتاح', 'Ain Fetah', 'Ain Fetah', '13031', FALSE),
  ('1301', 13, 'تلمسان', 'Tlemcen', 'Tlemcen', '13000', TRUE),
  ('1334', 13, 'عين النحالة', 'Ain Nehala', 'Ain Nehala', '13025', FALSE),
  ('1335', 13, 'عين تالوت', 'Ain Tallout', 'Ain Tallout', '13003', FALSE),
  ('1336', 13, 'عين يوسف', 'Ain Youcef', 'Ain Youcef', '13015', FALSE),
  ('1337', 13, 'بني وارسوس', 'Beni Ouarsous', 'Beni Ouarsous', '13036', FALSE),
  ('1338', 13, 'الفحول', 'El Fehoul', 'El Fehoul', '13005', FALSE),
  ('1339', 13, 'الرمشي', 'Remchi', 'Remchi', '13004', FALSE),
  ('1340', 13, 'سبعة شيوخ', 'Sebaa Chioukh', 'Sebaa Chioukh', '13022', FALSE),
  ('1341', 13, 'دار يغمراسن', 'Dar Yaghmouracene', 'Dar Yaghmouracene', '13019', FALSE),
  ('1304', 13, 'الغزوات', 'Ghazaouet', 'Ghazaouet', '13003', FALSE),
  ('1342', 13, 'السواحلية', 'Souahlia', 'Souahlia', '13029', FALSE),
  ('1343', 13, 'تيانت', 'Tianet', 'Tianet', '13045', FALSE),
  ('1344', 13, 'بني صميل', 'Beni Semiel', 'Beni Semiel', '13052', FALSE),
  ('1345', 13, 'وادي الخضر', 'Oued Lakhdar', 'Oued Lakhdar', '13000', FALSE),
  ('1346', 13, 'أولاد ميمون', 'Ouled Mimoun', 'Ouled Mimoun', '13013', FALSE),
  ('1347', 13, 'بني بهدل', 'Beni Bahdel', 'Beni Bahdel', '13042', FALSE),
  ('1348', 13, 'بني سنوس', 'Beni Snous', 'Beni Snous', '13017', FALSE),
  ('1349', 13, 'العزايل', 'Azails', 'Azails', '13021', FALSE),
  ('1403', 14, 'مهدية', 'Mahdia', 'Mahdia', '14006', FALSE),
  ('1404', 14, 'عين دزاريت', 'Ain Dzarit', 'Ain Dzarit', '14000', FALSE),
  ('1405', 14, 'السبعين', 'Sebaine', 'Sebaine', '14025', FALSE),
  ('1406', 14, 'الناظورة', 'Nadorah', 'Nadorah', '14031', FALSE),
  ('1407', 14, 'الفايجة', 'Faidja', 'Faidja', '14041', FALSE),
  ('1408', 14, 'سي عبد الغني', 'Sidi Abdelghani', 'Sidi Abdelghani', '14017', FALSE),
  ('1402', 14, 'السوقر', 'Sougueur', 'Sougueur', '14002', FALSE),
  ('1409', 14, 'توسنينة', 'Tousnina', 'Tousnina', '14026', FALSE),
  ('1410', 14, 'مغيلة', 'Meghila', 'Meghila', '14021', FALSE),
  ('1411', 14, 'السبت', 'Sebt', 'Sebt', '21009', FALSE),
  ('1412', 14, 'سيدي حسني', 'Sidi Hosni', 'Sidi Hosni', '14023', FALSE),
  ('1413', 14, 'عين الحديد', 'Ain El Hadid', 'Ain El Hadid', '14018', FALSE),
  ('1414', 14, 'فرندة', 'Frenda', 'Frenda', '14027', FALSE),
  ('1415', 14, 'تخمرت', 'Takhemaret', 'Takhemaret', '14037', FALSE),
  ('1416', 14, 'عين كرمس', 'Ain Kermes', 'Ain Kermes', '14028', FALSE),
  ('1417', 14, 'جبيلات الرصفاء', 'Djebilet Rosfa', 'Djebilet Rosfa', '14000', FALSE),
  ('1418', 14, 'مادنة', 'Madna', 'Madna', '14010', FALSE),
  ('1419', 14, 'مدريسة', 'Medrissa', 'Medrissa', '14008', FALSE),
  ('1420', 14, 'سيدي عبد الرحمن', 'Sidi Abderrahmane', 'Sidi Abderrahmane', '14038', FALSE),
  ('1421', 14, 'قرطوفة', 'Guertoufa', 'Guertoufa', '14022', FALSE),
  ('1422', 14, 'الرحوية', 'Rahouia', 'Rahouia', '14014', FALSE),
  ('1423', 14, 'وادي ليلي', 'Oued Lili', 'Oued Lili', '14033', FALSE),
  ('1424', 14, 'سيدي علي ملال', 'Sidi Ali Mellal', 'Sidi Ali Mellal', '14004', FALSE),
  ('1425', 14, 'تيدة', 'Tidda', 'Tidda', '14042', FALSE),
  ('1426', 14, 'جيلالي بن عمار', 'Djileli Ben Amar', 'Djileli Ben Amar', '14024', FALSE),
  ('1427', 14, 'مشرع الصفا', 'Mechraa Sfa', 'Mechraa Sfa', '14000', FALSE),
  ('1428', 14, 'تاقدمت', 'Tagdemt', 'Tagdemt', '14032', FALSE),
  ('1401', 14, 'تيارت', 'Tiaret', 'Tiaret', '14000', TRUE),
  ('1429', 14, 'مدروسة', 'Medroussa', 'Medroussa', '14002', FALSE),
  ('1430', 14, 'ملاكو', 'Mellakou', 'Mellakou', '14031', FALSE),
  ('1431', 14, 'سيدي بختي', 'Sidi Bakhti', 'Sidi Bakhti', '14007', FALSE),
  ('1432', 14, 'عين الذهب', 'Ain Deheb', 'Ain Deheb', '14006', FALSE),
  ('1433', 14, 'شحيمة', 'Chehaima', 'Chehaima', '14036', FALSE),
  ('1434', 14, 'النعيمة', 'Naima', 'Naima', '14020', FALSE),
  ('1435', 14, 'عين بوشقيف', 'Ain Bouchekif', 'Ain Bouchekif', '14003', FALSE),
  ('1436', 14, 'دحموني', 'Dahmouni', 'Dahmouni', '14013', FALSE),
  ('1505', 15, 'ميزرانـــة', 'Mizrana', 'Mizrana', '15062', FALSE),
  ('1506', 15, 'إفليـــسن', 'Iflissen', 'Iflissen', '15054', FALSE),
  ('1507', 15, 'تيقـزيرت', 'Tigzirt', 'Tigzirt', '15038', FALSE),
  ('1508', 15, 'إيجــار', 'Idjeur', 'Idjeur', '15049', FALSE),
  ('1509', 15, 'بني زيكــي', 'Beni-Zikki', 'Beni-Zikki', '15000', FALSE),
  ('1510', 15, 'إيلولة أومـــالو', 'Illoula Oumalou', 'Illoula Oumalou', '15000', FALSE),
  ('1511', 15, 'بوزقــن', 'Bouzeguene', 'Bouzeguene', '15000', FALSE),
  ('1512', 15, 'بني دوالة', 'Beni-Douala', 'Beni-Douala', '15032', FALSE),
  ('1513', 15, 'بني عيسي', 'Beni-Aissi', 'Beni-Aissi', '15015', FALSE),
  ('1514', 15, 'أيت محمود', 'Ait-Mahmoud', 'Ait-Mahmoud', '15028', FALSE),
  ('1515', 15, 'بنــــي زمنزار', 'Beni Zmenzer', 'Beni Zmenzer', '15016', FALSE),
  ('1516', 15, 'أقني قغران', 'Agouni-Gueghrane', 'Agouni-Gueghrane', '15061', FALSE),
  ('1517', 15, 'أيت بــوادو', 'Ait Bouaddou', 'Ait Bouaddou', '15000', FALSE),
  ('1518', 15, 'واضية', 'Ouadhias', 'Ouadhias', '15036', FALSE),
  ('1519', 15, 'تيزي نثلاثة', 'Tizi N''tleta', 'Tizi N''tleta', '15051', FALSE),
  ('1520', 15, 'أغريب', 'Aghribs', 'Aghribs', '15053', FALSE),
  ('1521', 15, 'أيت شافع', 'Ait-Chafaa', 'Ait-Chafaa', '15000', FALSE),
  ('1522', 15, 'أقرو', 'Akerrou', 'Akerrou', '15044', FALSE),
  ('1523', 15, 'أزفون', 'Azeffoun', 'Azeffoun', '15037', FALSE),
  ('1524', 15, 'أسي يوسف', 'Assi-Youcef', 'Assi-Youcef', '15066', FALSE),
  ('1525', 15, 'بوغني', 'Boghni', 'Boghni', '15040', FALSE),
  ('1526', 15, 'بونوح', 'Bounouh', 'Bounouh', '15012', FALSE),
  ('1527', 15, 'مشطراس', 'Mechtras', 'Mechtras', '15006', FALSE),
  ('1503', 15, 'ذراع بن خدة', 'Draa Ben Khedda', 'Draa Ben Khedda', '15001', FALSE),
  ('1528', 15, 'سيدي نعمان', 'Sidi Namane', 'Sidi Namane', '26026', FALSE),
  ('1529', 15, 'تادمايت', 'Tadmait', 'Tadmait', '15064', FALSE),
  ('1530', 15, 'تيرمتين', 'Tirmitine', 'Tirmitine', '15043', FALSE),
  ('1531', 15, 'أيت بومهدي', 'Ait Boumahdi', 'Ait Boumahdi', '15000', FALSE),
  ('1532', 15, 'أيت تودرت', 'Ait-Toudert', 'Ait-Toudert', '15067', FALSE),
  ('1533', 15, 'واسيف', 'Ouacif', 'Ouacif', '15048', FALSE),
  ('1534', 15, 'أيت خليلي', 'Ait Khellili', 'Ait Khellili', '15058', FALSE),
  ('1535', 15, 'مقــلع', 'Mekla', 'Mekla', '15050', FALSE),
  ('1536', 15, 'صوامـــع', 'Souama', 'Souama', '15000', FALSE),
  ('1537', 15, 'بني يني', 'Beni-Yenni', 'Beni-Yenni', '15052', FALSE),
  ('1538', 15, 'إبودرارن', 'Iboudrarene', 'Iboudrarene', '15060', FALSE),
  ('1539', 15, 'يطــافن', 'Yatafene', 'Yatafene', '15000', FALSE),
  ('1501', 15, 'تيزي وزو', 'Tizi Ouzou', 'Tizi Ouzou', '15000', TRUE),
  ('1540', 15, 'أبي يوسف', 'Abi-Youcef', 'Abi-Youcef', '15031', FALSE),
  ('1541', 15, 'عين الحمام', 'Ain-El-Hammam', 'Ain-El-Hammam', '15002', FALSE),
  ('1542', 15, 'أيت يحيى', 'Ait-Yahia', 'Ait-Yahia', '15027', FALSE),
  ('1543', 15, 'اقبيل', 'Akbil', 'Akbil', '15003', FALSE),
  ('1544', 15, 'بوجيمة', 'Boudjima', 'Boudjima', '15055', FALSE),
  ('1545', 15, 'ماكودة', 'Makouda', 'Makouda', '15009', FALSE),
  ('1546', 15, 'عين الزاوية', 'Ain-Zaouia', 'Ain-Zaouia', '15025', FALSE),
  ('1547', 15, 'أيت يحي موسى', 'Ait Yahia Moussa', 'Ait Yahia Moussa', '15056', FALSE),
  ('1548', 15, 'ذراع الميزان', 'Draa-El-Mizan', 'Draa-El-Mizan', '15010', FALSE),
  ('1549', 15, 'فريقات', 'Frikat', 'Frikat', '15014', FALSE),
  ('1550', 15, 'مكيرة', 'M''kira', 'M''kira', '15026', FALSE),
  ('1551', 15, 'تيزي غنيف', 'Tizi-Gheniff', 'Tizi-Gheniff', '15011', FALSE),
  ('1552', 15, 'إيلـيــلتـن', 'Illilten', 'Illilten', '15033', FALSE),
  ('1553', 15, 'إمســوحال', 'Imsouhal', 'Imsouhal', '15063', FALSE),
  ('1554', 15, 'إفــرحــونان', 'Iferhounene', 'Iferhounene', '15017', FALSE),
  ('1502', 15, 'عزازقة', 'Azazga', 'Azazga', '15003', FALSE),
  ('1555', 15, 'فريحة', 'Freha', 'Freha', '15004', FALSE),
  ('1556', 15, 'إيفيغاء', 'Ifigha', 'Ifigha', '15041', FALSE),
  ('1557', 15, 'إعــكورن', 'Yakourene', 'Yakourene', '15000', FALSE),
  ('1558', 15, 'زكري', 'Zekri', 'Zekri', '15023', FALSE),
  ('1559', 15, 'أيت عقـواشة', 'Ait Aggouacha', 'Ait Aggouacha', '15035', FALSE),
  ('1560', 15, 'إيرجـــن', 'Irdjen', 'Irdjen', '15007', FALSE),
  ('1504', 15, 'لاربعا ناث إيراثن', 'Larbaâ Nath Irathen', 'Larbaâ Nath Irathen', '15004', FALSE),
  ('1561', 15, 'أيت  أومالو', 'Ait-Oumalou', 'Ait-Oumalou', '15042', FALSE),
  ('1562', 15, 'تيزي راشد', 'Tizi-Rached', 'Tizi-Rached', '15022', FALSE),
  ('1563', 15, 'أيت عيسى ميمون', 'Ait-Aissa-Mimoun', 'Ait-Aissa-Mimoun', '15039', FALSE),
  ('1564', 15, 'واقنون', 'Ouaguenoun', 'Ouaguenoun', '15024', FALSE),
  ('1565', 15, 'تيمـيزار', 'Timizart', 'Timizart', '15008', FALSE),
  ('1566', 15, 'معـــاتقة', 'Maatkas', 'Maatkas', '15000', FALSE),
  ('1567', 15, 'سوق الإثنين', 'Souk-El-Tenine', 'Souk-El-Tenine', '15057', FALSE),
  ('1602', 16, 'حسين داي', 'Hussein Dey', 'Hussein Dey', '16017', FALSE),
  ('1609', 16, 'القبة', 'Kouba', 'Kouba', '16050', FALSE),
  ('1614', 16, 'محمد بلوزداد', 'Mohamed Belouzdad', 'Mohamed Belouzdad', '16000', FALSE),
  ('1615', 16, 'المغارية', 'El Magharia', 'El Magharia', '16031', FALSE),
  ('1616', 16, 'الكاليتوس', 'Les Eucalyptus', 'Les Eucalyptus', '16033', FALSE),
  ('1617', 16, 'سيدي موسى', 'Sidi Moussa', 'Sidi Moussa', '16037', FALSE),
  ('1618', 16, 'براقي', 'Baraki', 'Baraki', '16014', FALSE),
  ('1619', 16, 'عين طاية', 'Ain Taya', 'Ain Taya', '16038', FALSE),
  ('1610', 16, 'باب الزوار', 'Bab Ezzouar', 'Bab Ezzouar', '16311', FALSE),
  ('1611', 16, 'برج الكيفان', 'Bordj El Kiffan', 'Bordj El Kiffan', '16411', FALSE),
  ('1620', 16, 'الدار البيضاء', 'Dar El Beida', 'Dar El Beida', '16020', FALSE),
  ('1621', 16, 'المحمدية', 'Mohammadia', 'Mohammadia', '29031', FALSE),
  ('1622', 16, 'برج البحري', 'Bordj El Bahri', 'Bordj El Bahri', '16039', FALSE),
  ('1623', 16, 'المرسى', 'El Marsa', 'El Marsa', '21038', FALSE),
  ('1624', 16, 'بئر توتة', 'Bir Touta', 'Bir Touta', '16034', FALSE),
  ('1625', 16, 'اولاد شبل', 'Ouled Chebel', 'Ouled Chebel', '16036', FALSE),
  ('1626', 16, 'تسالة المرجة', 'Tessala El Merdja', 'Tessala El Merdja', '16035', FALSE),
  ('1627', 16, 'هراوة', 'Herraoua', 'Herraoua', '16041', FALSE),
  ('1628', 16, 'رغاية', 'Reghaia', 'Reghaia', '16043', FALSE),
  ('1613', 16, 'رويبة', 'Rouïba', 'Rouïba', '16016', FALSE),
  ('1629', 16, 'المعالمة', 'Maalma', 'Maalma', '16000', FALSE),
  ('1630', 16, 'الرحمانية', 'Rahmania', 'Rahmania', '16048', FALSE),
  ('1631', 16, 'سويدانية', 'Souidania', 'Souidania', '16049', FALSE),
  ('1632', 16, 'سطاوالي', 'Staoueli', 'Staoueli', '16045', FALSE),
  ('1612', 16, 'زرالدة', 'Zéralda', 'Zéralda', '16063', FALSE),
  ('1633', 16, 'بابا حسن', 'Baba Hassen', 'Baba Hassen', '16055', FALSE),
  ('1634', 16, 'الدويرة', 'Douira', 'Douira', '16054', FALSE),
  ('1635', 16, 'الدرارية', 'Draria', 'Draria', '16053', FALSE),
  ('1636', 16, 'العاشور', 'El Achour', 'El Achour', '16052', FALSE),
  ('1637', 16, 'الخرايسية', 'Khraissia', 'Khraissia', '16056', FALSE),
  ('1638', 16, 'عين بنيان', 'Ain Benian', 'Ain Benian', '16044', FALSE),
  ('1607', 16, 'الشراقة', 'Chéraga', 'Chéraga', '16012', FALSE),
  ('1606', 16, 'دالي إبراهيم', 'Dely Ibrahim', 'Dely Ibrahim', '16020', FALSE),
  ('1639', 16, 'اولاد فايت', 'Ouled Fayet', 'Ouled Fayet', '16051', FALSE),
  ('1640', 16, 'الحمامات', 'Hammamet', 'Hammamet', '16024', FALSE),
  ('1601', 16, 'الجزائر الوسطى', 'Alger Centre', 'Alger Centre', '16000', TRUE),
  ('1641', 16, 'المدنية', 'El Madania', 'El Madania', '16003', FALSE),
  ('1642', 16, 'المرادية', 'El Mouradia', 'El Mouradia', '16027', FALSE),
  ('1643', 16, 'سيدي امحمد', 'Sidi M''hamed', 'Sidi M''hamed', '16002', FALSE),
  ('1644', 16, 'السحاولة', 'Sehaoula', 'Sehaoula', '16057', FALSE),
  ('1645', 16, 'بئر مراد رايس', 'Bir Mourad Rais', 'Bir Mourad Rais', '16009', FALSE),
  ('1646', 16, 'بئر خادم', 'Birkhadem', 'Birkhadem', '16012', FALSE),
  ('1647', 16, 'جسر قسنطينة', 'Djasr Kasentina', 'Djasr Kasentina', '16026', FALSE),
  ('1604', 16, 'حيدرة', 'Hydra', 'Hydra', '16035', FALSE),
  ('1648', 16, 'بولوغين بن زيري', 'Bologhine Ibnou Ziri', 'Bologhine Ibnou Ziri', '16000', FALSE),
  ('1649', 16, 'القصبة', 'Casbah', 'Casbah', '16007', FALSE),
  ('1650', 16, 'وادي قريش', 'Oued Koriche', 'Oued Koriche', '16008', FALSE),
  ('1651', 16, 'الرايس حميدو', 'Rais Hamidou', 'Rais Hamidou', '16025', FALSE),
  ('1603', 16, 'باب الواد', 'Bab El Oued', 'Bab El Oued', '16008', FALSE),
  ('1605', 16, 'بن عكنون', 'Ben Aknoun', 'Ben Aknoun', '16028', FALSE),
  ('1652', 16, 'بني مسوس', 'Beni Messous', 'Beni Messous', '16032', FALSE),
  ('1653', 16, 'بوزريعة', 'Bouzareah', 'Bouzareah', '16011', FALSE),
  ('1654', 16, 'الابيار', 'El Biar', 'El Biar', '16010', FALSE),
  ('1655', 16, 'باش جراح', 'Bachedjerah', 'Bachedjerah', '16019', FALSE),
  ('1656', 16, 'بوروبة', 'Bourouba', 'Bourouba', '16016', FALSE),
  ('1608', 16, 'الحراش', 'El Harrach', 'El Harrach', '16200', FALSE),
  ('1657', 16, 'وادي السمار', 'Oued Smar', 'Oued Smar', '16015', FALSE),
  ('1704', 17, 'حاسي العش', 'Hassi El Euch', 'Hassi El Euch', '17016', FALSE),
  ('1705', 17, 'زعفران', 'Zaafrane', 'Zaafrane', '17028', FALSE),
  ('1706', 17, 'عين معبد', 'Ain Maabed', 'Ain Maabed', '17005', FALSE),
  ('1702', 17, 'حاسي بحبح', 'Hassi Bahbah', 'Hassi Bahbah', '17004', FALSE),
  ('1707', 17, 'عين الإبل', 'Ain El Ibel', 'Ain El Ibel', '17030', FALSE),
  ('1708', 17, 'تعظميت', 'Tadmit', 'Tadmit', '17036', FALSE),
  ('1709', 17, 'زكار', 'Zaccar', 'Zaccar', '17010', FALSE),
  ('1710', 17, 'مجبارة', 'Moudjbara', 'Moudjbara', '17000', FALSE),
  ('1711', 17, 'القديد', 'El Gueddid', 'El Gueddid', '17003', FALSE),
  ('1703', 17, 'الشارف', 'El Charef', 'El Charef', '17009', FALSE),
  ('1712', 17, 'بن يعقوب', 'Ben Yaagoub', 'Ben Yaagoub', '17027', FALSE),
  ('1713', 17, 'سيدي بايزيد', 'Sidi Baizid', 'Sidi Baizid', '17012', FALSE),
  ('1714', 17, 'مليليحة', 'M’Liliha', 'M’Liliha', '17013', FALSE),
  ('1715', 17, 'دار الشيوخ', 'Dar Chioukh', 'Dar Chioukh', '17025', FALSE),
  ('1716', 17, 'دويس', 'Douis', 'Douis', '17015', FALSE),
  ('1717', 17, 'الادريسية', 'El Idrissia', 'El Idrissia', '17014', FALSE),
  ('1718', 17, 'عين الشهداء', 'Ain Chouhada', 'Ain Chouhada', '17023', FALSE),
  ('1701', 17, 'الجلفة', 'Djelfa', 'Djelfa', '17000', TRUE),
  ('1801', 18, 'جيجل', 'Jijel', 'Jijel', '18000', TRUE),
  ('1804', 18, 'العوانة', 'El Aouana', 'El Aouana', '18003', FALSE),
  ('1805', 18, 'سلمى بن زيادة', 'Selma Benziada', 'Selma Benziada', '18018', FALSE),
  ('1806', 18, 'أراقن سويسي', 'Erraguene Souissi', 'Erraguene Souissi', '18000', FALSE),
  ('1807', 18, 'زيامة منصورية', 'Ziama Mansouriah', 'Ziama Mansouriah', '18004', FALSE),
  ('1808', 18, 'بوسيف أولاد عسكر', 'Boussif Ouled Askeur', 'Boussif Ouled Askeur', '18019', FALSE),
  ('1809', 18, 'الشحنة', 'Chahna', 'Chahna', '18008', FALSE),
  ('1810', 18, 'الامير عبد القادر', 'Emir Abdelkader', 'Emir Abdelkader', '46027', FALSE),
  ('1811', 18, 'وجانة', 'Oudjana', 'Oudjana', '18028', FALSE),
  ('1803', 18, 'طاهير', 'Taher', 'Taher', '18001', FALSE),
  ('1812', 18, 'الشقفة', 'Chekfa', 'Chekfa', '18007', FALSE),
  ('1813', 18, 'القنار نشفي', 'El Kennar Nouchfi', 'El Kennar Nouchfi', '18020', FALSE),
  ('1814', 18, 'سيدي عبد العزيز', 'Sidi Abdelaziz', 'Sidi Abdelaziz', '18013', FALSE),
  ('1815', 18, 'برج الطهر', 'Bordj T''har', 'Bordj T''har', '18026', FALSE),
  ('1802', 18, 'الميلية', 'El Milia', 'El Milia', '18002', FALSE),
  ('1816', 18, 'أولاد يحيى خدروش', 'Ouled Yahia Khadrouch', 'Ouled Yahia Khadrouch', '18021', FALSE),
  ('1817', 18, 'أولاد رابح', 'Ouled Rabah', 'Ouled Rabah', '18027', FALSE),
  ('1818', 18, 'سيدي معروف', 'Sidi Marouf', 'Sidi Marouf', '18010', FALSE),
  ('1819', 18, 'غبالة', 'Ghebala', 'Ghebala', '18015', FALSE),
  ('1820', 18, 'السطارة', 'Settara', 'Settara', '18011', FALSE),
  ('1821', 18, 'بوراوي بلهادف', 'Bouraoui Belhadef', 'Bouraoui Belhadef', '18016', FALSE),
  ('1822', 18, 'العنصر', 'El Ancer', 'El Ancer', '31010', FALSE),
  ('1823', 18, 'خيري واد عجول', 'Khiri Oued Adjoul', 'Khiri Oued Adjoul', '18000', FALSE),
  ('1824', 18, 'الجمعة بني حبيبي', 'Djemaa Beni Habibi', 'Djemaa Beni Habibi', '18025', FALSE),
  ('1825', 18, 'جيملة', 'Djimla', 'Djimla', '18017', FALSE),
  ('1826', 18, 'بودريعة بني  ياجيس', 'Boudria Beniyadjis', 'Boudria Beniyadjis', '18022', FALSE),
  ('1827', 18, 'قاوس', 'Kaous', 'Kaous', '18014', FALSE),
  ('1828', 18, 'تاكسنة', 'Texenna', 'Texenna', '18024', FALSE),
  ('1905', 19, 'الرصفة', 'Rosfa', 'Rosfa', '19023', FALSE),
  ('1906', 19, 'بوطالب', 'Boutaleb', 'Boutaleb', '19005', FALSE),
  ('1907', 19, 'الحامة', 'Hamma', 'Hamma', '40005', FALSE),
  ('1908', 19, 'أولاد تبان', 'Ouled Tebben', 'Ouled Tebben', '19010', FALSE),
  ('1909', 19, 'صالح باي', 'Salah Bey', 'Salah Bey', '19039', FALSE),
  ('1910', 19, 'واد البارد', 'Oued El Bared', 'Oued El Bared', '19057', FALSE),
  ('1911', 19, 'تيزي نبشار', 'Tizi N''bechar', 'Tizi N''bechar', '19038', FALSE),
  ('1912', 19, 'عموشة', 'Amoucha', 'Amoucha', '19027', FALSE),
  ('1913', 19, 'مزلوق', 'Mezloug', 'Mezloug', '19033', FALSE),
  ('1914', 19, 'أوريسيا', 'El Ouricia', 'El Ouricia', '19037', FALSE),
  ('1915', 19, 'عين عباسة', 'Ain Abessa', 'Ain Abessa', '19014', FALSE),
  ('1916', 19, 'عين أرنات', 'Ain Arnat', 'Ain Arnat', '19026', FALSE),
  ('1917', 19, 'قلال', 'Guellal', 'Guellal', '19048', FALSE),
  ('1918', 19, 'قصر الابطال', 'Kasr El Abtal', 'Kasr El Abtal', '19052', FALSE),
  ('1919', 19, 'أولاد سي أحمد', 'Ouled Si Ahmed', 'Ouled Si Ahmed', '19004', FALSE),
  ('1903', 19, 'عين ولمان', 'Aïn Oulmene', 'Aïn Oulmene', '19200', FALSE),
  ('1920', 19, 'أيت نوال مزادة', 'Ait Naoual Mezada', 'Ait Naoual Mezada', '19051', FALSE),
  ('1921', 19, 'ايت تيزي', 'Ait-Tizi', 'Ait-Tizi', '19054', FALSE),
  ('1922', 19, 'بوعنداس', 'Bouandas', 'Bouandas', '19030', FALSE),
  ('1923', 19, 'بوسلام', 'Bousselam', 'Bousselam', '19019', FALSE),
  ('1924', 19, 'حمام السخنة', 'Hamam Soukhna', 'Hamam Soukhna', '19000', FALSE),
  ('1925', 19, 'الطاية', 'Taya', 'Taya', '19058', FALSE),
  ('1926', 19, 'التلة', 'Tella', 'Tella', '19060', FALSE),
  ('1927', 19, 'عين أزال', 'Ain Azel', 'Ain Azel', '19040', FALSE),
  ('1928', 19, 'عين الحجر', 'Ain Lahdjar', 'Ain Lahdjar', '20003', FALSE),
  ('1929', 19, 'بيضاء برج', 'Beidha Bordj', 'Beidha Bordj', '19029', FALSE),
  ('1930', 19, 'بئر حدادة', 'Bir Haddada', 'Bir Haddada', '19034', FALSE),
  ('1931', 19, 'قنزات', 'Guenzet', 'Guenzet', '19041', FALSE),
  ('1932', 19, 'حربيل', 'Harbil', 'Harbil', '19036', FALSE),
  ('1933', 19, 'عين الروى', 'Ain-Roua', 'Ain-Roua', '19006', FALSE),
  ('1934', 19, 'بني وسين', 'Beni Oussine', 'Beni Oussine', '19000', FALSE),
  ('1935', 19, 'بوقاعة', 'Bougaa', 'Bougaa', '19043', FALSE),
  ('1936', 19, 'ذراع قبيلة', 'Draa-Kebila', 'Draa-Kebila', '19007', FALSE),
  ('1937', 19, 'حمام قرقور', 'Hammam Guergour', 'Hammam Guergour', '19050', FALSE),
  ('1901', 19, 'سطيف', 'Sétif', 'Sétif', '19000', TRUE),
  ('1904', 19, 'عين الكبيرة', 'Aïn El Kebira', 'Aïn El Kebira', '19400', FALSE),
  ('1938', 19, 'الدهامشة', 'Dehamcha', 'Dehamcha', '19015', FALSE),
  ('1939', 19, 'أولاد عدوان', 'Ouled Addouane', 'Ouled Addouane', '19024', FALSE),
  ('1940', 19, 'عين السبت', 'Ain-Sebt', 'Ain-Sebt', '19049', FALSE),
  ('1941', 19, 'بني عزيز', 'Beni-Aziz', 'Beni-Aziz', '19003', FALSE),
  ('1942', 19, 'معاوية', 'Maaouia', 'Maaouia', '19012', FALSE),
  ('1943', 19, 'بلاعة', 'Bellaa', 'Bellaa', '19025', FALSE),
  ('1944', 19, 'بئر العرش', 'Bir-El-Arch', 'Bir-El-Arch', '19008', FALSE),
  ('1945', 19, 'الولجة', 'El-Ouldja', 'El-Ouldja', '40009', FALSE),
  ('1946', 19, 'تاشودة', 'Tachouda', 'Tachouda', '19045', FALSE),
  ('1947', 19, 'تالة إيفاسن', 'Tala-Ifacene', 'Tala-Ifacene', '19042', FALSE),
  ('1948', 19, 'ماوكلان', 'Maouaklane', 'Maouaklane', '19000', FALSE),
  ('1949', 19, 'سرج الغول', 'Serdj-El-Ghoul', 'Serdj-El-Ghoul', '19035', FALSE),
  ('1950', 19, 'بابور', 'Babor', 'Babor', '19016', FALSE),
  ('1951', 19, 'قجال', 'Guidjel', 'Guidjel', '19017', FALSE),
  ('1952', 19, 'أولاد صابر', 'Ouled Sabor', 'Ouled Sabor', '19047', FALSE),
  ('1953', 19, 'بازر سكرة', 'Bazer-Sakra', 'Bazer-Sakra', '19000', FALSE),
  ('1902', 19, 'العلمة', 'El Eulma', 'El Eulma', '19600', FALSE),
  ('1954', 19, 'قلتة زرقاء', 'Guelta Zerka', 'Guelta Zerka', '19056', FALSE),
  ('1955', 19, 'بني فودة', 'Beni Fouda', 'Beni Fouda', '19044', FALSE),
  ('1956', 19, 'جميلة', 'Djemila', 'Djemila', '19021', FALSE),
  ('1957', 19, 'عين لقراج', 'Ain-Legradj', 'Ain-Legradj', '19000', FALSE),
  ('1958', 19, 'بني شبانة', 'Beni Chebana', 'Beni Chebana', '19009', FALSE),
  ('1959', 19, 'بني ورتيلان', 'Beni Ourtilane', 'Beni Ourtilane', '19022', FALSE),
  ('1960', 19, 'بني موحلي', 'Beni-Mouhli', 'Beni-Mouhli', '19046', FALSE),
  ('2001', 20, 'سعيدة', 'Saïda', 'Saïda', '20000', TRUE),
  ('2003', 20, 'تيرسين', 'Tircine', 'Tircine', '20015', FALSE),
  ('2004', 20, 'أولاد إبراهيم', 'Ouled Brahim', 'Ouled Brahim', '26012', FALSE),
  ('2005', 20, 'عين السلطان', 'Ain Soltane', 'Ain Soltane', '44020', FALSE),
  ('2006', 20, 'المعمورة', 'Maamora', 'Maamora', '20011', FALSE),
  ('2007', 20, 'الحساسنة', 'El Hassasna', 'El Hassasna', '46021', FALSE),
  ('2008', 20, 'عين السخونة', 'Ain Sekhouna', 'Ain Sekhouna', '20013', FALSE),
  ('2009', 20, 'سيدي بوبكر', 'Sidi Boubekeur', 'Sidi Boubekeur', '20009', FALSE),
  ('2010', 20, 'أولاد خالد', 'Ouled Khaled', 'Ouled Khaled', '20004', FALSE),
  ('2011', 20, 'هونت', 'Hounet', 'Hounet', '20007', FALSE),
  ('2012', 20, 'سيدي عمر', 'Sidi Amar', 'Sidi Amar', '42013', FALSE),
  ('2002', 20, 'يوب', 'Youb', 'Youb', '20003', FALSE),
  ('2013', 20, 'دوي ثابت', 'Doui Thabet', 'Doui Thabet', '20002', FALSE),
  ('2014', 20, 'سيدي احمد', 'Sidi Ahmed', 'Sidi Ahmed', '20012', FALSE),
  ('2015', 20, 'مولاي العربي', 'Moulay Larbi', 'Moulay Larbi', '20005', FALSE),
  ('2016', 20, 'عين الحجر', 'Ain El Hadjar', 'Ain El Hadjar', '20003', FALSE),
  ('2104', 21, 'عين بوزيان', 'Ain Bouziane', 'Ain Bouziane', '21022', FALSE),
  ('2105', 21, 'بني ولبان', 'Beni Oulbane', 'Beni Oulbane', '21021', FALSE),
  ('2106', 21, 'سيدي مزغيش', 'Sidi Mezghiche', 'Sidi Mezghiche', '21019', FALSE),
  ('2107', 21, 'صالح بو الشعور', 'Salah Bouchaour', 'Salah Bouchaour', '21025', FALSE),
  ('2108', 21, 'زردازة', 'Zerdezas', 'Zerdezas', '21017', FALSE),
  ('2109', 21, 'أولاد حبابة', 'Ouled Habbaba', 'Ouled Habbaba', '21018', FALSE),
  ('2110', 21, 'مجاز الدشيش', 'Emjez Edchich', 'Emjez Edchich', '21020', FALSE),
  ('2111', 21, 'الحروش', 'El Arrouch', 'El Arrouch', '21016', FALSE),
  ('2112', 21, 'الحدائق', 'El Hadaiek', 'El Hadaiek', '21000', FALSE),
  ('2113', 21, 'بوشطاطة', 'Bouchetata', 'Bouchetata', '21034', FALSE),
  ('2114', 21, 'عين زويت', 'Ain Zouit', 'Ain Zouit', '21002', FALSE),
  ('2115', 21, 'بني بشير', 'Beni Bechir', 'Beni Bechir', '21024', FALSE),
  ('2116', 21, 'رمضان جمال', 'Ramdane Djamel', 'Ramdane Djamel', '21023', FALSE),
  ('2117', 21, 'بين الويدان', 'Bin El Ouiden', 'Bin El Ouiden', '21029', FALSE),
  ('2118', 21, 'تمالوس', 'Tamalous', 'Tamalous', '21026', FALSE),
  ('2119', 21, 'الكركرة', 'Kerkara', 'Kerkara', '21012', FALSE),
  ('2120', 21, 'عين قشرة', 'Ain Kechra', 'Ain Kechra', '21027', FALSE),
  ('2121', 21, 'الولجة بولبلوط', 'Ouldja Boulbalout', 'Ouldja Boulbalout', '21035', FALSE),
  ('2122', 21, 'أم الطوب', 'Oum Toub', 'Oum Toub', '21028', FALSE),
  ('2123', 21, 'الغدير', 'El Ghedir', 'El Ghedir', '21033', FALSE),
  ('2124', 21, 'السبت', 'Es Sebt', 'Es Sebt', '21009', FALSE),
  ('2125', 21, 'عين شرشار', 'Ain Charchar', 'Ain Charchar', '21006', FALSE),
  ('2103', 21, 'عزابة', 'Azzaba', 'Azzaba', '21003', FALSE),
  ('2126', 21, 'جندل سعدي محمد', 'Djendel Saadi Mohamed', 'Djendel Saadi Mohamed', '21000', FALSE),
  ('2127', 21, 'الزيتونة', 'Zitouna', 'Zitouna', '36020', FALSE),
  ('2128', 21, 'قنواع', 'Kanoua', 'Kanoua', '21032', FALSE),
  ('2129', 21, 'أولاد عطية', 'Ouled Attia', 'Ouled Attia', '21013', FALSE),
  ('2130', 21, 'وادي الزهور', 'Oued Zhour', 'Oued Zhour', '21014', FALSE),
  ('2131', 21, 'خناق مايو', 'Khenag Maoune', 'Khenag Maoune', '21000', FALSE),
  ('2102', 21, 'القل', 'Collo', 'Collo', '21004', FALSE),
  ('2132', 21, 'الشرايع', 'Cheraia', 'Cheraia', '21031', FALSE),
  ('2133', 21, 'بني زيد', 'Beni Zid', 'Beni Zid', '21011', FALSE),
  ('2134', 21, 'المرسى', 'El Marsa', 'El Marsa', '21038', FALSE),
  ('2135', 21, 'بن عزوز', 'Ben Azzouz', 'Ben Azzouz', '21008', FALSE),
  ('2136', 21, 'بكوش لخضر', 'Bekkouche Lakhdar', 'Bekkouche Lakhdar', '21007', FALSE),
  ('2137', 21, 'فلفلة', 'Filfila', 'Filfila', '21030', FALSE),
  ('2138', 21, 'حمادي كرومة', 'Hammadi Krouma', 'Hammadi Krouma', '21037', FALSE),
  ('2101', 21, 'سكيكدة', 'Skikda', 'Skikda', '21000', TRUE),
  ('2204', 22, 'سيدي علي بن يوب', 'Sidi Ali Benyoub', 'Sidi Ali Benyoub', '22046', FALSE),
  ('2205', 22, 'طابية', 'Tabia', 'Tabia', '22021', FALSE),
  ('2206', 22, 'بوخنفيس', 'Boukhanefis', 'Boukhanefis', '22007', FALSE),
  ('2207', 22, 'مولاي سليسن', 'Moulay Slissen', 'Moulay Slissen', '22018', FALSE),
  ('2208', 22, 'الحصيبة', 'El Hacaiba', 'El Hacaiba', '22019', FALSE),
  ('2209', 22, 'عين تندمين', 'Ain Tindamine', 'Ain Tindamine', '22024', FALSE),
  ('2210', 22, 'تنيرة', 'Tenira', 'Tenira', '22017', FALSE),
  ('2211', 22, 'وادي سفيون', 'Oued Sefioun', 'Oued Sefioun', '22043', FALSE),
  ('2212', 22, 'حاسي دحو', 'Hassi Dahou', 'Hassi Dahou', '22052', FALSE),
  ('2213', 22, 'بن عشيبة شلية', 'Benachiba Chelia', 'Benachiba Chelia', '22051', FALSE),
  ('2214', 22, 'وادي تاوريرة', 'Oued Taourira', 'Oued Taourira', '22031', FALSE),
  ('2215', 22, 'مرين', 'Merine', 'Merine', '22022', FALSE),
  ('2216', 22, 'تفسور', 'Tefessour', 'Tefessour', '22011', FALSE),
  ('2217', 22, 'تاودموت', 'Taoudmout', 'Taoudmout', '22049', FALSE),
  ('2218', 22, 'سيدي يعقوب', 'Sidi Yacoub', 'Sidi Yacoub', '22040', FALSE),
  ('2219', 22, 'سيدي لحسن', 'Sidi Lahcene', 'Sidi Lahcene', '22014', FALSE),
  ('2220', 22, 'سيدي خالد', 'Sidi Khaled', 'Sidi Khaled', '22027', FALSE),
  ('2221', 22, 'العمارنة', 'Amarnas', 'Amarnas', '22012', FALSE),
  ('2222', 22, 'سيدي ابراهيم', 'Sidi Brahim', 'Sidi Brahim', '22003', FALSE),
  ('2223', 22, 'سيدي حمادوش', 'Sidi Hamadouche', 'Sidi Hamadouche', '22041', FALSE),
  ('2224', 22, 'مكدرة', 'Makedra', 'Makedra', '22016', FALSE),
  ('2225', 22, 'عين البرد', 'Ain El Berd', 'Ain El Berd', '22028', FALSE),
  ('2226', 22, 'حاسي زهانة', 'Hassi Zahana', 'Hassi Zahana', '22020', FALSE),
  ('2227', 22, 'شيطوان البلايلة', 'Chetouane Belaila', 'Chetouane Belaila', '22047', FALSE),
  ('2228', 22, 'بن باديس', 'Ben Badis', 'Ben Badis', '22045', FALSE),
  ('2229', 22, 'بضرابين المقراني', 'Bedrabine El Mokrani', 'Bedrabine El Mokrani', '22000', FALSE),
  ('2202', 22, 'سفيزف', 'Sfisef', 'Sfisef', '22002', FALSE),
  ('2230', 22, 'مسيد', 'M''cid', 'M''cid', '22026', FALSE),
  ('2231', 22, 'بوجبهة البرج', 'Boudjebaa El Bordj', 'Boudjebaa El Bordj', '22038', FALSE),
  ('2232', 22, 'عين أدن', 'Ain- Adden', 'Ain- Adden', '22030', FALSE),
  ('2233', 22, 'سيدي شعيب', 'Sidi Chaib', 'Sidi Chaib', '22035', FALSE),
  ('2234', 22, 'مرحوم', 'Marhoum', 'Marhoum', '22010', FALSE),
  ('2235', 22, 'بئر الحمام', 'Bir El Hammam', 'Bir El Hammam', '22048', FALSE),
  ('2236', 22, 'رجم دموش', 'Redjem Demouche', 'Redjem Demouche', '22050', FALSE),
  ('2237', 22, 'راس الماء', 'Ras El Ma', 'Ras El Ma', '22023', FALSE),
  ('2238', 22, 'وادي السبع', 'Oued Sebaa', 'Oued Sebaa', '22000', FALSE),
  ('2201', 22, 'سيدي بلعباس', 'Sidi Bel Abbès', 'Sidi Bel Abbès', '22000', TRUE),
  ('2239', 22, 'عين الثريد', 'Ain Thrid', 'Ain Thrid', '22015', FALSE),
  ('2240', 22, 'السهالة الثورة', 'Sehala Thaoura', 'Sehala Thaoura', '22039', FALSE),
  ('2241', 22, 'تسالة', 'Tessala', 'Tessala', '22002', FALSE),
  ('2242', 22, 'بلعربي', 'Belarbi', 'Belarbi', '22042', FALSE),
  ('2243', 22, 'مصطفى بن ابراهيم', 'Mostefa  Ben Brahim', 'Mostefa  Ben Brahim', '22004', FALSE),
  ('2244', 22, 'تلموني', 'Tilmouni', 'Tilmouni', '22013', FALSE),
  ('2245', 22, 'زروالة', 'Zerouala', 'Zerouala', '22033', FALSE),
  ('2246', 22, 'الضاية', 'Dhaya', 'Dhaya', '22032', FALSE),
  ('2247', 22, 'مزاورو', 'Mezaourou', 'Mezaourou', '22006', FALSE),
  ('2248', 22, 'تغاليمت', 'Teghalimet', 'Teghalimet', '22044', FALSE),
  ('2203', 22, 'تلاغ', 'Telagh', 'Telagh', '22003', FALSE),
  ('2249', 22, 'عين قادة', 'Ain Kada', 'Ain Kada', '22025', FALSE),
  ('2250', 22, 'لمطار', 'Lamtar', 'Lamtar', '22034', FALSE),
  ('2251', 22, 'سيدي علي بوسيدي', 'Sidi Ali Boussidi', 'Sidi Ali Boussidi', '22008', FALSE),
  ('2252', 22, 'سيدي دحو الزاير', 'Sidi Dahou Zairs', 'Sidi Dahou Zairs', '22000', FALSE),
  ('2301', 23, 'عنابة', 'Annaba', 'Annaba', '23000', TRUE),
  ('2304', 23, 'سرايدي', 'Seraïdi', 'Seraïdi', '23006', FALSE),
  ('2305', 23, 'برحال', 'Berrahal', 'Berrahal', '23002', FALSE),
  ('2306', 23, 'واد العنب', 'Oued El Aneb', 'Oued El Aneb', '23006', FALSE),
  ('2307', 23, 'التريعات', 'Treat', 'Treat', '23012', FALSE),
  ('2303', 23, 'الحجار', 'El Hadjar', 'El Hadjar', '23004', FALSE),
  ('2308', 23, 'سيدي عمار', 'Sidi Amar', 'Sidi Amar', '23011', FALSE),
  ('2302', 23, 'البوني', 'El Bouni', 'El Bouni', '23005', FALSE),
  ('2309', 23, 'عين الباردة', 'Ain El Berda', 'Ain El Berda', '23009', FALSE),
  ('2310', 23, 'الشرفة', 'Cheurfa', 'Cheurfa', '29043', FALSE),
  ('2311', 23, 'العلمة', 'El Eulma', 'El Eulma', '23004', FALSE),
  ('2312', 23, 'شطايبي', 'Chetaibi', 'Chetaibi', '23010', FALSE),
  ('2403', 24, 'نشماية', 'Nechmaya', 'Nechmaya', '24002', FALSE),
  ('2404', 24, 'بومهرة أحمد', 'Boumahra Ahmed', 'Boumahra Ahmed', '24031', FALSE),
  ('2405', 24, 'جبالة الخميسي', 'Djeballah Khemissi', 'Djeballah Khemissi', '24034', FALSE),
  ('2406', 24, 'بلخير', 'Belkheir', 'Belkheir', '24010', FALSE),
  ('2407', 24, 'بني مزلين', 'Beni Mezline', 'Beni Mezline', '24016', FALSE),
  ('2408', 24, 'قلعة بوصبع', 'Guelaat Bou Sbaa', 'Guelaat Bou Sbaa', '24018', FALSE),
  ('2409', 24, 'بوحمدان', 'Bou Hamdane', 'Bou Hamdane', '24012', FALSE),
  ('2410', 24, 'حمام دباغ', 'Hammam Debagh', 'Hammam Debagh', '24000', FALSE),
  ('2411', 24, 'الركنية', 'Roknia', 'Roknia', '24028', FALSE),
  ('2412', 24, 'الدهوارة', 'Dahouara', 'Dahouara', '24009', FALSE),
  ('2413', 24, 'حمام النبايل', 'Hammam N''bail', 'Hammam N''bail', '24022', FALSE),
  ('2414', 24, 'وادي الشحم', 'Oued Cheham', 'Oued Cheham', '24033', FALSE),
  ('2401', 24, 'قالمة', 'Guelma', 'Guelma', '24000', TRUE),
  ('2415', 24, 'بن جراح', 'Bendjarah', 'Bendjarah', '24011', FALSE),
  ('2416', 24, 'عين بن بيضاء', 'Ain Ben Beida', 'Ain Ben Beida', '24014', FALSE),
  ('2417', 24, 'بوشقوف', 'Bouchegouf', 'Bouchegouf', '24025', FALSE),
  ('2418', 24, 'مجاز الصفاء', 'Medjez Sfa', 'Medjez Sfa', '24030', FALSE),
  ('2419', 24, 'وادي فراغة', 'Oued Ferragha', 'Oued Ferragha', '24006', FALSE),
  ('2420', 24, 'بوعاتي محمود', 'Bouati Mahmoud', 'Bouati Mahmoud', '24003', FALSE),
  ('2421', 24, 'الفجوج', 'El Fedjoudj', 'El Fedjoudj', '24020', FALSE),
  ('2422', 24, 'هيليوبوليس', 'Heliopolis', 'Heliopolis', '24026', FALSE),
  ('2423', 24, 'مجاز عمار', 'Medjez Amar', 'Medjez Amar', '24024', FALSE),
  ('2424', 24, 'هواري بومدين', 'Houari Boumedienne', 'Houari Boumedienne', '24027', FALSE),
  ('2425', 24, 'رأس العقبة', 'Ras El Agba', 'Ras El Agba', '24008', FALSE),
  ('2426', 24, 'سلاوة عنونة', 'Sellaoua Announa', 'Sellaoua Announa', '24029', FALSE),
  ('2427', 24, 'برج صباط', 'Bordj Sabath', 'Bordj Sabath', '24021', FALSE),
  ('2402', 24, 'وادي الزناتي', 'Oued Zenati', 'Oued Zenati', '24002', FALSE),
  ('2428', 24, 'عين رقادة', 'Ain Regada', 'Ain Regada', '24032', FALSE),
  ('2429', 24, 'عين العربي', 'Ain Larbi', 'Ain Larbi', '24023', FALSE),
  ('2430', 24, 'عين مخلوف', 'Ain Makhlouf', 'Ain Makhlouf', '24013', FALSE),
  ('2431', 24, 'تاملوكة', 'Tamlouka', 'Tamlouka', '24005', FALSE),
  ('2432', 24, 'عين صندل', 'Ain Sandel', 'Ain Sandel', '24007', FALSE),
  ('2433', 24, 'بوحشانة', 'Bou Hachana', 'Bou Hachana', '24017', FALSE),
  ('2434', 24, 'لخزارة', 'Khezaras', 'Khezaras', '24000', FALSE),
  ('2503', 25, 'ديدوش مراد', 'Didouche Mourad', 'Didouche Mourad', '25005', FALSE),
  ('2504', 25, 'حامة بوزيان', 'Hamma Bouziane', 'Hamma Bouziane', '25002', FALSE),
  ('2505', 25, 'بني حميدان', 'Beni Hamidane', 'Beni Hamidane', '25008', FALSE),
  ('2506', 25, 'زيغود يوسف', 'Zighoud Youcef', 'Zighoud Youcef', '25004', FALSE),
  ('2507', 25, 'عين السمارة', 'Ain Smara', 'Ain Smara', '25010', FALSE),
  ('2502', 25, 'الخروب', 'El Khroub', 'El Khroub', '25100', FALSE),
  ('2508', 25, 'أولاد رحمون', 'Ouled Rahmoun', 'Ouled Rahmoun', '25009', FALSE),
  ('2509', 25, 'عين عبيد', 'Ain Abid', 'Ain Abid', '25007', FALSE),
  ('2510', 25, 'أبن باديس الهرية', 'Ben Badis', 'Ben Badis', '22045', FALSE),
  ('2511', 25, 'ابن زياد', 'Ibn Ziad', 'Ibn Ziad', '25012', FALSE),
  ('2512', 25, 'بوجريو مسعود', 'Messaoud Boudjeriou', 'Messaoud Boudjeriou', '25000', FALSE),
  ('2501', 25, 'قسنطينة', 'Constantine', 'Constantine', '25000', TRUE),
  ('2603', 26, 'السواقي', 'Souagui', 'Souagui', '26033', FALSE),
  ('2604', 26, 'جواب', 'Djouab', 'Djouab', '26037', FALSE),
  ('2605', 26, 'سيدي زهار', 'Sidi Zahar', 'Sidi Zahar', '26028', FALSE),
  ('2606', 26, 'سيدي زيان', 'Sidi Ziane', 'Sidi Ziane', '26014', FALSE),
  ('2607', 26, 'العزيزية', 'Al Azizia', 'Al Azizia', '26036', FALSE),
  ('2608', 26, 'مغراوة', 'Meghraoua', 'Meghraoua', '26039', FALSE),
  ('2609', 26, 'ميهوب', 'Mihoub', 'Mihoub', '26050', FALSE),
  ('2610', 26, 'حناشة', 'Hannacha', 'Hannacha', '26060', FALSE),
  ('2611', 26, 'عوامري', 'Ouamri', 'Ouamri', '26043', FALSE),
  ('2612', 26, 'وادي حربيل', 'Oued Harbil', 'Oued Harbil', '26029', FALSE),
  ('2613', 26, 'بني سليمان', 'Beni Slimane', 'Beni Slimane', '26046', FALSE),
  ('2614', 26, 'بوسكن', 'Bouskene', 'Bouskene', '26019', FALSE),
  ('2615', 26, 'سيدي الربيع', 'Sidi Errabie', 'Sidi Errabie', '26055', FALSE),
  ('2616', 26, 'بوعيشون', 'Bouaichoune', 'Bouaichoune', '26059', FALSE),
  ('2617', 26, 'أولاد بوعشرة', 'Ouled Bouachra', 'Ouled Bouachra', '26027', FALSE),
  ('2618', 26, 'سي المحجوب', 'Si Mahdjoub', 'Si Mahdjoub', '26044', FALSE),
  ('2602', 26, 'البرواقية', 'Berrouaghia', 'Berrouaghia', '26002', FALSE),
  ('2619', 26, 'أولاد دايد', 'Ouled Deide', 'Ouled Deide', '26006', FALSE),
  ('2620', 26, 'الربعية', 'Rebaia', 'Rebaia', '26020', FALSE),
  ('2621', 26, 'مجبر', 'Medjebar', 'Medjebar', '26062', FALSE),
  ('2622', 26, 'ثلاث دوائر', 'Eddouair', 'Eddouair', '26000', FALSE),
  ('2623', 26, 'الزبيرية', 'Zoubiria', 'Zoubiria', '26034', FALSE),
  ('2624', 26, 'سغوان', 'Seghouane', 'Seghouane', '26048', FALSE),
  ('2625', 26, 'العيساوية', 'Aissaouia', 'Aissaouia', '26005', FALSE),
  ('2626', 26, 'الحوضان', 'El Hamdania', 'El Hamdania', '26016', FALSE),
  ('2601', 26, 'المدية', 'Médéa', 'Médéa', '26000', TRUE),
  ('2627', 26, 'تابلاط', 'Tablat', 'Tablat', '26052', FALSE),
  ('2628', 26, 'ذراع السمار', 'Draa Essamar', 'Draa Essamar', '26054', FALSE),
  ('2629', 26, 'المدية', 'Ouzera', 'Ouzera', '26001', TRUE),
  ('2630', 26, 'تمسقيدة', 'Tamezguida', 'Tamezguida', '26000', FALSE),
  ('2631', 26, 'بن شكاو', 'Benchicao', 'Benchicao', '26030', FALSE),
  ('2632', 26, 'الحمدانية', 'El Omaria', 'El Omaria', '26016', FALSE),
  ('2633', 26, 'وزرة', 'Baata', 'Baata', '26002', FALSE),
  ('2634', 26, 'تيزي مهدي', 'Tizi Mahdi', 'Tizi Mahdi', '26013', FALSE),
  ('2635', 26, 'بعطة', 'Sedraia', 'Sedraia', '26024', FALSE),
  ('2636', 26, 'العمارية', 'Mezghenna', 'Mezghenna', '26007', FALSE),
  ('2637', 26, 'أولاد إبراهيم', 'Ouled Brahim', 'Ouled Brahim', '26012', FALSE),
  ('2638', 26, 'بئر بن عابد', 'Bir Ben Abed', 'Bir Ben Abed', '26000', FALSE),
  ('2639', 26, 'القلب الكبير', 'El Guelb El Kebir', 'El Guelb El Kebir', '26009', FALSE),
  ('2640', 26, 'سدراية', 'Sidi Naamane', 'Sidi Naamane', '26061', FALSE),
  ('2641', 26, 'بوشراحيل', 'Bouchrahil', 'Bouchrahil', '26021', FALSE),
  ('2642', 26, 'خمس جوامع', 'Khamsa Djoumaa', 'Khamsa Djoumaa', '26063', FALSE),
  ('2643', 26, 'سيدي نعمان', 'Deux Bassins', 'Deux Bassins', '26026', FALSE),
  ('2703', 27, 'فرناقة', 'Fornaka', 'Fornaka', '27003', FALSE),
  ('2704', 27, 'الحسيان (بني ياحي', 'Hassiane', 'Hassiane', '27000', FALSE),
  ('2705', 27, 'عين نويسي', 'Ain-Nouissy', 'Ain-Nouissy', '27005', FALSE),
  ('2706', 27, 'وادي الخير', 'Oued El Kheir', 'Oued El Kheir', '27009', FALSE),
  ('2702', 27, 'عين تادلس', 'Aïn Tedeles', 'Aïn Tedeles', '27002', FALSE),
  ('2707', 27, 'سيدي بلعطار', 'Sidi Belaattar', 'Sidi Belaattar', '27000', FALSE),
  ('2708', 27, 'سور', 'Sour', 'Sour', '27008', FALSE),
  ('2709', 27, 'حاسي ماماش', 'Hassi Mameche', 'Hassi Mameche', '27000', FALSE),
  ('2710', 27, 'مزغران', 'Mazagran', 'Mazagran', '27027', FALSE),
  ('2711', 27, 'ستيدية', 'Stidia', 'Stidia', '27004', FALSE),
  ('2712', 27, 'عين بودينار', 'Ain-Boudinar', 'Ain-Boudinar', '27028', FALSE),
  ('2713', 27, 'خير الدين', 'Kheir-Eddine', 'Kheir-Eddine', '27011', FALSE),
  ('2714', 27, 'صيادة', 'Sayada', 'Sayada', '27002', FALSE),
  ('2715', 27, 'سيدي علي', 'Sidi Ali', 'Sidi Ali', '27012', FALSE),
  ('2716', 27, 'تزقايت', 'Tazgait', 'Tazgait', '27029', FALSE),
  ('2717', 27, 'أولاد مع الله', 'Ouled-Maalah', 'Ouled-Maalah', '27026', FALSE),
  ('2718', 27, 'بن عبد المالك رمضان', 'Benabdelmalek Ramdane', 'Benabdelmalek Ramdane', '27000', FALSE),
  ('2719', 27, 'حجاج', 'Hadjadj', 'Hadjadj', '27014', FALSE),
  ('2720', 27, 'سيدي لخضر', 'Sidi-Lakhdar', 'Sidi-Lakhdar', '44024', FALSE),
  ('2701', 27, 'مستغانم', 'Mostaganem', 'Mostaganem', '27000', TRUE),
  ('2721', 27, 'عشعاشة', 'Achaacha', 'Achaacha', '27017', FALSE),
  ('2722', 27, 'خضرة', 'Khadra', 'Khadra', '27018', FALSE),
  ('2723', 27, 'نكمارية', 'Nekmaria', 'Nekmaria', '27015', FALSE),
  ('2724', 27, 'أولاد بوغالم', 'Ouled Boughalem', 'Ouled Boughalem', '27025', FALSE),
  ('2725', 27, 'بوقيراط', 'Bouguirat', 'Bouguirat', '27019', FALSE),
  ('2726', 27, 'صفصاف', 'Safsaf', 'Safsaf', '27030', FALSE),
  ('2727', 27, 'سيرات', 'Sirat', 'Sirat', '27020', FALSE),
  ('2728', 27, 'السوافلية', 'Souaflia', 'Souaflia', '27024', FALSE),
  ('2729', 27, 'عين سيدي الشريف', 'Ain-Sidi Cherif', 'Ain-Sidi Cherif', '27021', FALSE),
  ('2730', 27, 'ماسرة', 'Mesra', 'Mesra', '27022', FALSE),
  ('2731', 27, 'الطواهرية', 'Touahria', 'Touahria', '27031', FALSE),
  ('2732', 27, 'منصورة', 'Mansourah', 'Mansourah', '47013', FALSE),
  ('2801', 28, 'المسيلة', 'M’Sila', 'M’Sila', '28001', TRUE),
  ('2803', 28, 'شلال', 'Chellal', 'Chellal', '28009', FALSE),
  ('2804', 28, 'أولاد ماضي', 'Ouled Madhi', 'Ouled Madhi', '28010', FALSE),
  ('2805', 28, 'خطوطي سد الجير', 'Khetouti Sed El Djir', 'Khetouti Sed El Djir', '28032', FALSE),
  ('2806', 28, 'المعاريف', 'Maarif', 'Maarif', '28029', FALSE),
  ('2807', 28, 'مقرة', 'Magra', 'Magra', '28011', FALSE),
  ('2808', 28, 'برهوم', 'Berhoum', 'Berhoum', '28012', FALSE),
  ('2809', 28, 'عين الخضراء', 'Ain Khadra', 'Ain Khadra', '28013', FALSE),
  ('2810', 28, 'بلعايبة', 'Belaiba', 'Belaiba', '28015', FALSE),
  ('2811', 28, 'دهاهنة', 'Dehahna', 'Dehahna', '28030', FALSE),
  ('2802', 28, 'سيدي عيسى', 'Sidi Aïssa', 'Sidi Aïssa', '28002', FALSE),
  ('2812', 28, 'بوطي السايح', 'Bouti Sayah', 'Bouti Sayah', '28031', FALSE),
  ('2813', 28, 'بني يلمان', 'Beni Ilmane', 'Beni Ilmane', '28045', FALSE),
  ('2814', 28, 'عين الحجل', 'Ain El Hadjel', 'Ain El Hadjel', '28017', FALSE),
  ('2815', 28, 'سيدي هجرس', 'Sidi Hadjeres', 'Sidi Hadjeres', '28018', FALSE),
  ('2816', 28, 'حمام الضلعة', 'Hammam Dhalaa', 'Hammam Dhalaa', '28003', FALSE),
  ('2817', 28, 'ونوغة', 'Ouanougha', 'Ouanougha', '28019', FALSE),
  ('2818', 28, 'أولاد منصور', 'Ouled Mansour', 'Ouled Mansour', '28028', FALSE),
  ('2819', 28, 'تارمونت', 'Tarmount', 'Tarmount', '28005', FALSE),
  ('2820', 28, 'أولاد دراج', 'Ouled Derradj', 'Ouled Derradj', '28004', FALSE),
  ('2821', 28, 'السوامع', 'Souamaa', 'Souamaa', '28040', FALSE),
  ('2822', 28, 'أولاد عدي لقبالة', 'Ouled Addi Guebala', 'Ouled Addi Guebala', '28014', FALSE),
  ('2823', 28, 'المعاضيد', 'Maadid', 'Maadid', '28002', FALSE),
  ('2824', 28, 'امطارفة', 'M’Tarfa', 'M’Tarfa', '28006', FALSE),
  ('2903', 29, 'وادي الأبطال', 'Oued El Abtal', 'Oued El Abtal', '29010', FALSE),
  ('2904', 29, 'سيدي عبد الجبار', 'Sidi Abdeldjebar', 'Sidi Abdeldjebar', '29046', FALSE),
  ('2905', 29, 'عين فراح', 'Ain Ferah', 'Ain Ferah', '29011', FALSE),
  ('2906', 29, 'سيدي عبد المومن', 'Sidi Abdelmoumene', 'Sidi Abdelmoumene', '29032', FALSE),
  ('2907', 29, 'سجرارة', 'Sedjerara', 'Sedjerara', '29035', FALSE),
  ('2908', 29, 'مقطع الدوز', 'Mocta-Douz', 'Mocta-Douz', '29036', FALSE),
  ('2909', 29, 'فراقيق', 'Ferraguig', 'Ferraguig', '29033', FALSE),
  ('2910', 29, 'الغمري', 'El Ghomri', 'El Ghomri', '29034', FALSE),
  ('2911', 29, 'المحمدية', 'Mohammadia', 'Mohammadia', '29031', FALSE),
  ('2912', 29, 'تيغنيف', 'Tighennif', 'Tighennif', '29006', FALSE),
  ('2913', 29, 'سيدي قادة', 'Sidi Kada', 'Sidi Kada', '29008', FALSE),
  ('2914', 29, 'السهايلية', 'Sehailia', 'Sehailia', '29047', FALSE),
  ('2915', 29, 'زهانة', 'Zahana', 'Zahana', '29030', FALSE),
  ('2916', 29, 'القعدة', 'El Gaada', 'El Gaada', '29029', FALSE),
  ('2917', 29, 'رأس عين عميروش', 'Ras El Ain Amirouche', 'Ras El Ain Amirouche', '29000', FALSE),
  ('2918', 29, 'عقاز', 'Oggaz', 'Oggaz', '29027', FALSE),
  ('2919', 29, 'العلايمية', 'Alaimia', 'Alaimia', '29028', FALSE),
  ('2902', 29, 'سيق', 'Sig', 'Sig', '29002', FALSE),
  ('2920', 29, 'الشرفاء', 'Chorfa', 'Chorfa', '10017', FALSE),
  ('2921', 29, 'بوهني', 'Bou Henni', 'Bou Henni', '29037', FALSE),
  ('2922', 29, 'المأمونية', 'El Mamounia', 'El Mamounia', '29039', FALSE),
  ('2923', 29, 'القطنة', 'El Gueitena', 'El Gueitena', '29000', FALSE),
  ('2924', 29, 'بوحنيفية', 'Bouhanifia', 'Bouhanifia', '29002', FALSE),
  ('2925', 29, 'حسين', 'Hacine', 'Hacine', '29004', FALSE),
  ('2926', 29, 'عين فارس', 'Ain Fares', 'Ain Fares', '29024', FALSE),
  ('2927', 29, 'غروس', 'Gharrous', 'Gharrous', '29041', FALSE),
  ('2928', 29, 'بنيان', 'Benian', 'Benian', '29019', FALSE),
  ('2929', 29, 'عوف', 'Aouf', 'Aouf', '29023', FALSE),
  ('2930', 29, 'قرجوم', 'Guerdjoum', 'Guerdjoum', '29000', FALSE),
  ('2931', 29, 'وادي التاغية', 'Oued Taria', 'Oued Taria', '29022', FALSE),
  ('2932', 29, 'عين أفرص', 'Ain Frass', 'Ain Frass', '29025', FALSE),
  ('2933', 29, 'عين فكان', 'Ain Fekan', 'Ain Fekan', '29018', FALSE),
  ('2934', 29, 'خلوية', 'Khalouia', 'Khalouia', '29020', FALSE),
  ('2935', 29, 'المنور', 'El Menaouer', 'El Menaouer', '29021', FALSE),
  ('2936', 29, 'البرج', 'El Bordj', 'El Bordj', '29017', FALSE),
  ('2937', 29, 'سيدي بوسعيد', 'Sidi Boussaid', 'Sidi Boussaid', '29016', FALSE),
  ('2938', 29, 'المطمور', 'Matemore', 'Matemore', '29014', FALSE),
  ('2939', 29, 'ماقضة', 'Makhda', 'Makhda', '29015', FALSE),
  ('2940', 29, 'غريس', 'Ghriss', 'Ghriss', '29012', FALSE),
  ('2941', 29, 'ماوسة', 'Maoussa', 'Maoussa', '29005', FALSE),
  ('2901', 29, 'معسكر', 'Mascara', 'Mascara', '29000', TRUE),
  ('2942', 29, 'القرط', 'El Keurt', 'El Keurt', '29040', FALSE),
  ('2943', 29, 'فروحة', 'Froha', 'Froha', '29013', FALSE),
  ('2944', 29, 'تيزي', 'Tizi', 'Tizi', '29003', FALSE),
  ('2945', 29, 'الحشم', 'El Hachem', 'El Hachem', '29007', FALSE),
  ('2946', 29, 'نسمط', 'Nesmot', 'Nesmot', '29045', FALSE),
  ('2947', 29, 'زلامطة', 'Zelamta', 'Zelamta', '29000', FALSE),
  ('3001', 30, 'ورقلة', 'Ouargla', 'Ouargla', '30000', TRUE),
  ('3003', 30, 'الرويسات', 'Rouissat', 'Rouissat', '30005', FALSE),
  ('3002', 30, 'حاسي مسعود', 'Hassi Messaoud', 'Hassi Messaoud', '30500', FALSE),
  ('3004', 30, 'عين البيضاء', 'Ain Beida', 'Ain Beida', '30002', FALSE),
  ('3005', 30, 'حاسي بن عبد الله', 'Hassi Ben Abdellah', 'Hassi Ben Abdellah', '30012', FALSE),
  ('3006', 30, 'سيدي خويلد', 'Sidi Khouiled', 'Sidi Khouiled', '30011', FALSE),
  ('3007', 30, 'البرمة', 'El Borma', 'El Borma', '30021', FALSE),
  ('3008', 30, 'انقوسة', 'N''goussa', 'N''goussa', '30003', FALSE),
  ('3106', 31, 'سيدي الشحمي', 'Sidi Chami', 'Sidi Chami', '31013', FALSE),
  ('3107', 31, 'الكرمة', 'El Kerma', 'El Kerma', '31017', FALSE),
  ('3102', 31, 'السانية', 'Es Senia', 'Es Senia', '31004', FALSE),
  ('3108', 31, 'حاسي مفسوخ', 'Hassi Mefsoukh', 'Hassi Mefsoukh', '31021', FALSE),
  ('3109', 31, 'قديل', 'Gdyel', 'Gdyel', '31002', FALSE),
  ('3110', 31, 'بن فريحة', 'Ben Freha', 'Ben Freha', '31020', FALSE),
  ('3103', 31, 'بئر الجير', 'Bir El Djir', 'Bir El Djir', '31011', FALSE),
  ('3111', 31, 'حاسي بن عقبة', 'Hassi Ben Okba', 'Hassi Ben Okba', '31019', FALSE),
  ('3112', 31, 'حاسي بونيف', 'Hassi Bounif', 'Hassi Bounif', '31004', FALSE),
  ('3105', 31, 'أرزيو', 'Arzew', 'Arzew', '31200', FALSE),
  ('3113', 31, 'سيدي بن يبقى', 'Sidi Ben Yebka', 'Sidi Ben Yebka', '31022', FALSE),
  ('3114', 31, 'عين البية', 'Ain Biya', 'Ain Biya', '31026', FALSE),
  ('3115', 31, 'بطيوة', 'Bethioua', 'Bethioua', '31007', FALSE),
  ('3116', 31, 'مرسى الحجاج', 'Marsat El Hadjadj', 'Marsat El Hadjadj', '31008', FALSE),
  ('3104', 31, 'عين الترك', 'Aïn El Turk', 'Aïn El Turk', '31003', FALSE),
  ('3101', 31, 'وهران', 'Oran', 'Oran', '31000', TRUE),
  ('3117', 31, 'العنصر', 'El Ancor', 'El Ancor', '31010', FALSE),
  ('3118', 31, 'المرسى الكبير', 'Mers El Kebir', 'Mers El Kebir', '31015', FALSE),
  ('3119', 31, 'بوسفر', 'Bousfer', 'Bousfer', '31016', FALSE),
  ('3120', 31, 'بوفاتيس', 'Boufatis', 'Boufatis', '31014', FALSE),
  ('3121', 31, 'البراية', 'El Braya', 'El Braya', '31018', FALSE),
  ('3122', 31, 'وادي تليلات', 'Oued Tlelat', 'Oued Tlelat', '31011', FALSE),
  ('3123', 31, 'طفراوي', 'Tafraoui', 'Tafraoui', '31012', FALSE),
  ('3124', 31, 'عين الكرمة', 'Ain Kerma', 'Ain Kerma', '36021', FALSE),
  ('3125', 31, 'بوتليليس', 'Boutlelis', 'Boutlelis', '31024', FALSE),
  ('3126', 31, 'مسرغين', 'Messerghin', 'Messerghin', '31023', FALSE),
  ('3201', 32, 'البيض', 'El Bayadh', 'El Bayadh', '32000', TRUE),
  ('3203', 32, 'رقاصة', 'Rogassa', 'Rogassa', '32002', FALSE),
  ('3204', 32, 'الشقيق', 'Cheguig', 'Cheguig', '32017', FALSE),
  ('3205', 32, 'الكاف الأحمر', 'Kef El Ahmar', 'Kef El Ahmar', '32012', FALSE),
  ('3202', 32, 'بريزينة', 'Brezina', 'Brezina', '32002', FALSE),
  ('3206', 32, 'غسول', 'Ghassoul', 'Ghassoul', '32005', FALSE),
  ('3207', 32, 'كراكدة', 'Krakda', 'Krakda', '32015', FALSE),
  ('3208', 32, 'بوقطب', 'Bougtob', 'Bougtob', '32010', FALSE),
  ('3209', 32, 'الخيثر', 'El Kheither', 'El Kheither', '32011', FALSE),
  ('3210', 32, 'توسمولين', 'Tousmouline', 'Tousmouline', '32020', FALSE),
  ('3211', 32, 'بوعلام', 'Boualem', 'Boualem', '32006', FALSE),
  ('3212', 32, 'سيدي سليمان', 'Sidi Slimane', 'Sidi Slimane', '38020', FALSE),
  ('3213', 32, 'سيدي طيفور', 'Sidi Tifour', 'Sidi Tifour', '32022', FALSE),
  ('3214', 32, 'ستيتن', 'Stitten', 'Stitten', '32003', FALSE),
  ('3215', 32, 'سيدي عامر', 'Sidi Amar', 'Sidi Amar', '32018', FALSE),
  ('3303', 33, 'برج عمر إدريس', 'Bordj Omar Driss', 'Bordj Omar Driss', '33004', FALSE),
  ('3304', 33, 'دبداب', 'Debdeb', 'Debdeb', '33003', FALSE),
  ('3302', 33, 'إن أمناس', 'In Amenas', 'In Amenas', '33001', FALSE),
  ('3301', 33, 'إليزي', 'Illizi', 'Illizi', '33000', TRUE),
  ('3401', 34, 'الحمادية', 'Elhammadia', 'Elhammadia', '34011', FALSE),
  ('3403', 34, 'العش', 'El Euch', 'El Euch', '34027', FALSE),
  ('3404', 34, 'القصور', 'Ksour', 'Ksour', '34022', FALSE),
  ('3405', 34, 'الرابطة', 'Rabta', 'Rabta', '34033', FALSE),
  ('3406', 34, 'أولاد سيدي ابراهيم', 'Ouled Sidi-Brahim', 'Ouled Sidi-Brahim', '28021', FALSE),
  ('3407', 34, 'عين تاغروت', 'Ain Taghrout', 'Ain Taghrout', '34008', FALSE),
  ('3408', 34, 'تيكستار', 'Tixter', 'Tixter', '34026', FALSE),
  ('3409', 34, 'بليمور', 'Belimour', 'Belimour', '34012', FALSE),
  ('3410', 34, 'العناصر', 'El Annasseur', 'El Annasseur', '34028', FALSE),
  ('3411', 34, 'غيلاسة', 'Ghailasa', 'Ghailasa', '34032', FALSE),
  ('3412', 34, 'تقلعيت', 'Taglait', 'Taglait', '34021', FALSE),
  ('3413', 34, 'برج الغدير', 'Bordj Ghedir', 'Bordj Ghedir', '34000', FALSE),
  ('3414', 34, 'سيدي أمبارك', 'Sidi-Embarek', 'Sidi-Embarek', '34010', FALSE),
  ('3415', 34, 'خليل', 'Khelil', 'Khelil', '34020', FALSE),
  ('3416', 34, 'بئر قاصد علي', 'Bir Kasdali', 'Bir Kasdali', '34031', FALSE),
  ('3417', 34, 'تفرق', 'Tefreg', 'Tefreg', '34000', FALSE),
  ('3418', 34, 'الماين', 'El Main', 'El Main', '44034', FALSE),
  ('3419', 34, 'جعافرة', 'Djaafra', 'Djaafra', '34015', FALSE),
  ('3420', 34, 'القلة', 'Colla', 'Colla', '34025', FALSE),
  ('3421', 34, 'ثنية النصر', 'Teniet En Nasr', 'Teniet En Nasr', '34014', FALSE),
  ('3422', 34, 'الياشير', 'El Achir', 'El Achir', '34007', FALSE),
  ('3423', 34, 'حسناوة', 'Hasnaoua', 'Hasnaoua', '34019', FALSE),
  ('3424', 34, 'مجانة', 'Medjana', 'Medjana', '34013', FALSE),
  ('3425', 34, 'المهير', 'El M''hir', 'El M''hir', '34005', FALSE),
  ('3426', 34, 'المنصورة', 'Mansoura', 'Mansoura', '47013', FALSE),
  ('3427', 34, 'حرازة', 'Haraza', 'Haraza', '34034', FALSE),
  ('3428', 34, 'بن داود', 'Ben Daoud', 'Ben Daoud', '48035', FALSE),
  ('3429', 34, 'عين تسرة', 'Ain Tesra', 'Ain Tesra', '34030', FALSE),
  ('3430', 34, 'أولاد أبراهم', 'Ouled Brahem', 'Ouled Brahem', '34017', FALSE),
  ('3402', 34, 'راس الوادي', 'Ras El Oued', 'Ras El Oued', '34002', FALSE),
  ('3431', 34, 'برج زمورة', 'Bordj Zemmoura', 'Bordj Zemmoura', '34003', FALSE),
  ('3432', 34, 'أولاد دحمان', 'Ouled Dahmane', 'Ouled Dahmane', '34018', FALSE),
  ('3433', 34, 'تسامرت', 'Tassamert', 'Tassamert', '34000', FALSE),
  ('3434', 34, 'برج بوعريرج', 'B. B. Arreridj', 'B. B. Arreridj', '34000', FALSE),
  ('3504', 35, 'الخروبة', 'El Kharrouba', 'El Kharrouba', '35038', FALSE),
  ('3505', 35, 'بوزقزة قدارة', 'Bouzegza Keddara', 'Bouzegza Keddara', '35022', FALSE),
  ('3506', 35, 'أولاد هداج', 'Ouled Hedadj', 'Ouled Hedadj', '35033', FALSE),
  ('3507', 35, 'بودواو', 'Boudouaou', 'Boudouaou', '35002', FALSE),
  ('3508', 35, 'بودواو البحري', 'Boudouaou El Bahri', 'Boudouaou El Bahri', '35032', FALSE),
  ('3503', 35, 'دلس', 'Dellys', 'Dellys', '35003', FALSE),
  ('3509', 35, 'بن شود', 'Ben Choud', 'Ben Choud', '35027', FALSE),
  ('3510', 35, 'أعفير', 'Afir', 'Afir', '35004', FALSE),
  ('3511', 35, 'الثنية', 'Thenia', 'Thenia', '35015', FALSE),
  ('3512', 35, 'بني عمران', 'Beni Amrane', 'Beni Amrane', '35030', FALSE),
  ('3513', 35, 'عمال', 'Ammal', 'Ammal', '35029', FALSE),
  ('3514', 35, 'سوق الحد', 'Souk El Had', 'Souk El Had', '48031', FALSE),
  ('3515', 35, 'خميس الخشنة', 'Khemis El Khechna', 'Khemis El Khechna', '35037', FALSE),
  ('3516', 35, 'الاربعطاش', 'Larbatache', 'Larbatache', '35021', FALSE),
  ('3517', 35, 'أولاد موسى', 'Ouled Moussa', 'Ouled Moussa', '35020', FALSE),
  ('3518', 35, 'حمادي', 'Hammedi', 'Hammedi', '35036', FALSE),
  ('3519', 35, 'تيمزريت', 'Timezrit', 'Timezrit', '06007', FALSE),
  ('3520', 35, 'زموري', 'Zemmouri', 'Zemmouri', '35011', FALSE),
  ('3521', 35, 'لقاطة', 'Leghata', 'Leghata', '35035', FALSE),
  ('3522', 35, 'جنات', 'Djinet', 'Djinet', '35009', FALSE),
  ('3502', 35, 'برج منايل', 'Bordj Menaïel', 'Bordj Menaïel', '35002', FALSE),
  ('3523', 35, 'يسر', 'Isser', 'Isser', '35010', FALSE),
  ('3524', 35, 'شعبة العامر', 'Chabet El Ameur', 'Chabet El Ameur', '35014', FALSE),
  ('3525', 35, 'سي مصطفى', 'Si Mustapha', 'Si Mustapha', '35012', FALSE),
  ('3526', 35, 'أولاد عيسى', 'Ouled Aissa', 'Ouled Aissa', '35026', FALSE),
  ('3527', 35, 'الناصرية', 'Naciria', 'Naciria', '35008', FALSE),
  ('3528', 35, 'سيدي داود', 'Sidi Daoud', 'Sidi Daoud', '35007', FALSE),
  ('3529', 35, 'بغلية', 'Baghlia', 'Baghlia', '35006', FALSE),
  ('3530', 35, 'تاورقة', 'Taourga', 'Taourga', '35025', FALSE),
  ('3531', 35, 'تيجلابين', 'Tidjelabine', 'Tidjelabine', '35013', FALSE),
  ('3501', 35, 'بومرداس', 'Boumerdès', 'Boumerdès', '35000', TRUE),
  ('3532', 35, 'قورصو', 'Corso', 'Corso', '35019', FALSE),
  ('3603', 36, 'عين العسل', 'Ain El Assel', 'Ain El Assel', '36006', FALSE),
  ('3604', 36, 'بوقوس', 'Bougous', 'Bougous', '36004', FALSE),
  ('3601', 36, 'الطارف', 'El Tarf', 'El Tarf', '36000', TRUE),
  ('3605', 36, 'الزيتونة', 'Zitouna', 'Zitouna', '36020', FALSE),
  ('3606', 36, 'البسباس', 'Besbes', 'Besbes', '36016', FALSE),
  ('3607', 36, 'زريزر', 'Zerizer', 'Zerizer', '36019', FALSE),
  ('3608', 36, 'عصفور', 'Asfour', 'Asfour', '36017', FALSE),
  ('3609', 36, 'عين الكرمة', 'Ain Kerma', 'Ain Kerma', '36021', FALSE),
  ('3610', 36, 'بوحجار', 'Bouhadjar', 'Bouhadjar', '36002', FALSE),
  ('3611', 36, 'حمام بني صالح', 'Hammam Beni Salah', 'Hammam Beni Salah', '36023', FALSE),
  ('3612', 36, 'وادي الزيتون', 'Oued Zitoun', 'Oued Zitoun', '36022', FALSE),
  ('3613', 36, 'بن مهيدي', 'Ben M Hidi', 'Ben M Hidi', '36003', FALSE),
  ('3614', 36, 'بريحان', 'Berrihane', 'Berrihane', '36010', FALSE),
  ('3615', 36, 'الشط', 'Echatt', 'Echatt', '36018', FALSE),
  ('3616', 36, 'شبيطة مختار', 'Chebaita Mokhtar', 'Chebaita Mokhtar', '36015', FALSE),
  ('3617', 36, 'شحاني', 'Chihani', 'Chihani', '36014', FALSE),
  ('3618', 36, 'الذرعـان', 'Drean', 'Drean', '36013', FALSE),
  ('3619', 36, 'العيون', 'El Aioun', 'El Aioun', '38010', FALSE),
  ('3602', 36, 'القالة', 'El Kala', 'El Kala', '36001', FALSE),
  ('3620', 36, 'السوارخ', 'Souarekh', 'Souarekh', '36009', FALSE),
  ('3621', 36, 'رمل السوق', 'Raml Souk', 'Raml Souk', '36024', FALSE),
  ('3622', 36, 'بوثلجة', 'Bouteldja', 'Bouteldja', '36008', FALSE),
  ('3623', 36, 'الشافية', 'Chefia', 'Chefia', '36012', FALSE),
  ('3624', 36, 'بحيرة الطيور', 'Lac Des Oiseaux', 'Lac Des Oiseaux', '36011', FALSE),
  ('3701', 37, 'تندوف', 'Tindouf', 'Tindouf', '37000', TRUE),
  ('3702', 37, 'أم العسل', 'Oum El Assel', 'Oum El Assel', '37001', FALSE),
  ('3803', 38, 'خميستي', 'Khemisti', 'Khemisti', '42006', FALSE),
  ('3804', 38, 'العيون', 'Layoune', 'Layoune', '38010', FALSE),
  ('3802', 38, 'ثنية الحد', 'Theniet El Had', 'Theniet El Had', '38002', FALSE),
  ('3805', 38, 'سيدي بوتوشنت', 'Sidi Boutouchent', 'Sidi Boutouchent', '38015', FALSE),
  ('3806', 38, 'أولاد بسام', 'Ouled Bessam', 'Ouled Bessam', '38012', FALSE),
  ('3801', 38, 'تسمسيلت', 'Tissemsilt', 'Tissemsilt', '38000', TRUE),
  ('3807', 38, 'سيدي العنتري', 'Sidi Lantri', 'Sidi Lantri', '38008', FALSE),
  ('3808', 38, 'لرجام', 'Lardjem', 'Lardjem', '38006', FALSE),
  ('3809', 38, 'الملعب', 'Melaab', 'Melaab', '38007', FALSE),
  ('3810', 38, 'تملاحت', 'Tamellahet', 'Tamellahet', '38000', FALSE),
  ('3811', 38, 'بني شعيب', 'Beni Chaib', 'Beni Chaib', '38005', FALSE),
  ('3812', 38, 'بني لحسن', 'Beni Lahcene', 'Beni Lahcene', '38022', FALSE),
  ('3813', 38, 'برج بونعامة', 'Bordj Bounaama', 'Bordj Bounaama', '38002', FALSE),
  ('3814', 38, 'سيدي عابد', 'Sidi Abed', 'Sidi Abed', '38018', FALSE),
  ('3815', 38, 'عماري', 'Ammari', 'Ammari', '38013', FALSE),
  ('3816', 38, 'المعاصم', 'Maacem', 'Maacem', '38017', FALSE),
  ('3817', 38, 'سيدي سليمان', 'Sidi Slimane', 'Sidi Slimane', '38020', FALSE),
  ('3818', 38, 'بوقائد', 'Boucaid', 'Boucaid', '38021', FALSE),
  ('3819', 38, 'الأزهرية', 'Lazharia', 'Lazharia', '38004', FALSE),
  ('3820', 38, 'الأربعاء', 'Larbaa', 'Larbaa', '38016', FALSE),
  ('3821', 38, 'اليوسفية', 'Youssoufia', 'Youssoufia', '38014', FALSE),
  ('3822', 38, 'برج الأمير عبد القادر', 'Bordj El Emir Abdelkader', 'Bordj El Emir Abdelkader', '38009', FALSE),
  ('3903', 39, 'دوار الماء', 'Douar El Maa', 'Douar El Maa', '39015', FALSE),
  ('3904', 39, 'بن  قشة', 'Ben Guecha', 'Ben Guecha', '39000', FALSE),
  ('3905', 39, 'الطالب العربي', 'Taleb Larbi', 'Taleb Larbi', '39014', FALSE),
  ('3906', 39, 'العقلة', 'El Ogla', 'El Ogla', '39025', FALSE),
  ('3907', 39, 'المقرن', 'Magrane', 'Magrane', '39018', FALSE),
  ('3908', 39, 'سيدي عون', 'Sidi Aoun', 'Sidi Aoun', '39016', FALSE),
  ('3909', 39, 'اميه وانسة', 'Mih Ouansa', 'Mih Ouansa', '39026', FALSE),
  ('3910', 39, 'وادي العلندة', 'Oued El Alenda', 'Oued El Alenda', '39003', FALSE),
  ('3911', 39, 'كوينين', 'Kouinine', 'Kouinine', '39007', FALSE),
  ('3901', 39, 'الوادي', 'El Oued', 'El Oued', '39000', TRUE),
  ('3912', 39, 'البياضة', 'Bayadha', 'Bayadha', '39004', FALSE),
  ('3913', 39, 'النخلة', 'Nakhla', 'Nakhla', '39005', FALSE),
  ('3914', 39, 'الرباح', 'Robbah', 'Robbah', '39002', FALSE),
  ('3902', 39, 'قمار', 'Guemar', 'Guemar', '39002', FALSE),
  ('3915', 39, 'ورماس', 'Ourmes', 'Ourmes', '39000', FALSE),
  ('3916', 39, 'تغزوت', 'Taghzout', 'Taghzout', '39010', FALSE),
  ('3917', 39, 'الحمراية', 'Hamraia', 'Hamraia', '39009', FALSE),
  ('3918', 39, 'الرقيبة', 'Reguiba', 'Reguiba', '39008', FALSE),
  ('3919', 39, 'الدبيلة', 'Debila', 'Debila', '39011', FALSE),
  ('3920', 39, 'حساني عبد الكريم', 'Hassani Abdelkrim', 'Hassani Abdelkrim', '39012', FALSE),
  ('3921', 39, 'حاسي خليفة', 'Hassi Khalifa', 'Hassi Khalifa', '39013', FALSE),
  ('3922', 39, 'الطريفاوي', 'Trifaoui', 'Trifaoui', '39017', FALSE),
  ('4003', 40, 'خيران', 'Khirane', 'Khirane', '40020', FALSE),
  ('4004', 40, 'جلال', 'Djellal', 'Djellal', '40012', FALSE),
  ('4005', 40, 'الولجة', 'El Oueldja', 'El Oueldja', '40009', FALSE),
  ('4006', 40, 'ششار', 'Chechar', 'Chechar', '40011', FALSE),
  ('4007', 40, 'بابار', 'Babar', 'Babar', '40013', FALSE),
  ('4008', 40, 'المحمل', 'El Mahmal', 'El Mahmal', '40017', FALSE),
  ('4009', 40, 'أولاد رشاش', 'Ouled Rechache', 'Ouled Rechache', '40016', FALSE),
  ('4010', 40, 'يابوس', 'Yabous', 'Yabous', '40019', FALSE),
  ('4011', 40, 'شلية', 'Chelia', 'Chelia', '40021', FALSE),
  ('4012', 40, 'بوحمامة', 'Bouhmama', 'Bouhmama', '40008', FALSE),
  ('4013', 40, 'مصارة', 'M''sara', 'M''sara', '40018', FALSE),
  ('4001', 40, 'خنشلة', 'Khenchela', 'Khenchela', '40000', TRUE),
  ('4002', 40, 'قايس', 'Kaïs', 'Kaïs', '40002', FALSE),
  ('4014', 40, 'الرميلة', 'Remila', 'Remila', '40010', FALSE),
  ('4015', 40, 'تاوزيانت', 'Taouzianat', 'Taouzianat', '40007', FALSE),
  ('4016', 40, 'بغاي', 'Baghai', 'Baghai', '40004', FALSE),
  ('4017', 40, 'الحامة', 'El Hamma', 'El Hamma', '40005', FALSE),
  ('4018', 40, 'انسيغة', 'Ensigha', 'Ensigha', '40015', FALSE),
  ('4019', 40, 'طامزة', 'Tamza', 'Tamza', '40014', FALSE),
  ('4020', 40, 'عين الطويلة', 'Ain Touila', 'Ain Touila', '40006', FALSE),
  ('4021', 40, 'متوسة', 'M''toussa', 'M''toussa', '40002', FALSE),
  ('4101', 41, 'سوق أهراس', 'Souk Ahras', 'Souk Ahras', '41000', TRUE),
  ('4103', 41, 'عين سلطان', 'Ain Soltane', 'Ain Soltane', '44020', FALSE),
  ('4102', 41, 'سدراتة', 'Sedrata', 'Sedrata', '41002', FALSE),
  ('4104', 41, 'خميسة', 'Khemissa', 'Khemissa', '41023', FALSE),
  ('4105', 41, 'الحنانشة', 'Hanencha', 'Hanencha', '41003', FALSE),
  ('4106', 41, 'المشروحة', 'Machroha', 'Machroha', '41004', FALSE),
  ('4107', 41, 'عين الزانة', 'Ain Zana', 'Ain Zana', '41017', FALSE),
  ('4108', 41, 'أولاد إدريس', 'Ouled Driss', 'Ouled Driss', '41005', FALSE),
  ('4109', 41, 'ترقالت', 'Terraguelt', 'Terraguelt', '41025', FALSE),
  ('4110', 41, 'أم العظايم', 'Oum El Adhaim', 'Oum El Adhaim', '41016', FALSE),
  ('4111', 41, 'وادي الكبريت', 'Oued Kebrit', 'Oued Kebrit', '41024', FALSE),
  ('4112', 41, 'تيفاش', 'Tiffech', 'Tiffech', '41006', FALSE),
  ('4113', 41, 'الراقوبة', 'Ragouba', 'Ragouba', '41022', FALSE),
  ('4114', 41, 'مداوروش', 'M''daourouche', 'M''daourouche', '41015', FALSE),
  ('4115', 41, 'الدريعة', 'Drea', 'Drea', '41009', FALSE),
  ('4116', 41, 'تاورة', 'Taoura', 'Taoura', '41008', FALSE),
  ('4117', 41, 'الزعرورية', 'Zaarouria', 'Zaarouria', '41007', FALSE),
  ('4118', 41, 'الحدادة', 'Haddada', 'Haddada', '41010', FALSE),
  ('4119', 41, 'الخضارة', 'Khedara', 'Khedara', '41011', FALSE),
  ('4120', 41, 'أولاد مومن', 'Ouled Moumen', 'Ouled Moumen', '41013', FALSE),
  ('4121', 41, 'المراهنة', 'Merahna', 'Merahna', '41012', FALSE),
  ('4122', 41, 'ويلان', 'Ouillen', 'Ouillen', '41019', FALSE),
  ('4123', 41, 'سيدي فرج', 'Sidi Fredj', 'Sidi Fredj', '41020', FALSE),
  ('4124', 41, 'بئر بوحوش', 'Bir Bouhouche', 'Bir Bouhouche', '41014', FALSE),
  ('4125', 41, 'سافل الويدان', 'Safel El Ouiden', 'Safel El Ouiden', '41021', FALSE),
  ('4126', 41, 'الزوابي', 'Zouabi', 'Zouabi', '41026', FALSE),
  ('4205', 42, 'حجوط', 'Hadjout', 'Hadjout', '42012', FALSE),
  ('4206', 42, 'مراد', 'Merad', 'Merad', '42024', FALSE),
  ('4207', 42, 'مناصر', 'Menaceur', 'Menaceur', '42002', FALSE),
  ('4208', 42, 'الناظور', 'Nador', 'Nador', '42015', FALSE),
  ('4209', 42, 'سيدي عامر', 'Sidi-Amar', 'Sidi-Amar', '32018', FALSE),
  ('4210', 42, 'أغبال', 'Aghbal', 'Aghbal', '42000', FALSE),
  ('4211', 42, 'قوراية', 'Gouraya', 'Gouraya', '42014', FALSE),
  ('4212', 42, 'مسلمون', 'Messelmoun', 'Messelmoun', '42033', FALSE),
  ('4202', 42, 'شرشال', 'Cherchell', 'Cherchell', '42002', FALSE),
  ('4213', 42, 'حجرة النص', 'Hadjret Ennous', 'Hadjret Ennous', '42042', FALSE),
  ('4214', 42, 'سيدي غيلاس', 'Sidi Ghiles', 'Sidi Ghiles', '42032', FALSE),
  ('4215', 42, 'سيدي سميان', 'Sidi Semiane', 'Sidi Semiane', '42040', FALSE),
  ('4216', 42, 'الداموس', 'Damous', 'Damous', '42023', FALSE),
  ('4217', 42, 'الأرهاط', 'Larhat', 'Larhat', '42003', FALSE),
  ('4218', 42, 'بني ميلك', 'Beni Mileuk', 'Beni Mileuk', '42041', FALSE),
  ('4219', 42, 'فوكة', 'Fouka', 'Fouka', '42025', FALSE),
  ('4220', 42, 'دواودة', 'Douaouda', 'Douaouda', '42004', FALSE),
  ('4221', 42, 'عين تاقورايت', 'Ain Tagourait', 'Ain Tagourait', '42017', FALSE),
  ('4222', 42, 'بوهارون', 'Bou Haroun', 'Bou Haroun', '42030', FALSE),
  ('4204', 42, 'بواسماعيل', 'Bou Ismaïl', 'Bou Ismaïl', '42004', FALSE),
  ('4223', 42, 'خميستي', 'Khemisti', 'Khemisti', '42006', FALSE),
  ('4224', 42, 'أحمر العين', 'Ahmer El Ain', 'Ahmer El Ain', '42027', FALSE),
  ('4225', 42, 'بورقيقة', 'Bourkika', 'Bourkika', '42005', FALSE),
  ('4226', 42, 'سيدي راشد', 'Sidi Rached', 'Sidi Rached', '42034', FALSE),
  ('4227', 42, 'الحطاطبة', 'Attatba', 'Attatba', '42036', FALSE),
  ('4228', 42, 'الشعيبة', 'Chaiba', 'Chaiba', '42016', FALSE),
  ('4203', 42, 'القليعة', 'Koléa', 'Koléa', '42003', FALSE),
  ('4201', 42, 'تيبازة', 'Tipaza', 'Tipaza', '42000', TRUE),
  ('4303', 43, 'مشيرة', 'El Mechira', 'El Mechira', '43026', FALSE),
  ('4304', 43, 'التلاغمة', 'Teleghma', 'Teleghma', '43006', FALSE),
  ('4305', 43, 'وادي سقان', 'Oued Seguen', 'Oued Seguen', '43007', FALSE),
  ('4306', 43, 'العياضي برباس', 'El Ayadi Barbes', 'El Ayadi Barbes', '43029', FALSE),
  ('4307', 43, 'عين البيضاء أحريش', 'Ain Beida Harriche', 'Ain Beida Harriche', '43030', FALSE),
  ('4308', 43, 'تسالة لمطاعي', 'Tassala Lematai', 'Tassala Lematai', '43000', FALSE),
  ('4309', 43, 'ترعي باينان', 'Terrai Bainen', 'Terrai Bainen', '43023', FALSE),
  ('4310', 43, 'اعميرة اراس', 'Amira Arres', 'Amira Arres', '43000', FALSE),
  ('4311', 43, 'تسدان حدادة', 'Tassadane Haddada', 'Tassadane Haddada', '43019', FALSE),
  ('4312', 43, 'مينار زارزة', 'Minar Zarza', 'Minar Zarza', '43021', FALSE),
  ('4313', 43, 'سيدي مروان', 'Sidi Merouane', 'Sidi Merouane', '43018', FALSE),
  ('4314', 43, 'الشيقارة', 'Chigara', 'Chigara', '43032', FALSE),
  ('4315', 43, 'حمالة', 'Hamala', 'Hamala', '43024', FALSE),
  ('4316', 43, 'القرارم قوقة', 'Grarem Gouga', 'Grarem Gouga', '43017', FALSE),
  ('4317', 43, 'تيبرقنت', 'Tiberguent', 'Tiberguent', '43013', FALSE),
  ('4318', 43, 'الرواشد', 'Rouached', 'Rouached', '43015', FALSE),
  ('4319', 43, 'دراحي بوصلاح', 'Derrahi Bousselah', 'Derrahi Bousselah', '43020', FALSE),
  ('4320', 43, 'بوحاتم', 'Bouhatem', 'Bouhatem', '43014', FALSE),
  ('4321', 43, 'زغاية', 'Zeghaia', 'Zeghaia', '43028', FALSE),
  ('4322', 43, 'وادي النجاء', 'Oued Endja', 'Oued Endja', '43010', FALSE),
  ('4323', 43, 'أحمد راشدي', 'Ahmed Rachedi', 'Ahmed Rachedi', '43011', FALSE),
  ('4324', 43, 'تاجنانت', 'Tadjenanet', 'Tadjenanet', '43008', FALSE),
  ('4325', 43, 'أولاد اخلوف', 'Ouled Khalouf', 'Ouled Khalouf', '43012', FALSE),
  ('4326', 43, 'بن يحي عبد الرحمن', 'Benyahia Abderrahmane', 'Benyahia Abderrahmane', '43009', FALSE),
  ('4327', 43, 'عين الملوك', 'Ain Mellouk', 'Ain Mellouk', '43005', FALSE),
  ('4328', 43, 'وادي العثمانية', 'Oued Athmenia', 'Oued Athmenia', '43004', FALSE),
  ('4302', 43, 'شلغوم العيد', 'Chelghoum Laïd', 'Chelghoum Laïd', '43002', FALSE),
  ('4329', 43, 'عين التين', 'Ain Tine', 'Ain Tine', '43025', FALSE),
  ('4330', 43, 'سيدي خليفة', 'Sidi Khelifa', 'Sidi Khelifa', '43027', FALSE),
  ('4301', 43, 'ميلة', 'Mila', 'Mila', '43000', TRUE),
  ('4331', 43, 'يحي بني قشة', 'Yahia Beniguecha', 'Yahia Beniguecha', '43031', FALSE),
  ('4332', 43, 'فرجيوة', 'Ferdjioua', 'Ferdjioua', '43002', FALSE),
  ('4402', 44, 'خميس مليانة', 'Khemis Miliana', 'Khemis Miliana', '44002', FALSE),
  ('4403', 44, 'سيدي الأخضر', 'Sidi-Lakhdar', 'Sidi-Lakhdar', '44024', FALSE),
  ('4404', 44, 'عين البنيان', 'Ain-Benian', 'Ain-Benian', '44026', FALSE),
  ('4405', 44, 'عين التركي', 'Ain-Torki', 'Ain-Torki', '44023', FALSE),
  ('4406', 44, 'حمام ريغة', 'Hammam-Righa', 'Hammam-Righa', '44005', FALSE),
  ('4407', 44, 'بوراشد', 'Bourached', 'Bourached', '44009', FALSE),
  ('4408', 44, 'جليدة', 'Djelida', 'Djelida', '44007', FALSE),
  ('4409', 44, 'جمعة أولاد الشيخ', 'Djemaa Ouled Cheikh', 'Djemaa Ouled Cheikh', '44029', FALSE),
  ('4410', 44, 'الحسينية', 'Hoceinia', 'Hoceinia', '44027', FALSE),
  ('4411', 44, 'بومدفع', 'Boumedfaa', 'Boumedfaa', '44003', FALSE),
  ('4412', 44, 'عريب', 'Arib', 'Arib', '44006', FALSE),
  ('4413', 44, 'العامرة', 'El-Amra', 'El-Amra', '44008', FALSE),
  ('4414', 44, 'المخاطرية', 'Mekhatria', 'Mekhatria', '44030', FALSE),
  ('4415', 44, 'العطاف', 'El-Attaf', 'El-Attaf', '44010', FALSE),
  ('4416', 44, 'تبركانين', 'Tiberkanine', 'Tiberkanine', '44035', FALSE),
  ('4417', 44, 'عين بويحيى', 'Ain-Bouyahia', 'Ain-Bouyahia', '44033', FALSE),
  ('4418', 44, 'العبادية', 'El-Abadia', 'El-Abadia', '44011', FALSE),
  ('4419', 44, 'تاشتة زقاغة', 'Tacheta Zegagha', 'Tacheta Zegagha', '44032', FALSE),
  ('4420', 44, 'بربوش', 'Birbouche', 'Birbouche', '44028', FALSE),
  ('4421', 44, 'جندل', 'Djendel', 'Djendel', '44012', FALSE),
  ('4422', 44, 'وادي الشرفاء', 'Oued Chorfa', 'Oued Chorfa', '44013', FALSE),
  ('4423', 44, 'بن علال', 'Ben Allal', 'Ben Allal', '44025', FALSE),
  ('4424', 44, 'مليانة', 'Miliana', 'Miliana', '44002', FALSE),
  ('4425', 44, 'عين الاشياخ', 'Ain-Lechiakh', 'Ain-Lechiakh', '44014', FALSE),
  ('4426', 44, 'واد الجمعة', 'Oued Djemaa', 'Oued Djemaa', '44015', FALSE),
  ('4427', 44, 'عين السلطان', 'Ain-Soltane', 'Ain-Soltane', '44020', FALSE),
  ('4428', 44, 'الماين', 'El-Maine', 'El-Maine', '44034', FALSE),
  ('4429', 44, 'الروينة', 'Rouina', 'Rouina', '44016', FALSE),
  ('4430', 44, 'زدين', 'Zeddine', 'Zeddine', '44017', FALSE),
  ('4431', 44, 'بئر ولد خليفة', 'Bir-Ould-Khelifa', 'Bir-Ould-Khelifa', '44019', FALSE),
  ('4432', 44, 'برج الأمير خالد', 'Bordj-Emir-Khaled', 'Bordj-Emir-Khaled', '44022', FALSE),
  ('4433', 44, 'طارق بن زياد', 'Tarik-Ibn-Ziad', 'Tarik-Ibn-Ziad', '44021', FALSE),
  ('4434', 44, 'بطحية', 'Bathia', 'Bathia', '44031', FALSE),
  ('4435', 44, 'بلعاص', 'Belaas', 'Belaas', '44036', FALSE),
  ('4436', 44, 'الحسانية', 'Hassania', 'Hassania', '44000', FALSE),
  ('4401', 44, 'عين الدفلى', 'Aïn Defla', 'Aïn Defla', '44000', TRUE),
  ('4503', 45, 'تيوت', 'Tiout', 'Tiout', '45004', FALSE),
  ('4504', 45, 'عين الصفراء', 'Ain Sefra', 'Ain Sefra', '45003', FALSE),
  ('4505', 45, 'مغرار', 'Moghrar', 'Moghrar', '45006', FALSE),
  ('4506', 45, 'جنين بورزق', 'Djenienne Bourezg', 'Djenienne Bourezg', '45008', FALSE),
  ('4507', 45, 'عسلة', 'Asla', 'Asla', '45007', FALSE),
  ('4508', 45, 'القصدير', 'Kasdir', 'Kasdir', '45011', FALSE),
  ('4509', 45, 'مكمن بن عمار', 'Makmen Ben Amar', 'Makmen Ben Amar', '45000', FALSE),
  ('4502', 45, 'مشرية', 'Mécheria', 'Mécheria', '45002', FALSE),
  ('4510', 45, 'البيوض', 'El Biodh', 'El Biodh', '45012', FALSE),
  ('4511', 45, 'عين بن خليل', 'Ain Ben Khelil', 'Ain Ben Khelil', '45009', FALSE),
  ('4501', 45, 'النعامة', 'Naâma', 'Naâma', '45000', TRUE),
  ('4512', 45, 'سفيسيفة', 'Sfissifa', 'Sfissifa', '45005', FALSE),
  ('4603', 46, 'سيدي بومدين', 'Sidi Boumediene', 'Sidi Boumediene', '46015', FALSE),
  ('4604', 46, 'تامزورة', 'Tamzoura', 'Tamzoura', '46010', FALSE),
  ('4605', 46, 'وادي الصباح', 'Oued Sebbah', 'Oued Sebbah', '46016', FALSE),
  ('4606', 46, 'عين الأربعاء', 'Ain El Arbaa', 'Ain El Arbaa', '46009', FALSE),
  ('4607', 46, 'شعبة اللحم', 'Chaabat El Ham', 'Chaabat El Ham', '46002', FALSE),
  ('4608', 46, 'المالح', 'El Maleh', 'El Maleh', '46014', FALSE),
  ('4609', 46, 'أولاد الكيحل', 'Ouled Kihal', 'Ouled Kihal', '46022', FALSE),
  ('4610', 46, 'تارقة', 'Terga', 'Terga', '46008', FALSE),
  ('4611', 46, 'شنتوف', 'Chentouf', 'Chentouf', '46011', FALSE),
  ('4612', 46, 'الحساسنة', 'Hassasna', 'Hassasna', '46021', FALSE),
  ('4613', 46, 'وادي برقش', 'Oued Berkeche', 'Oued Berkeche', '46006', FALSE),
  ('4614', 46, 'حمام بوحجر', 'Hammam Bou Hadjar', 'Hammam Bou Hadjar', '46004', FALSE),
  ('4615', 46, 'العامرية', 'El Amria', 'El Amria', '46019', FALSE),
  ('4616', 46, 'حاسي الغلة', 'Hassi El Ghella', 'Hassi El Ghella', '46020', FALSE),
  ('4617', 46, 'أولاد بوجمعة', 'Ouled Boudjemaa', 'Ouled Boudjemaa', '46017', FALSE),
  ('4618', 46, 'المساعيد', 'El Messaid', 'El Messaid', '46028', FALSE),
  ('4619', 46, 'بوزجار', 'Bouzedjar', 'Bouzedjar', '46005', FALSE),
  ('4620', 46, 'أغلال', 'Aghlal', 'Aghlal', '46007', FALSE),
  ('4621', 46, 'عين الكيحل', 'Ain Kihal', 'Ain Kihal', '46003', FALSE),
  ('4622', 46, 'عين الطلبة', 'Ain Tolba', 'Ain Tolba', '46018', FALSE),
  ('4623', 46, 'عقب الليل', 'Aoubellil', 'Aoubellil', '46013', FALSE),
  ('4602', 46, 'بني صاف', 'Béni Saf', 'Béni Saf', '46002', FALSE),
  ('4624', 46, 'سيدي صافي', 'Sidi Safi', 'Sidi Safi', '46024', FALSE),
  ('4625', 46, 'الأمير عبد القادر', 'Emir Abdelkader', 'Emir Abdelkader', '46027', FALSE),
  ('4626', 46, 'ولهاصة الغرابة', 'Oulhaca El Gheraba', 'Oulhaca El Gheraba', '46025', FALSE),
  ('4627', 46, 'سيدي ورياش', 'Sidi Ouriache', 'Sidi Ouriache', '46026', FALSE),
  ('4628', 46, 'سيدي بن عدة', 'Sidi Ben Adda', 'Sidi Ben Adda', '46012', FALSE),
  ('4601', 46, 'عين تموشنت', 'Aïn Témouchent', 'Aïn Témouchent', '46000', TRUE),
  ('4702', 47, 'ضاية بن ضحوة', 'Dhayet Bendhahoua', 'Dhayet Bendhahoua', '47003', FALSE),
  ('4704', 47, 'المنصورة', 'Mansoura', 'Mansoura', '47013', FALSE),
  ('4705', 47, 'العطف', 'El Atteuf', 'El Atteuf', '47007', FALSE),
  ('4706', 47, 'بونورة', 'Bounoura', 'Bounoura', '47010', FALSE),
  ('4707', 47, 'زلفانة', 'Zelfana', 'Zelfana', '47008', FALSE),
  ('4703', 47, 'القرارة', 'El Guerrara', 'El Guerrara', '47003', FALSE),
  ('4708', 47, 'سبسب', 'Sebseb', 'Sebseb', '47009', FALSE),
  ('4709', 47, 'متليلي', 'Metlili', 'Metlili', '47005', FALSE),
  ('4710', 47, 'بريان', 'Berriane', 'Berriane', '47004', FALSE),
  ('4701', 47, 'غرداية', 'Ghardaïa', 'Ghardaïa', '47000', TRUE),
  ('4803', 48, 'القطار', 'El-Guettar', 'El-Guettar', '48015', FALSE),
  ('4804', 48, 'مازونة', 'Mazouna', 'Mazouna', '48022', FALSE),
  ('4805', 48, 'أولاد يعيش', 'Ouled Aiche', 'Ouled Aiche', '48005', FALSE),
  ('4806', 48, 'عمي موسى', 'Ammi Moussa', 'Ammi Moussa', '48011', FALSE),
  ('4807', 48, 'بني درقن', 'Beni Dergoun', 'Beni Dergoun', '48013', FALSE),
  ('4808', 48, 'دار بن عبد الله', 'Dar Ben Abdelah', 'Dar Ben Abdelah', '48032', FALSE),
  ('4809', 48, 'زمورة', 'Zemmoura', 'Zemmoura', '48012', FALSE),
  ('4810', 48, 'جديوية', 'Djidiouia', 'Djidiouia', '48014', FALSE),
  ('4811', 48, 'حمري', 'Hamri', 'Hamri', '48016', FALSE),
  ('4812', 48, 'أولاد سيدي الميهوب', 'Ouled Sidi Mihoub', 'Ouled Sidi Mihoub', '48038', FALSE),
  ('4813', 48, 'بلعسل بوزقزة', 'Belaassel Bouzagza', 'Belaassel Bouzagza', '48003', FALSE),
  ('4814', 48, 'المطمر', 'El-Matmar', 'El-Matmar', '48017', FALSE),
  ('4815', 48, 'سيدي  خطاب', 'Sidi Khettab', 'Sidi Khettab', '48010', FALSE),
  ('4816', 48, 'سيدي امحمد بن عودة', 'Sidi M''hamed Benaouda', 'Sidi M''hamed Benaouda', '48018', FALSE),
  ('4817', 48, 'عين طارق', 'Ain-Tarek', 'Ain-Tarek', '48019', FALSE),
  ('4818', 48, 'حد الشكالة', 'Had Echkalla', 'Had Echkalla', '48034', FALSE),
  ('4819', 48, 'الولجة', 'El Ouldja', 'El Ouldja', '40009', FALSE),
  ('4820', 48, 'عين الرحمة', 'Ain Rahma', 'Ain Rahma', '48024', FALSE),
  ('4821', 48, 'القلعة', 'Kalaa', 'Kalaa', '48023', FALSE),
  ('4822', 48, 'سيدي سعادة', 'Sidi Saada', 'Sidi Saada', '48004', FALSE),
  ('4823', 48, 'يلل', 'Yellel', 'Yellel', '48025', FALSE),
  ('4824', 48, 'سوق الحد', 'Souk El Had', 'Souk El Had', '48031', FALSE),
  ('4825', 48, 'منداس', 'Mendes', 'Mendes', '48028', FALSE),
  ('4826', 48, 'وادي السلام', 'Oued Essalem', 'Oued Essalem', '48020', FALSE),
  ('4827', 48, 'سيدي لزرق', 'Sidi Lazreg', 'Sidi Lazreg', '48006', FALSE),
  ('4828', 48, 'واريزان', 'Ouarizane', 'Ouarizane', '48021', FALSE),
  ('4829', 48, 'مرجة سيدي عابد', 'Merdja Sidi Abed', 'Merdja Sidi Abed', '48037', FALSE),
  ('4802', 48, 'وادي ارهيو', 'Oued Rhiou', 'Oued Rhiou', '48002', FALSE),
  ('4830', 48, 'لحلاف', 'Lahlef', 'Lahlef', '48029', FALSE),
  ('4831', 48, 'بن داود', 'Bendaoud', 'Bendaoud', '48035', FALSE),
  ('4801', 48, 'غليزان', 'Relizane', 'Relizane', '48000', TRUE),
  ('4832', 48, 'الحاسي', 'El Hassi', 'El Hassi', '48033', FALSE),
  ('4833', 48, 'سيدي أمحمد بن علي', 'Sidi M''hamed Benali', 'Sidi M''hamed Benali', '48008', FALSE),
  ('4834', 48, 'مديونة', 'Mediouna', 'Mediouna', '48009', FALSE),
  ('4835', 48, 'بني زنطيس', 'Beni Zentis', 'Beni Zentis', '48030', FALSE),
  ('4836', 48, 'وادي الجمعة', 'Oued El Djemaa', 'Oued El Djemaa', '48026', FALSE),
  ('4837', 48, 'الحمادنة', 'El H''madna', 'El H''madna', '48007', FALSE),
  ('4838', 48, 'الرمكة', 'Ramka', 'Ramka', '48027', FALSE),
  ('4903', 49, 'تنركوك', 'Tinerkouk', 'Tinerkouk', '01016', FALSE),
  ('4904', 49, 'قصر قدور', 'Ksar Kaddour', 'Ksar Kaddour', '01007', FALSE),
  ('4901', 49, 'تيميمون', 'Timimoun', 'Timimoun', '49000', TRUE),
  ('4905', 49, 'أولاد السعيد', 'Ouled Said', 'Ouled Said', '01010', FALSE),
  ('4906', 49, 'المطارفة', 'Metarfa', 'Metarfa', '28006', FALSE),
  ('4902', 49, 'أوقروت', 'Aougrout', 'Aougrout', '49002', FALSE),
  ('4907', 49, 'طالمين', 'Talmine', 'Talmine', '01024', FALSE),
  ('4908', 49, 'شروين', 'Charouine', 'Charouine', '01003', FALSE),
  ('4909', 49, 'أولاد عيسى', 'Ouled Aissa', 'Ouled Aissa', '35026', FALSE),
  ('4910', 49, 'دلدول', 'Deldoul', 'Deldoul', '17029', FALSE),
  ('5002', 50, 'تيمياوين', 'Timiaouine', 'Timiaouine', '50001', FALSE),
  ('5001', 50, 'برج باجي مختار', 'Bordj Badji Mokhtar', 'Bordj Badji Mokhtar', '50000', TRUE),
  ('5103', 51, 'رأس الميعاد', 'Ras El Miad', 'Ras El Miad', '07006', FALSE),
  ('5104', 51, 'بسباس', 'Besbes', 'Besbes', '36016', FALSE),
  ('5102', 51, 'سيدي خالد', 'Sidi Khaled', 'Sidi Khaled', '51001', FALSE),
  ('5105', 51, 'الدوسن', 'Doucen', 'Doucen', '07009', FALSE),
  ('5101', 51, 'أولاد جلال', 'Ouled Djellal', 'Ouled Djellal', '51000', TRUE),
  ('5106', 51, 'الشعيبة', 'Chaiba', 'Chaiba', '42016', FALSE),
  ('5201', 52, 'بني عباس', 'Béni Abbès', 'Béni Abbès', '52000', TRUE),
  ('5203', 52, 'تامترت', 'Tamtert', 'Tamtert', '08020', FALSE),
  ('5204', 52, 'إقلي', 'Igli', 'Igli', '08011', FALSE),
  ('5205', 52, 'الواتة', 'El Ouata', 'El Ouata', '08014', FALSE),
  ('5206', 52, 'أولاد خضير', 'Ouled-Khodeir', 'Ouled-Khodeir', '52000', FALSE),
  ('5207', 52, 'القصابي', 'Ksabi', 'Ksabi', '08019', FALSE),
  ('5202', 52, 'كرزاز', 'Kerzaz', 'Kerzaz', '52002', FALSE),
  ('5208', 52, 'تيمودي', 'Timoudi', 'Timoudi', '08005', FALSE),
  ('5209', 52, 'بن يخلف', 'Beni-Ikhlef', 'Beni-Ikhlef', '08008', FALSE),
  ('5302', 53, 'إينغر', 'Inghar', 'Inghar', '11003', FALSE),
  ('5301', 53, 'عين صالح', 'In Salah', 'In Salah', '53000', TRUE),
  ('5303', 53, 'فقارة الزوى', 'Foggaret Ezzoua', 'Foggaret Ezzoua', '11010', FALSE),
  ('5402', 54, 'تين زواتين', 'Tin Zouatine', 'Tin Zouatine', '54001', FALSE),
  ('5401', 54, 'عين قزام', 'In Guezzam', 'In Guezzam', '54000', TRUE),
  ('5503', 55, 'تماسين', 'Temacine', 'Temacine', '55002', FALSE),
  ('5504', 55, 'بلدة اعمر', 'Blidet Amor', 'Blidet Amor', '55000', FALSE),
  ('5505', 55, 'سيدي سليمان', 'Sidi Slimane', 'Sidi Slimane', '38020', FALSE),
  ('5506', 55, 'المقارين', 'Megarine', 'Megarine', '30019', FALSE),
  ('5502', 55, 'النزلة', 'Nezla', 'Nezla', '55001', FALSE),
  ('5507', 55, 'تبسبست', 'Tebesbest', 'Tebesbest', '30007', FALSE),
  ('5501', 55, 'تقرت', 'Touggourt', 'Touggourt', '55000', TRUE),
  ('5508', 55, 'الزاوية العابدية', 'Zaouia El Abidia', 'Zaouia El Abidia', '30009', FALSE),
  ('5509', 55, 'الطيبات', 'Taibet', 'Taibet', '30015', FALSE),
  ('5510', 55, 'بن ناصر', 'Benaceur', 'Benaceur', '30017', FALSE),
  ('5511', 55, 'المنقر', 'M''naguer', 'M''naguer', '30018', FALSE),
  ('5512', 55, 'العالية', 'El Alia', 'El Alia', '30020', FALSE),
  ('5513', 55, 'الحجيرة', 'El-Hadjira', 'El-Hadjira', '30014', FALSE),
  ('5601', 56, 'جانت', 'Djanet', 'Djanet', '56000', TRUE),
  ('5602', 56, 'برج الحواس', 'Bordj El Haouas', 'Bordj El Haouas', '56001', FALSE),
  ('5701', 57, 'أم الطيور', 'Oum Touyour', 'Oum Touyour', '39029', FALSE),
  ('5703', 57, 'المغير', 'El-M''ghaier', 'El-M''ghaier', '39027', TRUE),
  ('5704', 57, 'سطيل', 'Still', 'Still', '39021', FALSE),
  ('5705', 57, 'سيدي خليل', 'Sidi Khelil', 'Sidi Khelil', '39023', FALSE),
  ('5706', 57, 'سيدي عمران', 'Sidi Amrane', 'Sidi Amrane', '39030', FALSE),
  ('5707', 57, 'المرارة', 'M''rara', 'M''rara', '39022', FALSE),
  ('5702', 57, 'جامعة', 'Djamaa', 'Djamaa', '57001', FALSE),
  ('5708', 57, 'تندلة', 'Tenedla', 'Tenedla', '39024', FALSE),
  ('5801', 58, 'المنيعة', 'El Meniaa', 'El Meniaa', '58000', TRUE),
  ('5802', 58, 'حاسي الفحل', 'Hassi Gara', 'Hassi Gara', '58001', FALSE),
  ('5803', 58, 'حاسي الفحل', 'Hassi Fehal', 'Hassi Fehal', '47011', FALSE),
  ('5901', 59, 'أفلو', 'Aflou', 'Aflou', '59000', TRUE),
  ('5903', 59, 'سبقاق', 'Sebgag', 'Sebgag', '03016', FALSE),
  ('5904', 59, 'سيدي بوزيد', 'Sidi Bouzid', 'Sidi Bouzid', '03024', FALSE),
  ('5902', 59, 'بريدة', 'Brida', 'Brida', '59002', FALSE),
  ('5905', 59, 'الحاج المشري', 'Hadj Mechri', 'Hadj Mechri', '03015', FALSE),
  ('5906', 59, 'تاويالة', 'Taouiala', 'Taouiala', '03017', FALSE),
  ('5907', 59, 'قلتة سيدي سعد', 'Gueltat Sidi Saad', 'Gueltat Sidi Saad', '03010', FALSE),
  ('5908', 59, 'عين سيدي علي', 'Ain Sidi Ali', 'Ain Sidi Ali', '03011', FALSE),
  ('5909', 59, 'البيضاء', 'El Beidha', 'El Beidha', '03012', FALSE),
  ('5910', 59, 'وادي مرة', 'Oued Morra', 'Oued Morra', '03021', FALSE),
  ('5911', 59, 'وادي مزي', 'Oued M''Zi', 'Oued M''Zi', '03022', FALSE),
  ('5912', 59, 'الغيشة', 'El Ghicha', 'El Ghicha', '03014', FALSE),
  ('6001', 60, 'بريكة', 'Barika', 'Barika', '60000', TRUE),
  ('6003', 60, 'بيطام', 'Bitam', 'Bitam', '05014', FALSE),
  ('6004', 60, 'م دوكال', 'M’Doukal', 'M’Doukal', '60000', FALSE),
  ('6005', 60, 'سقانة', 'Seggana', 'Seggana', '05029', FALSE),
  ('6006', 60, 'تيلاطو', 'Tilatou', 'Tilatou', '05018', FALSE),
  ('6007', 60, 'عبد القادر عزيز', 'Abdelkader Azil', 'Abdelkader Azil', '60000', FALSE),
  ('6002', 60, 'الجزار', 'Djezzar', 'Djezzar', '60002', FALSE),
  ('6008', 60, 'أولاد عمار', 'Ouled Ammar', 'Ouled Ammar', '05056', FALSE),
  ('6101', 61, 'القنطرة', 'El Kantara', 'El Kantara', '07017', TRUE),
  ('6102', 61, 'عين زعطوط', 'Ain Zaatout', 'Ain Zaatout', '07018', FALSE),
  ('6103', 61, 'برانيس', 'Branis', 'Branis', '07003', FALSE),
  ('6104', 61, 'الوتیة', 'El Outaya', 'El Outaya', '07019', FALSE),
  ('6105', 61, 'جمورة', 'Djemourah', 'Djemourah', '07020', FALSE),
  ('6201', 62, 'بئر العاتر', 'Bir El Ater', 'Bir El Ater', '12002', TRUE),
  ('6202', 62, 'نقرين', 'Negrine', 'Negrine', '12009', FALSE),
  ('6203', 62, 'العقلة المالحة', 'El Ogla El Melha', 'El Ogla El Melha', '62000', FALSE),
  ('6204', 62, 'فركان', 'Ferkane', 'Ferkane', '12028', FALSE),
  ('6301', 63, 'العريشة', 'El Aricha', 'El Aricha', '13032', TRUE),
  ('6302', 63, 'الگور', 'El Gor', 'El Gor', '13010', FALSE),
  ('6303', 63, 'سيدي جيلالي', 'Sidi Djillali', 'Sidi Djillali', '13041', FALSE),
  ('6304', 63, 'البويهي', 'El Bouihi', 'El Bouihi', '13043', FALSE),
  ('6401', 64, 'قصر الشلالة', 'Ksar Chellala', 'Ksar Chellala', '14029', TRUE),
  ('6402', 64, 'زمالة الأمير عبد القادر', 'Zmalet El Emir Abdelkader', 'Zmalet El Emir Abdelkader', '14009', FALSE),
  ('6403', 64, 'حمادية', 'Hamadia', 'Hamadia', '34011', FALSE),
  ('6404', 64, 'الرشايقة', 'Rechaiga', 'Rechaiga', '14030', FALSE),
  ('6405', 64, 'سرغين', 'Serguine', 'Serguine', '14039', FALSE),
  ('6406', 64, 'بوغارة', 'Bougara', 'Bougara', '14040', FALSE),
  ('6501', 65, 'عين وسارة', 'Ain Ouessara', 'Ain Ouessara', '17031', TRUE),
  ('6502', 65, 'الخميس', 'El Khemis', 'El Khemis', '17011', FALSE),
  ('6503', 65, 'البيرين', 'Birine', 'Birine', '17008', FALSE),
  ('6504', 65, 'بويرة الأحداب', 'Bouira Lahdab', 'Bouira Lahdab', '17009', FALSE),
  ('6505', 65, 'سيدي لخضر', 'Sidi Ladjel', 'Sidi Ladjel', '44024', FALSE),
  ('6506', 65, 'حاسي فدول', 'Hassi Fedoul', 'Hassi Fedoul', '17033', FALSE),
  ('6507', 65, 'عين فكة', 'Ain Fekka', 'Ain Fekka', '17035', FALSE),
  ('6508', 65, 'حاضرة', 'Had Sahary', 'Had Sahary', '17020', FALSE),
  ('6509', 65, 'قرنيني', 'Guernini', 'Guernini', '17021', FALSE),
  ('6510', 65, 'بنهار', 'Benhar', 'Benhar', '17032', FALSE),
  ('6601', 66, 'مسعد', 'Messaad', 'Messaad', '17017', TRUE),
  ('6602', 66, 'سلمانة', 'Selmana', 'Selmana', '17022', FALSE),
  ('6603', 66, 'دلدول', 'Deldoul', 'Deldoul', '17029', FALSE),
  ('6604', 66, 'فيض البطمة', 'Faidh El Botma', 'Faidh El Botma', '17007', FALSE),
  ('6605', 66, 'أم العظام', 'Oum Laadham', 'Oum Laadham', '17024', FALSE),
  ('6606', 66, 'عمورة', 'Amourah', 'Amourah', '17034', FALSE),
  ('6607', 66, 'سد الرحال', 'Sed Rahal', 'Sed Rahal', '17006', FALSE),
  ('6608', 66, 'قطارة', 'Guettara', 'Guettara', '48015', FALSE),
  ('6701', 67, 'قصر البخاري', 'Ksar El Boukhari', 'Ksar El Boukhari', '26035', TRUE),
  ('6702', 67, 'أولاد معرف', 'Ouled Maaref', 'Ouled Maaref', '26003', FALSE),
  ('6703', 67, 'سيدي دامد', 'Sidi Damed', 'Sidi Damed', '26031', FALSE),
  ('6704', 67, 'عين بوسيف', 'Ain Boucif', 'Ain Boucif', '26004', FALSE),
  ('6705', 67, 'الكاف الأحمر', 'Kef Lakhdar', 'Kef Lakhdar', '32012', FALSE),
  ('6706', 67, 'عين اقصير', 'Ain Ouksir', 'Ain Ouksir', '26041', FALSE),
  ('6707', 67, 'الدراق', 'Derrag', 'Derrag', '26008', FALSE),
  ('6708', 67, 'بوطاط', 'Bouaiche', 'Bouaiche', '26010', FALSE),
  ('6709', 67, 'شلالة العذاورة', 'Chelalet El Adhaoura', 'Chelalet El Adhaoura', '26018', FALSE),
  ('6710', 67, 'بوغار', 'Boghar', 'Boghar', '26025', FALSE),
  ('6711', 67, 'أولاد عنتر', 'Ouled Antar', 'Ouled Antar', '26058', FALSE),
  ('6712', 67, 'العوينات', 'El Ouinet', 'El Ouinet', '26057', FALSE),
  ('6713', 67, 'عزيز', 'Aziz', 'Aziz', '26032', FALSE),
  ('6714', 67, 'شهبونية', 'Chahbounia', 'Chahbounia', '26038', FALSE),
  ('6715', 67, 'شنيقل', 'Cheniguel', 'Cheniguel', '26040', FALSE),
  ('6716', 67, 'أم الجليل', 'Oum El Djallil', 'Oum El Djallil', '26042', FALSE),
  ('6717', 67, 'مفاتحة', 'M’Fatha', 'M’Fatha', '26049', FALSE),
  ('6718', 67, 'بوقزول', 'Boughezoul', 'Boughezoul', '26051', FALSE),
  ('6719', 67, 'السناقصة', 'Saneg', 'Saneg', '26064', FALSE),
  ('6720', 67, 'أولاد هلال', 'Ouled Hellal', 'Ouled Hellal', '26022', FALSE),
  ('6721', 67, 'تفراوت', 'Tafraout', 'Tafraout', '26023', FALSE),
  ('6801', 68, 'بوسعادة', 'Bou Saada', 'Bou Saada', '28020', TRUE),
  ('6802', 68, 'أولاد سيدي ابراهيم', 'Ouled Sidi Brahim', 'Ouled Sidi Brahim', '28021', FALSE),
  ('6803', 68, 'سيدي عامر', 'Sidi Ameur', 'Sidi Ameur', '32018', FALSE),
  ('6804', 68, 'تامسة', 'Tamsa', 'Tamsa', '28023', FALSE),
  ('6805', 68, 'خوبانة', 'Khoubana', 'Khoubana', '28007', FALSE),
  ('6806', 68, 'مصيف', 'M’Cif', 'M’Cif', '28008', FALSE),
  ('6807', 68, 'أولاد سلامة', 'Ouled Slimane', 'Ouled Slimane', '09019', FALSE),
  ('6808', 68, 'بن سرور', 'Ben Srour', 'Ben Srour', '28024', FALSE),
  ('6809', 68, 'الحمادين', 'El Houamed', 'El Houamed', '28026', FALSE),
  ('6810', 68, 'الهامل', 'El Hamel', 'El Hamel', '28027', FALSE),
  ('6811', 68, 'الزرق', 'Zarzour', 'Zarzour', '28033', FALSE),
  ('6812', 68, 'محمد بودياف', 'Mouhamed Boudiaf', 'Mouhamed Boudiaf', '68000', FALSE),
  ('6813', 68, 'بنزو', 'Benzouh', 'Benzouh', '28035', FALSE),
  ('6814', 68, 'بئر فضة', 'Bir Foda', 'Bir Foda', '28036', FALSE),
  ('6815', 68, 'عين فارس', 'Ain Fares', 'Ain Fares', '29024', FALSE),
  ('6816', 68, 'سيدي امحمد', 'Sidi M’Hamed', 'Sidi M’Hamed', '16002', FALSE),
  ('6817', 68, 'مضاء', 'Menaa', 'Menaa', '05006', FALSE),
  ('6818', 68, 'عين الملح', 'Ain El Meleh', 'Ain El Meleh', '28041', FALSE),
  ('6819', 68, 'مدجيدل', 'Medjedel', 'Medjedel', '28042', FALSE),
  ('6820', 68, 'سليم', 'Slim', 'Slim', '28043', FALSE),
  ('6821', 68, 'عين الرش', 'Ain Errich', 'Ain Errich', '28044', FALSE),
  ('6822', 68, 'أولتام', 'Oultem', 'Oultem', '68000', FALSE),
  ('6823', 68, 'جبل مسعد', 'Djebel Messaad', 'Djebel Messaad', '28047', FALSE),
  ('6901', 69, 'الأبيض سيدي الشيخ', 'El Abiodh Sidi Cheikh', 'El Abiodh Sidi Cheikh', '32007', TRUE),
  ('6902', 69, 'عين العراك', 'Ain El Orak', 'Ain El Orak', '32008', FALSE),
  ('6903', 69, 'أربوات', 'Arbaouat', 'Arbaouat', '32009', FALSE),
  ('6904', 69, 'البنود', 'El Bnoud', 'El Bnoud', '32016', FALSE),
  ('6905', 69, 'بوسمغون', 'Boussemghoun', 'Boussemghoun', '32013', FALSE),
  ('6906', 69, 'الشلالة', 'Chellala', 'Chellala', '32014', FALSE),
  ('6907', 69, 'المحرة', 'El Meharra', 'El Meharra', '69000', FALSE)
ON CONFLICT (id) DO UPDATE SET
  wilaya_id = EXCLUDED.wilaya_id,
  name_ar = EXCLUDED.name_ar,
  name_fr = EXCLUDED.name_fr,
  name_en = EXCLUDED.name_en,
  postal_code = EXCLUDED.postal_code,
  is_seat = EXCLUDED.is_seat;

-- <<< END OF CONSOLIDATED MIGRATION <<<

-- =========================================================================
-- UTILITY: PROMOTE USER TO ADMIN
-- =========================================================================
-- To promote a user to administrator, run the following SQL (replace with actual user ID):
-- 
-- INSERT INTO public.admin_users (user_id) 
-- VALUES ('<USER_UUID>')
-- ON CONFLICT DO NOTHING;
-- 
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<USER_UUID>';


-- >>> BEGIN FILE: supabase/migrations/20261104_profiles_security_hardening.sql <<<
-- =========================================================================
-- WIN DZ (وين نلقاها؟) - FINAL PROFILE SECURITY HARDENING
-- Consolidated Implementation of Column-Level Security (CLS)
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
DROP POLICY IF EXISTS "Public discovery of profiles" ON public.profiles;

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
-- <<< END FILE: supabase/migrations/20261104_profiles_security_hardening.sql <<<
