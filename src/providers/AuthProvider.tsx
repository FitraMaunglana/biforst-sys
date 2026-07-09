"use client";
// ============================================================
// biforst-sys — AuthProvider
// Centralized auth context menggantikan 6× copy-paste auth check
// di setiap page. Wrap di root layout.
// ============================================================

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabaseClient';
import { ADMIN_EMAIL, EMAIL_TO_NAME } from '@/src/utils/constants';
import type { AuthState, UserRole } from '@/src/types';

interface AuthContextValue extends AuthState {
  logout: () => Promise<void>;
}

const defaultAuthState: AuthContextValue = {
  isLoading: true,
  isAuthenticated: false,
  session: null,
  role: 'staff',
  founderName: '',
  logout: async () => {},
};

export const AuthContext = createContext<AuthContextValue>(defaultAuthState);

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    session: null,
    role: 'staff',
    founderName: '',
  });

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          session: null,
          role: 'staff',
          founderName: '',
        });
        return;
      }

      const email = session.user.email || '';
      const role: UserRole = email === ADMIN_EMAIL ? 'admin' : 'staff';
      const founderName = EMAIL_TO_NAME[email] || '';

      setAuthState({
        isLoading: false,
        isAuthenticated: true,
        session: {
          email,
          userId: session.user.id,
        },
        role,
        founderName,
      });
    };

    initAuth();

    // Tangkap event recovery password — Supabase mengarahkan link
    // recovery ke root, bukan ke /login
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/login?recovery=true');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  const value: AuthContextValue = {
    ...authState,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
