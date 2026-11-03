import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { store } from '../../lib/supabase/store';
import { getWilayaById, getWilayaName } from '../../data/locations/wilayas';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { AuthModal } from '../ui/AuthModal';
import { 
  Search, 
  PlusCircle, 
  Bell, 
  MessageSquare, 
  Moon, 
  Sun, 
  Globe, 
  User, 
  LogOut, 
  Shield, 
  Heart, 
  Layers,
  ChevronDown,
  X,
  MapPin,
  Settings
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Message unread count
  const conversations = store.getConversations();
  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const handleLanguageChange = (lang: 'ar' | 'fr' | 'en') => {
    setLanguage(lang);
    setIsLangMenuOpen(false);
  };

  const handleLogout = () => {
    signOut();
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  const userWilaya = user ? getWilayaById(user.wilaya_id) : undefined;
  const userWilayaName = userWilaya ? getWilayaName(userWilaya, language) : '';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
            
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center gap-3 shrink-0 group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-slate-900 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <span className="font-black text-lg sm:text-xl tracking-tighter">WIN</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
                    WIN DZ
                  </span>
                  <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold px-1.5 py-0.5 rounded-sm border border-teal-500/20">
                    69 ولاية
                  </span>
                </div>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                  وين نلقاها؟
                </span>
              </div>
            </Link>

            {/* Quick Explore / Search Link (desktop) */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <Link
                to="/explore"
                className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs sm:text-sm border border-slate-200 dark:border-slate-700/60 transition group"
              >
                <Search className="w-4 h-4 text-teal-500 group-hover:scale-110 transition-transform" />
                <span className="truncate">{t.searchPlaceholder}</span>
              </Link>
            </div>

            {/* Actions & Navigation Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              
              {/* PWA Install Button */}
              <div className="hidden sm:block">
                <PWAInstallButton variant="button" />
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>

              {/* Language Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-bold transition cursor-pointer min-h-[40px]"
                  title={t.switchLanguage}
                >
                  <Globe className="w-4 h-4 text-teal-500" />
                  <span className="uppercase">{language}</span>
                </button>

                {isLangMenuOpen && (
                  <div className="absolute end-0 mt-2 w-36 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 text-xs">
                    <button
                      onClick={() => handleLanguageChange('ar')}
                      className={`w-full text-start px-3 py-2 flex items-center justify-between hover:bg-teal-50 dark:hover:bg-slate-800 cursor-pointer ${
                        language === 'ar' ? 'font-bold text-teal-600 dark:text-teal-400' : ''
                      }`}
                    >
                      <span>العربية (الافتراضية)</span>
                      {language === 'ar' && <span>✓</span>}
                    </button>
                    <button
                      onClick={() => handleLanguageChange('fr')}
                      className={`w-full text-start px-3 py-2 flex items-center justify-between hover:bg-teal-50 dark:hover:bg-slate-800 cursor-pointer ${
                        language === 'fr' ? 'font-bold text-teal-600 dark:text-teal-400' : ''
                      }`}
                    >
                      <span>Français</span>
                      {language === 'fr' && <span>✓</span>}
                    </button>
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`w-full text-start px-3 py-2 flex items-center justify-between hover:bg-teal-50 dark:hover:bg-slate-800 cursor-pointer ${
                        language === 'en' ? 'font-bold text-teal-600 dark:text-teal-400' : ''
                      }`}
                    >
                      <span>English</span>
                      {language === 'en' && <span>✓</span>}
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications */}
              {isAuthenticated && (
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title={t.myNotifications}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 end-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Messages Link */}
              {isAuthenticated && (
                <Link
                  to="/messages"
                  className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title={t.myConversations}
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute top-1 end-1 w-4 h-4 rounded-full bg-teal-500 text-white text-[10px] font-black flex items-center justify-center">
                      {unreadMessagesCount}
                    </span>
                  )}
                </Link>
              )}

              {/* User Profile or Login */}
              {isAuthenticated && user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-h-[44px]"
                    aria-label="User account menu"
                    aria-expanded={isProfileMenuOpen}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {user.display_name.substring(0, 1)}
                    </div>
                    <span className="hidden lg:block text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                      {user.display_name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Desktop Dropdown Menu (lg and above) */}
                  {isProfileMenuOpen && (
                    <div className="hidden lg:block absolute end-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-xs">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {user.display_name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        {userWilayaName && (
                          <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{userWilayaName}</span>
                          </p>
                        )}
                      </div>

                      <Link
                        to="/dashboard"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 min-h-[40px]"
                      >
                        <Layers className="w-4 h-4 text-teal-500" />
                        <span>{t.myDashboard}</span>
                      </Link>

                      <Link
                        to="/favorites"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 min-h-[40px]"
                      >
                        <Heart className="w-4 h-4 text-rose-500" />
                        <span>{t.myFavorites}</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/secure-admin"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold min-h-[40px]"
                        >
                          <Shield className="w-4 h-4 text-amber-500" />
                          <span>{t.adminPanel}</span>
                        </Link>
                      )}

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                      {/* Desktop Logout Button */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-xs cursor-pointer min-h-[44px] transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>{t.logout}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer min-h-[40px]"
                >
                  <User className="w-4 h-4 text-teal-500" />
                  <span>{t.login}</span>
                </button>
              )}

              {/* Prominent Publish Button */}
              <Link
                to="/create"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-md shadow-teal-500/20 hover:shadow-teal-500/40 transition cursor-pointer min-h-[40px]"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{t.publishAction}</span>
                <span className="sm:hidden">نشر</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Responsive Account Drawer / Modal (screens < 1024px) */}
      {isAuthenticated && user && isProfileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsProfileMenuOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 max-h-[90vh] overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200">
            
            {/* Header with User Info & Close button */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-blue-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  {user.display_name.substring(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900 dark:text-white text-base">
                      {user.display_name}
                    </p>
                    {isAdmin && (
                      <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                        مشرف
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  {userWilayaName && (
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>ولاية {userWilayaName}</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setIsProfileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation links (touch-friendly min-h-[48px]) */}
            <div className="space-y-1">
              <Link
                to="/dashboard"
                onClick={() => setIsProfileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm min-h-[48px] transition-colors"
              >
                <Layers className="w-5 h-5 text-teal-500 shrink-0" />
                <span>{t.myDashboard}</span>
              </Link>

              <Link
                to="/favorites"
                onClick={() => setIsProfileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm min-h-[48px] transition-colors"
              >
                <Heart className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{t.myFavorites}</span>
              </Link>

              <Link
                to="/messages"
                onClick={() => setIsProfileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm min-h-[48px] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-teal-500 shrink-0" />
                  <span>{t.myConversations}</span>
                </div>
                {unreadMessagesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-500 text-white text-xs font-black">
                    {unreadMessagesCount}
                  </span>
                )}
              </Link>

              <Link
                to="/create"
                onClick={() => setIsProfileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold text-sm min-h-[48px] transition-colors"
              >
                <PlusCircle className="w-5 h-5 text-teal-500 shrink-0" />
                <span>{t.publishAction}</span>
              </Link>

              {isAdmin && (
                <Link
                  to="/secure-admin"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-sm min-h-[48px] transition-colors"
                >
                  <Shield className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>{t.adminPanel}</span>
                </Link>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              {/* Prominent Mobile/Tablet Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-black text-sm border border-rose-300 dark:border-rose-800 shadow-sm transition-all cursor-pointer min-h-[48px] active:scale-98"
              >
                <LogOut className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{t.logout}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};
