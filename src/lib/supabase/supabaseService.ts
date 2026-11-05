import { supabase, isSupabaseConfigured } from './client';
import { activeEnvConfig } from './envConfig';
import { 
  Post, 
  UserProfile, 
  Conversation, 
  Message, 
  AppNotification, 
  Favorite, 
  ContentReport, 
  ModerationAuditLog,
  SearchFilterState 
} from '../../types';

const STORAGE_BUCKET = 'post-images';

function ensureFullUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  
  // If it's a relative path from Supabase storage, build the full public URL
  if (isSupabaseConfigured && activeEnvConfig.supabaseUrl) {
    const baseUrl = activeEnvConfig.supabaseUrl.replace(/\/$/, '');
    // Clean path: remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Check if path already includes the bucket name (sometimes happens in older data)
    if (cleanPath.startsWith(`${STORAGE_BUCKET}/`)) {
      return `${baseUrl}/storage/v1/object/public/${cleanPath}`;
    }
    
    return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanPath}`;
  }
  
  return path;
}

export class SupabaseService {
  // -------------------------------------------------------------------------
  // 1. AUTHENTICATION & PROFILES
  // -------------------------------------------------------------------------

  public static async signUp(params: {
    email: string;
    password: string;
    displayName: string;
    wilayaId: number;
    phone?: string;
  }): Promise<{ user: any; session: any; needsEmailConfirmation: boolean; error?: string }> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل. يرجى التحقق من إعدادات الاتصال.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          display_name: params.displayName,
          wilaya_id: params.wilayaId,
          phone: params.phone || '',
        },
      },
    });

    if (error) {
      return { user: null, session: null, needsEmailConfirmation: false, error: error.message };
    }

    const needsEmailConfirmation = !data.session;

    // Profile record is automatically provisioned by the public.handle_new_user() 
    // database trigger. No manual upsert required here (prevents RLS/timing conflicts).
    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation,
    };
  }

  public static async signIn(email: string, password: string): Promise<{ profile: UserProfile | null; error?: string }> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { profile: null, error: error.message };
    }

    if (!data.user) {
      return { profile: null, error: 'تعذر العثور على بيانات المستخدم.' };
    }

    // Fetch user profile from database
    const profile = await this.getProfile(data.user.id);
    return { profile, error: undefined };
  }

  public static async signOut(): Promise<{ error?: string }> {
    if (!supabase || !isSupabaseConfigured) return {};
    const { error } = await supabase.auth.signOut();
    return { error: error?.message };
  }

  public static async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  public static async resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  public static async getProfile(userId: string, retryCount = 0): Promise<UserProfile | null> {
    if (!supabase || !isSupabaseConfigured) return null;

    // 1. Try owner RPC get_my_profile for authenticated user's own profile
    try {
      const { data: myData, error: rpcErr } = await supabase.rpc('get_my_profile');
      if (!rpcErr && Array.isArray(myData) && myData.length > 0 && myData[0].id === userId) {
        const row = myData[0];
        return {
          id: row.id,
          email: row.email || '',
          display_name: row.display_name,
          phone: row.phone || '',
          show_phone_publicly: row.show_phone_publicly !== false,
          avatar_url: ensureFullUrl(row.avatar_url),
          bio: row.bio,
          wilaya_id: row.wilaya_id || 16,
          commune_name: row.commune_name,
          commune_id: row.commune_id,
          preferred_language: row.preferred_language || 'ar',
          role: row.role || 'user',
          is_verified: row.is_verified,
          is_suspended: row.is_suspended,
          created_at: row.created_at,
          last_active_at: row.last_active_at,
        };
      }
    } catch {
      // Fall through to public_profiles view query
    }

    // 2. Query public_profiles view for public seller profiles (omits email)
    const { data, error } = await supabase
      .from('public_profiles')
      .select('id, display_name, phone, show_phone_publicly, avatar_url, bio, wilaya_id, commune_name, commune_id, preferred_language, is_verified, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      // If we are looking for the current user and it's not found yet, it might be a race with the trigger
      // Retry up to 3 times with a short delay
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return this.getProfile(userId, retryCount + 1);
      }

      // Check auth session user metadata as fallback
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user && authData.user.id === userId) {
        const meta = authData.user.user_metadata || {};
        return {
          id: userId,
          email: authData.user.email || '',
          display_name: meta.display_name || authData.user.email?.split('@')[0] || 'مواطن',
          phone: meta.phone || '',
          show_phone_publicly: meta.show_phone_publicly !== false,
          wilaya_id: Number(meta.wilaya_id) || 16,
          preferred_language: 'ar',
          role: meta.role || 'user',
          is_verified: true,
          created_at: authData.user.created_at,
        };
      }
      return null;
    }

    return {
      id: data.id,
      email: '', // Intentionally omitted for non-owner public profile view
      display_name: data.display_name,
      phone: data.phone || '',
      show_phone_publicly: data.show_phone_publicly !== false,
      avatar_url: ensureFullUrl(data.avatar_url),
      bio: data.bio,
      wilaya_id: data.wilaya_id || 16,
      commune_name: data.commune_name,
      commune_id: data.commune_id,
      preferred_language: data.preferred_language || 'ar',
      role: 'user',
      is_verified: data.is_verified,
      created_at: data.created_at,
    };
  }

  public static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    // Use secure owner RPC update_my_profile
    // We pass undefined/null to __SKIP__ defaults where appropriate
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_my_profile', {
      p_display_name: updates.display_name === undefined ? '__SKIP__' : updates.display_name,
      p_phone: updates.phone === undefined ? '__SKIP__' : updates.phone,
      p_show_phone_publicly: updates.show_phone_publicly, // BOOLEAN
      p_avatar_url: updates.avatar_url === undefined ? '__SKIP__' : updates.avatar_url,
      p_bio: updates.bio === undefined ? '__SKIP__' : updates.bio,
      p_wilaya_id: updates.wilaya_id === undefined ? -1 : updates.wilaya_id,
      p_commune_name: updates.commune_name === undefined ? '__SKIP__' : updates.commune_name,
      p_commune_id: updates.commune_id === undefined ? '__SKIP__' : updates.commune_id,
      p_preferred_language: updates.preferred_language === undefined ? '__SKIP__' : updates.preferred_language,
    });

    if (rpcErr) {
      throw new Error(`فشل تحديث الملف الشخصي عبر RPC: ${rpcErr.message}`);
    }

    if (!Array.isArray(rpcRes) || rpcRes.length === 0) {
      throw new Error('فشل تحديث الملف الشخصي: لم يتم إرجاع بيانات.');
    }

    const row = rpcRes[0];
    return {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      phone: row.phone || '',
      show_phone_publicly: row.show_phone_publicly !== false,
      avatar_url: row.avatar_url,
      bio: row.bio,
      wilaya_id: row.wilaya_id || 16,
      commune_name: row.commune_name,
      commune_id: row.commune_id,
      preferred_language: row.preferred_language || 'ar',
      role: row.role || 'user',
      is_verified: row.is_verified,
      is_suspended: row.is_suspended,
      created_at: row.created_at,
      last_active_at: row.last_active_at,
    };
  }

  public static async checkIsAdmin(userId: string): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured) return false;

    try {
      // Use secure server-side RPC function is_admin() 
      // This is the only authoritative way to check without 42501 errors in RLS policies.
      const { data: rpcAdmin, error } = await supabase.rpc('is_admin');
      if (error) return false;
      return rpcAdmin === true;
    } catch {
      return false;
    }
  }

  public static async fetchAllProfiles(): Promise<UserProfile[]> {
    if (!supabase || !isSupabaseConfigured) return [];

    // Use secure server-side RPC function get_all_profiles() 
    // This is the authoritative way for admins to fetch full records (including emails)
    // without exposing sensitive data via broad RLS policies.
    const { data, error } = await supabase.rpc('get_all_profiles');

    if (error) {
      console.warn('Supabase fetchAllProfiles error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      phone: row.phone || '',
      show_phone_publicly: row.show_phone_publicly !== false,
      avatar_url: row.avatar_url,
      bio: row.bio,
      wilaya_id: row.wilaya_id || 16,
      commune_name: row.commune_name,
      commune_id: row.commune_id,
      preferred_language: row.preferred_language || 'ar',
      role: row.role || 'user',
      is_verified: row.is_verified,
      is_suspended: row.is_suspended,
      created_at: row.created_at,
      last_active_at: row.last_active_at,
    }));
  }

  // -------------------------------------------------------------------------
  // 2. POSTS CRUD & SEARCH
  // -------------------------------------------------------------------------

  public static async fetchPosts(filters?: Partial<SearchFilterState>): Promise<{ posts: Post[]; total: number }> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل أو غير مهيأ للجلب.');
    }

    let query = supabase
      .from('posts')
      .select('*, profiles:user_id(id, display_name, avatar_url, wilaya_id), post_images(image_url, sort_order)', { count: 'exact' });

    // Filter by active status
    if (filters?.availability && filters.availability !== 'ALL') {
      query = query.eq('availability_status', filters.availability);
    } else {
      query = query.not('availability_status', 'in', '("hidden","expired")');
    }

    // Post type (NEED / OFFER)
    if (filters?.post_type && filters.post_type !== 'ALL') {
      query = query.eq('post_type', filters.post_type);
    }

    // Category
    if (filters?.category_id && filters.category_id !== 'ALL') {
      query = query.eq('category_id', filters.category_id);
    }

    // Subcategory
    if (filters?.subcategory_id && filters.subcategory_id !== 'ALL') {
      query = query.eq('subcategory_id', filters.subcategory_id);
    }

    // Wilaya
    if (filters?.wilaya_id && filters.wilaya_id !== 'ALL') {
      query = query.eq('wilaya_id', Number(filters.wilaya_id));
    }

    // Commune
    if (filters?.commune_id && filters.commune_id !== 'ALL') {
      query = query.eq('commune_id', filters.commune_id);
    }

    // Free items only
    if (filters?.is_free_only) {
      query = query.eq('is_free', true);
    }

    // Keyword Search
    if (filters?.query && filters.query.trim() !== '') {
      const q = filters.query.trim();
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,commune_name.ilike.%${q}%`);
    }

    // Sorting
    const sortBy = filters?.sortBy || 'newest';
    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortBy === 'price_asc') {
      query = query.order('price', { ascending: true, nullsFirst: false });
    } else if (sortBy === 'price_desc') {
      query = query.order('price', { ascending: false, nullsFirst: false });
    }

    // Pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 24;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Supabase fetchPosts error:', error);
      throw new Error(`فشل جلب الإعلانات من قاعدة البيانات: ${error.message}`);
    }

    const posts: Post[] = (data || []).map((row: any) => {
      const seller = row.public_profiles || row.profiles;
      const joinedImages = Array.isArray(row.post_images)
        ? row.post_images.map((img: any) => img.image_url)
        : (Array.isArray(row.images) ? row.images : []);

      return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        post_type: row.post_type,
        category_id: row.category_id,
        subcategory_id: row.subcategory_id,
        wilaya_id: row.wilaya_id,
        commune_id: row.commune_id,
        commune_name: row.commune_name,
        images: joinedImages.map((img: string) => ensureFullUrl(img)).filter(Boolean) as string[],
        price: row.price != null ? Number(row.price) : undefined,
        budget_max: row.budget_max != null ? Number(row.budget_max) : undefined,
        is_free: row.is_free,
        availability_status: row.availability_status,
        contact_preference: row.contact_preference,
        condition: row.condition,
        last_confirmed_at: row.last_confirmed_at,
        expires_at: row.expires_at,
        views_count: row.views_count || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user: seller ? {
          id: seller.id,
          display_name: seller.display_name,
          wilaya_id: seller.wilaya_id,
          phone: seller.phone,
          show_phone_publicly: seller.show_phone_publicly === true,
          avatar_url: ensureFullUrl(seller.avatar_url),
        } : undefined,
      };
    });

    return { posts, total: count || posts.length };
  }

  public static async fetchPostById(id: string): Promise<Post | null> {
    if (!supabase || !isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles:user_id(id, display_name, avatar_url, wilaya_id), post_images(image_url, sort_order)')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    const seller = data.public_profiles || data.profiles;
    const joinedImages = Array.isArray(data.post_images)
      ? data.post_images.map((img: any) => img.image_url)
      : (Array.isArray(data.images) ? data.images : []);

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      description: data.description,
      post_type: data.post_type,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id,
      wilaya_id: data.wilaya_id,
      commune_id: data.commune_id,
      commune_name: data.commune_name,
      images: joinedImages.map((img: string) => ensureFullUrl(img)).filter(Boolean) as string[],
      price: data.price != null ? Number(data.price) : undefined,
      budget_max: data.budget_max != null ? Number(data.budget_max) : undefined,
      is_free: data.is_free,
      availability_status: data.availability_status,
      contact_preference: data.contact_preference,
      condition: data.condition,
      last_confirmed_at: data.last_confirmed_at,
      expires_at: data.expires_at,
      views_count: data.views_count || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user: seller ? {
        id: seller.id,
        display_name: seller.display_name,
        wilaya_id: seller.wilaya_id,
        phone: seller.phone,
        show_phone_publicly: seller.show_phone_publicly === true,
        avatar_url: ensureFullUrl(seller.avatar_url),
      } : undefined,
    };
  }

  public static async createPost(
    post: Omit<Post, 'id' | 'views_count' | 'created_at' | 'updated_at' | 'last_confirmed_at' | 'expires_at'>,
    existingPostId?: string
  ): Promise<Post> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    // Verify caller identity from active auth session strictly (no fallback to client post.user_id)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      throw new Error('جلسة المستخدم غير صالحة أو غير مصادق عليها. يرجى تسجيل الدخول مجدداً لنشر الإعلان.');
    }
    const authenticatedUserId = authData.user.id;

    let insertedPost: any = null;

    // 1. RECOVERY PATH: If existingPostId is supplied, retrieve and validate existing post strictly
    if (existingPostId) {
      const { data: existing, error: fetchError } = await supabase
        .from('posts')
        .select('*, profiles:user_id(id, display_name, avatar_url, wilaya_id)')
        .eq('id', existingPostId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`فشل الاستعلام عن الإعلان السابق المعرف: ${existingPostId} (${fetchError.message})`);
      }

      if (!existing) {
        throw new Error(`تعذر العثور على الإعلان السابق المعرف: ${existingPostId}. لا يمكن استكمال العملية.`);
      }

      if (existing.user_id !== authenticatedUserId) {
        throw new Error(`غير مصرح لك باستعادة أو تعديل هذا الإعلان المعرف: ${existingPostId} (ملكية حساب آخر).`);
      }

      insertedPost = existing;
    } else {
      // 2. NEW POST PATH: Executed ONLY when existingPostId is not provided
      const now = new Date();
      const expires = new Date();
      expires.setDate(now.getDate() + 30);

      // Payload ONLY contains valid columns existing in posts table (images is excluded)
      const payload = {
        user_id: authenticatedUserId,
        title: post.title,
        description: post.description,
        post_type: post.post_type,
        category_id: post.category_id,
        subcategory_id: post.subcategory_id || null,
        wilaya_id: post.wilaya_id,
        commune_id: post.commune_id || null,
        commune_name: post.commune_name || null,
        price: post.price || null,
        budget_max: post.budget_max || null,
        is_free: Boolean(post.is_free),
        availability_status: post.availability_status || 'available',
        contact_preference: post.contact_preference || 'chat_only',
        condition: post.condition || null,
        last_confirmed_at: now.toISOString(),
        expires_at: expires.toISOString(),
        views_count: 0,
      };

      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert([payload])
        .select('*, profiles:user_id(id, display_name, avatar_url, wilaya_id)')
        .single();

      if (postError) {
        throw new Error(`فشل إنشاء الإعلان في قاعدة البيانات: ${postError.message}`);
      }
      insertedPost = newPost;
    }

    // 3. Persist post images to post_images child table if provided
    let savedImages: string[] = [];
    const imagesToSave = (post.images || []).filter(Boolean);

    if (imagesToSave.length > 0) {
      let needsInsert = true;

      // Idempotency check: if retrying, check existing images first
      if (existingPostId) {
        const { data: existingImgs, error: checkErr } = await supabase
          .from('post_images')
          .select('image_url, sort_order')
          .eq('post_id', insertedPost.id)
          .order('sort_order', { ascending: true });

        if (checkErr) {
          const err = new Error(`فشل استعلام صور الإعلان المحفوظة مسبقاً: ${checkErr.message}`);
          (err as any).pendingPostId = insertedPost.id;
          throw err;
        }

        if (existingImgs && existingImgs.length > 0) {
          // Compare exact lengths, URLs, and sort_orders element by element
          const exactMatch = existingImgs.length === imagesToSave.length && existingImgs.every((row: any, idx: number) => {
            const rowFullUrl = ensureFullUrl(row.image_url);
            const targetFullUrl = ensureFullUrl(imagesToSave[idx]);
            const matchesUrl = rowFullUrl === targetFullUrl || row.image_url === imagesToSave[idx];
            const matchesOrder = row.sort_order === idx;
            return matchesUrl && matchesOrder;
          });

          if (exactMatch) {
            savedImages = existingImgs.map((row: any) => ensureFullUrl(row.image_url)).filter(Boolean) as string[];
            needsInsert = false;
          } else {
            // Clean up previous rows before inserting new set
            const { error: delErr } = await supabase.from('post_images').delete().eq('post_id', insertedPost.id);
            if (delErr) {
              const err = new Error(`فشل تنظيف أسطر الصور السابقة للإعلان: ${delErr.message}`);
              (err as any).pendingPostId = insertedPost.id;
              throw err;
            }
          }
        }
      }

      if (needsInsert) {
        const imagePayloads = imagesToSave.map((imgUrl, index) => ({
          post_id: insertedPost.id,
          image_url: imgUrl,
          sort_order: index,
        }));

        const { data: imgData, error: imgError } = await supabase
          .from('post_images')
          .insert(imagePayloads)
          .select('image_url');

        if (imgError) {
          // Attempt compensation DELETE restricted strictly by id AND user_id
          const { data: deletedData, error: cleanupError } = await supabase
            .from('posts')
            .delete()
            .eq('id', insertedPost.id)
            .eq('user_id', insertedPost.user_id)
            .select('id');

          const wasDeleted = !cleanupError && Array.isArray(deletedData) && deletedData.length > 0;

          if (wasDeleted) {
            const err = new Error(`فشل حفظ صور الإعلان (${imgError.message}). تم إلغاء إنشاء الإعلان بنجاح لتجنب حفظ إعلان بدون صور.`);
            (err as any).pendingPostId = null;
            (err as any).wasDeleted = true;
            throw err;
          } else {
            const cleanupMsg = cleanupError
              ? `(خطأ الحذف التعويضي: ${cleanupError.message})`
              : `(لم يتم إرجاع أية سجلات محذوفة من قاعدة البيانات)`;
            
            const err = new Error(
              `فشل حفظ صور الإعلان في قاعدة البيانات (${imgError.message}). الإعلان محفوظ جزئياً برقم المعرف: ${insertedPost.id} ${cleanupMsg}`
            );
            (err as any).pendingPostId = insertedPost.id;
            (err as any).wasDeleted = false;
            throw err;
          }
        }

        if (imgData && imgData.length > 0) {
          savedImages = imgData.map((row: any) => ensureFullUrl(row.image_url)).filter(Boolean) as string[];
        } else {
          const err = new Error(`فشل حفظ صور الإعلان: لم يتم إرجاع صور محفوظة من قاعدة البيانات. المعرف: ${insertedPost.id}`);
          (err as any).pendingPostId = insertedPost.id;
          throw err;
        }
      }
    }

    return {
      id: insertedPost.id,
      user_id: insertedPost.user_id,
      title: insertedPost.title,
      description: insertedPost.description,
      post_type: insertedPost.post_type,
      category_id: insertedPost.category_id,
      subcategory_id: insertedPost.subcategory_id,
      wilaya_id: insertedPost.wilaya_id,
      commune_id: insertedPost.commune_id,
      commune_name: insertedPost.commune_name,
      images: savedImages,
      price: insertedPost.price != null ? Number(insertedPost.price) : undefined,
      budget_max: insertedPost.budget_max != null ? Number(insertedPost.budget_max) : undefined,
      is_free: insertedPost.is_free,
      availability_status: insertedPost.availability_status,
      contact_preference: insertedPost.contact_preference,
      condition: insertedPost.condition,
      last_confirmed_at: insertedPost.last_confirmed_at,
      expires_at: insertedPost.expires_at,
      views_count: insertedPost.views_count || 0,
      created_at: insertedPost.created_at,
      updated_at: insertedPost.updated_at,
      user: insertedPost.profiles ? {
        id: insertedPost.profiles.id,
        display_name: insertedPost.profiles.display_name,
        wilaya_id: insertedPost.profiles.wilaya_id,
        avatar_url: ensureFullUrl(insertedPost.profiles.avatar_url),
      } : undefined,
    };
  }

  public static async updatePost(id: string, updates: Partial<Post>): Promise<Post> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.category_id !== undefined) payload.category_id = updates.category_id;
    if (updates.subcategory_id !== undefined) payload.subcategory_id = updates.subcategory_id;
    if (updates.wilaya_id !== undefined) payload.wilaya_id = updates.wilaya_id;
    if (updates.commune_id !== undefined) payload.commune_id = updates.commune_id;
    if (updates.commune_name !== undefined) payload.commune_name = updates.commune_name;
    if (updates.images !== undefined) payload.images = updates.images;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.budget_max !== undefined) payload.budget_max = updates.budget_max;
    if (updates.is_free !== undefined) payload.is_free = updates.is_free;
    if (updates.availability_status !== undefined) payload.availability_status = updates.availability_status;
    if (updates.contact_preference !== undefined) payload.contact_preference = updates.contact_preference;
    if (updates.condition !== undefined) payload.condition = updates.condition;

    const { data, error } = await supabase
      .from('posts')
      .update(payload)
      .eq('id', id)
      .select('*, profiles:user_id(id, display_name, avatar_url, wilaya_id)')
      .single();

    if (error) {
      throw new Error(`فشل تحديث الإعلان: ${error.message}`);
    }

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      description: data.description,
      post_type: data.post_type,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id,
      wilaya_id: data.wilaya_id,
      commune_id: data.commune_id,
      commune_name: data.commune_name,
      images: (Array.isArray(data.images) ? data.images : []).map((img: string) => ensureFullUrl(img)).filter(Boolean) as string[],
      price: data.price != null ? Number(data.price) : undefined,
      budget_max: data.budget_max != null ? Number(data.budget_max) : undefined,
      is_free: data.is_free,
      availability_status: data.availability_status,
      contact_preference: data.contact_preference,
      condition: data.condition,
      last_confirmed_at: data.last_confirmed_at,
      expires_at: data.expires_at,
      views_count: data.views_count || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user: data.profiles ? {
        ...data.profiles,
        avatar_url: ensureFullUrl(data.profiles.avatar_url)
      } : undefined,
    };
  }

  public static async deletePost(id: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
      throw new Error(`فشل حذف الإعلان من قاعدة البيانات: ${error.message}`);
    }
  }

  public static async incrementPostViews(id: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;

    try {
      // Direct update increment
      const post = await this.fetchPostById(id);
      if (post) {
        await supabase
          .from('posts')
          .update({ views_count: (post.views_count || 0) + 1 })
          .eq('id', id);
      }
    } catch {
      // Non-critical operation
    }
  }

  // -------------------------------------------------------------------------
  // 3. STORAGE & IMAGES
  // -------------------------------------------------------------------------

  public static async uploadPostImage(file: File, userId: string): Promise<string> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `${userId}/${timestamp}_${random}.webp`;

    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(fileName, file, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (error) {
      throw new Error(`فشل رفع الصورة إلى سحابة Supabase Storage: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  public static async deletePostImage(imageUrlOrPath: string): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured || !imageUrlOrPath) return false;
    let storagePath = imageUrlOrPath.trim();
    if (storagePath.includes('/post-images/')) {
      storagePath = storagePath.split('/post-images/')[1].split('?')[0];
    }
    const { error } = await supabase.storage.from('post-images').remove([storagePath]);
    return !error;
  }

  // -------------------------------------------------------------------------
  // 4. CONVERSATIONS & MESSAGING
  // -------------------------------------------------------------------------

  public static async fetchConversations(userId: string): Promise<Conversation[]> {
    if (!supabase || !isSupabaseConfigured) return [];

    // Query conversations where user is a participant
    const { data: participantRows, error: pError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (pError || !participantRows || participantRows.length === 0) {
      return [];
    }

    const conversationIds = participantRows.map(r => r.conversation_id);

    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*, posts(*), conversation_participants(user_id, profiles:user_id(id, display_name, avatar_url, wilaya_id)))')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });

    if (convError || !convData) {
      return [];
    }

    return convData.map((c: any) => {
      const participants = (c.conversation_participants || [])
        .map((cp: any) => cp.profiles)
        .filter(Boolean);
      const participantIds = (c.conversation_participants || []).map((cp: any) => cp.user_id);

      return {
        id: c.id,
        post_id: c.post_id,
        post: c.posts,
        participant_ids: participantIds,
        participants,
        last_message: c.last_message,
        last_message_at: c.last_message_at,
        created_at: c.created_at,
      };
    });
  }

  public static async getOrCreateConversation(postId: string | undefined, otherUserId: string, currentUserId: string): Promise<Conversation> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    if (!postId) {
      throw new Error('post_id is required to start a conversation');
    }

    // Use secure Atomic Conversation Creation RPC
    // This derived recipient from post owner and handles atomic creation
    const { data: convId, error } = await supabase.rpc('create_conversation', {
      p_post_id: postId,
      p_recipient_id: otherUserId, // Ignored by RPC if caller is buyer, used if seller initiates
      p_initial_message: ''
    });

    if (error) {
      throw new Error(`فشل إنشاء المحادثة: ${error.message}`);
    }

    // Fetch the full conversation object
    const convs = await this.fetchConversations(currentUserId);
    const found = convs.find(c => c.id === convId);
    
    if (!found) {
       throw new Error('تعذر العثور على المحادثة المنشأة حديثاً.');
    }

    return found;
  }

  public static async fetchMessages(conversationId: string): Promise<Message[]> {
    if (!supabase || !isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles:sender_id(display_name)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((m: any) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      sender_name: m.profiles?.display_name,
      content: m.content,
      is_read: m.is_read,
      created_at: m.created_at,
    }));
  }

  public static async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
        is_read: false,
        created_at: now,
      }])
      .select('*, profiles:sender_id(display_name)')
      .single();

    if (error) {
      throw new Error(`فشل إرسال الرسالة: ${error.message}`);
    }

    // Update conversation last_message
    await supabase
      .from('conversations')
      .update({
        last_message: content.trim(),
        last_message_at: now,
      })
      .eq('id', conversationId);

    return {
      id: data.id,
      conversation_id: data.conversation_id,
      sender_id: data.sender_id,
      sender_name: data.profiles?.display_name,
      content: data.content,
      is_read: false,
      created_at: data.created_at,
    };
  }

  public static async markMessagesAsRead(conversationId: string, currentUserId: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId);
  }

  // -------------------------------------------------------------------------
  // 5. FAVORITES
  // -------------------------------------------------------------------------

  public static async fetchFavorites(userId: string): Promise<Favorite[]> {
    if (!supabase || !isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('favorites')
      .select('*, posts(*, profiles:user_id(id, display_name, avatar_url, wilaya_id))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((f: any) => ({
      id: f.id,
      user_id: f.user_id,
      post_id: f.post_id,
      created_at: f.created_at,
      post: f.posts ? {
        ...f.posts,
        user: f.posts.profiles,
      } : undefined,
    }));
  }

  public static async toggleFavorite(userId: string, postId: string): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
      return false; // Removed
    } else {
      await supabase.from('favorites').insert([{ user_id: userId, post_id: postId }]);
      return true; // Added
    }
  }

  // -------------------------------------------------------------------------
  // 6. NOTIFICATIONS
  // -------------------------------------------------------------------------

  public static async fetchNotifications(userId: string): Promise<AppNotification[]> {
    if (!supabase || !isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((n: any) => ({
      id: n.id,
      user_id: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body,
      related_post_id: n.related_post_id,
      related_conversation_id: n.related_conversation_id,
      is_read: n.is_read,
      created_at: n.created_at,
    }));
  }

  public static async markNotificationAsRead(id: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  }

  public static async markAllNotificationsAsRead(userId: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);
  }

  public static async createNotification(notification: Omit<AppNotification, 'id' | 'created_at'>): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;

    await supabase.from('notifications').insert([{
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      related_post_id: notification.related_post_id || null,
      related_conversation_id: notification.related_conversation_id || null,
      is_read: false,
    }]);
  }

  // -------------------------------------------------------------------------
  // 7. REPORTS & MODERATION (ADMIN)
  // -------------------------------------------------------------------------

  public static async submitReport(report: {
    reporter_id?: string;
    post_id?: string;
    reason: string;
    details?: string;
  }): Promise<void> {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase غير متصل.');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('يجب تسجيل الدخول لإرسال بلاغ.');
    }

    const { error } = await supabase.from('reports').insert([{
      reporter_id: user.id, // Force authenticated user ID
      post_id: report.post_id || null,
      reason: report.reason,
      details: report.details || '',
      status: 'pending',
    }]);

    if (error) {
      throw new Error(`فشل إرسال البلاغ: ${error.message}`);
    }
  }

  public static async fetchReports(): Promise<ContentReport[]> {
    if (!supabase || !isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      post_id: r.post_id,
      reporter_id: r.reporter_id || 'anonymous',
      reporter_name: r.reporter_name || 'مواطن',
      reason: r.reason,
      details: r.details,
      status: r.status,
      created_at: r.created_at,
    }));
  }

  public static async resolveReport(reportId: string, status: 'resolved' | 'rejected', notes?: string, adminId?: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;

    await supabase
      .from('reports')
      .update({ status })
      .eq('id', reportId);

    if (adminId) {
      await supabase.from('moderation_actions').insert([{
        admin_id: adminId,
        action: `report_${status}`,
        target_id: reportId,
        target_type: 'report',
        notes: notes || '',
      }]);
    }
  }

  public static async fetchAuditLogs(): Promise<ModerationAuditLog[]> {
    if (!supabase || !isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('moderation_actions')
      .select('*, profiles:admin_id(display_name, avatar_url)')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((a: any) => ({
      id: a.id,
      admin_id: a.admin_id,
      admin_name: a.profiles?.display_name || 'مشرف المنصة',
      action_type: a.action,
      target_id: a.target_id,
      target_type: a.target_type,
      notes: a.notes,
      created_at: a.created_at,
    }));
  }
}
