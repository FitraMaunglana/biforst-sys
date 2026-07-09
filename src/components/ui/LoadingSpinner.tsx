import React from 'react';
import { Loader2, Lock } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Tampilkan loading 'ERP-style' dengan ikon Lock */
  variant?: 'minimal' | 'erp';
  /** Pesan loading */
  message?: string;
}

/**
 * Loading spinner standar.
 */
export default function LoadingSpinner({
  variant = 'minimal',
  message,
}: LoadingSpinnerProps) {
  if (variant === 'erp') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Lock className="w-8 h-8 animate-pulse text-indigo-600" />
          <p className="font-mono text-sm font-medium">
            {message || 'Membuka Enkripsi Konsol ERP...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 flex justify-center">
      <Loader2 className="animate-spin text-slate-400" size={32} />
    </div>
  );
}
