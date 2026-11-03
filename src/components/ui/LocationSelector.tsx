import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ALGERIAN_WILAYAS, getWilayaName, getWilayaById } from '../../data/locations/wilayas';
import { getCommunesByWilaya, getCommuneName, getCommuneById } from '../../data/locations/communes';
import { useLanguage } from '../../context/LanguageContext';
import { MapPin, Search, ChevronDown, X, Check } from 'lucide-react';

interface Props {
  selectedWilayaId?: number | 'ALL';
  selectedCommuneId?: string;
  onWilayaChange: (wilayaId: number | 'ALL') => void;
  onCommuneChange: (communeId: string) => void;
  showAllOption?: boolean;
  className?: string;
}

export const LocationSelector: React.FC<Props> = ({
  selectedWilayaId,
  selectedCommuneId,
  onWilayaChange,
  onCommuneChange,
  showAllOption = true,
  className = '',
}) => {
  const { language, t } = useLanguage();
  const [communeSearchTerm, setCommuneSearchTerm] = useState('');
  const [isCommuneDropdownOpen, setIsCommuneDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableCommunes = useMemo(() => {
    if (!selectedWilayaId || selectedWilayaId === 'ALL') {
      return [];
    }
    return getCommunesByWilaya(Number(selectedWilayaId));
  }, [selectedWilayaId]);

  // Reset commune if previous selected commune does not belong to the selected wilaya
  useEffect(() => {
    if (selectedCommuneId && selectedWilayaId && selectedWilayaId !== 'ALL') {
      const exists = availableCommunes.some(c => c.id === selectedCommuneId);
      if (!exists) {
        onCommuneChange('');
      }
    }
  }, [selectedWilayaId, availableCommunes, selectedCommuneId, onCommuneChange]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCommuneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCommune = selectedCommuneId ? getCommuneById(selectedCommuneId) : undefined;

  // Filter communes by Arabic, French, or English search query
  const filteredCommunes = useMemo(() => {
    const query = communeSearchTerm.trim().toLowerCase();
    if (!query) return availableCommunes;

    return availableCommunes.filter(c => {
      const matchAr = c.name_ar.includes(query) || c.name_ar.replace(/[أإآ]/g, 'ا').includes(query);
      const matchFr = c.name_fr.toLowerCase().includes(query);
      const matchEn = c.name_en?.toLowerCase().includes(query);
      const matchPostal = c.postal_code?.includes(query);
      return matchAr || matchFr || matchEn || matchPostal;
    });
  }, [availableCommunes, communeSearchTerm]);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      {/* Wilaya Dropdown */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-teal-500" />
            {t.wilayaLabel}
          </span>
          <span className="text-[10px] text-slate-400">69 ولاية</span>
        </label>
        <select
          value={selectedWilayaId || (showAllOption ? 'ALL' : '')}
          onChange={(e) => {
            const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
            onWilayaChange(val);
            onCommuneChange(''); // Reset commune when wilaya changes
            setCommuneSearchTerm('');
          }}
          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition cursor-pointer min-h-[44px]"
        >
          {showAllOption && <option value="ALL">{t.allWilayas}</option>}
          {ALGERIAN_WILAYAS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} - {getWilayaName(w, language)}
            </option>
          ))}
        </select>
      </div>

      {/* Dependent Searchable Commune Selector */}
      <div className="relative" ref={dropdownRef}>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
          <span>{t.communeLabel}</span>
          {availableCommunes.length > 0 && (
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
              {availableCommunes.length} بلدية
            </span>
          )}
        </label>

        {/* Trigger Button / Display */}
        <div
          onClick={() => {
            if (availableCommunes.length > 0) {
              setIsCommuneDropdownOpen(!isCommuneDropdownOpen);
            }
          }}
          className={`w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between min-h-[44px] transition cursor-pointer ${
            availableCommunes.length === 0 ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800' : 'hover:border-teal-500'
          }`}
        >
          <span className="truncate">
            {selectedCommune
              ? `${getCommuneName(selectedCommune, language)} ${selectedCommune.postal_code ? `(${selectedCommune.postal_code})` : ''}`
              : selectedWilayaId && selectedWilayaId !== 'ALL'
              ? 'اختر البلدية (أو ابحث بالاسم)'
              : 'اختر الولاية أولاً'}
          </span>
          <div className="flex items-center gap-1 shrink-0 text-slate-400">
            {selectedCommuneId && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onCommuneChange('');
                }}
                className="p-1 hover:text-rose-500 transition cursor-pointer"
                title="إلغاء اختيار البلدية"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {/* Searchable Dropdown Panel */}
        {isCommuneDropdownOpen && availableCommunes.length > 0 && (
          <div className="absolute inset-x-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col max-h-72">
            {/* Search Input for Arabic & French names */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 sticky top-0 z-10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute start-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={communeSearchTerm}
                  onChange={(e) => setCommuneSearchTerm(e.target.value)}
                  placeholder="ابحث بالاسم بالعربية أو الفرنسية (مثال: بئر الجير / Es Senia)..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl ps-8 pe-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  autoFocus
                />
                {communeSearchTerm && (
                  <button
                    onClick={() => setCommuneSearchTerm('')}
                    className="absolute end-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Communes List */}
            <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
              <button
                type="button"
                onClick={() => {
                  onCommuneChange('');
                  setIsCommuneDropdownOpen(false);
                }}
                className={`w-full text-start px-3 py-2 text-xs rounded-lg transition flex items-center justify-between cursor-pointer ${
                  !selectedCommuneId ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600'
                }`}
              >
                <span>كل بلديات الولاية</span>
                {!selectedCommuneId && <Check className="w-3.5 h-3.5" />}
              </button>

              {filteredCommunes.length > 0 ? (
                filteredCommunes.map((c) => {
                  const isSelected = c.id === selectedCommuneId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onCommuneChange(c.id);
                        setIsCommuneDropdownOpen(false);
                      }}
                      className={`w-full text-start px-3 py-2 text-xs rounded-lg transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold">{c.name_ar}</span>
                        <span className="text-[11px] text-slate-400">({c.name_fr})</span>
                        {c.is_seat && (
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-bold">
                            مقر الولاية
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.postal_code && (
                          <span className="text-[10px] text-slate-400">{c.postal_code}</span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  لا توجد بلدية تطابق "{communeSearchTerm}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
