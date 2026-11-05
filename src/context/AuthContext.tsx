import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { store } from '../lib/supabase/store';
import { SupabaseService } from '../lib/supabase/supabaseService';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';
import { activeEnvConfig } from '../lib/supabase/envConfig';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSupabaseConnected: boolean;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: { email: string; password?: string; display_name: string; wilaya_id: number; phone?: string }) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  deleteAccount: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => store.getCurrentUser());
  const [isSupabaseConnected] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setUser(store.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    // If runtime mode is in STAGING_ERROR or PRODUCTION_ERROR, reject immediately
    if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
      return { success: false, error: activeEnvConfig.statusMessage };
    }

    // If Supabase is connected and password is provided, perform real Supabase Auth
    if (isSupabaseConfigured && supabase && password) {
      try {
        const res = await SupabaseService.signIn(email, password);
        if (res.error) {
          return { success: false, error: res.error };
        }
        if (res.profile) {
          // Sync profile to store
          store.updateProfile(res.profile);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'فشل تسجيل الدخول عبر Supabase' };
      }
    }

    if (!password) {
      return { success: false, error: 'يرجى إدخال كلمة المرور للمتابعة.' };
    }

    return { success: false, error: 'خدمة المصادقة غير متاحة أو بيانات الاعتماد غير مكتملة.' };
  };

  const signUp = async (data: {
    email: string;
    password?: string;
    display_name: string;
    wilaya_id: number;
    phone?: string;
  }): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }> => {
    // If runtime mode is in STAGING_ERROR or PRODUCTION_ERROR, reject immediately
    if (activeEnvConfig.runtimeMode === 'STAGING_ERROR' || activeEnvConfig.runtimeMode === 'PRODUCTION_ERROR') {
      return { success: false, error: activeEnvConfig.statusMessage };
    }

    // If Supabase is connected and password is provided, perform real Supabase signup
    if (isSupabaseConfigured && supabase && data.password) {
      try {
        const res = await SupabaseService.signUp({
          email: data.email,
          password: data.password,
          displayName: data.display_name,
          wilayaId: data.wilaya_id,
          phone: data.phone,
        });

        if (res.error) {
          return { success: false, error: res.error };
        }

        if (res.needsEmailConfirmation) {
          return { success: true, needsConfirmation: true };
        }

        return { success: true, needsConfirmation: false };
      } catch (err: any) {
        return { success: false, error: err.message || 'فشل إنشاء الحساب عبر Supabase' };
      }
    }

    if (!data.password) {
      return { success: false, error: 'كلمة المرور مطلوبة لإنشاء الحساب.' };
    }

    return { success: false, error: 'خدمة إنشاء الحساب غير متاحة حالياً.' };
  };

  const signOut = async () => {
    store.signOut();
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'خدمة استعادة كلمة المرور تتطلب اتصال Supabase.' };
    }
    return SupabaseService.resetPassword(email);
  };

  const resendVerification = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'خدمة تأكيد البريد تتطلب اتصال Supabase.' };
    }
    return SupabaseService.resendVerificationEmail(email);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    store.updateProfile(updates);
  };

  const deleteAccount = () => {
    store.deleteAccount();
  };

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isSupabaseConnected,
        signIn,
        signUp,
        signOut,
        resetPassword,
        resendVerification,
        updateProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
