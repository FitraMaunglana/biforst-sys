"use client";
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../src/components/layout/AppLayout';
import PageHeader from '../../src/components/ui/PageHeader';
import PdfPreviewModal from '../../src/components/ui/PdfPreviewModal';
import { loadImage, PDF_PRIMARY_COLOR } from '../../src/utils/pdf';
import { fetchKabupatens, fetchTitikForBast, generateBastNumber } from '../../src/services/bast.service';
import type { Kabupaten } from '../../src/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileCheck, Plus, Eye, MapPin } from 'lucide-react';

export default function BastPage() {
    const [kabupatens, setKabupatens] = useState<Kabupaten[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedKab, setSelectedKab] = useState('');
    const [handoverDate, setHandoverDate] = useState(new Date().toISOString().split('T')[0]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewPdf, setPreviewPdf] = useState<{ url: string; doc: jsPDF; fileName: string } | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const kabData = await fetchKabupatens();
            setKabupatens(kabData);
        } catch (error) {
            console.error("Gagal memuat data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const terbilangHari = (date: Date) => {
        const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return hari[date.getDay()];
    };

    const handleCreateBast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKab || !handoverDate) return alert('Pilih wilayah dan tanggal serah terima.');
        setIsGenerating(true);

        try {
            const selectedKabData = kabupatens.find(k => k.id === selectedKab);
            const titikData = await fetchTitikForBast(selectedKab);

            if (!titikData || titikData.length === 0) {
                alert("Tidak ada titik berstatus 'Sudah Aman' di wilayah ini. BAST tidak dapat diterbitkan jika proyek belum selesai 100%.");
                setIsGenerating(false);
                return;
            }

            const tableRows = (titikData as Record<string, string>[]).map((titik, idx) => [
                idx + 1,
                `Kec. ${titik.dukcapil_name}`,
                titik.coordinates || '-',
                titik.isp_name || '-',
                titik.status
            ]);

            const bastNumber = await generateBastNumber();
            const doc = await generatePDF(bastNumber, handoverDate, selectedKabData!, tableRows, titikData.length);
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const fileName = `${bastNumber.replace(/\//g, '_')}.pdf`;

            setPreviewPdf({ url: pdfUrl, doc: doc, fileName });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
            alert("Terjadi kesalahan: " + message);
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePDF = async (bastNum: string, dateStr: string, kabData: Kabupaten, rows: (string | number)[][], totalTitik: number) => {
        const doc = new jsPDF();
        const stempelImg = await loadImage('/stempel_scan.png');
        const ttdImg = await loadImage('/tanda_tangan.jpg');

        doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...PDF_PRIMARY_COLOR);
        doc.text("PT BIFROST TECHNOLOGY SOLUTION", 105, 20, { align: 'center' });
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(80);
        doc.text("Solusi Infrastruktur Jaringan & Telekomunikasi Enterprise", 105, 26, { align: 'center' });
        doc.setFontSize(9);
        doc.text("Kabupaten Sleman, Daerah Istimewa Yogyakarta | Email: finance@bifrost.co.id", 105, 31, { align: 'center' });
        doc.setDrawColor(...PDF_PRIMARY_COLOR); doc.setLineWidth(1); doc.line(14, 35, 196, 35);
        doc.setLineWidth(0.3); doc.line(14, 36.5, 196, 36.5);

        doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text("BERITA ACARA SERAH TERIMA (BAST) PEKERJAAN", 105, 48, { align: 'center' });
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Nomor: ${bastNum}`, 105, 54, { align: 'center' });

        const hDate = new Date(dateStr);
        const paragraf1 = `Pada hari ini, ${terbilangHari(hDate)}, tanggal ${hDate.getDate()} bulan ${hDate.getMonth() + 1} tahun ${hDate.getFullYear()}, bertempat di lokasi proyek Ekspansi Jaringan Jawa Tengah, telah dilakukan serah terima hasil pekerjaan antara pihak-pihak di bawah ini:`;
        doc.setFontSize(10); doc.setTextColor(30); doc.text(doc.splitTextToSize(paragraf1, 182), 14, 65);

        doc.setFont("helvetica", "bold"); doc.text("PIHAK PERTAMA (Pelaksana Pekerjaan):", 14, 82);
        doc.setFont("helvetica", "normal");
        doc.text("Nama Perusahaan", 18, 88); doc.text(": PT Bifrost Technology Solution", 60, 88);
        doc.text("Nama PIC", 18, 94); doc.text(`: ${kabData.pic_name} / Fitra Maulana`, 60, 94);
        doc.text("Jabatan", 18, 100); doc.text(": Tim Teknis / Direktur Operasional", 60, 100);

        doc.setFont("helvetica", "bold"); doc.text("PIHAK KEDUA (Pemberi Kerja):", 14, 110);
        doc.setFont("helvetica", "normal");
        doc.text("Nama Perusahaan", 18, 116); doc.text(": PT Comtelindo", 60, 116);
        doc.text("Proyek", 18, 122); doc.text(`: Ekspansi Jaringan ${kabData.name}`, 60, 122);

        const paragraf2 = `PIHAK PERTAMA menyatakan telah menyelesaikan dan menyerahkan hasil pekerjaan instalasi dan aktivasi jaringan sebanyak ${totalTitik} titik lokasi dalam keadaan "Sudah Aman" (berfungsi dengan baik) kepada PIHAK KEDUA. PIHAK KEDUA menyatakan telah menerima hasil pekerjaan tersebut dengan rincian lokasi sebagai berikut:`;
        doc.text(doc.splitTextToSize(paragraf2, 182), 14, 134);

        autoTable(doc, {
            startY: 152, head: [['No', 'Lokasi / Dukcapil', 'Titik Koordinat', 'ISP', 'Status Teknis']], body: rows,
            theme: 'grid', styles: { fontSize: 8, textColor: [30, 30, 30] },
            headStyles: { fillColor: PDF_PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 4: { halign: 'center' } }
        });

        const finalY = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY + 10;
        const paragraf3 = "Demikian Berita Acara Serah Terima ini dibuat dalam rangkap 2 (dua) untuk dapat dipergunakan sebagaimana mestinya, sebagai dasar penagihan Invoice/pembayaran oleh PIHAK PERTAMA.";
        doc.text(doc.splitTextToSize(paragraf3, 182), 14, finalY);

        const ttdY = finalY + 20;
        doc.setFont("helvetica", "bold");
        doc.text("PIHAK KEDUA", 40, ttdY, { align: 'center' }); doc.text("PT Comtelindo", 40, ttdY + 5, { align: 'center' });
        doc.text("PIHAK PERTAMA", 170, ttdY, { align: 'center' }); doc.text("PT Bifrost Technology Solution", 170, ttdY + 5, { align: 'center' });
        
        doc.setFont("helvetica", "normal");
        doc.line(15, ttdY + 35, 65, ttdY + 35); doc.text("Perwakilan Klien", 40, ttdY + 40, { align: 'center' });

        if (ttdImg) doc.addImage(ttdImg, 'JPEG', 150, ttdY + 10, 40, 22);
        doc.setFont("helvetica", "bold"); doc.text("Fitra Maulana, S.Tr.T.", 170, ttdY + 35, { align: 'center' });
        doc.setFont("helvetica", "normal"); doc.text("Direktur BTS", 170, ttdY + 40, { align: 'center' });
        if (stempelImg) doc.addImage(stempelImg, 'PNG', 135, ttdY + 3, 40, 40);

        return doc;
    };

    return (
        <AppLayout requireAdmin>
            <div className="p-6 relative"><div className="max-w-6xl mx-auto space-y-6">
                <PageHeader
                    icon={<FileCheck className="w-6 h-6 text-emerald-400" />}
                    title="Modul Berita Acara (BAST)"
                    subtitle="Fase 3: Pembuatan Dokumen Serah Terima Proyek Lapangan"
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Plus className="w-4 h-4 text-emerald-600" /> Terbitkan Dokumen BAST Baru
                        </h2>
                        {isLoading ? (
                            <p className="text-sm text-slate-500 text-center py-4 animate-pulse">Memuat data wilayah...</p>
                        ) : (
                            <form onSubmit={handleCreateBast} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Pilih Kabupaten Proyek</label>
                                    <select value={selectedKab} onChange={(e) => setSelectedKab(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" required>
                                        <option value="">-- Pilih Wilayah --</option>
                                        {kabupatens.map(k => (<option key={k.id} value={k.id}>{k.name}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Serah Terima</label>
                                    <input type="date" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" required />
                                </div>
                                <div className="pt-2">
                                    <button type="submit" disabled={isGenerating} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md">
                                        {isGenerating ? 'Menyiapkan BAST...' : 'Kalkulasi & Pratinjau BAST'}
                                        {!isGenerating && <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </form>
                        )}
                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-xs text-rose-700 leading-relaxed flex items-start gap-2">
                            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                            <p><strong>PENTING:</strong> Sistem mengunci keamanan operasional. BAST hanya dapat diterbitkan untuk titik yang statusnya sudah dirubah menjadi <strong>"Sudah Aman"</strong> oleh tim lapangan di Dasbor Utama. Titik yang masih "Kontrak" atau "Dealing" tidak akan masuk ke dokumen BAST.</p>
                        </div>
                    </div>
                </div>
            </div></div>
            {previewPdf && <PdfPreviewModal open={!!previewPdf} onClose={() => setPreviewPdf(null)} pdfUrl={previewPdf.url} onDownload={() => previewPdf.doc.save(previewPdf.fileName)} title="Pratinjau BAST" icon={<FileCheck className="w-5 h-5 text-emerald-400" />} />}
        </AppLayout>
    );
}