import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../lib/supabase/store';
import { AvailabilityStatus } from '../../types';
import { LocationSelector } from '../../components/ui/LocationSelector';
import { getCommuneById } from '../../data/locations/communes';
import { uploadImageToStorage, deleteImageFromStorage } from '../../lib/storage/supabaseStorage';
import { AlertCircle, ArrowLeft, ArrowRight, Trash2, MapPin, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

export const EditPostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language, direction } = useLanguage();

  const post = id ? store.getPostById(id) : undefined;

  const [title, setTitle] = useState(post?.title || '');
  const [description, setDescription] = useState(post?.description || '');
  const [wilayaId, setWilayaId] = useState<number>(post?.wilaya_id || 16);
  const [communeId, setCommuneId] = useState<string>(post?.commune_id || '');
  const [price, setPrice] = useState<string>(
    post?.price ? String(post.price) : post?.budget_max ? String(post.budget_max) : ''
  );
  const [isFree, setIsFree] = useState(post?.is_free || false);
  const [status, setStatus] = useState<AvailabilityStatus>(
    post?.availability_status || 'available'
  );
  const [images, setImages] = useState<string[]>(post?.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (!post) {
    return <div className="text-center py-12 font-bold">الإعلان غير موجود</div>;
  }

  if (user?.id !== post.user_id && user?.role !== 'admin') {
    return <div className="text-center py-12 text-rose-500 font-bold">غير مصرح لك بتعديل هذا الإعلان.</div>;
  }

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (images.length >= 4) {
      alert('الحد الأقصى هو 4 صور لكل إعلان.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const file = e.target.files[0];
      const result = await uploadImageToStorage(file, user?.id);
      setImages(prev => [...prev, result.url]);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الصورة.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const targetUrl = images[index];
    if (targetUrl) {
      deleteImageFromStorage(targetUrl).catch(() => {});
    }
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = price.trim() ? Number(price) : undefined;
      const selectedCommuneObj = communeId ? getCommuneById(communeId) : undefined;
      store.updatePost(post.id, {
        title: title.trim(),
        description: description.trim(),
        wilaya_id: wilayaId,
        commune_id: communeId || undefined,
        commune_name: selectedCommuneObj?.name_ar || undefined,
        is_free: isFree,
        images: images,
        price: post.post_type === 'OFFER' && !isFree ? amount : undefined,
        budget_max: post.post_type === 'NEED' && !isFree ? amount : undefined,
        availability_status: status,
        last_confirmed_at: new Date().toISOString(),
      });
      navigate(`/post/${post.id}`);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ التعديلات');
    }
  };

  const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            تعديل الإعلان: {post.title}
          </h1>
          <button
            type="button"
            onClick={() => navigate(`/post/${post.id}`)}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <BackIcon className="w-4 h-4" />
            <span>رجوع</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              العنوان <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الوصف <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          {/* Image Management Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-teal-500" />
              <span>صور الإعلان (حتى 4 صور بتنسيق WebP/JPG/PNG)</span>
            </label>

            {/* Thumbnail previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {images.map((imgUrl, index) => (
                  <div key={index} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img 
                      src={imgUrl} 
                      alt={`صورة ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1.5 right-1.5 bg-rose-600/90 hover:bg-rose-600 text-white p-1 rounded-full shadow transition cursor-pointer"
                      title="حذف الصورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {images.length < 4 && (
              <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:border-teal-500 hover:text-teal-600 transition ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    <span>جاري معالجة ورفع الصورة...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-teal-500" />
                    <span>إضافة صورة أخرى إلى الإعلان</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
          </div>

          {/* Location Selector (Wilaya and Communes) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-500" />
              <span>الموقع الجغرافي (الولاية والبلدية)</span>
            </label>
            <LocationSelector
              selectedWilayaId={wilayaId}
              selectedCommuneId={communeId}
              onWilayaChange={(w) => setWilayaId(Number(w))}
              onCommuneChange={(c) => setCommuneId(c)}
              showAllOption={false}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.availability}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AvailabilityStatus)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm cursor-pointer focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            >
              <option value="available">{t.statusAvailable}</option>
              <option value="fulfilled">{t.statusFulfilled}</option>
              <option value="unavailable">{t.statusUnavailable}</option>
            </select>
          </div>

          {/* Price / Budget */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                {post.post_type === 'OFFER' ? 'عرض مجاني / تبرع / إعارة بدون مقابل' : 'طلب مساعدة مجانية أو تطوع'}
              </span>
            </label>

            {!isFree && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {post.post_type === 'OFFER' ? 'السعر (دج - اختياري)' : 'الميزانية التقريبية (دج - اختياري)'}
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0 دج"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/post/${post.id}`)}
              className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold min-h-[44px] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md transition cursor-pointer min-h-[44px]"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
