import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { store } from '../../lib/supabase/store';
import { AuthModal } from '../ui/AuthModal';

export const MobileBottomNav: React.FC = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const conversations = store.getConversations();
  const unreadMessages = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  return (
    <>
      <nav aria-label="Mobile navigation" className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 flex items-center justify-around shadow-lg">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[48px] min-w-[48px] gap-0.5 text-[10px] font-bold p-1 rounded-xl transition ${
              isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span>الرئيسية</span>
        </NavLink>

        <NavLink
          to="/explore"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[48px] min-w-[48px] gap-0.5 text-[10px] font-bold p-1 rounded-xl transition ${
              isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <Search className="w-5 h-5" />
          <span>استكشاف</span>
        </NavLink>

        {/* Central Highlighted Post Button */}
        <NavLink
          to="/create"
          className="flex flex-col items-center justify-center -mt-5 min-h-[48px] min-w-[48px]"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 mt-0.5">نشر</span>
        </NavLink>

        <NavLink
          to="/messages"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center min-h-[48px] min-w-[48px] gap-0.5 text-[10px] font-bold p-1 rounded-xl transition ${
              isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <MessageSquare className="w-5 h-5" />
          {unreadMessages > 0 && (
            <span className="absolute top-1 end-2 w-3.5 h-3.5 rounded-full bg-teal-500 text-white text-[9px] font-black flex items-center justify-center">
              {unreadMessages}
            </span>
          )}
          <span>رسائل</span>
        </NavLink>

        {isAuthenticated ? (
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-h-[48px] min-w-[48px] gap-0.5 text-[10px] font-bold p-1 rounded-xl transition ${
                isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <User className="w-5 h-5" />
            <span>حسابي</span>
          </NavLink>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex flex-col items-center justify-center min-h-[48px] min-w-[48px] gap-0.5 text-[10px] font-bold p-1 rounded-xl text-slate-500 dark:text-slate-400 cursor-pointer"
          >
            <User className="w-5 h-5" />
            <span>دخول</span>
          </button>
        )}
      </nav>

      {/* Auth Modal for bottom nav login trigger */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};
