import { 
  Post, 
  UserProfile, 
  Conversation, 
  Message, 
  AppNotification, 
  Favorite, 
  SavedSearch, 
  ContentReport, 
  ModerationAuditLog,
  SearchFilterState
} from '../../types';
import { 
  INITIAL_DEMO_POSTS, 
  INITIAL_DEMO_NOTIFICATIONS, 
  INITIAL_DEMO_REPORTS 
} from './mockData';
import { findMatchesForPost } from '../matching/engine';
import { supabase, isSupabaseConfigured } from './client';
import { SupabaseService } from './supabaseService';
import { activeEnvConfig } from './envConfig';

const STORAGE_KEYS = {
  POSTS: 'windz_posts_v2',
  USERS: 'windz_users_v1',
  CURRENT_USER: 'windz_current_user_v1',
  CONVERSATIONS: 'windz_convs_v1',
  MESSAGES: 'windz_msgs_v1',
  NOTIFICATIONS: 'windz_notifs_v1',
  FAVORITES: 'windz_favs_v1',
  SAVED_SEARCHES: 'windz_saved_searches_v1',
  REPORTS: 'windz_reports_v1',
  AUDIT_LOGS: 'windz_audit_logs_v1',
  BLOCKED_USERS: 'windz_blocked_users_v1',
};

class DataStore {
  private posts: Post[] = [];
  private users: UserProfile[] = [];
  private currentUser: UserProfile | null = null;
  private conversations: Conversation[] = [];
  private messages: Message[] = [];
  private notifications: AppNotification[] = [];
  private favorites: Favorite[] = [];
  private savedSearches: SavedSearch[] = [];
  private reports: ContentReport[] = [];
  private auditLogs: ModerationAuditLog[] = [];
  private blockedUsers: Record<string, string[]> = {};

  private listeners: Set<() => void> = new Set();
  private isSupabaseSyncing = false;

  constructor() {
    this.initData();
    if (isSupabaseConfigured && supabase) {
      this.initSupabaseSync();
    }
  }

  private initData() {
    try {
      // 1. Posts (clean slate from windz_posts_v2, purge legacy v1 cache)
      try {
        localStorage.removeItem('windz_posts_v1');
      } catch {
        // ignore localStorage errors in sandboxed iframes
      }
      const savedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
      const parsedPosts: Post[] = savedPosts ? JSON.parse(savedPosts) : [];
      this.posts = parsedPosts.filter(p => !p.id.startsWith('post-'));

      // 2. Users (filter out legacy demo users)
      const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      const parsedUsers: UserProfile[] = savedUsers ? JSON.parse(savedUsers) : [];
      this.users = parsedUsers.filter(u => !u.id.startsWith('user-'));

      // 3. Current User (strictly null by default for unauthenticated visitors)
      const savedCurUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (savedCurUser) {
        const parsed = JSON.parse(savedCurUser);
        this.currentUser = (parsed && !parsed.id?.startsWith('user-')) ? parsed : null;
      } else {
        this.currentUser = null;
      }

      // 4. Notifications
      const savedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const parsedNotifs: AppNotification[] = savedNotifs ? JSON.parse(savedNotifs) : [];
      this.notifications = parsedNotifs.filter(n => !n.id.startsWith('notif-'));

      // 5. Reports
      const savedReports = localStorage.getItem(STORAGE_KEYS.REPORTS);
      const parsedReports: ContentReport[] = savedReports ? JSON.parse(savedReports) : [];
      this.reports = parsedReports.filter(r => !r.id.startsWith('rep-'));

      // 6. Favorites
      const savedFavs = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      this.favorites = savedFavs ? JSON.parse(savedFavs) : [];

      // 7. Saved searches
      const savedSearches = localStorage.getItem(STORAGE_KEYS.SAVED_SEARCHES);
      this.savedSearches = savedSearches ? JSON.parse(savedSearches) : [];

      // 8. Conversations & Messages (clean empty by default)
      const savedConvs = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      const parsedConvs: Conversation[] = savedConvs ? JSON.parse(savedConvs) : [];
      this.conversations = parsedConvs.filter(c => !c.id.startsWith('conv-'));

      const savedMsgs = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      const parsedMsgs: Message[] = savedMsgs ? JSON.parse(savedMsgs) : [];
      this.messages = parsedMsgs.filter(m => !m.id.startsWith('msg-'));

      // 9. Blocked users
      const savedBlocked = localStorage.getItem(STORAGE_KEYS.BLOCKED_USERS);
      this.blockedUsers = savedBlocked ? JSON.parse(savedBlocked) : {};

      // 10. Audit logs
      const savedLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      this.auditLogs = savedLogs ? JSON.parse(savedLogs) : [];
    } catch {
      this.posts = [];
      this.users = [];
      this.currentUser = null;
      this.notifications = [];
      this.reports = [];
      this.favorites = [];
      this.conversations = [];
      this.messages = [];
      this.auditLogs = [];
    }
  }

  /**
   * Initializes real-time synchronization and auth state listener with Supabase
   */
  private async initSupabaseSync() {
    if (!supabase || !isSupabaseConfigured) return;

    try {
      // 1. Initial sync of posts
      await this.refreshPostsFromSupabase();

      // 1.1 Initial check for existing session profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await SupabaseService.getProfile(session.user.id);
        if (profile) {
          this.currentUser = profile;
          if (profile.role === 'admin') {
            await this.refreshUsersFromSupabase();
          }
          this.save();
        }
      }

      // 2. Auth State Changes Listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          try {
            const profile = await SupabaseService.getProfile(session.user.id);
            if (profile) {
              this.currentUser = profile;
              
              // If admin, fetch all users to replace demo data
              if (profile.role === 'admin') {
                await this.refreshUsersFromSupabase();
              }
              
              this.save();
              await this.syncUserDataFromSupabase(profile.id);
            }
          } catch (e) {
            console.warn('Profile fetch on auth change:', e);
          }
        } else if (event === 'SIGNED_OUT') {
          // If explicitly signed out of Supabase
          this.currentUser = null;
          this.users = [];
          this.save();
        }
      });

      // 3. Realtime Channel for Posts
      supabase
        .channel('public:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          this.refreshPostsFromSupabase();
        })
        .subscribe();

      // 4. Realtime Channel for Messages
      supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          const newMsg = payload.new;
          if (newMsg && !this.messages.some(m => m.id === newMsg.id)) {
            this.messages.push({
              id: newMsg.id,
              conversation_id: newMsg.conversation_id,
              sender_id: newMsg.sender_id,
              content: newMsg.content,
              is_read: newMsg.is_read,
              created_at: newMsg.created_at,
            });
            this.save();
          }
        })
        .subscribe();

    } catch (err) {
      console.error('Supabase initial sync error:', err);
    }
  }

  public async refreshPostsFromSupabase(): Promise<void> {
    if (!supabase || !isSupabaseConfigured || this.isSupabaseSyncing) return;
    this.isSupabaseSyncing = true;
    try {
      const res = await SupabaseService.fetchPosts({ pageSize: 100 });
      if (res && Array.isArray(res.posts)) {
        // Successful query response (including empty [] as authoritative DB state)
        this.posts = res.posts;
        this.save();
      }
    } catch (err) {
      // Network failure or DB query error: KEEP current local posts, DO NOT wipe!
      console.warn('Network error or fetch failure during refreshPostsFromSupabase. Retaining local cache:', err);
    } finally {
      this.isSupabaseSyncing = false;
    }
  }

  public async refreshUsersFromSupabase(): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;
    try {
      const dbUsers = await SupabaseService.fetchAllProfiles();
      if (dbUsers && dbUsers.length > 0) {
        // Only keep demo users if they are not in the DB
        this.users = dbUsers;
        this.save();
      }
    } catch (err) {
      console.warn('Could not refresh users from Supabase:', err);
    }
  }

  public async syncUserDataFromSupabase(userId: string): Promise<void> {
    if (!supabase || !isSupabaseConfigured) return;
    try {
      const [convs, favs, notifs] = await Promise.all([
        SupabaseService.fetchConversations(userId).catch(() => []),
        SupabaseService.fetchFavorites(userId).catch(() => []),
        SupabaseService.fetchNotifications(userId).catch(() => []),
      ]);

      if (convs.length > 0) {
        this.conversations = convs;
      }
      if (favs.length > 0) {
        this.favorites = favs;
      }
      if (notifs.length > 0) {
        this.notifications = notifs;
      }
      this.save();
    } catch (err) {
      console.warn('User data sync error:', err);
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(this.posts));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(this.conversations));
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(this.messages));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(this.favorites));
      localStorage.setItem(STORAGE_KEYS.SAVED_SEARCHES, JSON.stringify(this.savedSearches));
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(this.reports));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs));
      localStorage.setItem(STORAGE_KEYS.BLOCKED_USERS, JSON.stringify(this.blockedUsers));
    } catch (e) {
      console.warn('LocalStorage save notice:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error(err);
      }
    }
  }

  // --- POSTS ---
  public getPosts(): Post[] {
    return [...this.posts];
  }

  public getPostById(id: string): Post | undefined {
    return this.posts.find(p => p.id === id);
  }

  public incrementPostViews(id: string): void {
    const post = this.posts.find(p => p.id === id);
    if (post) {
      post.views_count = (post.views_count || 0) + 1;
      this.save();
    }
    if (isSupabaseConfigured) {
      SupabaseService.incrementPostViews(id).catch(() => {});
    }
  }

  public async createPost(
    data: Omit<Post, 'id' | 'views_count' | 'created_at' | 'updated_at' | 'last_confirmed_at' | 'expires_at'>,
    existingPostId?: string
  ): Promise<Post> {
    if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
      throw new Error(`فشل إنشاء الإعلان: ${activeEnvConfig.statusMessage}`);
    }

    if (!this.currentUser) {
      throw new Error('يجب تسجيل الدخول لنشر إعلان أو طلب.');
    }

    const now = new Date();
    const expires = new Date();
    expires.setDate(now.getDate() + 30);

    const tempId = existingPostId || `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPost: Post = {
      ...data,
      id: tempId,
      user_id: this.currentUser.id,
      user: {
        id: this.currentUser.id,
        display_name: this.currentUser.display_name,
        wilaya_id: this.currentUser.wilaya_id,
        phone: this.currentUser.phone,
      },
      last_confirmed_at: now.toISOString(),
      expires_at: expires.toISOString(),
      views_count: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // If Supabase is connected and configured, persist to database
    if (isSupabaseConfigured && supabase) {
      // Optimistically add to local array if not already there
      const existingIdx = this.posts.findIndex(p => p.id === tempId);
      if (existingIdx === -1) {
        this.posts.unshift(newPost);
      }

      try {
        const savedPost = await SupabaseService.createPost(data, existingPostId);
        // Replace temp or existing post with confirmed DB post containing real UUID
        const idx = this.posts.findIndex(p => p.id === tempId || p.id === savedPost.id);
        if (idx !== -1) {
          this.posts[idx] = savedPost;
        } else {
          this.posts.unshift(savedPost);
        }
        this.save();
        this.notify();
        return savedPost;
      } catch (err: any) {
        // REVERT optimistic update on Supabase failure ONLY if post wasn't partially saved in DB
        if (!err.pendingPostId) {
          this.posts = this.posts.filter(p => p.id !== tempId);
        }
        this.save();
        this.notify();
        throw err;
      }
    }

    // Fallback for local offline development
    this.posts.unshift(newPost);
    this.save();
    this.notify();
    return newPost;
  }

  public updatePost(id: string, updates: Partial<Post>): Post {
    if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
      throw new Error(`فشل تعديل الإعلان: ${activeEnvConfig.statusMessage}`);
    }

    const idx = this.posts.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('الإعلان غير موجود.');

    const current = this.posts[idx];
    if (this.currentUser?.role !== 'admin' && this.currentUser?.id !== current.user_id) {
      throw new Error('ليس لديك صلاحية تعديل هذا الإعلان.');
    }

    this.posts[idx] = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      SupabaseService.updatePost(id, updates).catch(err => {
        console.error('Supabase updatePost error:', err);
      });
    }

    this.save();
    return this.posts[idx];
  }

  public deletePost(id: string): void {
    if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
      throw new Error(`فشل حذف الإعلان: ${activeEnvConfig.statusMessage}`);
    }

    const post = this.posts.find(p => p.id === id);
    if (!post) return;

    if (this.currentUser?.role !== 'admin' && this.currentUser?.id !== post.user_id) {
      throw new Error('غير مصرح لك بحذف هذا الإعلان.');
    }

    this.posts = this.posts.filter(p => p.id !== id);

    if (isSupabaseConfigured && supabase) {
      SupabaseService.deletePost(id).catch(err => {
        console.error('Supabase deletePost error:', err);
      });
    }

    this.save();
  }

  public searchPosts(filters: SearchFilterState): { posts: Post[]; total: number } {
    let filtered = this.posts.filter(p => {
      if (this.currentUser?.role !== 'admin') {
        if (p.availability_status === 'hidden' || p.availability_status === 'expired') {
          return false;
        }
      }

      if (filters.query && filters.query.trim() !== '') {
        const qTokens = filters.query.toLowerCase().trim().split(/\s+/);
        const textContent = `${p.title} ${p.description} ${p.commune_name || ''}`.toLowerCase();
        const matchesAll = qTokens.every(token => textContent.includes(token));
        if (!matchesAll) return false;
      }

      if (filters.post_type && filters.post_type !== 'ALL') {
        if (p.post_type !== filters.post_type) return false;
      }

      if (filters.category_id && filters.category_id !== 'ALL') {
        if (p.category_id !== filters.category_id) return false;
      }

      if (filters.subcategory_id && filters.subcategory_id !== 'ALL') {
        if (p.subcategory_id !== filters.subcategory_id) return false;
      }

      if (filters.wilaya_id && filters.wilaya_id !== 'ALL') {
        if (p.wilaya_id !== Number(filters.wilaya_id)) return false;
      }

      if (filters.commune_id && filters.commune_id !== 'ALL') {
        if (p.commune_id !== filters.commune_id) return false;
      }

      if (filters.is_free_only) {
        if (!p.is_free) return false;
      }

      if (filters.availability && filters.availability !== 'ALL') {
        if (p.availability_status !== filters.availability) return false;
      }

      return true;
    });

    const sortBy = filters.sortBy || 'newest';
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'price_asc') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    const total = filtered.length;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 12;
    const paginated = filtered.slice(0, page * pageSize);

    return { posts: paginated, total };
  }

  // --- USER AUTH & PROFILES ---
  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public getAllUsers(): UserProfile[] {
    return [...this.users];
  }

  public signIn(_email: string): UserProfile {
    throw new Error('تسجيل الدخول يتطلب الاتصال بمصادقة Supabase الرسمية وإدخال كلمة المرور.');
  }

  public signUp(_data: { email: string; display_name: string; wilaya_id: number; phone?: string }): UserProfile {
    throw new Error('إنشاء الحساب يتطلب الاتصال بمصادقة Supabase الرسمية.');
  }

  public async getProfile(userId: string): Promise<UserProfile | null> {
    const cached = this.users.find(u => u.id === userId);
    if (cached && !cached.id.startsWith('user-')) {
       // Optional: could re-validate here if needed
    }

    if (isSupabaseConfigured && !userId.startsWith('user-')) {
      const profile = await SupabaseService.getProfile(userId);
      if (profile) {
        // Update cache
        const idx = this.users.findIndex(u => u.id === userId);
        if (idx !== -1) {
          this.users[idx] = profile;
        } else {
          this.users.push(profile);
        }
        this.save();
        return profile;
      }
    }

    return cached || null;
  }

  public signOut(): void {
    this.currentUser = null;
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    this.save();
  }

  public updateProfile(updates: Partial<UserProfile>): UserProfile {
    if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
      throw new Error(`فشل تحديث الملف الشخصي: ${activeEnvConfig.statusMessage}`);
    }
    if (!this.currentUser) throw new Error('غير مسجل.');
    const idx = this.users.findIndex(u => u.id === this.currentUser!.id);
    if (idx !== -1) {
      this.users[idx] = { ...this.users[idx], ...updates };
      this.currentUser = this.users[idx];
      this.save();

      if (isSupabaseConfigured && supabase && !this.currentUser.id.startsWith('user-')) {
        SupabaseService.updateProfile(this.currentUser.id, updates).catch(err => {
          console.warn('Supabase profile update:', err);
        });
      }

      return this.currentUser;
    }
    throw new Error('المستخدم غير موجود.');
  }

  public deleteAccount(): void {
    if (!this.currentUser) return;
    const uid = this.currentUser.id;
    this.posts = this.posts.filter(p => p.user_id !== uid);
    this.users = this.users.filter(u => u.id !== uid);
    this.conversations = this.conversations.filter(c => !c.participant_ids.includes(uid));
    this.notifications = this.notifications.filter(n => n.user_id !== uid);
    this.currentUser = null;
    this.save();
  }

  // --- MESSAGING ---
  public getConversations(): Conversation[] {
    if (!this.currentUser) return [];
    const uid = this.currentUser.id;
    return this.conversations
      .filter(c => c.participant_ids.includes(uid))
      .map(c => {
        const otherId = c.participant_ids.find(id => id !== uid);
        const otherUser = this.users.find(u => u.id === otherId);
        const post = c.post_id ? this.posts.find(p => p.id === c.post_id) : undefined;
        const unread = this.messages.filter(m => m.conversation_id === c.id && m.sender_id !== uid && !m.is_read).length;

        return {
          ...c,
          post,
          participants: otherUser ? [otherUser] : [],
          unread_count: unread,
        };
      })
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  }

  public getOrCreateConversation(postId: string, otherUserId: string): Conversation {
    if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
      throw new Error(`فشل فتح المحادثة: ${activeEnvConfig.statusMessage}`);
    }
    if (!this.currentUser) throw new Error('يجب تسجيل الدخول لبدء محادثة.');
    const myId = this.currentUser.id;

    if (myId === otherUserId) {
      throw new Error('لا يمكنك بدء محادثة مع نفسك.');
    }

    if (this.isUserBlocked(otherUserId)) {
      throw new Error('لا يمكنك مراسلة هذا المستخدم لأنه محظور.');
    }

    const existing = this.conversations.find(
      c => c.participant_ids.includes(myId) && c.participant_ids.includes(otherUserId) && (!postId || c.post_id === postId)
    );

    if (existing) return existing;

    const post = this.posts.find(p => p.id === postId);
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      post_id: postId,
      post,
      participant_ids: [myId, otherUserId],
      last_message: '',
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    this.conversations.unshift(newConv);

    if (isSupabaseConfigured && supabase && !myId.startsWith('user-')) {
      SupabaseService.getOrCreateConversation(postId, otherUserId, myId).catch(err => {
        console.warn('Supabase conversation sync:', err);
      });
    }

    this.save();
    return newConv;
  }

  public getMessages(conversationId: string): Message[] {
    if (!this.currentUser) return [];
    const conv = this.conversations.find(c => c.id === conversationId);
    if (!conv || !conv.participant_ids.includes(this.currentUser.id)) {
      return [];
    }
    return this.messages.filter(m => m.conversation_id === conversationId);
  }

  public sendMessage(conversationId: string, content: string): Message {
    if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
      throw new Error(`فشل إرسال الرسالة: ${activeEnvConfig.statusMessage}`);
    }
    if (!this.currentUser) throw new Error('غير مسجل.');
    const trimmed = content.trim();
    if (!trimmed) throw new Error('الرسالة فارغة.');

    const conv = this.conversations.find(c => c.id === conversationId);
    if (!conv || !conv.participant_ids.includes(this.currentUser.id)) {
      throw new Error('غير مصرح لك بالمراسلة في هذه المحادثة.');
    }

    const recipientId = conv.participant_ids.find(id => id !== this.currentUser!.id);
    if (recipientId && this.isUserBlocked(recipientId)) {
      throw new Error('لا يمكن إرسال الرسالة لأن المستخدم محظور.');
    }

    const now = new Date().toISOString();
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: this.currentUser.id,
      sender_name: this.currentUser.display_name,
      content: trimmed,
      is_read: false,
      created_at: now,
    };

    this.messages.push(newMsg);
    conv.last_message = trimmed;
    conv.last_message_at = now;

    if (isSupabaseConfigured && supabase && !this.currentUser.id.startsWith('user-')) {
      SupabaseService.sendMessage(conversationId, this.currentUser.id, trimmed).catch(err => {
        console.warn('Supabase message persist notice:', err);
      });
    }

    if (recipientId) {
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        user_id: recipientId,
        type: 'new_message',
        title: `رسالة جديدة من ${this.currentUser.display_name}`,
        body: trimmed.length > 60 ? `${trimmed.substring(0, 60)}...` : trimmed,
        related_conversation_id: conversationId,
        related_post_id: conv.post_id,
        is_read: false,
        created_at: now,
      };
      this.notifications.unshift(notif);

      if (isSupabaseConfigured) {
        SupabaseService.createNotification(notif).catch(() => {});
      }
    }

    this.save();
    return newMsg;
  }

  public markMessagesRead(conversationId: string): void {
    if (!this.currentUser) return;
    const uid = this.currentUser.id;
    let modified = false;

    for (const msg of this.messages) {
      if (msg.conversation_id === conversationId && msg.sender_id !== uid && !msg.is_read) {
        msg.is_read = true;
        modified = true;
      }
    }

    if (isSupabaseConfigured && supabase && !uid.startsWith('user-')) {
      SupabaseService.markMessagesAsRead(conversationId, uid).catch(() => {});
    }

    if (modified) this.save();
  }

  // --- USER BLOCKING ---
  public blockUser(targetUserId: string): void {
    if (!this.currentUser) return;
    const uid = this.currentUser.id;
    if (!this.blockedUsers[uid]) this.blockedUsers[uid] = [];
    if (!this.blockedUsers[uid].includes(targetUserId)) {
      this.blockedUsers[uid].push(targetUserId);
      this.save();
    }
  }

  public unblockUser(targetUserId: string): void {
    if (!this.currentUser) return;
    const uid = this.currentUser.id;
    if (this.blockedUsers[uid]) {
      this.blockedUsers[uid] = this.blockedUsers[uid].filter(id => id !== targetUserId);
      this.save();
    }
  }

  public isUserBlocked(targetUserId: string): boolean {
    if (!this.currentUser) return false;
    const list = this.blockedUsers[this.currentUser.id] || [];
    return list.includes(targetUserId);
  }

  // --- NOTIFICATIONS ---
  public getNotifications(): AppNotification[] {
    if (!this.currentUser) return [];
    return this.notifications.filter(n => n.user_id === this.currentUser!.id);
  }

  public getUnreadNotificationCount(): number {
    if (!this.currentUser) return 0;
    return this.notifications.filter(n => n.user_id === this.currentUser!.id && !n.is_read).length;
  }

  public markNotificationAsRead(id: string): void {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.is_read = true;
      this.save();
    }
    if (isSupabaseConfigured) {
      SupabaseService.markNotificationAsRead(id).catch(() => {});
    }
  }

  public markAllNotificationsAsRead(): void {
    if (!this.currentUser) return;
    const uid = this.currentUser.id;
    for (const n of this.notifications) {
      if (n.user_id === uid) n.is_read = true;
    }
    if (isSupabaseConfigured && !uid.startsWith('user-')) {
      SupabaseService.markAllNotificationsAsRead(uid).catch(() => {});
    }
    this.save();
  }

  public clearNotifications(): void {
    if (!this.currentUser) return;
    const uid = this.currentUser.id;
    this.notifications = this.notifications.filter(n => n.user_id !== uid);
    this.save();
  }

  // --- FAVORITES ---
  public getFavorites(): Favorite[] {
    if (!this.currentUser) return [];
    const uid = this.currentUser.id;
    return this.favorites
      .filter(f => f.user_id === uid)
      .map(f => ({
        ...f,
        post: this.posts.find(p => p.id === f.post_id),
      }))
      .filter(f => f.post !== undefined);
  }

  public isPostFavorite(postId: string): boolean {
    if (!this.currentUser) return false;
    return this.favorites.some(f => f.user_id === this.currentUser!.id && f.post_id === postId);
  }

  public toggleFavorite(postId: string): boolean {
    if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
      throw new Error(`فشل المفضلة: ${activeEnvConfig.statusMessage}`);
    }
    if (!this.currentUser) throw new Error('يجب تسجيل الدخول لإضافة إعلان للمفضلة.');
    const uid = this.currentUser.id;
    const idx = this.favorites.findIndex(f => f.user_id === uid && f.post_id === postId);

    let isAdded = false;
    if (idx !== -1) {
      this.favorites.splice(idx, 1);
      isAdded = false;
    } else {
      this.favorites.push({
        id: `fav-${Date.now()}`,
        user_id: uid,
        post_id: postId,
        created_at: new Date().toISOString(),
      });
      isAdded = true;
    }

    if (isSupabaseConfigured && supabase && !uid.startsWith('user-')) {
      SupabaseService.toggleFavorite(uid, postId).catch(err => {
        console.warn('Supabase toggleFavorite notice:', err);
      });
    }

    this.save();
    return isAdded;
  }

  // --- SAVED SEARCHES ---
  public getSavedSearches(): SavedSearch[] {
    if (!this.currentUser) return [];
    return this.savedSearches.filter(s => s.user_id === this.currentUser!.id);
  }

  public saveSearch(name: string, filter: SearchFilterState): SavedSearch {
    if (!this.currentUser) throw new Error('غير مسجل.');
    const newSearch: SavedSearch = {
      id: `saved-${Date.now()}`,
      user_id: this.currentUser.id,
      name,
      query: filter.query,
      post_type: filter.post_type !== 'ALL' ? filter.post_type : undefined,
      category_id: filter.category_id !== 'ALL' ? filter.category_id : undefined,
      wilaya_id: filter.wilaya_id !== 'ALL' ? Number(filter.wilaya_id) : undefined,
      is_free: filter.is_free_only,
      notify_on_new_match: true,
      created_at: new Date().toISOString(),
    };

    this.savedSearches.push(newSearch);
    this.save();
    return newSearch;
  }

  public deleteSavedSearch(id: string): void {
    this.savedSearches = this.savedSearches.filter(s => s.id !== id);
    this.save();
  }

  // --- REPORTS & MODERATION ---
  public submitReport(data: { post_id?: string; reported_user_id?: string; reason: ContentReport['reason']; details: string }): ContentReport {
    if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
      throw new Error(`فشل إرسال البلاغ: ${activeEnvConfig.statusMessage}`);
    }
    const reporter = this.currentUser;
    const newReport: ContentReport = {
      id: `rep-${Date.now()}`,
      reporter_id: reporter ? reporter.id : 'anonymous',
      reporter_name: reporter ? reporter.display_name : 'زائر',
      post_id: data.post_id,
      reported_user_id: data.reported_user_id,
      reason: data.reason,
      details: data.details,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    this.reports.unshift(newReport);

    if (isSupabaseConfigured && supabase) {
      SupabaseService.submitReport({
        reporter_id: reporter?.id,
        post_id: data.post_id,
        reason: data.reason,
        details: data.details,
      }).catch(err => {
        console.warn('Supabase report submit notice:', err);
      });
    }

    this.save();
    return newReport;
  }

  public getReports(): ContentReport[] {
    return [...this.reports];
  }

  public resolveReport(reportId: string, status: 'resolved' | 'rejected', notes?: string): void {
    if (this.currentUser?.role !== 'admin') throw new Error('يتطلب صلاحيات المشرف.');
    const rep = this.reports.find(r => r.id === reportId);
    if (rep) {
      rep.status = status;
      rep.reviewed_at = new Date().toISOString();
      rep.admin_notes = notes || '';

      this.logAuditAction({
        action_type: 'dismiss_report',
        target_id: reportId,
        target_type: 'report',
        notes: `Report marked as ${status}: ${notes || ''}`,
      });

      if (isSupabaseConfigured && supabase) {
        SupabaseService.resolveReport(reportId, status, notes, this.currentUser?.id).catch(err => {
          console.warn('Supabase resolve report notice:', err);
        });
      }

      this.save();
    }
  }

  public adminHidePost(postId: string, notes: string): void {
    if (this.currentUser?.role !== 'admin') throw new Error('صلاحيات غير كافية.');
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      post.availability_status = 'hidden';
      this.logAuditAction({
        action_type: 'hide_post',
        target_id: postId,
        target_type: 'post',
        notes,
      });
      if (isSupabaseConfigured && supabase) {
        SupabaseService.updatePost(postId, { availability_status: 'hidden' }).catch(() => {});
      }
      this.save();
    }
  }

  public adminRestorePost(postId: string): void {
    if (this.currentUser?.role !== 'admin') throw new Error('صلاحيات غير كافية.');
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      post.availability_status = 'available';
      this.logAuditAction({
        action_type: 'restore_post',
        target_id: postId,
        target_type: 'post',
        notes: 'Restored by admin',
      });
      if (isSupabaseConfigured && supabase) {
        SupabaseService.updatePost(postId, { availability_status: 'available' }).catch(() => {});
      }
      this.save();
    }
  }

  public adminSuspendUser(userId: string, notes: string): void {
    if (this.currentUser?.role !== 'admin') throw new Error('صلاحيات غير كافية.');
    const target = this.users.find(u => u.id === userId);
    if (target) {
      target.is_suspended = true;
      this.logAuditAction({
        action_type: 'suspend_user',
        target_id: userId,
        target_type: 'user',
        notes,
      });
      this.save();
    }
  }

  public adminRestoreUser(userId: string): void {
    if (this.currentUser?.role !== 'admin') throw new Error('صلاحيات غير كافية.');
    const target = this.users.find(u => u.id === userId);
    if (target) {
      target.is_suspended = false;
      this.logAuditAction({
        action_type: 'restore_user',
        target_id: userId,
        target_type: 'user',
        notes: 'Account restored by admin',
      });
      this.save();
    }
  }

  public getAuditLogs(): ModerationAuditLog[] {
    return [...this.auditLogs];
  }

  private logAuditAction(action: Omit<ModerationAuditLog, 'id' | 'admin_id' | 'admin_name' | 'created_at'>) {
    if (!this.currentUser) return;
    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      admin_id: this.currentUser.id,
      admin_name: this.currentUser.display_name,
      created_at: new Date().toISOString(),
      ...action,
    });
  }

  /**
   * Safe migration helper for existing local data (posts, favorites) to an authenticated Supabase account
   */
  public async migrateLocalDataToSupabase(targetUserId: string): Promise<{ migratedPosts: number; migratedFavorites: number }> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase غير متصل لنقل البيانات.');
    }

    let migratedPosts = 0;
    let migratedFavorites = 0;

    // 1. Migrate offline posts created locally
    const localPosts = this.posts.filter(p => p.id.startsWith('post-') && p.user_id !== targetUserId);
    for (const lp of localPosts) {
      try {
        await SupabaseService.createPost({
          ...lp,
          user_id: targetUserId,
        });
        migratedPosts++;
      } catch (e) {
        console.warn('Post migration error for', lp.id, e);
      }
    }

    // 2. Migrate local favorites
    const localFavs = this.favorites.filter(f => f.id.startsWith('fav-'));
    for (const lf of localFavs) {
      try {
        await SupabaseService.toggleFavorite(targetUserId, lf.post_id);
        migratedFavorites++;
      } catch (e) {
        console.warn('Favorite migration error for', lf.post_id, e);
      }
    }

    await this.refreshPostsFromSupabase();
    await this.syncUserDataFromSupabase(targetUserId);

    return { migratedPosts, migratedFavorites };
  }
}

export const store = new DataStore();
