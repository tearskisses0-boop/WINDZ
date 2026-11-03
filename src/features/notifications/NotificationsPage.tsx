import React from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Bell, 
  Sparkles, 
  MessageSquare, 
  CheckCheck, 
  Trash2, 
  ArrowLeft,
  ArrowRight,
  ExternalLink 
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { direction, t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-teal-500" />
            <span>{t.notificationsTitle}</span>
            {unreadCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500 text-white">
                {unreadCount} غير مقروء
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إشعارات المطابقة الذكية للطلبات والعروض والرسائل الجديدة
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{t.markAllRead}</span>
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold text-xs hover:bg-rose-100 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.clearNotifications}</span>
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notif) => {
            const isMatch = notif.type === 'match_found';
            return (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  !notif.is_read
                    ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-500/40 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  isMatch ? 'bg-amber-500/20 text-amber-600' : 'bg-teal-500/20 text-teal-600'
                }`}>
                  {isMatch ? <Sparkles className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                    {notif.body}
                  </p>

                  <div className="flex items-center gap-3">
                    {notif.related_post_id && (
                      <Link
                        to={`/post/${notif.related_post_id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        <span>معاينة الإعلان</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}

                    {notif.related_conversation_id && (
                      <Link
                        to={`/messages?conv=${notif.related_conversation_id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        <span>فتح المحادثة</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {!notif.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 mt-2" />
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
            <Bell className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {t.noNotifications}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              ستصلك هنا إشعارات فورية عند توفر عروض تطابق طلباتك أو عند استلام رسائل جديدة.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
