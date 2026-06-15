"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    FileText, Download, Plus, ArrowLeft, Building2, Clock, CheckCircle2, X, Eye
} from 'lucide-react';

const terbilang = (angka: number): string => {
    const bilangan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    if (angka < 12) return bilangan[angka];
    if (angka < 20) return terbilang(angka - 10) + ' belas';
    if (angka < 100) return terbilang(Math.floor(angka / 10)) + ' puluh ' + (angka % 10 !== 0 ? ' ' + terbilang(angka % 10) : '');
    if (angka < 200) return 'seratus ' + (angka - 100 !== 0 ? terbilang(angka - 100) : '');
    if (angka < 1000) return terbilang(Math.floor(angka / 100)) + ' ratus ' + (angka % 100 !== 0 ? terbilang(angka % 100) : '');
    if (angka < 2000) return 'seribu ' + (angka - 1000 !== 0 ? terbilang(angka - 1000) : '');
    if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' ribu ' + (angka % 1000 !== 0 ? terbilang(angka % 1000) : '');
    if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' juta ' + (angka % 1000000 !== 0 ? terbilang(angka % 1000000) : '');
    if (angka < 1000000000000) return terbilang(Math.floor(angka / 1000000000)) + ' miliar ' + (angka % 1000000000 !== 0 ? terbilang(angka % 1000000000) : '');
    return '';
};

export default function InvoicePage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [kabupatens, setKabupatens] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedKab, setSelectedKab] = useState('');
    const [billingType, setBillingType] = useState('Gabungan (CST + MRC)');
    const [dueDate, setDueDate] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // State untuk Modal Pratinjau PDF
    const [previewPdf, setPreviewPdf] = useState<{ url: string; doc: any; fileName: string } | null>(null);

    // State untuk Modal Pembayaran
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentData, setPaymentData] = useState({
        invoice_id: '',
        invoice_number: '',
        total_amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        payment_method: 'Transfer BCA'
    });

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else if (session.user.email !== 'biforsttechnologysolution@gmail.com') {
                alert('AKSES DITOLAK: Halaman ini khusus untuk Direksi.');
                router.push('/'); // Tendang kembali ke Dasbor
            } else {
                fetchData();
            }
        };
        checkAuth();
    }, [router]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: invData } = await supabase
                .from('invoices')
                .select('*, kabupatens(name)')
                .order('created_at', { ascending: false });

            if (invData) setInvoices(invData);

            const { data: kabData } = await supabase
                .from('kabupatens')
                .select('id, name, pic_name');

            if (kabData) setKabupatens(kabData);
        } catch (error) {
            console.error("Gagal memuat data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateInvoiceNumber = () => {
        const date = new Date();
        const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][date.getMonth()];
        const year = date.getFullYear();
        const count = invoices.length + 1;
        const paddedCount = count.toString().padStart(3, '0');
        return `INV/BFR/${year}/${monthRoman}/${paddedCount}`;
    };

    const formatDateIndo = (dateStr: string) => {
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const d = new Date(dateStr);
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKab || !dueDate) return alert('Mohon lengkapi data kabupaten dan jatuh tempo.');

        setIsGenerating(true);

        try {
            const selectedKabData = kabupatens.find(k => k.id === selectedKab);

            const { data: titikData, error: errTitik } = await supabase
                .from('titik_lokasi')
                .select(`
          dukcapil_name, status, isp_name,
          titik_harga ( modal_mrc, modal_cst, harga_jual_mrc, harga_jual_cst )
        `)
                .eq('kabupaten_id', selectedKab)
                .in('status', ['Kontrak', 'Sudah Aman']);

            if (errTitik || !titikData || titikData.length === 0) {
                alert("Tidak ada titik berstatus 'Kontrak' atau 'Sudah Aman' di kabupaten ini untuk ditagihkan.");
                setIsGenerating(false);
                return;
            }

            let subtotalCST = 0;
            let subtotalMRC = 0;
            const tableRows: any[] = [];

            const rawTitikData = titikData as any[];

            rawTitikData.forEach((titik, idx) => {
                const harga = Array.isArray(titik.titik_harga) ? titik.titik_harga[0] : titik.titik_harga;

                const cst = Number(harga?.harga_jual_cst) || 0;
                const mrc = Number(harga?.harga_jual_mrc) || 0;

                let rowCST = '-';
                let rowMRC = '-';

                if (billingType.includes('CST') || billingType === 'Gabungan (CST + MRC)') {
                    subtotalCST += cst;
                    rowCST = `Rp ${cst.toLocaleString('id-ID')}`;
                }
                if (billingType.includes('MRC') || billingType === 'Gabungan (CST + MRC)') {
                    subtotalMRC += mrc;
                    rowMRC = `Rp ${mrc.toLocaleString('id-ID')}`;
                }

                tableRows.push([
                    idx + 1,
                    `Kec. ${titik.dukcapil_name}`,
                    titik.isp_name || '-',
                    titik.status,
                    rowCST,
                    rowMRC
                ]);
            });

            const subtotalDPP = subtotalCST + subtotalMRC;
            const ppn11 = subtotalDPP * 0.11;
            const grandTotal = subtotalDPP + ppn11;

            const invNumber = generateInvoiceNumber();
            const issueDate = new Date().toISOString().split('T')[0];

            const { data: newInv, error: invErr } = await supabase
                .from('invoices')
                .insert({
                    kabupaten_id: selectedKab,
                    invoice_number: invNumber,
                    issue_date: issueDate,
                    due_date: dueDate,
                    billing_type: billingType,
                    subtotal: subtotalDPP,
                    tax_amount: ppn11,
                    total_amount: grandTotal,
                    status: 'Terkirim'
                })
                .select().single();

            if (invErr) throw invErr;

            // Jangan langsung download, ambil objek dokumen PDF-nya
            const doc = await generatePDF(invNumber, issueDate, dueDate, selectedKabData, tableRows, subtotalDPP, ppn11, grandTotal, rawTitikData.length);

            // Buat pratinjau Blob URL
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const fileName = `${invNumber.replace(/\//g, '_')}.pdf`;

            setPreviewPdf({ url: pdfUrl, doc: doc, fileName });
            fetchData();

        } catch (error: any) {
            alert("Terjadi kesalahan: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePDF = async (invNum: string, issue: string, due: string, kabData: any, rows: any[], dpp: number, ppn: number, grandTotal: number, totalTitik: number) => {
        const doc = new jsPDF();
        const primaryColor: [number, number, number] = [22, 50, 79];

        const loadImage = (src: string) => {
            return new Promise<HTMLImageElement | null>((resolve) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
            });
        };

        const stempelImg = await loadImage('/stempel_scan.png');
        const ttdImg = await loadImage('/tanda_tangan.jpg');

        // --- TOP HEADER ---
        doc.setFontSize(26);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("INVOICE", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(30);
        doc.text("BTS Biforst Technology Solution", 14, 29);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.text("Kabupaten Sleman, Daerah Istimewa Yogyakarta", 14, 34);
        doc.text("Telp: (0274) 000-0000  ·  Email: biforsttechnologysolution@gmail.com", 14, 39);

        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text("Ditagihkan Kepada", 196, 22, { align: "right" });

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text("PT Comtelindo", 196, 28, { align: "right" });

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text("Proyek: Ekspansi Jaringan Jawa Tengah", 196, 33, { align: "right" });

        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(0.8);
        doc.line(14, 44, 196, 44);

        // --- META DATA INVOICE ---
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Nomor Invoice", 14, 53);
        doc.text("Tanggal Terbit", 14, 59);
        doc.text("Jatuh Tempo", 14, 65);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(`: ${invNum}`, 42, 53);
        doc.text(`: ${formatDateIndo(issue)}`, 42, 59);
        doc.text(`: ${formatDateIndo(due)}`, 42, 65);

        doc.setFillColor(225, 245, 238);
        doc.roundedRect(140, 48, 56, 16, 2, 2, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 110, 86);
        doc.text(billingType.toUpperCase(), 168, 54, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.text(`Layanan: ${totalTitik} Titik Aktif`, 168, 60, { align: "center" });

        // --- TABEL RINCIAN ---
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text(`Rincian Tagihan: ${kabData.name}`, 14, 80);

        autoTable(doc, {
            startY: 84,
            head: [['No', 'Lokasi / Kecamatan', 'ISP', 'Status', 'Biaya CST', 'Biaya MRC']],
            body: rows,
            theme: 'grid',
            styles: { fontSize: 8, textColor: [30, 30, 30], cellPadding: 4 },
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 251, 252] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                3: { halign: 'center' },
                4: { halign: 'right' },
                5: { halign: 'right' },
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 8;

        autoTable(doc, {
            startY: finalY,
            margin: { left: 110 },
            body: [
                ['Subtotal (DPP)', `Rp ${dpp.toLocaleString('id-ID')}`],
                ['PPN 11%', `Rp ${ppn.toLocaleString('id-ID')}`]
            ],
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { halign: 'left', textColor: [100, 100, 100], cellWidth: 40 },
                1: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] }
            }
        });

        const totalY = (doc as any).lastAutoTable.finalY;
        autoTable(doc, {
            startY: totalY,
            margin: { left: 110 },
            body: [
                ['TOTAL TAGIHAN', `Rp ${grandTotal.toLocaleString('id-ID')}`]
            ],
            theme: 'plain',
            styles: { fontSize: 11, cellPadding: 4, fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
            columnStyles: {
                0: { halign: 'left', cellWidth: 40 },
                1: { halign: 'right' }
            }
        });

        const boxY = (doc as any).lastAutoTable.finalY + 8;

        // --- TERBILANG ---
        doc.setFillColor(247, 249, 250);
        doc.setDrawColor(15, 110, 86);
        doc.setLineWidth(1.5);
        doc.rect(14, boxY, 182, 12, 'F');
        doc.line(14, boxY, 14, boxY + 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(50);
        const textTerbilang = `Terbilang: ${terbilang(grandTotal)} rupiah`.replace(/\s+/g, ' ').trim();
        const finalTerbilang = textTerbilang.charAt(0).toUpperCase() + textTerbilang.slice(1);
        doc.text(finalTerbilang, 18, boxY + 8);

        // --- FOOTER & TANDA TANGAN ---
        const footerY = boxY + 25;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.text("Informasi Pembayaran", 14, footerY);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);
        doc.text("Bank        : BCA", 14, footerY + 5);
        doc.text("No. Rek   : 0000-000-000", 14, footerY + 10);
        doc.text("a.n.          : BTS Biforst Technology Solution", 14, footerY + 15);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text("Mohon konfirmasi setelah melakukan pembayaran.", 14, footerY + 21);

        doc.setFontSize(9);
        doc.setTextColor(50);
        doc.text(`Sleman, ${formatDateIndo(issue)}`, 196, footerY, { align: "right" });
        doc.text("Hormat Kami,", 196, footerY + 5, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text("Fitra Maulana, S.Tr.T.", 196, footerY + 34, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Direktur BTS", 196, footerY + 38, { align: "right" });

        if (ttdImg) {
            doc.addImage(ttdImg, 'JPEG', 160, footerY + 6, 38, 20);
        }

        if (stempelImg) {
            doc.addImage(stempelImg, 'PNG', 146, footerY - 4, 42, 42);
        }

        // --- CATATAN BAWAH ---
        doc.setDrawColor(230);
        doc.setLineWidth(0.5);
        doc.line(14, 275, 196, 275);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(150);
        const noteText = "Catatan: Tagihan ini merupakan biaya layanan untuk periode sesuai ketentuan. PPN dihitung dengan tarif efektif 11% sesuai ketentuan PMK 131/2024 untuk jasa non-mewah. Dokumen ini sah secara hukum dan diterbitkan melalui sistem ERP internal PT Bifrost.";
        const splitNote = doc.splitTextToSize(noteText, 182);
        doc.text(splitNote, 14, 280);

        // KEMBALIKAN OBJEK DOC, BUKAN LANGSUNG MENGUNDUHNYA
        return doc;
    };

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const openPaymentModal = (inv: any) => {
        setPaymentData({
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            total_amount: inv.total_amount,
            payment_date: new Date().toISOString().split('T')[0],
            amount: inv.total_amount,
            payment_method: 'Transfer BCA'
        });
        setShowPaymentModal(true);
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessingPayment(true);
        try {
            // 1. Catat ke tabel riwayat pembayaran (invoice_payments)
            const { error: paymentErr } = await supabase
                .from('invoice_payments')
                .insert({
                    invoice_id: paymentData.invoice_id,
                    payment_date: paymentData.payment_date,
                    amount: paymentData.amount,
                    payment_method: paymentData.payment_method
                });

            if (paymentErr) throw paymentErr;

            // 2. Update status di tabel invoices
            const newStatus = paymentData.amount >= paymentData.total_amount ? 'Lunas' : 'Dibayar Sebagian';
            const { error: invUpdateErr } = await supabase
                .from('invoices')
                .update({ status: newStatus })
                .eq('id', paymentData.invoice_id);

            if (invUpdateErr) throw invUpdateErr;

            // =================================================================
            // 3. INTEGRASI JURNAL KAS (PRD KEU-01) - DOUBLE ENTRY BOOKKEEPING
            // =================================================================

            // A. Buat referensi unik untuk transaksi kas
            const randHex = Math.floor(1000 + Math.random() * 9000);
            const refCode = `KM-${paymentData.payment_date.replace(/-/g, '')}-${randHex}`;

            // B. Masukkan ke tabel induk transaksi
            const { data: txData, error: txError } = await supabase
                .from('transactions')
                .insert({
                    date: paymentData.payment_date,
                    description: `Pencairan Dana Invoice ${paymentData.invoice_number} via ${paymentData.payment_method}`,
                    reference_code: refCode
                })
                .select().single();

            if (txError) throw txError;

            // C. Masukkan pencatatan debit/kredit ke jurnal
            // Debit: Kas & Setara Kas (acc-kas-101) bertambah
            // Kredit: Pendapatan Penjualan Layanan (acc-rev-401) bertambah
            const { error: jeError } = await supabase
                .from('journal_entries')
                .insert([
                    {
                        transaction_id: txData.id,
                        account_id: 'acc-kas-101',
                        debit: paymentData.amount,
                        credit: 0
                    },
                    {
                        transaction_id: txData.id,
                        account_id: 'acc-rev-401',
                        debit: 0,
                        credit: paymentData.amount
                    }
                ]);

            if (jeError) throw jeError;
            // =================================================================

            alert(`Pembayaran berhasil dicatat! Status Invoice: ${newStatus} & Dana telah masuk ke Jurnal Kas (Ref: ${refCode}).`);
            setShowPaymentModal(false);
            fetchData();

        } catch (error: any) {
            alert("Gagal mencatat pembayaran: " + error.message);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 relative">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <FileText className="w-6 h-6 text-indigo-400" /> Modul Penagihan & Invoice
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Fase 2: Pembuatan tagihan otomatis bersertifikasi elektronik (S.Tr.T.)</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Plus className="w-4 h-4 text-emerald-600" /> Terbitkan Invoice Baru
                        </h2>
                        <form onSubmit={handleCreateInvoice} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Pilih Kabupaten</label>
                                <select
                                    value={selectedKab}
                                    onChange={(e) => setSelectedKab(e.target.value)}
                                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                >
                                    <option value="">-- Pilih Wilayah --</option>
                                    {kabupatens.map(k => (
                                        <option key={k.id} value={k.id}>{k.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Jenis Penagihan</label>
                                <select
                                    value={billingType}
                                    onChange={(e) => setBillingType(e.target.value)}
                                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="Gabungan (CST + MRC)">Gabungan (CST + MRC)</option>
                                    <option value="Hanya CST (Sekali Bayar)">Hanya CST (Sekali Bayar)</option>
                                    <option value="Hanya MRC (Bulanan)">Hanya MRC (Bulanan)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Jatuh Tempo</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isGenerating}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
                                >
                                    {isGenerating ? 'Menyiapkan PDF...' : 'Kalkulasi & Pratinjau PDF'}
                                    {!isGenerating && <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Building2 className="w-4 h-4 text-indigo-600" /> Riwayat Tagihan ke PT Comtelindo
                        </h2>

                        {isLoading ? (
                            <p className="text-sm text-slate-500 text-center py-10 animate-pulse">Memuat data brankas...</p>
                        ) : invoices.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <p className="text-sm text-slate-400 font-medium">Belum ada invoice yang diterbitkan.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-slate-400 bg-slate-50 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Nomor Invoice</th>
                                            <th className="px-4 py-3">Jatuh Tempo</th>
                                            <th className="px-4 py-3 text-right">Total Nilai</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3 text-center rounded-r-lg">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {invoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50 transition">
                                                <td className="px-4 py-4 font-mono font-bold text-indigo-600">
                                                    {inv.invoice_number}
                                                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">{inv.kabupatens?.name}</div>
                                                </td>
                                                <td className="px-4 py-4 text-slate-500 whitespace-nowrap flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {formatDateIndo(inv.due_date)}
                                                </td>
                                                <td className="px-4 py-4 font-bold text-right text-slate-900 whitespace-nowrap">{formatIDR(inv.total_amount)}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${inv.status === 'Terkirim' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                                        inv.status === 'Lunas' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                            inv.status === 'Dibayar Sebagian' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                                                'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    {inv.status === 'Terkirim' || inv.status === 'Dibayar Sebagian' ? (
                                                        <button
                                                            onClick={() => openPaymentModal(inv)}
                                                            className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-1.5 rounded border border-indigo-200 hover:bg-indigo-600 hover:text-white transition whitespace-nowrap"
                                                        >
                                                            Terima Dana
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">Selesai</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL PRATINJAU PDF (PREVIEW) */}
            {previewPdf && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0">
                            <h3 className="font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-400" /> Pratinjau Invoice Resmi
                            </h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => previewPdf.doc.save(previewPdf.fileName)}
                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition"
                                >
                                    <Download className="w-4 h-4" /> Simpan & Unduh PDF
                                </button>
                                <button onClick={() => setPreviewPdf(null)} className="text-slate-400 hover:text-white transition" title="Tutup Preview">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-200 relative">
                            {/* Menampilkan pratinjau PDF murni menggunakan iframe */}
                            <iframe
                                src={previewPdf.url}
                                className="w-full h-full border-none absolute inset-0"
                                title="Invoice Preview"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI PEMBAYARAN */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                            <h3 className="font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Konfirmasi Pencairan Dana
                            </h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center mb-2">
                                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Tagihan PT Comtelindo</p>
                                <p className="font-mono font-bold text-indigo-600">{paymentData.invoice_number}</p>
                                <p className="text-xl font-black text-slate-900 mt-1">{formatIDR(paymentData.total_amount)}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Transfer Masuk</label>
                                <input
                                    type="date"
                                    value={paymentData.payment_date}
                                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nominal Diterima (Rp)</label>
                                <input
                                    type="number"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                                    className="w-full font-mono text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Metode Pembayaran</label>
                                <select
                                    value={paymentData.payment_method}
                                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="Transfer BCA">Transfer Bank BCA</option>
                                    <option value="Transfer Mandiri">Transfer Bank Mandiri</option>
                                    <option value="Cek Giro">Cek / Giro</option>
                                    <option value="Tunai">Tunai</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessingPayment}
                                className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white font-bold rounded-xl text-sm transition shadow-md"
                            >
                                {isProcessingPayment ? 'Mencatat Transaksi...' : 'Tandai Sebagai Lunas'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}