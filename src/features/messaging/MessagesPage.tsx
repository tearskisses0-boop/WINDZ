import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../lib/supabase/store';
import { Conversation, Message } from '../../types';
import { ReportModal } from '../../components/ui/ReportModal';
import { 
  Send, 
  MessageSquare, 
  User, 
  ShieldAlert, 
  CheckCheck, 
  ExternalLink, 
  ArrowLeft,
  ArrowRight,
  MoreVertical,
  Ban,
  Clock
} from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const { language, direction, t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConvId = searchParams.get('conv');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    const list = store.getConversations();
    setConversations(list);

    if (activeConvId) {
      const msgs = store.getMessages(activeConvId);
      setMessages(msgs);
      store.markMessagesRead(activeConvId);
    } else if (list.length > 0 && window.innerWidth >= 768) {
      // Auto-select first conversation on desktop
      setSearchParams({ conv: list[0].id }, { replace: true });
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(loadData);
    return unsubscribe;
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {t.messagesTitle}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          يرجى تسجيل الدخول للوصول إلى رسائلك الخاصة ومتابعة المحادثات مع المواطنين.
        </p>
      </div>
    );
  }

  const activeConversation = conversations.find(c => c.id === activeConvId);
  const otherParticipant = activeConversation?.participants?.[0];
  const isOtherBlocked = otherParticipant ? store.isUserBlocked(otherParticipant.id) : false;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !newMessageText.trim()) return;

    try {
      store.sendMessage(activeConvId, newMessageText.trim());
      setNewMessageText('');
    } catch (err: any) {
      alert(err.message || 'فشل إرسال الرسالة');
    }
  };

  const handleBlockUser = () => {
    if (!otherParticipant) return;
    if (window.confirm(`هل أنت متأكد من رغبتك في حظر ${otherParticipant.display_name}؟`)) {
      store.blockUser(otherParticipant.id);
      setShowOptions(false);
    }
  };

  const handleUnblockUser = () => {
    if (!otherParticipant) return;
    store.unblockUser(otherParticipant.id);
    setShowOptions(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-130px)] min-h-[500px]">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden h-full flex flex-col md:flex-row">
        
        {/* Left / Start: Conversations Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 border-e border-slate-200 dark:border-slate-800 flex flex-col shrink-0 ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-black text-lg text-slate-900 dark:text-white flex items-center justify-between">
              <span>{t.messagesTitle}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400">
                {conversations.length}
              </span>
            </h2>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {conversations.length > 0 ? (
              conversations.map((conv) => {
                const partner = conv.participants?.[0];
                const isSelected = conv.id === activeConvId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSearchParams({ conv: conv.id })}
                    className={`w-full text-start p-4 transition-colors flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/50 dark:bg-slate-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {partner?.display_name?.substring(0, 1) || 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {partner?.display_name || 'مستخدم مسجل'}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {conv.post && (
                        <p className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 truncate mb-0.5">
                          بخصوص: {conv.post.title}
                        </p>
                      )}

                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conv.last_message || 'محادثة جديدة'}
                      </p>
                    </div>

                    {(conv.unread_count || 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                {t.noConversations}
              </div>
            )}
          </div>
        </div>

        {/* Right / End: Active Chat Window */}
        <div className={`flex-1 flex flex-col h-full overflow-hidden ${
          !activeConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setSearchParams({})}
                    className="md:hidden p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {direction === 'rtl' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 font-bold flex items-center justify-center">
                    {otherParticipant?.display_name?.substring(0, 1) || 'U'}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {otherParticipant?.display_name || 'مواطن'}
                    </h3>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      متصل الآن
                    </span>
                  </div>
                </div>

                {/* Dropdown Options */}
                <div className="relative">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showOptions && (
                    <div className="absolute end-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 text-xs">
                      {isOtherBlocked ? (
                        <button
                          onClick={handleUnblockUser}
                          className="w-full text-start px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                        >
                          {t.unblockUser}
                        </button>
                      ) : (
                        <button
                          onClick={handleBlockUser}
                          className="w-full text-start px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{t.blockUser}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsReportOpen(true);
                          setShowOptions(false);
                        }}
                        className="w-full text-start px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                        <span>{t.reportConversation}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Post Preview Banner */}
              {activeConversation.post && (
                <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs gap-3">
                  <div className="truncate">
                    <span className="text-slate-500">الإعلان المرتبط:</span>{' '}
                    <strong className="text-slate-900 dark:text-white truncate">
                      {activeConversation.post.title}
                    </strong>
                  </div>
                  <Link
                    to={`/post/${activeConversation.post.id}`}
                    className="text-teal-600 dark:text-teal-400 hover:underline font-bold shrink-0 flex items-center gap-1"
                  >
                    <span>معاينة</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Messages Flow */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-slate-950/20">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                            isMe
                              ? 'bg-teal-600 text-white rounded-br-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-bl-xs'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && (
                            <CheckCheck className={`w-3.5 h-3.5 ${msg.is_read ? 'text-teal-500' : 'text-slate-300'}`} />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    ابدأ المحادثة الآن واطرح استفساراتك بكل احترام ومسؤولية.
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              {isOtherBlocked ? (
                <div className="p-4 bg-slate-100 dark:bg-slate-800 text-center text-xs text-rose-500 font-semibold border-t border-slate-200 dark:border-slate-700">
                  {t.userBlockedNotice}
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 items-center"
                >
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder={t.typeMessagePlaceholder}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={!newMessageText.trim()}
                    className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.sendMessage}</span>
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                اختر محادثة من القائمة لعرض الرسائل
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                يمكنك بدء محادثة جديدة عبر أي إعلان طلب أو عرض بالنقر على "تواصل مع صاحب الإعلان".
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reportedUserId={otherParticipant?.id}
        postId={activeConversation?.post_id}
      />
    </div>
  );
};
