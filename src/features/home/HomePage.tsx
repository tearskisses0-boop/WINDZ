import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../lib/supabase/store';
import { PLATFORM_CATEGORIES, getCategoryName } from '../../data/categories';
import { ALGERIAN_WILAYAS, getWilayaName } from '../../data/locations/wilayas';
import { ListingCard } from '../../components/ui/ListingCard';
import { PWAInstallButton } from '../../components/pwa/PWAInstallButton';
import { 
  Search, 
  MapPin, 
  PlusCircle, 
  HelpCircle, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight,
  ShieldCheck, 
  Users, 
  Compass,
  Package,
  Wrench,
  GraduationCap,
  HeartHandshake,
  CheckCircle2
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { language, direction, t } = useLanguage();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEED' | 'OFFER'>('ALL');

  const allPosts = store.getPosts();
  const needPosts = allPosts.filter(p => p.post_type === 'NEED' && p.availability_status === 'available');
  const offerPosts = allPosts.filter(p => p.post_type === 'OFFER' && p.availability_status === 'available');

  const displayedPosts = activeTab === 'ALL' 
    ? allPosts.filter(p => p.availability_status === 'available').slice(0, 6)
    : activeTab === 'NEED'
    ? needPosts.slice(0, 6)
    : offerPosts.slice(0, 6);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedWilaya !== 'ALL') params.set('wilaya', selectedWilaya);
    navigate(`/explore?${params.toString()}`);
  };

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const renderCatIcon = (code: string) => {
    if (code === 'products') return <Package className="w-5 h-5 sm:w-6 sm:h-6" />;
    if (code === 'services') return <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />;
    if (code === 'opportunities') return <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />;
    if (code === 'places') return <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />;
    return <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6" />;
  };

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* PWA Install Banner */}
      <PWAInstallButton variant="banner" />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl mx-3 sm:mx-6 p-6 sm:p-12 lg:p-16 shadow-2xl border border-teal-500/20">
        
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 text-teal-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-inner">
            <Compass className="w-4 h-4 text-teal-400 animate-spin" style={{ animationDuration: '10s' }} />
            <span>منصة البحث والاستكشاف المجانية لكافة ربوع الجزائر</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-tight">
            وين نلقاها في <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">الجزائر</span>؟
          </h1>

          <p className="text-slate-300 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
            {t.heroSubtitle}
          </p>

          {/* Large Central Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-8 bg-white dark:bg-slate-900/95 p-2 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row gap-2 sm:gap-3"
          >
            {/* Keyword Input */}
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 absolute start-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-slate-50 dark:bg-slate-800/60 border-none rounded-xl sm:rounded-2xl ps-10 pe-3 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            {/* Wilaya Selector */}
            <div className="relative w-full md:w-56 flex items-center shrink-0">
              <MapPin className="w-4 h-4 absolute start-3 text-teal-500 pointer-events-none" />
              <select
                value={selectedWilaya}
                onChange={(e) => setSelectedWilaya(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/60 border-none rounded-xl sm:rounded-2xl ps-9 pe-3 py-3 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="ALL">{t.allWilayas}</option>
                {ALGERIAN_WILAYAS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {getWilayaName(w, language)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Submit Button */}
            <button
              type="submit"
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-slate-950 font-black px-6 py-3 rounded-xl sm:rounded-2xl text-sm transition-all shadow-md shadow-teal-500/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>{t.searchButton}</span>
            </button>
          </form>

          {/* Quick Category Badges */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">أكثر ما يبحث عنه المواطنون:</span>
            {['قطع غيار سيارات', 'تصليح أجهزة', 'إعارة عتاد', 'كتب ومراجع', 'ديباناج'].map((kw) => (
              <button
                key={kw}
                onClick={() => {
                  setSearchQuery(kw);
                  navigate(`/explore?q=${encodeURIComponent(kw)}`);
                }}
                className="bg-slate-800/80 hover:bg-slate-700 text-teal-300 px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5 Primary Categories Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              الأقسام الرئيسية للاستكشاف
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              اختر القسم لتصفح كل ما يبحث عنه أو يقدمه المواطنون
            </p>
          </div>
          <Link
            to="/explore"
            className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>{t.browseAll}</span>
            <ArrowIcon className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {PLATFORM_CATEGORIES.map((cat) => {
            const count = allPosts.filter(p => p.category_id === cat.id && p.availability_status === 'available').length;
            return (
              <Link
                key={cat.id}
                to={`/explore?category=${cat.id}`}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shadow-inner"
                  style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                >
                  {renderCatIcon(cat.code)}
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
                  {getCategoryName(cat, language)}
                </h3>
                <span className="text-[11px] text-slate-400 mt-1 font-medium">
                  {count} إعلان نشط
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Listings with Tab Switcher (Need vs Offer) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              آخر ما نُشر على WIN DZ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              طلبات تبحث عمن يلبيها وعروض جاهزة للمشاركة
            </p>
          </div>

          {/* Post Type Tab Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              الكل ({allPosts.filter(p => p.availability_status === 'available').length})
            </button>
            <button
              onClick={() => setActiveTab('NEED')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer ${
                activeTab === 'NEED'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>طلبات مواطنين ({needPosts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('OFFER')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer ${
                activeTab === 'OFFER'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>عروض متوفرة ({offerPosts.length})</span>
            </button>
          </div>
        </div>

        {/* Listings Grid or Clean Empty State */}
        {displayedPosts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {displayedPosts.map((post) => (
                <ListingCard key={post.id} post={post} />
              ))}
            </div>

            {/* View All CTA */}
            <div className="mt-8 text-center">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700/80 text-teal-700 dark:text-teal-300 font-bold text-sm border border-slate-200 dark:border-slate-700 transition"
              >
                <span>{t.browseAll}</span>
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-800 max-w-lg mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
              لا توجد إعلانات حالياً
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              كن أول من يشارك طلباً أو عرضاً لمساعدة المواطنين في بلديتك أو ولايتك عبر كامل التراب الوطني.
            </p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>أضف إعلانك الأول</span>
            </Link>
          </div>
        )}
      </section>

      {/* How WIN DZ Works */}
      <section className="bg-slate-100 dark:bg-slate-900/60 py-12 sm:py-16 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {t.howItWorks}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              منصة مجتمعية بسيطة تهدف لربط المواطنين في الجزائر وحل مشكلة البحث دون أي وسيط أو تكلفة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center relative shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-xl flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                {t.step1Title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.step1Desc}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center relative shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-xl flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                {t.step2Title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.step2Desc}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 text-center relative shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-xl flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                {t.step3Title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.step3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Civic Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-start">
            <h3 className="text-2xl sm:text-3xl font-black">
              تبحث عن شيء نادر أو لديك ما تود إعارته ومشاركته؟
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              انشر طلبك أو عرضك الآن مجاناً وساعد إخوانك المواطنين في ولايتك أو عبر كامل التراب الوطني.
            </p>
          </div>
          <Link
            to="/create"
            className="bg-white text-slate-950 hover:bg-teal-100 font-black px-8 py-3.5 rounded-2xl text-sm transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-teal-600" />
            <span>{t.publishAction}</span>
          </Link>
        </div>
      </section>
    </div>
  );
};
