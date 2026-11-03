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
