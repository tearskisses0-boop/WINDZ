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
