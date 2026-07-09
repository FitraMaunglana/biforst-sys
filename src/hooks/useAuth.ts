"use client";
// ============================================================
// biforst-sys — useAuth Hook
// Custom hook untuk mengakses auth context + helper guards.
// ============================================================

import { useContext } from 'react';
import { AuthContext } from '@/src/providers/AuthProvider';

/**
 * Hook utama untuk mengakses auth state dari mana saja.
 *
 * @example
 * ```tsx
 * const { role, session, isLoading } = useAuth();
 * if (role === 'admin') { ... }
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
