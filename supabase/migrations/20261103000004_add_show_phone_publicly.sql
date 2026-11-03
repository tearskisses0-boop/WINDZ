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
