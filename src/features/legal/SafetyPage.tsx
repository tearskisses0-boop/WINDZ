import React from 'react';
import { ShieldCheck, MapPin, AlertTriangle, Eye, Phone, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SafetyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          إرشادات الأمان والثقة في مجتمع WIN DZ
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          نصائح وإرشادات لحماية المواطنين وضمان تعاملات آمنة وموثوقة عبر التراب الوطني
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-teal-600 font-bold">
            <MapPin className="w-5 h-5" />
            <h3>المقابلة في أماكن عامة ومأهولة</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            عند معاينة سلعة، قطعة غيار أو استعارة أدوات، اتفق دائماً على اللقاء في مكان عام ومضاء نهاراً (قرب محطة قطار، ساحة عمومية، أو مقهى معروف). لا توافق أبداً على اللقاء في أماكن منعزلة.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-teal-600 font-bold">
            <Eye className="w-5 h-5" />
            <h3>فحص السلع وقطع الغيار شخصياً</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            تأكد من فحص حالة الشيء بدقة قبل الاستلام. بالنسبة للقطع الميكانيكية أو الإلكترونية، يفضل الاستعانة بحرفي أو ميكانيكي للتأكد من التوافق والمواصفات.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-rose-500 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <h3>الحذر من الدفع المسبق أو تحويل الأموال</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            لا تقم أبداً بتحويل أموال أو شحن رصيد مسبقاً قبل استلام السلعة ومعاينتها. منصة WIN DZ لا تطلب أي عمولات أو رسوم أو وساطة مالية على الإطلاق.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-teal-600 font-bold">
            <Heart className="w-5 h-5" />
            <h3>روح التضامن وإرجاع العتاد المستعار</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            إذا استفدت من عتاد طبي، أجهزة أو أدوات تم وضعها للإعارة المجانية لوجه الله، احرص على الحفاظ عليها وإرجاعها في الوقت المتفق عليه لتمكين مواطنين ومحتاجين آخرين من الاستفادة.
          </p>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          to="/"
          className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
        >
          العودة للمنصة الرئيسية
        </Link>
      </div>
    </div>
  );
};
