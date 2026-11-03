import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../lib/supabase/store';
import { PLATFORM_CATEGORIES, getCategoryById, getCategoryName } from '../../data/categories';
import { ALGERIAN_WILAYAS, getWilayaName, getWilayaById } from '../../data/locations/wilayas';
import { getCommunesByWilaya, getCommuneName } from '../../data/locations/communes';
import { ListingCard } from '../../components/ui/ListingCard';
import { LocationSelector } from '../../components/ui/LocationSelector';
import { SearchFilterState, PostType } from '../../types';
import { 
  Search, 
  Filter, 
  X, 
  Bookmark, 
  SlidersHorizontal, 
  RotateCcw, 
  Check, 
  PackageSearch 
} from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const { language, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search filter states from URL or defaults
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [postType, setPostType] = useState<PostType | 'ALL'>(
    (searchParams.get('type') as PostType) || 'ALL'
  );
  const [categoryId, setCategoryId] = useState<string>(
    searchParams.get('category') || 'ALL'
  );
  const [subcategoryId, setSubcategoryId] = useState<string>(
    searchParams.get('subcategory') || 'ALL'
  );
  const [wilayaId, setWilayaId] = useState<number | 'ALL'>(
    searchParams.get('wilaya') ? Number(searchParams.get('wilaya')) : 'ALL'
  );
  const [communeId, setCommuneId] = useState<string>(
    searchParams.get('commune') || ''
  );
  const [isFreeOnly, setIsFreeOnly] = useState<boolean>(
    searchParams.get('free') === 'true'
  );
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>(
    (searchParams.get('sort') as any) || 'newest'
  );

  const [page, setPage] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [savedSearchSuccess, setSavedSearchSuccess] = useState(false);

  // Sync to URL parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (postType !== 'ALL') params.set('type', postType);
    if (categoryId !== 'ALL') params.set('category', categoryId);
    if (subcategoryId !== 'ALL') params.set('subcategory', subcategoryId);
    if (wilayaId !== 'ALL') params.set('wilaya', String(wilayaId));
    if (communeId) params.set('commune', communeId);
    if (isFreeOnly) params.set('free', 'true');
    if (sortBy !== 'newest') params.set('sort', sortBy);

    setSearchParams(params, { replace: true });
    setPage(1); // Reset page on filter changes
  }, [query, postType, categoryId, subcategoryId, wilayaId, communeId, isFreeOnly, sortBy]);

  // Available subcategories for selected category
  const selectedCategory = useMemo(() => {
    return categoryId !== 'ALL' ? getCategoryById(categoryId) : undefined;
  }, [categoryId]);

  const filterState: SearchFilterState = {
    query,
    post_type: postType,
    category_id: categoryId,
    subcategory_id: subcategoryId,
    wilaya_id: wilayaId,
    commune_id: communeId,
    is_free_only: isFreeOnly,
    sortBy,
    page,
    pageSize: 12,
  };

  const { posts, total } = store.searchPosts(filterState);

  const handleClearFilters = () => {
    setQuery('');
    setPostType('ALL');
    setCategoryId('ALL');
    setSubcategoryId('ALL');
    setWilayaId('ALL');
    setCommuneId('');
    setIsFreeOnly(false);
    setSortBy('newest');
  };

  const handleSaveSearch = () => {
    if (!isAuthenticated) {
      alert('يرجى تسجيل الدخول لحفظ نتائج هذا البحث وتلقي تنبيهات عند ظهور مطابقات جديدة.');
      return;
    }
    const name = query.trim() || (categoryId !== 'ALL' ? getCategoryName(selectedCategory, language) : 'بحث عام');
    store.saveSearch(name, filterState);
    setSavedSearchSuccess(true);
    setTimeout(() => setSavedSearchSuccess(false), 2500);
  };

  const hasActiveFilters = 
    query.trim() !== '' ||
    postType !== 'ALL' ||
    categoryId !== 'ALL' ||
    subcategoryId !== 'ALL' ||
    wilayaId !== 'ALL' ||
    communeId !== '' ||
    isFreeOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      
      {/* Top Title & Search Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {t.discoveryTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {total} {t.resultsFound}
          </p>
        </div>

        {/* Save this search button */}
        <button
          onClick={handleSaveSearch}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
            savedSearchSuccess
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-teal-500'
          }`}
        >
          {savedSearchSuccess ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4 text-teal-500" />}
          <span>{savedSearchSuccess ? 'تم حفظ البحث!' : 'حفظ تنبيه لهذا البحث'}</span>
        </button>
      </div>

      {/* Main Filter Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        
        {/* Row 1: Search Query & Mobile Filter Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl ps-10 pe-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute end-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="md:hidden flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-teal-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold text-xs border border-teal-500/30 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>فلاتر</span>
          </button>
        </div>

        {/* Row 2: Desktop Filter Selectors */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${isMobileFilterOpen ? 'block' : 'hidden md:grid'}`}>
          
          {/* Post Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.filterByType}
            </label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">الكل (طلبات وعروض)</option>
              <option value="NEED">طلبات فقط (Need - أبحث عنه)</option>
              <option value="OFFER">عروض فقط (Offer - متوفر لدي)</option>
            </select>
          </div>

          {/* Primary Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.filterByCategory}
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId('ALL');
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">{t.allCategories}</option>
              {PLATFORM_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {getCategoryName(c, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.filterBySubcategory}
            </label>
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={!selectedCategory}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            >
              <option value="ALL">جميع التصنيفات الفرعية</option>
              {selectedCategory?.subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {language === 'fr' ? sub.name_fr : language === 'en' ? sub.name_en : sub.name_ar}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.sortBy}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-teal-500"
            >
              <option value="newest">{t.sortNewest}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="price_asc">{t.sortPriceAsc}</option>
              <option value="price_desc">{t.sortPriceDesc}</option>
            </select>
          </div>
        </div>

        {/* Row 3: Location Selector & Free Only Switch */}
        <div className={`${isMobileFilterOpen ? 'block' : 'hidden md:block'} pt-2 border-t border-slate-100 dark:border-slate-800`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div className="md:col-span-2">
              <LocationSelector
                selectedWilayaId={wilayaId}
                selectedCommuneId={communeId}
                onWilayaChange={(w) => setWilayaId(w)}
                onCommuneChange={(c) => setCommuneId(c)}
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 md:pt-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFreeOnly}
                  onChange={(e) => setIsFreeOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span>{t.filterFreeOnly}</span>
              </label>

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.clearFilters}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">{t.activeFilters}:</span>

          {query && (
            <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-lg border border-teal-500/20">
              بحث: "{query}"
              <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setQuery('')} />
            </span>
          )}

          {postType !== 'ALL' && (
            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-slate-800 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/20">
              {postType === 'NEED' ? t.needBadge : t.offerBadge}
              <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setPostType('ALL')} />
            </span>
          )}

          {categoryId !== 'ALL' && (
            <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-500/20">
              {getCategoryName(selectedCategory, language)}
              <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setCategoryId('ALL')} />
            </span>
          )}

          {wilayaId !== 'ALL' && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              الولاية: {getWilayaName(getWilayaById(Number(wilayaId)), language)}
              <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setWilayaId('ALL')} />
            </span>
          )}

          {isFreeOnly && (
            <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-lg border border-teal-500/20">
              مجاني وتطوع فقط
              <X className="w-3 h-3 cursor-pointer hover:text-rose-500" onClick={() => setIsFreeOnly(false)} />
            </span>
          )}
        </div>
      )}

      {/* Results Grid */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {posts.map((post) => (
            <ListingCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-800 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-4">
            <PackageSearch className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {t.noResultsTitle}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            {t.noResultsDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
            >
              {t.clearFilters}
            </button>
            <a
              href="/create"
              className="px-4 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 shadow-md transition"
            >
              انشر طلبك أو عرضك الآن
            </a>
          </div>
        </div>
      )}

      {/* Pagination: Load More */}
      {posts.length < total && (
        <div className="text-center pt-6">
          <button
            onClick={() => setPage((prev) => prev + 1)}
            className="px-8 py-3 rounded-2xl bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 font-bold text-sm border border-slate-200 dark:border-slate-800 hover:border-teal-500 shadow-xs transition cursor-pointer"
          >
            {t.loadMore} ({total - posts.length} متبقي)
          </button>
        </div>
      )}
    </div>
  );
};
