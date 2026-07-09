"use client";
import React, { useState } from 'react';
import TransactionForm from '@/src/components/TransactionForm';
import { KasTrendChart } from '@/src/components/KasTrendChart';
import PdfPreviewModal from '@/src/components/ui/PdfPreviewModal';
import Modal from '@/src/components/ui/Modal';
import { formatIDR, formatDateIndo } from '@/src/utils/format';
import { loadImage, PDF_PRIMARY_COLOR } from '@/src/utils/pdf';
import { editTransaction } from '@/src/services/dashboard.service';
import { getSignedUrl } from '@/src/services/storage.service';
import type { FormattedTransaction, KasBalance } from '@/src/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, Database, RefreshCcw, Eye, Paperclip, Pencil, ShieldAlert } from 'lucide-react';

interface KasTabProps {
  transactions: FormattedTransaction[];
  kasBalance: KasBalance;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function KasTab({ transactions, kasBalance, onRefresh, isLoading }: KasTabProps) {
  const [previewPdf, setPreviewPdf] = useState<{ url: string; doc: jsPDF; fileName: string } | null>(null);
  const [editingTx, setEditingTx] = useState<FormattedTransaction | null>(null);
  const [editTxForm, setEditTxForm] = useState({ date: '', description: '', amount: 0 });
  const [isSavingTx, setIsSavingTx] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleViewAttachment = async (path: string) => {
    try {
      const url = await getSignedUrl(path);
      window.open(url, '_blank');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membuka lampiran.';
      alert(message);
    }
  };

  const handleOpenEditTx = (tx: FormattedTransaction) => {
    setEditingTx(tx);
    setEditTxForm({ date: tx.date, description: tx.description, amount: tx.amount });
  };

  const handleSaveEditTx = async () => {
    if (!editingTx) return;
    setIsSavingTx(true);
    try {
      await editTransaction(editingTx.id, editTxForm.date, editTxForm.description, editTxForm.amount);
      alert('Transaksi berhasil diperbarui. Saldo kas dan laporan terkait sudah disesuaikan.');
      setEditingTx(null);
      onRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengedit transaksi.';
      alert('Gagal mengedit transaksi: ' + message);
    } finally {
      setIsSavingTx(false);
    }
  };

  const handlePreviewReport = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const stempelImg = await loadImage('/stempel_scan.png');
      const ttdImg = await loadImage('/tanda_tangan.jpg');

      doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(...PDF_PRIMARY_COLOR);
      doc.text("LAPORAN MUTASI KAS & KEUANGAN", 14, 22);
      doc.setFontSize(10); doc.setTextColor(50); doc.text("BTS Biforst Technology Solution", 14, 29);
      doc.setFont("helvetica", "normal"); doc.text("Kabupaten Sleman, Daerah Istimewa Yogyakarta", 14, 34);
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text(`Dicetak pada: ${formatDateIndo(new Date().toISOString())}`, 196, 29, { align: 'right' });

      doc.setDrawColor(...PDF_PRIMARY_COLOR); doc.setLineWidth(0.8); doc.line(14, 40, 196, 40);
      doc.setFillColor(245, 247, 250); doc.rect(14, 46, 182, 26, 'F');
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30);
      doc.text("RINGKASAN PERIODE", 18, 54);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text("Total Pemasukan Kas", 18, 61); doc.text("Total Pengeluaran Kas", 18, 67);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 110, 86); doc.text(`: Rp ${kasBalance.masuk.toLocaleString('id-ID')}`, 56, 61);
      doc.setTextColor(225, 29, 72); doc.text(`: Rp ${kasBalance.keluar.toLocaleString('id-ID')}`, 56, 67);
      doc.setFontSize(11); doc.setTextColor(100); doc.text("SALDO AKTUAL:", 120, 58);
      doc.setFontSize(14); doc.setTextColor(...PDF_PRIMARY_COLOR);
      doc.text(`Rp ${kasBalance.saldo.toLocaleString('id-ID')}`, 120, 65);

      const tableRows = transactions.map((tx, i) => [
        i + 1, formatDateIndo(tx.date), tx.reference_code, tx.description,
        tx.type === 'Masuk' ? `Rp ${tx.amount.toLocaleString('id-ID')}` : '-',
        tx.type === 'Keluar' ? `Rp ${tx.amount.toLocaleString('id-ID')}` : '-'
      ]);

      autoTable(doc, {
        startY: 78,
        head: [['No', 'Tanggal', 'No. Referensi', 'Keterangan Transaksi', 'Kas Masuk', 'Kas Keluar']],
        body: tableRows, theme: 'grid',
        styles: { fontSize: 8, textColor: [50, 50, 50], cellPadding: 3 },
        headStyles: { fillColor: PDF_PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 4: { halign: 'right', cellWidth: 28 }, 5: { halign: 'right', cellWidth: 28 } }
      });

      const finalY = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY + 15;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(50);
      doc.text(`Sleman, ${formatDateIndo(new Date().toISOString())}`, 196, finalY, { align: "right" });
      doc.text("Mengetahui,", 196, finalY + 5, { align: "right" });
      if (ttdImg) doc.addImage(ttdImg, 'JPEG', 160, finalY + 6, 38, 20);
      doc.setFont("helvetica", "bold"); doc.setTextColor(0);
      doc.text("Fitra Maulana, S.Tr.T.", 196, finalY + 34, { align: "right" });
      doc.setFont("helvetica", "normal"); doc.setTextColor(100);
      doc.text("Direktur BTS", 196, finalY + 38, { align: "right" });
      if (stempelImg) doc.addImage(stempelImg, 'PNG', 146, finalY - 4, 42, 42);

      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const fileId = `Laporan_Kas_BTS_${new Date().toISOString().split('T')[0]}.pdf`;
      setPreviewPdf({ url: pdfUrl, doc, fileName: fileId });
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat memproses laporan.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-emerald-500 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
          <ArrowDownLeft className="w-24 h-24 absolute -right-4 -bottom-4 opacity-10" />
          <p className="text-emerald-100 font-medium text-sm">Total Pemasukan Kas</p>
          <h3 className="text-3xl font-black mt-2 font-mono">{formatIDR(kasBalance.masuk)}</h3>
        </div>
        <div className="bg-rose-500 rounded-2xl p-6 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <ArrowUpRight className="w-24 h-24 absolute -right-4 -bottom-4 opacity-10" />
          <p className="text-rose-100 font-medium text-sm">Total Pengeluaran Kas</p>
          <h3 className="text-3xl font-black mt-2 font-mono">{formatIDR(kasBalance.keluar)}</h3>
        </div>
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-slate-900/20 relative overflow-hidden border border-slate-700">
          <Wallet className="w-24 h-24 absolute -right-4 -bottom-4 opacity-10" />
          <p className="text-slate-400 font-medium text-sm">Saldo Aktual Perusahaan</p>
          <h3 className="text-3xl font-black mt-2 font-mono text-emerald-400">{formatIDR(kasBalance.saldo)}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-indigo-600" /> Tren Kas Masuk vs Keluar</h3>
        <KasTrendChart transactions={transactions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Database className="w-4 h-4 text-indigo-600" /> Buku Mutasi Kas Induk</h3>
            <div className="flex items-center gap-2">
              <button onClick={handlePreviewReport} disabled={isGenerating} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 font-bold text-[11px] rounded-lg transition flex items-center gap-1.5">
                {isGenerating ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} Pratinjau Laporan PDF
              </button>
              <button onClick={onRefresh} className="text-slate-400 hover:text-indigo-600 p-1.5 bg-slate-50 border border-slate-200 rounded-lg"><RefreshCcw className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0">
                <tr><th className="px-4 py-3">Tanggal & Ref</th><th className="px-4 py-3">Keterangan Transaksi</th><th className="px-4 py-3 text-right">Nominal (Rp)</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Belum ada riwayat transaksi.</td></tr>
                ) : (
                  transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition group">
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">{tx.type === 'Masuk' ? <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> : <ArrowUpRight className="w-3 h-3 text-rose-500" />}{formatDateIndo(tx.date)}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.reference_code}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600 leading-relaxed max-w-[200px]">
                        {tx.description}
                        {tx.attachment_url && (<button onClick={() => handleViewAttachment(tx.attachment_url!)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 mt-1"><Paperclip size={10} /> Lihat Bukti</button>)}
                      </td>
                      <td className="px-4 py-3 align-top text-right"><span className={`font-bold font-mono px-2.5 py-1 rounded bg-slate-50 border ${tx.type === 'Masuk' ? 'text-emerald-600 border-emerald-100' : 'text-rose-600 border-rose-100'}`}>{tx.type === 'Masuk' ? '+' : '-'} {formatIDR(tx.amount)}</span></td>
                      <td className="px-4 py-3 align-top"><button onClick={() => handleOpenEditTx(tx)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition" title="Edit transaksi"><Pencil size={13} /></button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="lg:col-span-5 relative"><TransactionForm onSuccess={onRefresh} /></div>
      </div>

      {previewPdf && (
        <PdfPreviewModal open={!!previewPdf} onClose={() => setPreviewPdf(null)} pdfUrl={previewPdf.url} onDownload={() => previewPdf.doc.save(previewPdf.fileName)} title="Pratinjau Laporan Mutasi Kas & Keuangan" />
      )}

      {editingTx && (
        <Modal open={!!editingTx} onClose={() => setEditingTx(null)} title="Edit Transaksi" icon={<Pencil size={16} className="text-amber-400" />}>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <p>Mengubah transaksi yang sudah tersimpan akan memengaruhi saldo kas historis dan laporan yang sudah pernah dilihat sebelumnya. Pastikan koreksi ini benar — perubahan akan tercatat permanen di Audit Log.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Tanggal</label>
              <input type="date" value={editTxForm.date} onChange={(e) => setEditTxForm({ ...editTxForm, date: e.target.value })} className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Keterangan</label>
              <input type="text" value={editTxForm.description} onChange={(e) => setEditTxForm({ ...editTxForm, description: e.target.value })} className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Nominal</label>
              <input type="number" value={editTxForm.amount} onChange={(e) => setEditTxForm({ ...editTxForm, amount: Number(e.target.value) })} className="w-full mt-1 border border-amber-300 rounded-lg px-3 py-2 text-sm font-mono font-bold" min="1" />
              <p className="text-[10px] text-slate-400 mt-1">Jurnal debit/kredit akan otomatis disesuaikan ke nominal baru ini.</p>
            </div>
            <button onClick={handleSaveEditTx} disabled={isSavingTx} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50">
              {isSavingTx ? 'Menyimpan...' : 'Simpan Koreksi'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
