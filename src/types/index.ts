export type PostType = 'NEED' | 'OFFER';

export type AvailabilityStatus = 'available' | 'unavailable' | 'fulfilled' | 'expired' | 'hidden';

export type ContactPreference = 'chat_only' | 'phone_allowed';

export type UserRole = 'user' | 'moderator' | 'admin';

export type SupportedLanguage = 'ar' | 'fr' | 'en';

export interface Wilaya {
  id: number;
  code: string; // e.g. "01", "16", "69"
  name_ar: string;
  name_fr: string;
  name_en: string;
  region: 'Center' | 'East' | 'West' | 'South' | 'Highlands';
}

export interface Commune {
  id: string;
  wilaya_id: number;
  name_ar: string;
  name_fr: string;
  name_en: string;
  postal_code?: string;
  is_seat?: boolean;
}

export interface Category {
  id: string;
  code: 'products' | 'services' | 'opportunities' | 'places' | 'community_help';
  name_ar: string;
  name_fr: string;
  name_en: string;
  description_ar: string;
  description_fr: string;
  description_en: string;
  icon: string;
  color: string;
  subcategories: {
    id: string;
    name_ar: string;
    name_fr: string;
    name_en: string;
  }[];
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  wilaya_id: number;
  commune_name?: string;
  commune_id?: string;
  preferred_language: SupportedLanguage;
  role: UserRole;
  is_verified?: boolean;
  is_suspended?: boolean;
  show_phone_publicly?: boolean;
  created_at: string;
  last_active_at?: string;
}

export interface Post {
  id: string;
  user_id: string;
  user?: Partial<UserProfile>;
  title: string;
  description: string;
  post_type: PostType; // NEED | OFFER
  category_id: string;
  subcategory_id?: string;
  wilaya_id: number;
  commune_id?: string;
  commune_name?: string;
  images: string[];
  price?: number; // Optional in DZD
  is_free: boolean;
  budget_max?: number;
  availability_status: AvailabilityStatus;
  contact_preference: ContactPreference;
  condition?: string; // New, good, acceptable (for products)
  last_confirmed_at: string;
  expires_at: string;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  post_id?: string;
  post?: Partial<Post>;
  participant_ids: string[];
  participants?: UserProfile[];
  last_message?: string;
  last_message_at: string;
  created_at: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export type NotificationType = 
  | 'match_found'
  | 'new_message'
  | 'new_reply'
  | 'listing_status'
  | 'saved_search_alert'
  | 'moderation';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_post_id?: string;
  related_conversation_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  post?: Post;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  query?: string;
  post_type?: PostType;
  category_id?: string;
  wilaya_id?: number;
  is_free?: boolean;
  notify_on_new_match: boolean;
  created_at: string;
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  reporter_name?: string;
  post_id?: string;
  reported_user_id?: string;
  reason: 'fraud' | 'fake_offer' | 'misleading' | 'spam' | 'harassment' | 'inappropriate' | 'expired';
  details: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  admin_notes?: string;
}

export interface ModerationAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: 'hide_post' | 'delete_post' | 'restore_post' | 'suspend_user' | 'restore_user' | 'dismiss_report';
  target_id: string;
  target_type: 'post' | 'user' | 'report';
  notes: string;
  created_at: string;
}

export interface SearchFilterState {
  query: string;
  post_type?: PostType | 'ALL';
  category_id?: string;
  subcategory_id?: string;
  wilaya_id?: number | 'ALL';
  commune_id?: string;
  is_free_only?: boolean;
  availability?: AvailabilityStatus | 'ALL';
  sortBy?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
  page: number;
  pageSize: number;
}
