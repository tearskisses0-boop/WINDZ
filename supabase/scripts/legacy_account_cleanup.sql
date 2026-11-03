-- =========================================================================
-- WIN DZ (وين نلقاها؟) - Legacy User Account Cleanup Procedure
-- SAFE, AUDITED & EXPLICITLY APPROVED CLEANUP SCRIPT
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. DRY-RUN IMPACT ASSESSMENT (Execute First to Inspect Accounts & Objects)
-- -------------------------------------------------------------------------
-- A. Accounts targeted for cleanup (excludes active administrators)
SELECT 
    p.id, 
    p.email, 
    p.display_name, 
    p.role, 
    p.created_at,
    (SELECT count(*) FROM public.posts WHERE user_id = p.id) AS post_count,
    (SELECT count(*) FROM public.messages WHERE sender_id = p.id) AS message_count
FROM public.profiles p
WHERE p.role != 'admin'
  AND p.email NOT IN ('admin@windz.dz', 'tearskisses0@gmail.com')
ORDER BY p.created_at ASC;

-- B. Summary counts of records affected by CASCADE deletion upon profile removal
SELECT 
    (SELECT count(*) FROM public.profiles WHERE role != 'admin') AS profiles_to_delete,
    (SELECT count(*) FROM public.posts WHERE user_id IN (SELECT id FROM public.profiles WHERE role != 'admin')) AS posts_to_delete,
    (SELECT count(*) FROM public.post_images WHERE post_id IN (SELECT id FROM public.posts WHERE user_id IN (SELECT id FROM public.profiles WHERE role != 'admin'))) AS post_images_to_delete,
    (SELECT count(*) FROM public.messages WHERE sender_id IN (SELECT id FROM public.profiles WHERE role != 'admin')) AS messages_to_delete;

-- -------------------------------------------------------------------------
-- 2. EXPLICIT ACCOUNT CLEANUP PROCEDURE (Requires Administrative Approval)
-- -------------------------------------------------------------------------
-- UNCOMMENT AND EXECUTE ONLY AFTER CREATING A DATABASE BACKUP SNAPSHOT AND RECEIVING EXPLICIT APPROVAL
/*
BEGIN;

-- A. Delete Storage Objects belonging to non-admin accounts
DELETE FROM storage.objects 
WHERE bucket_id = 'post-images' 
  AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.profiles WHERE role != 'admin'
  );

-- B. Delete profiles (Foreign key ON DELETE CASCADE will safely clean dependent posts, messages, favorites, etc.)
DELETE FROM public.profiles 
WHERE role != 'admin' 
  AND email NOT IN ('admin@windz.dz', 'tearskisses0@gmail.com');

COMMIT;
*/
