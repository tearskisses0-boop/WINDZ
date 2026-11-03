import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import { Navbar } from './components/layout/Navbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Footer } from './components/layout/Footer';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { SupabaseConnectionNotice } from './components/ui/SupabaseConnectionNotice';

import { HomePage } from './features/home/HomePage';
import { ExplorePage } from './features/discovery/ExplorePage';
import { PostDetailPage } from './features/posts/PostDetailPage';
import { CreatePostPage } from './features/posts/CreatePostPage';
import { EditPostPage } from './features/posts/EditPostPage';
import { MessagesPage } from './features/messaging/MessagesPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { AdminPage } from './features/admin/AdminPage';
import { SafetyPage } from './features/legal/SafetyPage';
import { TermsPage } from './features/legal/TermsPage';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
                {/* Desktop Top Navbar */}
                <Navbar />

                {/* Supabase Connection State Notice (Prevents Silent Fallback) */}
                <SupabaseConnectionNotice />

                {/* Main View Area */}
                <main className="flex-1 pb-16 sm:pb-0">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/post/:id" element={<PostDetailPage />} />
                    <Route path="/create" element={<CreatePostPage />} />
                    <Route path="/edit/:id" element={<EditPostPage />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/favorites" element={<DashboardPage />} />
                    <Route path="/secure-admin" element={<AdminPage />} />
                    <Route path="/safety" element={<SafetyPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>

                {/* Persistent Desktop & Mobile Footer */}
                <Footer />

                {/* Mobile Bottom Navigation Bar */}
                <MobileBottomNav />

                {/* Offline State Indicator */}
                <OfflineIndicator />
              </div>
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
