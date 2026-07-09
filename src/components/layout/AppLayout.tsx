"use client";
// ============================================================
// biforst-sys — AppLayout
// Layout wrapper yang menyatukan Sidebar + content area.
// Menggantikan 7× copy-paste pattern di setiap page.
// Termasuk auth guard otomatis.
// ============================================================

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import Sidebar from '@/src/components/Sidebar';
import { Lock, Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  /** Jika true, hanya admin yang bisa mengakses. Staff akan di-redirect. */
  requireAdmin?: boolean;
}

export default function AppLayout({ children, requireAdmin = false }: AppLayoutProps) {
  const router = useRouter();
  const { isLoading, isAuthenticated, role } = useAuth();

  // Redirect ke login jika belum terautentikasi
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Admin guard
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && requireAdmin && role !== 'admin') {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, requireAdmin, role, router]);

  // Auth loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Lock className="w-8 h-8 animate-pulse text-indigo-600" />
          <p className="font-mono text-sm font-medium">Membuka Enkripsi Konsol ERP...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (requireAdmin && role !== 'admin')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
