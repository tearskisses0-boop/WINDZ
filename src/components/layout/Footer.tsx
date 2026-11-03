import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Shield, Heart, MapPin, ExternalLink, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-24 sm:pb-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-black text-lg">
                WIN
              </div>
              <div>
                <span className="font-black text-xl text-white tracking-tight">WIN DZ</span>
                <span className="block text-xs font-bold text-teal-400">وين نلقاها؟ — الجزائر</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              المنصة الوطنية الجزائرية المستقلة لمساعدة المواطنين في العثور على المنتجات، قطع الغيار النادرة، الخدمات، الأماكن والمساعدة المجتمعية عبر 69 ولاية.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-fit">
              <Heart className="w-3.5 h-3.5" />
              <span>خدمة مجانية 100% للمواطنين — بدون إعلانات وبدون عمولات</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3">الأقسام الرئيسية</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/explore?category=cat-products" className="hover:text-teal-400 transition">المنتجات وقطع الغيار</Link></li>
              <li><Link to="/explore?category=cat-services" className="hover:text-teal-400 transition">الخدمات المهنية والمحلية</Link></li>
              <li><Link to="/explore?category=cat-opportunities" className="hover:text-teal-400 transition">الفرص والتكوين المهني</Link></li>
              <li><Link to="/explore?category=cat-places" className="hover:text-teal-400 transition">الأماكن والمرافق والمحلات</Link></li>
              <li><Link to="/explore?category=cat-community-help" className="hover:text-teal-400 transition">المساعدة المجتمعية والتضامن</Link></li>
            </ul>
          </div>

          {/* Civic Guidelines & Governance */}
          <div>
            <h4 className="font-bold text-white text-sm mb-3">الأمان والمصداقية</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span>مراسلة داخلية بدون كشف الهاتف</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>تغطية معتمدة لـ 69 ولاية</span>
              </li>
              <li>
                <Link to="/safety" className="hover:text-teal-400 transition">إرشادات الأمان والتعامل</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-teal-400 transition">شروط الاستخدام والخصوصية</Link>
              </li>
              <li className="pt-2">
                <Link 
                  to="/secure-admin" 
                  className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-500/30 transition"
                >
                  <Lock className="w-3 h-3" />
                  <span>{t.adminPanel}</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} WIN DZ — وين نلقاها؟ جميع الحقوق محفوظة للمجتمع الجزائري.</p>
          <p className="flex items-center gap-1 text-slate-400">
            <span>البحث، الاكتشاف، والتواصل</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
