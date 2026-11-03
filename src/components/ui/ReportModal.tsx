import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { store } from '../../lib/supabase/store';
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { ContentReport } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  reportedUserId?: string;
}

export const ReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  postId,
  reportedUserId,
}) => {
  const { t } = useLanguage();
  const [reason, setReason] = useState<ContentReport['reason']>('misleading');
  const [details, setDetails] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      alert('يرجى تقديم تفاصيل إضافية لشرح سبب البلاغ.');
      return;
    }

    store.submitReport({
      post_id: postId,
      reported_user_id: reportedUserId,
      reason,
      details,
    });

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setDetails('');
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t.reportSentSuccess}
            </h3>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.reportTitle}
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t.reportReason}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ContentReport['reason'])}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                <option value="fraud">{t.fraud}</option>
                <option value="fake_offer">{t.fakeOffer}</option>
                <option value="misleading">{t.misleading}</option>
                <option value="spam">{t.spam}</option>
                <option value="harassment">{t.harassment}</option>
                <option value="inappropriate">{t.inappropriate}</option>
                <option value="expired">{t.expiredListing}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t.reportDetails}
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="وضح المشكلة بدقة لمساعدة فريق الإشراف على اتخاذ الإجراء المناسب..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md transition"
              >
                {t.reportSubmit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
