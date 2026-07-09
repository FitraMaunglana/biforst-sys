import React from 'react';

interface EmptyStateProps {
  /** Pesan yang ditampilkan */
  message?: string;
  /** Apakah menggunakan dashed border */
  dashed?: boolean;
}

/**
 * Empty state placeholder reusable.
 */
export default function EmptyState({
  message = 'Belum ada data.',
  dashed = false,
}: EmptyStateProps) {
  return (
    <div
      className={`text-center py-12 rounded-xl bg-slate-50 ${
        dashed ? 'border-2 border-dashed border-slate-200' : 'border border-slate-200'
      }`}
    >
      <p className="text-sm text-slate-400 font-medium">{message}</p>
    </div>
  );
}
