"use client";
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../src/components/layout/AppLayout';
import PageHeader from '../../src/components/ui/PageHeader';
import PdfPreviewModal from '../../src/components/ui/PdfPreviewModal';
import Modal from '../../src/components/ui/Modal';
import StatusBadge from '../../src/components/ui/StatusBadge';
import EmptyState from '../../src/components/ui/EmptyState';
import { formatIDR, formatDateIndo, terbilang } from '../../src/utils/format';
import { loadImage, PDF_PRIMARY_COLOR } from '../../src/utils/pdf';
import { fetchInvoices, fetchKabupatens, fetchTitikForInvoice, generateDocumentNumber, insertInvoice, recordInvoicePayment } from '../../src/services/invoice.service';
import type { Invoice, Kabupaten } from '../../src/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Plus, Building2, Clock, CheckCircle2, Eye } from 'lucide-react';

export default function InvoicePage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [kabupatens, setKabupatens] = useState<Kabupaten[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedKab, setSelectedKab] = useState('');
    const [billingType, setBillingType] = useState('Gabungan (CST + MRC)');
    const [dueDate, setDueDate] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewPdf, setPreviewPdf] = useState<{ url: string; doc: jsPDF; fileName: string } | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentData, setPaymentData] = useState({ invoice_id: '', invoice_number: '', total_amount: 0, payment_date: new Date().toISOString().split('T')[0], amount: 0, payment_method: 'Transfer BCA' });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [invData, kabData] = await Promise.all([fetchInvoices(), fetchKabupatens()]);
            setInvoices(invData);
            setKabupatens(kabData);
        } catch (err) { console.error("Gagal memuat data:", err); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKab || !dueDate) return alert('Mohon lengkapi data kabupaten dan jatuh tempo.');
        setIsGenerating(true);
        try {
            const selectedKabData = kabupatens.find(k => k.id === selectedKab);
            const titikData = await fetchTitikForInvoice(selectedKab);
            if (!titikData || titikData.length === 0) { alert("Tidak ada titik berstatus 'Kontrak' atau 'Sudah Aman' di kabupaten ini."); setIsGenerating(false); return; }

            let subtotalCST = 0, subtotalMRC = 0;
            const tableRows: (string | number)[][] = [];
            (titikData as Record<string, unknown>[]).forEach((titik, idx) => {
                const harga = Array.isArray(titik.titik_harga) ? (titik.titik_harga as Record<string, unknown>[])[0] : titik.titik_harga as Record<string, unknown> | null;
                const cst = Number((harga as Record<string, unknown>)?.harga_jual_cst) || 0;
                const mrc = Number((harga as Record<string, unknown>)?.harga_jual_mrc) || 0;
                let rowCST = '-', rowMRC = '-';
                if (billingType.includes('CST') || billingType === 'Gabungan (CST + MRC)') { subtotalCST += cst; rowCST = `Rp ${cst.toLocaleString('id-ID')}`; }
                if (billingType.includes('MRC') || billingType === 'Gabungan (CST + MRC)') { subtotalMRC += mrc; rowMRC = `Rp ${mrc.toLocaleString('id-ID')}`; }
                tableRows.push([idx + 1, `Kec. ${titik.dukcapil_name}`, (titik.isp_name as string) || '-', titik.status as string, rowCST, rowMRC]);
            });

            const subtotalDPP = subtotalCST + subtotalMRC;
            const ppn11 = subtotalDPP * 0.11;
            const grandTotal = subtotalDPP + ppn11;
            const invNumber = await generateDocumentNumber('INV', 'INV/BFR');
            const issueDate = new Date().toISOString().split('T')[0];
            await insertInvoice({ kabupaten_id: selectedKab, invoice_number: invNumber, issue_date: issueDate, due_date: dueDate, billing_type: billingType, subtotal: subtotalDPP, tax_amount: ppn11, total_amount: grandTotal, status: 'Terkirim' });
            const doc = await generatePDF(invNumber, issueDate, dueDate, selectedKabData!, tableRows, subtotalDPP, ppn11, grandTotal, titikData.length);
            const pdfBlob = doc.output('blob');
            setPreviewPdf({ url: URL.createObjectURL(pdfBlob), doc, fileName: `${invNumber.replace(/\//g, '_')}.pdf` });
            fetchData();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Terjadi kesalahan.';
            alert("Terjadi kesalahan: " + message);
        } finally { setIsGenerating(false); }
    };

    const generatePDF = async (invNum: string, issue: string, due: string, kabData: Kabupaten, rows: (string | number)[][], dpp: number, ppn: number, grandTotal: number, totalTitik: number) => {
        const doc = new jsPDF();
        const stempelImg = await loadImage('/stempel_scan.png');
        const ttdImg = await loadImage('/tanda_tangan.jpg');

        doc.setFontSize(26); doc.setFont("helvetica", "bold"); doc.setTextColor(...PDF_PRIMARY_COLOR); doc.text("INVOICE", 14, 22);
        doc.setFontSize(10); doc.setTextColor(30); doc.text("BTS Biforst Technology Solution", 14, 29);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80);
        doc.text("Kabupaten Sleman, Daerah Istimewa Yogyakarta", 14, 34);
        doc.text("Telp: (0274) 000-0000  ·  Email: biforsttechnologysolution@gmail.com", 14, 39);
        doc.setFontSize(8); doc.setTextColor(120); doc.text("Ditagihkan Kepada", 196, 22, { align: "right" });
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(0); doc.text("PT Comtelindo", 196, 28, { align: "right" });
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80); doc.text("Proyek: Ekspansi Jaringan Jawa Tengah", 196, 33, { align: "right" });
        doc.setDrawColor(...PDF_PRIMARY_COLOR); doc.setLineWidth(0.8); doc.line(14, 44, 196, 44);

        doc.setFontSize(9); doc.setTextColor(100);
        doc.text("Nomor Invoice", 14, 53); doc.text("Tanggal Terbit", 14, 59); doc.text("Jatuh Tempo", 14, 65);
        doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text(`: ${invNum}`, 42, 53); doc.text(`: ${formatDateIndo(issue)}`, 42, 59); doc.text(`: ${formatDateIndo(due)}`, 42, 65);

        doc.setFillColor(225, 245, 238); doc.roundedRect(140, 48, 56, 16, 2, 2, 'F');
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(15, 110, 86);
        doc.text(billingType.toUpperCase(), 168, 54, { align: "center" });
        doc.setFont("helvetica", "normal"); doc.text(`Layanan: ${totalTitik} Titik Aktif`, 168, 60, { align: "center" });

        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...PDF_PRIMARY_COLOR);
        doc.text(`Rincian Tagihan: ${kabData.name}`, 14, 80);
        autoTable(doc, { startY: 84, head: [['No', 'Lokasi / Kecamatan', 'ISP', 'Status', 'Biaya CST', 'Biaya MRC']], body: rows, theme: 'grid', styles: { fontSize: 8, textColor: [30, 30, 30], cellPadding: 4 }, headStyles: { fillColor: PDF_PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [250, 251, 252] }, columnStyles: { 0: { halign: 'center', cellWidth: 15 }, 3: { halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'right' } } });

        const finalY = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY + 8;
        autoTable(doc, { startY: finalY, margin: { left: 110 }, body: [['Subtotal (DPP)', `Rp ${dpp.toLocaleString('id-ID')}`], ['PPN 11%', `Rp ${ppn.toLocaleString('id-ID')}`]], theme: 'plain', styles: { fontSize: 9, cellPadding: 3 }, columnStyles: { 0: { halign: 'left', textColor: [100, 100, 100], cellWidth: 40 }, 1: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } } });
        const totalY = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY;
        autoTable(doc, { startY: totalY, margin: { left: 110 }, body: [['TOTAL TAGIHAN', `Rp ${grandTotal.toLocaleString('id-ID')}`]], theme: 'plain', styles: { fontSize: 11, cellPadding: 4, fillColor: PDF_PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { halign: 'left', cellWidth: 40 }, 1: { halign: 'right' } } });

        const boxY = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY + 8;
        doc.setFillColor(247, 249, 250); doc.setDrawColor(15, 110, 86); doc.setLineWidth(1.5);
        doc.rect(14, boxY, 182, 12, 'F'); doc.line(14, boxY, 14, boxY + 12);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(50);
        const textTerbilang = `Terbilang: ${terbilang(grandTotal)} rupiah`.replace(/\s+/g, ' ').trim();
        doc.text(textTerbilang.charAt(0).toUpperCase() + textTerbilang.slice(1), 18, boxY + 8);

        const footerY = boxY + 25;
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...PDF_PRIMARY_COLOR); doc.text("Informasi Pembayaran", 14, footerY);
        doc.setFont("helvetica", "normal"); doc.setTextColor(50);
        doc.text("Bank        : BCA", 14, footerY + 5); doc.text("No. Rek   : 0000-000-000", 14, footerY + 10); doc.text("a.n.          : BTS Biforst Technology Solution", 14, footerY + 15);
        doc.setFontSize(8); doc.setTextColor(120); doc.text("Mohon konfirmasi setelah melakukan pembayaran.", 14, footerY + 21);
        doc.setFontSize(9); doc.setTextColor(50);
        doc.text(`Sleman, ${formatDateIndo(issue)}`, 196, footerY, { align: "right" }); doc.text("Hormat Kami,", 196, footerY + 5, { align: "right" });
        doc.setFont("helvetica", "bold"); doc.setTextColor(0); doc.text("Fitra Maulana, S.Tr.T.", 196, footerY + 34, { align: "right" });
        doc.setFont("helvetica", "normal"); doc.setTextColor(100); doc.text("Direktur BTS", 196, footerY + 38, { align: "right" });
        if (ttdImg) doc.addImage(ttdImg, 'JPEG', 160, footerY + 6, 38, 20);
        if (stempelImg) doc.addImage(stempelImg, 'PNG', 146, footerY - 4, 42, 42);
        doc.setDrawColor(230); doc.setLineWidth(0.5); doc.line(14, 275, 196, 275);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(150);
        const noteText = "Catatan: Tagihan ini merupakan biaya layanan untuk periode sesuai ketentuan. PPN dihitung dengan tarif efektif 11% sesuai ketentuan PMK 131/2024 untuk jasa non-mewah. Dokumen ini sah secara hukum dan diterbitkan melalui sistem ERP internal PT Bifrost.";
        doc.text(doc.splitTextToSize(noteText, 182), 14, 280);
        return doc;
    };

    const openPaymentModal = (inv: Invoice) => {
        setPaymentData({ invoice_id: inv.id, invoice_number: inv.invoice_number, total_amount: inv.total_amount, payment_date: new Date().toISOString().split('T')[0], amount: inv.total_amount, payment_method: 'Transfer BCA' });
        setShowPaymentModal(true);
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessingPayment(true);
        try {
            const data = await recordInvoicePayment({ invoiceId: paymentData.invoice_id, paymentDate: paymentData.payment_date, amount: paymentData.amount, paymentMethod: paymentData.payment_method });
            alert(`Pembayaran berhasil dicatat! Status Invoice: ${data.status} & Dana telah masuk ke Jurnal Kas (Ref: ${data.reference_code}).`);
            setShowPaymentModal(false);
            fetchData();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Gagal mencatat pembayaran.';
            alert("Gagal mencatat pembayaran: " + message);
        } finally { setIsProcessingPayment(false); }
    };

    return (
        <AppLayout requireAdmin>
            <div className="p-6"><div className="max-w-6xl mx-auto space-y-6">
                <PageHeader icon={<FileText className="w-6 h-6 text-indigo-400" />} title="Modul Penagihan & Invoice" subtitle="Fase 2: Pembuatan tagihan otomatis bersertifikasi elektronik (S.Tr.T.)" />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3"><Plus className="w-4 h-4 text-emerald-600" /> Terbitkan Invoice Baru</h2>
                        <form onSubmit={handleCreateInvoice} className="space-y-4">
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Pilih Kabupaten</label><select value={selectedKab} onChange={(e) => setSelectedKab(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required><option value="">-- Pilih Wilayah --</option>{kabupatens.map(k => (<option key={k.id} value={k.id}>{k.name}</option>))}</select></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Jenis Penagihan</label><select value={billingType} onChange={(e) => setBillingType(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"><option value="Gabungan (CST + MRC)">Gabungan (CST + MRC)</option><option value="Hanya CST (Sekali Bayar)">Hanya CST (Sekali Bayar)</option><option value="Hanya MRC (Bulanan)">Hanya MRC (Bulanan)</option></select></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">Jatuh Tempo</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>
                            <div className="pt-2"><button type="submit" disabled={isGenerating} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md">{isGenerating ? 'Menyiapkan PDF...' : 'Kalkulasi & Pratinjau PDF'}{!isGenerating && <Eye className="w-4 h-4" />}</button></div>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3"><Building2 className="w-4 h-4 text-indigo-600" /> Riwayat Tagihan ke PT Comtelindo</h2>
                        {isLoading ? (<p className="text-sm text-slate-500 text-center py-10 animate-pulse">Memuat data brankas...</p>) : invoices.length === 0 ? (<EmptyState message="Belum ada invoice yang diterbitkan." dashed />) : (
                            <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400 bg-slate-50 font-bold uppercase tracking-wider"><tr><th className="px-4 py-3 rounded-l-lg">Nomor Invoice</th><th className="px-4 py-3">Jatuh Tempo</th><th className="px-4 py-3 text-right">Total Nilai</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center rounded-r-lg">Aksi</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-4 font-mono font-bold text-indigo-600">{inv.invoice_number}<div className="text-[10px] text-slate-400 font-sans mt-0.5">{inv.kabupatens?.name}</div></td>
                                    <td className="px-4 py-4 text-slate-500 whitespace-nowrap flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateIndo(inv.due_date)}</td>
                                    <td className="px-4 py-4 font-bold text-right text-slate-900 whitespace-nowrap">{formatIDR(inv.total_amount)}</td>
                                    <td className="px-4 py-4 text-center"><StatusBadge status={inv.status} /></td>
                                    <td className="px-4 py-4 text-center">{inv.status === 'Terkirim' || inv.status === 'Dibayar Sebagian' ? (<button onClick={() => openPaymentModal(inv)} className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-1.5 rounded border border-indigo-200 hover:bg-indigo-600 hover:text-white transition whitespace-nowrap">Terima Dana</button>) : (<span className="text-[10px] text-slate-400 italic">Selesai</span>)}</td>
                                </tr>))}</tbody></table></div>
                        )}
                    </div>
                </div>
            </div></div>

            {previewPdf && <PdfPreviewModal open={!!previewPdf} onClose={() => setPreviewPdf(null)} pdfUrl={previewPdf.url} onDownload={() => previewPdf.doc.save(previewPdf.fileName)} title="Pratinjau Invoice Resmi" />}

            {showPaymentModal && (
                <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Konfirmasi Pencairan Dana" icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}>
                    <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center mb-2"><p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Tagihan PT Comtelindo</p><p className="font-mono font-bold text-indigo-600">{paymentData.invoice_number}</p><p className="text-xl font-black text-slate-900 mt-1">{formatIDR(paymentData.total_amount)}</p></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Transfer Masuk</label><input type="date" value={paymentData.payment_date} onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })} className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">Nominal Diterima (Rp)</label><input type="number" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })} className="w-full font-mono text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">Metode Pembayaran</label><select value={paymentData.payment_method} onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })} className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"><option value="Transfer BCA">Transfer Bank BCA</option><option value="Transfer Mandiri">Transfer Bank Mandiri</option><option value="Cek Giro">Cek / Giro</option><option value="Tunai">Tunai</option></select></div>
                        <button type="submit" disabled={isProcessingPayment} className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white font-bold rounded-xl text-sm transition shadow-md">{isProcessingPayment ? 'Mencatat Transaksi...' : 'Tandai Sebagai Lunas'}</button>
                    </form>
                </Modal>
            )}
        </AppLayout>
    );
}