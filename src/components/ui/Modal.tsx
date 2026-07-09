"use client";

import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  /** Apakah modal ditampilkan */
  open: boolean;
  /** Callback saat modal ditutup */
  onClose: () => void;
  /** Judul modal di header */
  title: string;
  /** Ikon di samping judul */
  icon?: React.ReactNode;
  /** Konten utama modal */
  children: React.ReactNode;
  /** Tombol aksi tambahan di header (e.g. Download) */
  headerAction?: React.ReactNode;
  /** Max width class, default: 'max-w-md' */
  maxWidth?: string;
  /** Apakah modal full height (untuk PDF preview), default: false */
  fullHeight?: boolean;
}

/**
 * Modal overlay reusable.
 * Menggantikan 8+ inline modal implementations.
 */
export default function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  headerAction,
  maxWidth = 'max-w-md',
  fullHeight = false,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} overflow-hidden ${
          fullHeight ? 'h-[90vh] flex flex-col' : ''
        }`}
      >
        {/* Header */}
        <div className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            {icon} {title}
          </h3>
          <div className="flex items-center gap-4">
            {headerAction}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
