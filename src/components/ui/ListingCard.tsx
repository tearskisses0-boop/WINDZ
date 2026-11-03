import React from 'react';
import { Post } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../lib/supabase/store';
import { getWilayaById, getWilayaName } from '../../data/locations/wilayas';
import { getCategoryById, getCategoryName } from '../../data/categories';
import { 
  MapPin, 
  Clock, 
  Heart, 
  HelpCircle, 
  CheckCircle2, 
  Eye, 
  Sparkles,
  Package,
  Wrench,
  GraduationCap,
  HeartHandshake,
  Phone,
  MessageCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { normalizeCallNumber, buildWhatsAppUrl } from '../../utils/phoneUtils';

interface Props {
  post: Post;
  onFavoriteToggle?: () => void;
}

export const ListingCard: React.FC<Props> = ({ post, onFavoriteToggle }) => {
  const { language, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const isFavorite = store.isPostFavorite(post.id);

  const wilaya = getWilayaById(post.wilaya_id);
  const category = getCategoryById(post.category_id);

  const sellerPhone = post.user?.phone;
  const isPhonePublic = Boolean(
    sellerPhone && 
    (post.user?.show_phone_publicly !== false) && 
    (post.contact_preference === 'phone_allowed')
  );
  const callUri = isPhonePublic ? normalizeCallNumber(sellerPhone) : null;
  const whatsappUri = isPhonePublic ? buildWhatsAppUrl(sellerPhone, post.title, language) : null;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('يرجى تسجيل الدخول لحفظ الإعلان في المفضلة');
      return;
    }
    store.toggleFavorite(post.id);
    if (onFavoriteToggle) onFavoriteToggle();
  };

  const isNeed = post.post_type === 'NEED';

  // Category Icon Resolver
  const renderCategoryIcon = () => {
    if (post.category_id === 'cat-products') return <Package className="w-3.5 h-3.5" />;
    if (post.category_id === 'cat-services') return <Wrench className="w-3.5 h-3.5" />;
    if (post.category_id === 'cat-opportunities') return <GraduationCap className="w-3.5 h-3.5" />;
    if (post.category_id === 'cat-places') return <MapPin className="w-3.5 h-3.5" />;
    return <HeartHandshake className="w-3.5 h-3.5" />;
  };

  return (
    <Link
      to={`/post/${post.id}`}
      className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/50 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative cursor-pointer"
    >
      {/* Top Banner & Image or Gradient Header */}
      <div className="relative h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
        {post.images && post.images.length > 0 ? (
          <img
            src={post.images[0]}
            alt={post.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${
            isNeed 
              ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-slate-900/10 dark:from-amber-950/30 dark:to-slate-900' 
              : 'bg-gradient-to-br from-teal-500/10 via-emerald-500/10 to-slate-900/10 dark:from-teal-950/30 dark:to-slate-900'
          }`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 shadow-inner ${
              isNeed ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
            }`}>
              {isNeed ? <HelpCircle className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {getCategoryName(category, language)}
            </span>
          </div>
        )}

        {/* Post Type Badge */}
        <div className="absolute top-3 start-3 z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md ${
              isNeed
                ? 'bg-amber-500/90 text-white'
                : 'bg-teal-600/90 text-white'
            }`}
          >
            {isNeed ? <HelpCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isNeed ? t.needBadge : t.offerBadge}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? t.removeFromFavorites : t.addToFavorites}
          className={`absolute top-3 end-3 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-md ${
            isFavorite
              ? 'bg-rose-500 text-white scale-110'
              : 'bg-black/40 text-white hover:bg-black/60 hover:scale-105'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Availability Badge */}
        {post.availability_status !== 'available' && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-20">
            <span className="bg-slate-900 text-amber-300 font-bold px-3 py-1 rounded-full text-xs border border-amber-500/40">
              {post.availability_status === 'fulfilled' ? t.statusFulfilled : t.statusUnavailable}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category & Location Header */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 gap-2">
          <span className="inline-flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate">
            {renderCategoryIcon()}
            {getCategoryName(category, language)}
          </span>

          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium shrink-0">
            <MapPin className="w-3.5 h-3.5 text-teal-500" />
            {getWilayaName(wilaya, language)}
            {post.commune_name ? ` (${post.commune_name})` : ''}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base line-clamp-2 mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
          {post.title}
        </h3>

        {/* Description snippet */}
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {post.description}
        </p>

        {/* Footer info: Price/Budget and Date */}
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            {post.is_free ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300/40">
                {t.freeItem}
              </span>
            ) : isNeed ? (
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {post.budget_max ? (
                  <>
                    <span className="text-slate-400 text-[10px] block">{t.budget}:</span>
                    <strong className="text-amber-600 dark:text-amber-400 text-sm">{post.budget_max.toLocaleString()} د.ج</strong>
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">ميزانية حسب الاتفاق</span>
                )}
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {post.price ? (
                  <>
                    <span className="text-slate-400 text-[10px] block">{t.price}:</span>
                    <strong className="text-teal-600 dark:text-teal-400 text-sm">{post.price.toLocaleString()} د.ج</strong>
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">السعر عند التواصل</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {isPhonePublic && (callUri || whatsappUri) && (
              <div className="flex items-center gap-1.5 me-1" onClick={(e) => e.stopPropagation()}>
                {callUri && (
                  <a
                    href={`tel:${callUri}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 hover:bg-teal-600 hover:text-white flex items-center justify-center transition"
                    title={`${t.callSeller}: ${sellerPhone}`}
                  >
                    <Phone className="w-3 h-3" />
                  </a>
                )}
                {whatsappUri && (
                  <a
                    href={whatsappUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition"
                    title={t.whatsappContact}
                  >
                    <MessageCircle className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" />
              {post.views_count || 0}
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5" title={post.created_at}>
              <Clock className="w-3 h-3" />
              {new Date(post.created_at).toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
