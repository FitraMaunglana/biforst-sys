import React from 'react';

interface PageHeaderProps {
  /** Ikon lucide-react */
  icon: React.ReactNode;
  /** Judul halaman */
  title: string;
  /** Deskripsi/subtitle */
  subtitle?: string;
  /** Tombol aksi di sebelah kanan */
  action?: React.ReactNode;
}

/**
 * Header halaman standar (bg-slate-900 rounded banner).
 * Menggantikan 7× copy-paste header di setiap page.
 */
export default function PageHeader({ icon, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          {icon} {title}
        </h1>
        {subtitle && (
          <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
