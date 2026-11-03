import React from 'react';
import { FileText, Shield, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          ميثاق وشروط استخدام منصة WIN DZ (وين نلقاها؟)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          المبادئ المدنية وحماية البيانات لمنصة المساعدة والاستكشاف الوطنية
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        
        <section className="space-y-2">
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Check className="w-4 h-4 text-teal-500" />
            1. المجانية التامة والمبدأ غير التجاري
          </h2>
          <p>
            منصة WIN DZ مبادرة رقمية وطنية مجانية 100% لخدمة المواطنين الجزائريين. لا تتضمن المنصة أي اشتراكات مدفوعة، ولا عمولات، ولا نقاط افتراضية، ولا إعلانات تجارية مزعجة، ولا بوابات دفع مالي.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Check className="w-4 h-4 text-teal-500" />
            2. حماية الخصوصية والبيانات الشخصية
          </h2>
          <p>
            يلتزم النظام بعدم إظهار أرقام هواتف المستخدمين للعامة بشكل تلقائي. يتم التواصل مبدئياً عبر الرسائل الداخلية المشفرة للمنصة، وللمستخدم وحده حرية مشاركة هاتفه عند الحاجة. لا يتم بيع أو مشاركة بيانات المستخدمين مع أي جهة خارجية.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Check className="w-4 h-4 text-teal-500" />
            3. مسؤولية المحتوى ومصداقية الإعلانات
          </h2>
          <p>
            يتحمل كل مستخدم كامل المسؤولية الأخلاقية والقانونية عما ينشره من طلبات أو عروض. يمنع منعاً باتاً نشر إعلانات مضللة، أو سلع محظورة قانوناً في الجزائر، أو انتحال صفات هيئات رسمية، أو نشر إعلانات وهمية لأغراض احتيالية.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Check className="w-4 h-4 text-teal-500" />
            4. الإشراف، الإبلاغ، والحظر
          </h2>
          <p>
            يملك فريق الإشراف الحق في مراجعة الإعلانات المبلغ عنها من قبل المواطنين، وإخفائها أو حذفها، وتعليق حسابات المستخدمين المخالفين لحماية أمان المنصة والمجتمع.
          </p>
        </section>
      </div>

      <div className="text-center pt-4">
        <Link
          to="/"
          className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
        >
          العودة للمنصة
        </Link>
      </div>
    </div>
  );
};
