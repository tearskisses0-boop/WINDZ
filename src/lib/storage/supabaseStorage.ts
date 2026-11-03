import { supabase, isSupabaseConfigured } from '../supabase/client';
import { validateAndCompressImage, ProcessedImageResult } from './imageOptimizer';

export interface StorageUploadResult {
  url: string;
  path: string;
  sizeBytes: number;
  width: number;
  height: number;
  storageType: 'supabase_storage' | 'optimized_data_url';
}

/**
 * Optimizes an image to WebP and uploads it directly to Supabase Storage ('post-images' bucket).
 * Strictly adheres to the <userId>/<timestamp>_<random>.webp folder ownership structure.
 */
export async function uploadImageToStorage(
  file: File, 
  userId?: string
): Promise<StorageUploadResult> {
  // 1. Client-side validation and WebP compression (max 1200px dimension, 82% quality)
  const compressed: ProcessedImageResult = await validateAndCompressImage(file);

  // Check runtime mode for upload policy
  const { activeEnvConfig } = await import('../supabase/envConfig');

  if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
    throw new Error(`فشل رفع الصورة: ${activeEnvConfig.statusMessage}`);
  }

  if (!isSupabaseConfigured || !supabase) {
    // Allowed only in DEVELOPMENT_LOCAL mode
    return {
      url: compressed.previewUrl,
      path: `local/${compressed.file.name}`,
      sizeBytes: compressed.sizeBytes,
      width: compressed.width,
      height: compressed.height,
      storageType: 'optimized_data_url',
    };
  }

  // Determine owner user ID from active session if not explicitly provided
  let effectiveUserId = userId;
  if (!effectiveUserId || effectiveUserId === 'anonymous' || effectiveUserId === 'public') {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      effectiveUserId = session.user.id;
    }
  }

  if (!effectiveUserId || effectiveUserId === 'anonymous' || effectiveUserId === 'public') {
    throw new Error('يجب تسجيل الدخول لرفع الصور إلى المنصة.');
  }

  // 2. Upload to Supabase Storage 'post-images' bucket under the user's dedicated folder
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const path = `${effectiveUserId}/${timestamp}_${random}.webp`;

  try {
    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(path, compressed.file, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.warn('Supabase storage upload error:', error.message);
      throw new Error(`خطأ في سحابة التخزين: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(data.path);

    return {
      url: publicUrlData.publicUrl,
      path: data.path,
      sizeBytes: compressed.sizeBytes,
      width: compressed.width,
      height: compressed.height,
      storageType: 'supabase_storage',
    };
  } catch (err: any) {
    console.error('Storage upload exception:', err);
    throw err;
  }
}

/**
 * Safely deletes an image from the 'post-images' storage bucket.
 * Extracts the storage relative path whether given a full Supabase URL or a relative path.
 */
export async function deleteImageFromStorage(imageUrlOrPath: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !imageUrlOrPath) {
    return false;
  }

  let storagePath = imageUrlOrPath.trim();
  if (storagePath.startsWith('data:') || storagePath.startsWith('blob:') || storagePath.startsWith('local/')) {
    // Local / in-memory data URL, no remote deletion required
    return true;
  }

  if (storagePath.includes('/post-images/')) {
    storagePath = storagePath.split('/post-images/')[1].split('?')[0];
  }

  try {
    const { error } = await supabase.storage
      .from('post-images')
      .remove([storagePath]);

    if (error) {
      console.warn('Failed to delete image from Supabase storage:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting image from storage:', err);
    return false;
  }
}
