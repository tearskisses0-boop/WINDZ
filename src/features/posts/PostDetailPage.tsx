import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../lib/supabase/store';
import { getWilayaById, getWilayaName } from '../../data/locations/wilayas';
import { getCategoryById, getCategoryName } from '../../data/categories';
import { findMatchesForPost, MatchResult } from '../../lib/matching/engine';
import { ReportModal } from '../../components/ui/ReportModal';
import { ListingCard } from '../../components/ui/ListingCard';
import { 
  MapPin, 
  Clock, 
  Heart, 
  Share2, 
  AlertTriangle, 
  MessageSquare, 
  Phone, 
  HelpCircle, 
  CheckCircle2, 
  Calendar, 
  Edit3, 
  Trash2, 
  Sparkles,
  ShieldCheck,
  Package,
  Wrench,
  GraduationCap,
  HeartHandshake,
  Check,
  MessageCircle
} from 'lucide-react';
import { formatPhoneDisplay, normalizeCallNumber, buildWhatsAppUrl } from '../../utils/phoneUtils';

export const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user, isAuthenticated } = useAuth();

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);

  const post = id ? store.getPostById(id) : undefined;

  useEffect(() => {
    if (id) {
      store.incrementPostViews(id);
    }
    if (post) {
      const opposingMatches = findMatchesForPost(post, store.getPosts());
      setMatches(opposingMatches.slice(0, 3));
    }
  }, [id, post]);

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
          الإعلان غير موجود أو تم حذفه
        </h2>
        <Link
          to="/explore"
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm"
        >
          العودة للاستكشاف
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === post.user_id;
  const isNeed = post.post_type === 'NEED';
  const isFavorite = store.isPostFavorite(post.id);

  const wilaya = getWilayaById(post.wilaya_id);
  const category = getCategoryById(post.category_id);

  const handleContactPoster = () => {
    if (!isAuthenticated) {
      alert('يرجى تسجيل الدخول لبدء محادثة آمنة مع صاحب الإعلان.');
      return;
    }
    if (isOwner) {
      alert('لا يمكنك مراسلة نفسك.');
      return;
    }

    try {
      const conv = store.getOrCreateConversation(post.id, post.user_id);
      navigate(`/messages?conv=${conv.id}`);
    } catch (err: any) {
      alert(err.message || 'تعذر بدء المحادثة');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: `شاهد هذا الإعلان على منصة WIN DZ: ${post.title}`,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleMarkStatus = (status: 'fulfilled' | 'unavailable' | 'available') => {
    store.updatePost(post.id, {
      availability_status: status,
      last_confirmed_at: new Date().toISOString(),
    });
  };

  const handleDeletePost = () => {
    if (window.confirm(t.confirmDeletePost)) {
      store.deletePost(post.id);
      navigate('/explore');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        
        {/* Post Type & Category & Wilaya Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isNeed ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white'
              }`}
            >
              {isNeed ? <HelpCircle className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isNeed ? t.needBadge : t.offerBadge}
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full">
              {getCategoryName(category, language)}
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              <MapPin className="w-3.5 h-3.5 text-teal-500" />
              {getWilayaName(wilaya, language)}
              {post.commune_name ? ` • ${post.commune_name}` : ''}
            </span>
          </div>

          {/* Social / Utility Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => store.toggleFavorite(post.id)}
              className={`p-2 rounded-xl border transition ${
                isFavorite
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
              title={isFavorite ? t.removeFromFavorites : t.addToFavorites}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
              title={t.sharePost}
            >
              {copiedShare ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsReportOpen(true)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 transition"
              title={t.reportPost}
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title & Price Header */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {post.is_free ? (
              <span className="px-3.5 py-1.5 rounded-xl font-black text-sm bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40">
                {t.freeItem}
              </span>
            ) : isNeed ? (
              post.budget_max ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{t.budget}:</span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {post.budget_max.toLocaleString()} د.ج
                  </span>
                </div>
              ) : null
            ) : post.price ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{t.price}:</span>
                <span className="text-xl font-black text-teal-600 dark:text-teal-400">
                  {post.price.toLocaleString()} د.ج
                </span>
              </div>
            ) : null}

            {/* Availability & Confirmation Badge */}
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span className={`w-2 h-2 rounded-full ${
                post.availability_status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
              <span>
                {post.availability_status === 'available'
                  ? t.statusAvailable
                  : post.availability_status === 'fulfilled'
                  ? t.statusFulfilled
                  : t.statusUnavailable}
              </span>
              <span className="text-slate-400 text-[10px]">
                ({t.lastConfirmed}: {new Date(post.last_confirmed_at).toLocaleDateString()})
              </span>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        {post.images && post.images.length > 0 && (
          <div className="space-y-3">
            <div className="relative h-64 sm:h-96 w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
              <img
                src={post.images[activeImageIndex]}
                alt={post.title}
                className="w-full h-full object-contain"
              />
            </div>
            {post.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {post.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                      activeImageIndex === idx ? 'border-teal-500 scale-95' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detailed Description */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            التفاصيل الكاملة
          </h2>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed text-sm whitespace-pre-line">
            {post.description}
          </div>
        </div>

        {/* Metadata Details (Dates & Safety) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-500" />
            <span>{t.postedOn}: {new Date(post.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-500" />
            <span>{t.expiresOn}: {new Date(post.expires_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>حماية الخصوصية: مراسلة داخلية مشفرة</span>
          </div>
        </div>

        {/* Primary Contact CTA or Owner Management Controls */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          {isOwner ? (
            /* Owner Actions */
            <div className="w-full space-y-3">
              <p className="text-xs font-bold text-teal-600 dark:text-teal-400">
                أنت صاحب هذا الإعلان — إدارة الإعلان:
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/edit/${post.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t.editPost}</span>
                </Link>

                {post.availability_status === 'available' ? (
                  <>
                    <button
                      onClick={() => handleMarkStatus('fulfilled')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs border border-emerald-300/40 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.markFulfilled}</span>
                    </button>
                    <button
                      onClick={() => handleMarkStatus('unavailable')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-xs border border-amber-300/40 transition cursor-pointer"
                    >
                      <span>{t.markUnavailable}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleMarkStatus('available')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                  >
                    <span>تأكيد التوفر مجدداً (متاح الآن)</span>
                  </button>
                )}

                <button
                  onClick={handleDeletePost}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-xs border border-rose-300/40 transition ms-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.deletePost}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Visitor / Citizen Actions */
            (() => {
              const sellerPhone = post.user?.phone;
              const isPhonePublic = Boolean(
                sellerPhone && 
                (post.user?.show_phone_publicly !== false) && 
                (post.contact_preference === 'phone_allowed')
              );
              const callUri = isPhonePublic ? normalizeCallNumber(sellerPhone) : null;
              const whatsappUri = isPhonePublic ? buildWhatsAppUrl(sellerPhone, post.title, language) : null;

              return (
                <div className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {post.user?.display_name || 'مواطن مسجل'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {!isPhonePublic ? t.contactByChatOnly : t.contactByPhone}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {isPhonePublic && sellerPhone ? (
                      <>
                        {/* Direct Call Button */}
                        {callUri && (
                          <a
                            href={`tel:${callUri}`}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition min-h-[44px]"
                            title={`${t.callSeller}: ${formatPhoneDisplay(sellerPhone)}`}
                          >
                            <Phone className="w-4 h-4 shrink-0" />
                            <span>{t.callSeller}</span>
                            <span className="text-[11px] opacity-90 dir-ltr">({formatPhoneDisplay(sellerPhone)})</span>
                          </a>
                        )}

                        {/* Direct WhatsApp Button */}
                        {whatsappUri && (
                          <a
                            href={whatsappUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition min-h-[44px]"
                            title={t.whatsappContact}
                          >
                            <MessageCircle className="w-4 h-4 shrink-0" />
                            <span>{t.whatsappContact}</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                        {t.phoneHidden}
                      </span>
                    )}

                    {/* Internal Chat Button */}
                    <button
                      onClick={handleContactPoster}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer min-h-[44px]"
                    >
                      <MessageSquare className="w-4 h-4 shrink-0 text-teal-400" />
                      <span>{t.contactOwner}</span>
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Smart Proximity Matching Showcase */}
      {matches.length > 0 && (
        <section className="bg-gradient-to-br from-teal-950/20 via-slate-900/10 to-transparent p-6 rounded-3xl border border-teal-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isNeed ? t.matchingOffersFound : t.matchingNeedsFound}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  مطابقة ذكية محلية بالولاية والبلدية والكلمات الدلالية
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2.5 py-1 rounded-lg">
              {matches.length} نتائج
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((m) => (
              <div key={m.post.id} className="relative">
                <div className="absolute top-2 end-2 z-30 bg-teal-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                  تطابق {m.score}%
                </div>
                <ListingCard post={m.post} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        postId={post.id}
        reportedUserId={post.user_id}
      />
    </div>
  );
};
