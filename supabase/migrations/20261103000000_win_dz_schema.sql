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
    USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Citizens can insert reports"
    ON reports FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND reporter_id = auth.uid()
        AND status = 'pending'
    );

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
