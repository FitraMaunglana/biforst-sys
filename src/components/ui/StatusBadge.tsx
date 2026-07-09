import React from 'react';

interface StatusBadgeProps {
  /** Status text to display */
  status: string;
  /** Optional override for the color scheme */
  variant?: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate' | 'auto';
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Lunas: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  Terkirim: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  'Dibayar Sebagian': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  'Belum Dibayar': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  'Sudah Aman': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  Kontrak: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  Dealing: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  Selesai: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  'Sedang Dikerjakan': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  'Belum Mulai': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  
  // Reimbursement specific
  'Menunggu Review': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  'Disetujui': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  'Ditolak': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
};

const VARIANT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

const DEFAULT_COLORS = { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };

/**
 * Badge status generik.
 * Menggantikan inline conditional class logic.
 */
export default function StatusBadge({ status, variant = 'auto' }: StatusBadgeProps) {
  const colors =
    variant !== 'auto'
      ? VARIANT_COLORS[variant] || DEFAULT_COLORS
      : STATUS_COLORS[status] || DEFAULT_COLORS;

  return (
    <span
      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {status}
    </span>
  );
}
