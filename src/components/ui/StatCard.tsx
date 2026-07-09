import React from 'react';

interface StatCardProps {
  /** Ikon di pojok kanan atas */
  icon: React.ReactNode;
  /** Label kecil di atas nilai */
  label: string;
  /** Nilai utama yang ditampilkan */
  value: React.ReactNode;
  /** Warna aksen ikon: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose' | 'teal' */
  accent?: string;
  /** Warna teks value (opsional, default: text-slate-900) */
  valueColor?: string;
}

const ACCENT_BG: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
  teal: 'bg-teal-50 text-teal-600',
  violet: 'bg-violet-50 text-violet-600',
};

/**
 * Kartu statistik ringkasan (Total Titik, Proyeksi Profit, dll).
 * Menggantikan ~15 inline stat card implementations.
 */
export default function StatCard({
  icon,
  label,
  value,
  accent = 'indigo',
  valueColor = 'text-slate-900',
}: StatCardProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
      <div className={`absolute right-4 top-4 p-2 rounded-xl ${ACCENT_BG[accent] || ACCENT_BG.indigo}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <h3 className={`text-2xl font-black mt-1 ${valueColor}`}>
        {value}
      </h3>
    </div>
  );
}
