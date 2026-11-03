import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../lib/supabase/store';
import { PLATFORM_CATEGORIES, getCategoryName } from '../../data/categories';
import { ALGERIAN_WILAYAS, getWilayaName } from '../../data/locations/wilayas';
import { getCommuneById } from '../../data/locations/communes';
import { LocationSelector } from '../../components/ui/LocationSelector';
import { uploadImageToStorage, deleteImageFromStorage } from '../../lib/storage/supabaseStorage';
import { AuthModal } from '../../components/ui/AuthModal';
import { PostType, ContactPreference } from '../../types';
import { 
  HelpCircle, 
  Sparkles, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Shield, 
  Image as ImageIcon 
} from 'lucide-react';

export const CreatePostPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Form Fields
  const [postType, setPostType] = useState<PostType>('NEED');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('cat-products');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [wilayaId, setWilayaId] = useState<number>(user?.wilaya_id || 16);
  const [communeId, setCommuneId] = useState('');
  const [priceOrBudget, setPriceOrBudget] = useState<string>('');
  const [isFree, setIsFree] = useState(false);
  const [contactPreference, setContactPreference] = useState<ContactPreference>('chat_only');
  const [condition, setCondition] = useState('');

  // Images state
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCategory = PLATFORM_CATEGORIES.find(c => c.id === categoryId);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (!isAuthenticated || !user) {
      setIsAuthModalOpen(true);
      setError('يرجى تسجيل الدخول أولاً لتتمكن من رفع الصور إلى إعلانك.');
      return;
    }

    if (uploadedImages.length >= 4) {
      alert('الحد الأقصى هو 4 صور لكل إعلان.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const file = e.target.files[0];
      const result = await uploadImageToStorage(file, user.id);
      setUploadedImages(prev => [...prev, result.url]);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الصورة.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const targetUrl = uploadedImages[index];
    if (targetUrl) {
      deleteImageFromStorage(targetUrl).catch(() => {});
    }
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!title.trim() || title.trim().length < 5) {
      setError('يرجى إدخال عنوان واضح ومفهوم (5 أحرف على الأقل).');
      return;
    }

    if (!description.trim() || description.trim().length < 15) {
      setError('يرجى تقديم تفاصيل كافية في الوصف (15 حرفاً على الأقل).');
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedAmount = priceOrBudget.trim() ? Number(priceOrBudget) : undefined;

      const selectedCommuneObj = communeId ? getCommuneById(communeId) : undefined;

      const created = store.createPost({
        user_id: user!.id,
        title: title.trim(),
        description: description.trim(),
        post_type: postType,
        category_id: categoryId,
        subcategory_id: subcategoryId || undefined,
        wilaya_id: wilayaId,
        commune_id: communeId || undefined,
        commune_name: selectedCommuneObj?.name_ar || undefined,
        images: uploadedImages,
        price: postType === 'OFFER' && !isFree ? parsedAmount : undefined,
        budget_max: postType === 'NEED' && !isFree ? parsedAmount : undefined,
        is_free: isFree,
        availability_status: 'available',
        contact_preference: contactPreference,
        condition: condition.trim() || undefined,
      });

      navigate(`/post/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ الإعلان.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* Page Title */}
      <div className="text-center mb-8 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {t.createPostTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          انشر طلبك أو عرضك بدون وسيط ومجاناً 100% عبر كامل التراب الوطني
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8"
      >
        
        {/* Step 1: Type Selection (NEED vs OFFER) */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-white">
            {t.postTypeSelection}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* NEED Card */}
            <button
              type="button"
              onClick={() => {
                setPostType('NEED');
                setIsFree(false);
              }}
              className={`p-4 rounded-2xl border-2 text-start transition-all cursor-pointer relative ${
                postType === 'NEED'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    {t.publishNeed}
                  </h3>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                    طلب مواطن (أبحث عنه)
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                تبحث عن قطعة غيار، خدمة تصليح، دواء نادر، عتاد للاستعارة أو مساعدة.
              </p>
              {postType === 'NEED' && (
                <div className="absolute top-3 end-3 w-3 h-3 rounded-full bg-amber-500" />
              )}
            </button>

            {/* OFFER Card */}
            <button
              type="button"
              onClick={() => {
                setPostType('OFFER');
              }}
              className={`p-4 rounded-2xl border-2 text-start transition-all cursor-pointer relative ${
                postType === 'OFFER'
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    {t.publishOffer}
                  </h3>
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold">
                    عرض متوفر (متاح للمشاركة)
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                لديك سلعة، أدوات للإعارة، خدمة تقدمها، هبة مجانية، أو دورة تكوينية.
              </p>
              {postType === 'OFFER' && (
                <div className="absolute top-3 end-3 w-3 h-3 rounded-full bg-teal-500" />
              )}
            </button>
          </div>
        </div>

        {/* Step 2: Title & Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.titleLabel} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.descriptionLabel} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
        </div>

        {/* Step 3: Category & Subcategory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.categoryLabel} <span className="text-rose-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId('');
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {PLATFORM_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryName(cat, language)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.subcategoryLabel}
            </label>
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="">اختر التصنيف الفرعي (اختياري)</option>
              {selectedCategory?.subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {language === 'fr' ? sub.name_fr : language === 'en' ? sub.name_en : sub.name_ar}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 4: Location (Wilaya & Commune) */}
        <div>
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            الموقع الجغرافي المعني بالطلب أو العرض
          </span>
          <LocationSelector
            selectedWilayaId={wilayaId}
            selectedCommuneId={communeId}
            onWilayaChange={(w) => setWilayaId(Number(w))}
            onCommuneChange={(c) => setCommuneId(c)}
            showAllOption={false}
          />
        </div>

        {/* Step 5: Price / Budget / Free Checkbox */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => {
                setIsFree(e.target.checked);
                if (e.target.checked) setPriceOrBudget('');
              }}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {t.isFreeCheckbox}
            </span>
          </label>

          {!isFree && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                {postType === 'NEED' ? t.budget : t.price} (د.ج - بالدينار الجزائري)
              </label>
              <input
                type="number"
                value={priceOrBudget}
                onChange={(e) => setPriceOrBudget(e.target.value)}
                placeholder="مثال: 4500"
                min="0"
                step="100"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}
        </div>

        {/* Step 6: Images Upload */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {t.imagesLabel}
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t.imagesHint}
          </p>

          <div className="flex flex-wrap gap-3 items-center">
            {uploadedImages.map((imgUrl, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 end-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {uploadedImages.length < 4 && (
              <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-teal-500 cursor-pointer transition">
                <Upload className="w-5 h-5" />
                <span className="text-[10px] font-bold">
                  {isUploading ? 'معالجة...' : 'إضافة صورة'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Step 7: Contact Preference */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            {t.contactPrefLabel}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
              contactPreference === 'chat_only' ? 'border-teal-500 bg-teal-50/30 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="radio"
                name="contactPref"
                checked={contactPreference === 'chat_only'}
                onChange={() => setContactPreference('chat_only')}
                className="text-teal-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                رسائل داخلية فقط (حماية كاملة للخصوصية)
              </span>
            </label>

            <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
              contactPreference === 'phone_allowed' ? 'border-teal-500 bg-teal-50/30 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="radio"
                name="contactPref"
                checked={contactPreference === 'phone_allowed'}
                onChange={() => setContactPreference('phone_allowed')}
                className="text-teal-600"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                السماح بالاتصال الهاتفي المباشر أيضاً
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-black text-base shadow-lg shadow-teal-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{isSubmitting ? t.publishing : t.submitPost}</span>
        </button>
      </form>

      {/* Auth Modal if unauthenticated */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="login"
      />
    </div>
  );
};
