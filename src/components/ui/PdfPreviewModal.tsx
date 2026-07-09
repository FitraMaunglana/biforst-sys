"use client";

import React from 'react';
import { FileText, Download, X } from 'lucide-react';

interface PdfPreviewModalProps {
  /** Apakah modal ditampilkan */
  open: boolean;
  /** Callback saat modal ditutup */
  onClose: () => void;
  /** URL Blob untuk iframe preview */
  pdfUrl: string;
  /** Callback untuk download PDF */
  onDownload: () => void;
  /** Judul modal */
  title?: string;
  /** Ikon di samping judul */
  icon?: React.ReactNode;
  /** Warna tombol download */
  downloadColor?: string;
}

/**
 * Modal pratinjau PDF reusable.
 * Menggantikan copy-paste di dashboard, invoices, dan bast.
 */
export default function PdfPreviewModal({
  open,
  onClose,
  pdfUrl,
  onDownload,
  title = 'Pratinjau Dokumen',
  icon = <FileText className="w-5 h-5 text-indigo-400" />,
  downloadColor = 'bg-indigo-600 hover:bg-indigo-700',
}: PdfPreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            {icon} {title}
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={onDownload}
              className={`px-4 py-1.5 ${downloadColor} text-white text-sm font-bold rounded-lg flex items-center gap-2 transition`}
            >
              <Download className="w-4 h-4" /> Simpan & Unduh
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition"
              title="Tutup Preview"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-200 relative">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-none absolute inset-0"
            title="Document Preview"
          />
        </div>
      </div>
    </div>
  );
}
