import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../lib/supabase/store';
import { ListingCard } from '../../components/ui/ListingCard';
import { LocationSelector } from '../../components/ui/LocationSelector';
import { ALGERIAN_WILAYAS, getWilayaName, getWilayaById } from '../../data/locations/wilayas';
import { getCommuneById } from '../../data/locations/communes';
import { 
  User, 
  HelpCircle, 
  Sparkles, 
  Heart, 
  Bookmark, 
  Settings, 
  PlusCircle, 
  Trash2, 
  Shield, 
  CheckCircle2, 
  Lock,
  Phone,
  Mail,
  MapPin,
  Ban,
  LogOut,
  Camera,
  Loader2
} from 'lucide-react';
import { uploadImageToStorage } from '../../lib/storage/supabaseStorage';

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated, signOut, updateProfile, deleteAccount } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'needs' | 'offers' | 'favorites' | 'saved' | 'settings'>('needs');

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [showPhonePublicly, setShowPhonePublicly] = useState<boolean>(user?.show_phone_publicly === true);
  const [wilayaId, setWilayaId] = useState<number>(user?.wilaya_id || 16);
  const [communeName, setCommuneName] = useState(user?.commune_name || '');
  const [communeId, setCommuneId] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-3">يرجى تسجيل الدخول للوصول إلى لوحة التحكم</h2>
        <Link to="/" className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  const allPosts = store.getPosts();
  const myNeeds = allPosts.filter(p => p.user_id === user.id && p.post_type === 'NEED');
  const myOffers = allPosts.filter(p => p.user_id === user.id && p.post_type === 'OFFER');
  const myFavorites = store.getFavorites();
  const mySavedSearches = store.getSavedSearches();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingAvatar(true);
    setAvatarError('');
    try {
      const file = e.target.files[0];
      const result = await uploadImageToStorage(file, user.id);
      updateProfile({ avatar_url: result.url });
    } catch (err: any) {
      setAvatarError(err.message || 'فشل تحديث الصورة الشخصية');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      display_name: displayName.trim(),
      phone: phone.trim(),
      show_phone_publicly: showPhonePublicly,
      wilaya_id: wilayaId,
      commune_name: communeName || undefined,
    });
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 2000);
  };

  const handleDeleteMyAccount = () => {
    if (window.confirm(t.confirmDeleteAccount)) {
      deleteAccount();
      navigate('/');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Profile Overview Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-navy-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-start flex-col sm:flex-row">
          
          {/* Avatar with Upload Capability */}
          <div className="relative group">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-teal-500 text-slate-950 font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-teal-400/40">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.display_name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user.display_name.substring(0, 1)}</span>
              )}
            </div>

            <label 
              className="absolute -bottom-1 -right-1 bg-slate-900/90 hover:bg-teal-600 text-white p-1.5 rounded-xl border border-slate-700 cursor-pointer shadow-md transition"
              title="تغيير الصورة الشخصية"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black">{user.display_name}</h1>
              {user.role === 'admin' && (
                <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  مشرف إداري
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 flex items-center justify-center sm:justify-start gap-2">
              <span>{user.email}</span>
              <span>•</span>
              <span>ولاية {getWilayaName(getWilayaById(user.wilaya_id), language)}</span>
            </p>
            {avatarError && (
              <p className="text-rose-400 text-xs mt-1">{avatarError}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
          <Link
            to="/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>نشر إعلان جديد</span>
          </Link>

          {user.role === 'admin' && (
            <Link
              to="/secure-admin"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition min-h-[44px]"
            >
              <Shield className="w-4 h-4" />
              <span>لوحة الإدارة</span>
            </Link>
          )}

          <button
            onClick={() => {
              signOut();
              navigate('/');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs sm:text-sm border border-rose-500/30 shadow-md transition cursor-pointer min-h-[44px]"
            title={t.logout}
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>{t.logout}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('needs')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'needs'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>{t.needsTab} ({myNeeds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('offers')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'offers'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t.offersTab} ({myOffers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'favorites'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>{t.favoritesTab} ({myFavorites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'saved'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>{t.savedSearchesTab} ({mySavedSearches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition shrink-0 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{t.settingsTab}</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div>
        {/* Needs Tab */}
        {activeTab === 'needs' && (
          <div className="space-y-4">
            {myNeeds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myNeeds.map(post => (
                  <ListingCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                <p className="text-slate-500 text-sm mb-4">لم تنشر أي طلب حتى الآن.</p>
                <Link
                  to="/create"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs"
                >
                  انشر طلبك الآن
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Offers Tab */}
        {activeTab === 'offers' && (
          <div className="space-y-4">
            {myOffers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myOffers.map(post => (
                  <ListingCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                <p className="text-slate-500 text-sm mb-4">لم تنشر أي عرض متاح حتى الآن.</p>
                <Link
                  to="/create"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs"
                >
                  انشر عرضك الآن
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            {myFavorites.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myFavorites.map(fav => (
                  fav.post && <ListingCard key={fav.id} post={fav.post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                <p className="text-slate-500 text-sm mb-4">لا توجد إعلانات في المفضلة حالياً.</p>
                <Link
                  to="/explore"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs"
                >
                  استكشف الإعلانات
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Saved Searches Tab */}
        {activeTab === 'saved' && (
          <div className="space-y-3">
            {mySavedSearches.length > 0 ? (
              mySavedSearches.map(saved => (
                <div
                  key={saved.id}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{saved.name}</h3>
                    <p className="text-xs text-slate-400">
                      تنبيهات المطابقة مفعلة • {new Date(saved.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/explore?q=${encodeURIComponent(saved.query || '')}&wilaya=${saved.wilaya_id || 'ALL'}`}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold text-xs"
                    >
                      عرض النتائج
                    </Link>
                    <button
                      onClick={() => store.deleteSavedSearch(saved.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                <p className="text-slate-500 text-sm">لم تحفظ أي بحث حتى الآن.</p>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 max-w-xl mx-auto space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.settingsTab}
            </h2>

            {settingsSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.savedSuccessfully}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.displayName}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.phoneLabel}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                <input
                  type="checkbox"
                  id="showPhonePublicly"
                  checked={showPhonePublicly}
                  onChange={(e) => setShowPhonePublicly(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
                />
                <label htmlFor="showPhonePublicly" className="text-xs leading-relaxed cursor-pointer select-none">
                  <span className="font-bold block text-slate-800 dark:text-slate-200">
                    {t.showPhonePublicly}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block mt-0.5">
                    {t.showPhonePubliclyDesc}
                  </span>
                </label>
              </div>

              <div className="pt-1">
                <LocationSelector
                  selectedWilayaId={wilayaId}
                  selectedCommuneId={communeId}
                  onWilayaChange={(w) => setWilayaId(Number(w))}
                  onCommuneChange={(c) => {
                    setCommuneId(c);
                    const comm = getCommuneById(c);
                    if (comm) setCommuneName(comm.name_ar);
                  }}
                  showAllOption={false}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md transition cursor-pointer min-h-[44px]"
              >
                {t.saveChanges}
              </button>
            </form>

            {/* Supabase Data Migration Section */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-teal-700 dark:text-teal-400 mb-1">مزامنة البيانات المحلية إلى سحابة Supabase</h3>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                إذا قمت بإنشاء إعلانات أو حفظ مفضلات قبل تسجيل الدخول، يمكنك نقلها ومزامنتها مباشرة إلى حسابك السحابي الدائم.
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await store.migrateLocalDataToSupabase(user.id);
                    alert(`تمت المزامنة بنجاح! تم نقل ${res.migratedPosts} إعلان و ${res.migratedFavorites} مفضلة إلى حسابك السحابي.`);
                  } catch (err: any) {
                    alert(`فشل نقل البيانات: ${err.message}`);
                  }
                }}
                className="w-full py-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>مزامنة الإعلانات والمفضلات المحلية إلى السحابة</span>
              </button>
            </div>

            {/* Logout Section for Mobile, Tablet & Desktop */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">جلسة الحساب</h3>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                إنهاء جلستك الحالية والعودة لصفحة التصفح كزائر.
              </p>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  navigate('/');
                }}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-rose-50 text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-rose-600 mb-2">{t.deleteAccount}</h3>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                سيؤدي حذف الحساب إلى مسح كافة إعلاناتك ورسائلك وسجلاتك نهائياً دون إمكانية استرجاعها.
              </p>
              <button
                type="button"
                onClick={handleDeleteMyAccount}
                className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 transition min-h-[44px]"
              >
                تأكيد حذف حسابي نهائياً
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
