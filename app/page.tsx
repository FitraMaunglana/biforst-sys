"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../src/lib/supabaseClient';
import TransactionForm from '../src/components/TransactionForm';
import Sidebar from '../src/components/Sidebar';
import { PipelineDonutChart, KabupatenProgressChart } from '../src/components/DashboardCharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Layers, TrendingUp, MapPin, Users, Database, Lock, RefreshCcw, BarChart3,
  DollarSign, Briefcase, CheckCircle2, Map, Clock, User, FileText, ArrowUpRight,
  ArrowDownLeft, Wallet, Download, Eye, X, ShieldAlert
} from 'lucide-react';

interface TitikData {
  id: string;
  status: string;
  dukcapil_name: string;
  address: string;
  coordinates: string;
  isp_name: string;
  notes: string;
  kabupaten_id: string;
  kabupatens: {
    name: string;
    pic_name: string;
  };
  titik_harga: {
    modal_mrc: number;
    modal_cst: number;
    harga_jual_mrc: number;
    harga_jual_cst: number;
  } | null;
}

const PIPELINE_STATUSES = ['Belum Mulai', 'Pitching', 'Coverage', 'Dealing', 'Kontrak', 'Sudah Aman'];

// EMAIL ADMIN MASTER
const ADMIN_EMAIL = 'biforsttechnologysolution@gmail.com';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'proyek' | 'kas'>('proyek');
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('staff');
  const [currentUser, setCurrentUser] = useState('');

  // Sinkronkan tab aktif dengan query param ?tab=kas di URL,
  // supaya sidebar bisa langsung mengarahkan ke tab tertentu.
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'kas' || tabParam === 'proyek') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);


  const [titikList, setTitikList] = useState<TitikData[]>([]);
  const [selectedKabupaten, setSelectedKabupaten] = useState<string | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [kasBalance, setKasBalance] = useState({ masuk: 0, keluar: 0, saldo: 0 });
  const [previewReportPdf, setPreviewReportPdf] = useState<{ url: string; doc: any; fileName: string } | null>(null);

  useEffect(() => {
    const initDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        const email = session.user.email || '';
        setCurrentUser(email);

        // LOGIKA ROLE-BASED ACCESS CONTROL (RBAC)
        if (email === ADMIN_EMAIL) {
          setUserRole('admin');
        } else {
          setUserRole('staff');
          setActiveTab('proyek'); // Pastikan staf selalu di tab proyek
        }

        setIsCheckingAuth(false);
        await fetchDashboardData();
      }
    };
    initDashboard();
  }, [router]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: projData, error: projErr } = await supabase
        .from('titik_lokasi')
        .select(`
          id, status, dukcapil_name, address, coordinates, isp_name, notes, kabupaten_id,
          kabupatens ( name, pic_name ),
          titik_harga ( modal_mrc, modal_cst, harga_jual_mrc, harga_jual_cst )
        `);

      if (projErr) throw projErr;

      if (projData) {
        const rawData = projData as any[];
        setTitikList(rawData);
        if (rawData.length > 0 && !selectedKabupaten) {
          const kabData = rawData[0].kabupatens;
          const firstKab = Array.isArray(kabData) ? kabData[0]?.name : kabData?.name;
          if (firstKab) setSelectedKabupaten(firstKab);
        }
      }

      await fetchKasData();

    } catch (err) {
      console.error("Gagal memuat data komando proyek:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKasData = async () => {
    try {
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select(`
          id, date, description, reference_code, created_at,
          journal_entries ( account_id, debit, credit )
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (txErr) throw txErr;

      if (txData) {
        let totalMasuk = 0;
        let totalKeluar = 0;

        const formattedTx = txData.map(tx => {
          const kasEntry = tx.journal_entries.find((je: any) => je.account_id === 'acc-kas-101');
          let type = 'Unknown';
          let amount = 0;

          if (kasEntry) {
            if (kasEntry.debit > 0) {
              type = 'Masuk';
              amount = kasEntry.debit;
              totalMasuk += amount;
            } else if (kasEntry.credit > 0) {
              type = 'Keluar';
              amount = kasEntry.credit;
              totalKeluar += amount;
            }
          }
          return { ...tx, type, amount };
        });

        setTransactions(formattedTx);
        setKasBalance({ masuk: totalMasuk, keluar: totalKeluar, saldo: totalMasuk - totalKeluar });
      }
    } catch (err) {
      console.error("Gagal memuat mutasi kas:", err);
    }
  };

  const handleStatusChange = async (titikId: string, newStatus: string) => {
    setIsUpdatingStatusId(titikId);
    try {
      const { error } = await supabase.from('titik_lokasi').update({ status: newStatus }).eq('id', titikId);
      if (error) throw error;
      setTitikList(prev => prev.map(item => item.id === titikId ? { ...item, status: newStatus } : item));
    } catch (err) {
      alert("Gagal memperbarui status. Periksa jaringan Anda.");
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  const formatDateIndo = (dateStr: string) => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const d = new Date(dateStr);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handlePreviewReport = async () => {
    setIsLoading(true);
    try {
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

      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("LAPORAN MUTASI KAS & KEUANGAN", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(50);
      doc.text("BTS Biforst Technology Solution", 14, 29);
      doc.setFont("helvetica", "normal");
      doc.text("Kabupaten Sleman, Daerah Istimewa Yogyakarta", 14, 34);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Dicetak pada: ${formatDateIndo(new Date().toISOString())}`, 196, 29, { align: 'right' });

      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.8);
      doc.line(14, 40, 196, 40);

      doc.setFillColor(245, 247, 250);
      doc.rect(14, 46, 182, 26, 'F');

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text("RINGKASAN PERIODE", 18, 54);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Total Pemasukan Kas", 18, 61);
      doc.text("Total Pengeluaran Kas", 18, 67);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 110, 86);
      doc.text(`: Rp ${kasBalance.masuk.toLocaleString('id-ID')}`, 56, 61);
      doc.setTextColor(225, 29, 72);
      doc.text(`: Rp ${kasBalance.keluar.toLocaleString('id-ID')}`, 56, 67);

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text("SALDO AKTUAL:", 120, 58);
      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text(`Rp ${kasBalance.saldo.toLocaleString('id-ID')}`, 120, 65);

      const tableRows = transactions.map((tx, i) => [
        i + 1,
        formatDateIndo(tx.date),
        tx.reference_code,
        tx.description,
        tx.type === 'Masuk' ? `Rp ${tx.amount.toLocaleString('id-ID')}` : '-',
        tx.type === 'Keluar' ? `Rp ${tx.amount.toLocaleString('id-ID')}` : '-'
      ]);

      autoTable(doc, {
        startY: 78,
        head: [['No', 'Tanggal', 'No. Referensi', 'Keterangan Transaksi', 'Kas Masuk', 'Kas Keluar']],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 8, textColor: [50, 50, 50], cellPadding: 3 },
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          4: { halign: 'right', cellWidth: 28 },
          5: { halign: 'right', cellWidth: 28 }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text(`Sleman, ${formatDateIndo(new Date().toISOString())}`, 196, finalY, { align: "right" });
      doc.text("Mengetahui,", 196, finalY + 5, { align: "right" });

      if (ttdImg) doc.addImage(ttdImg, 'JPEG', 160, finalY + 6, 38, 20);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Fitra Maulana, S.Tr.T.", 196, finalY + 34, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("Direktur BTS", 196, finalY + 38, { align: "right" });

      if (stempelImg) doc.addImage(stempelImg, 'PNG', 146, finalY - 4, 42, 42);

      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const fileId = `Laporan_Kas_BTS_${new Date().toISOString().split('T')[0]}.pdf`;

      setPreviewReportPdf({ url: pdfUrl, doc, fileName: fileId });

    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat memproses laporan.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Lock className="w-8 h-8 animate-pulse text-indigo-600" />
          <p className="font-mono text-sm font-medium">Membuka Enkripsi Konsol ERP...</p>
        </div>
      </div>
    );
  }

  const totalTitik = titikList.length;
  const statusCounts = titikList.reduce((acc: Record<string, number>, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  let totalProyeksiProfit1Tahun = 0;
  titikList.forEach(item => {
    if (item.titik_harga) {
      const harga = Array.isArray(item.titik_harga) ? item.titik_harga[0] : item.titik_harga;
      const pendapatan = (Number(harga?.harga_jual_mrc) * 12) + Number(harga?.harga_jual_cst);
      const modal = (Number(harga?.modal_mrc) * 12) + Number(harga?.modal_cst);
      totalProyeksiProfit1Tahun += (pendapatan - modal);
    }
  });

  const kabupatenAgregat = titikList.reduce((acc: Record<string, any>, item) => {
    const kabData = item.kabupatens;
    const kabName = Array.isArray(kabData) ? kabData[0]?.name : kabData?.name || 'Unknown';
    const picName = Array.isArray(kabData) ? kabData[0]?.pic_name : kabData?.pic_name || 'Unassigned';

    if (!acc[kabName]) acc[kabName] = { name: kabName, pic: picName, total: 0, aman: 0 };
    acc[kabName].total += 1;
    if (item.status === 'Sudah Aman' || item.status === 'Kontrak') acc[kabName].aman += 1;
    return acc;
  }, {});

  const filteredTitikByKabupaten = titikList.filter(t => {
    const kabData = t.kabupatens;
    const name = Array.isArray(kabData) ? kabData[0]?.name : kabData?.name;
    return name === selectedKabupaten;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
      <Sidebar />

      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold tracking-tight text-lg text-slate-900">
              {activeTab === 'proyek' ? 'Komando Proyek' : 'Jurnal Kas Keuangan'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {userRole === 'admin' ? (
                <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded border border-indigo-200 font-mono font-medium">Manager Akses</span>
              ) : (
                <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded border border-emerald-200 font-mono font-medium">Staf Lapangan</span>
              )}
              <span className="text-slate-400 text-xs font-mono">{currentUser}</span>
            </div>
          </div>
          <button onClick={fetchDashboardData} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition">
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <main className="px-6 py-6 space-y-6">

          {/* Sub-navigasi internal: Proyek vs Kas (bukan route terpisah, jadi tetap toggle di sini) */}
          {userRole === 'admin' && (
            <div className="flex bg-slate-200/60 p-1.5 rounded-xl max-w-md border border-slate-200">
              <button onClick={() => setActiveTab('proyek')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'proyek' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                <Briefcase className="w-4 h-4" /> Komando Proyek
              </button>
              <button onClick={() => setActiveTab('kas')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'kas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                <DollarSign className="w-4 h-4" /> Jurnal Kas Keuangan
              </button>
            </div>
          )}

          {activeTab === 'proyek' ? (
            /* TAB 1: KOMANDO PROYEK */
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-4 top-4 p-2 bg-indigo-50 text-indigo-600 rounded-xl"><MapPin className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ekspansi Titik</p>
                  <h3 className="text-2xl font-black mt-1 text-slate-900">{totalTitik} <span className="text-xs text-slate-400 font-normal">Lokasi</span></h3>
                </div>

                {/* Sembunyikan Proyeksi Profit untuk Staf Lapangan */}
                {userRole === 'admin' ? (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute right-4 top-4 p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proyeksi Profit 1 Thn</p>
                    <h3 className="text-2xl font-black mt-1 text-emerald-600">{formatIDR(totalProyeksiProfit1Tahun)}</h3>
                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex items-center justify-center text-slate-400">
                    <div className="text-center space-y-1">
                      <ShieldAlert className="w-6 h-6 mx-auto opacity-50" />
                      <p className="text-[10px] font-mono">Dibatasi Manajemen</p>
                    </div>
                  </div>
                )}

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-4 top-4 p-2 bg-amber-50 text-amber-600 rounded-xl"><CheckCircle2 className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tahap Dealing</p>
                  <h3 className="text-2xl font-black mt-1 text-amber-600">{statusCounts['Dealing'] || 0} <span className="text-xs text-slate-400 font-normal">Titik</span></h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-4 top-4 p-2 bg-slate-100 text-slate-600 rounded-xl"><Layers className="w-5 h-5" /></div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Belum Dimulai</p>
                  <h3 className="text-2xl font-black mt-1 text-slate-700">{statusCounts['Belum Mulai'] || 0} <span className="text-xs text-slate-400 font-normal">Titik</span></h3>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" /> Ringkasan Pipeline Nasional
                </h3>
                <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden">
                  {PIPELINE_STATUSES.map((st, idx) => {
                    const pct = totalTitik > 0 ? ((statusCounts[st] || 0) / totalTitik) * 100 : 0;
                    const colors = ['bg-slate-300', 'bg-blue-400', 'bg-purple-400', 'bg-amber-400', 'bg-emerald-400', 'bg-teal-500'];
                    return pct > 0 ? <div key={idx} className={`${colors[idx]} h-full transition-all duration-300`} style={{ width: `${pct}%` }} /> : null;
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" /> Distribusi Tahapan Pipeline
                  </h3>
                  <PipelineDonutChart statusCounts={statusCounts} pipelineStatuses={PIPELINE_STATUSES} />
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2">
                    <Map className="w-4 h-4 text-indigo-600" /> Progres per Kabupaten
                  </h3>
                  <KabupatenProgressChart kabupatenAgregat={kabupatenAgregat} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Map className="w-4 h-4 text-indigo-600" /> Pilih Wilayah Kerja
                  </h3>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {Object.values(kabupatenAgregat).map((kab: any, i) => {
                      const isSelected = selectedKabupaten === kab.name;
                      return (
                        <button
                          key={i} onClick={() => setSelectedKabupaten(kab.name)}
                          className={`w-full text-left p-3.5 rounded-xl border transition flex justify-between ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                        >
                          <div>
                            <h4 className="font-bold text-sm truncate">{kab.name}</h4>
                            <p className={`text-[11px] font-mono flex items-center gap-1 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>PIC: {kab.pic}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs block font-bold font-mono">{kab.total} Titik</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">Eksplorasi Titik: {selectedKabupaten}</h3>
                  <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                    {filteredTitikByKabupaten.map((titik) => (
                      <div key={titik.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 text-sm">Kec. {titik.dukcapil_name}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{titik.address}</p>
                        </div>
                        <div className="w-[35%] text-right shrink-0">
                          <select
                            value={titik.status}
                            disabled={isUpdatingStatusId === titik.id}
                            onChange={(e) => handleStatusChange(titik.id, e.target.value)}
                            className="text-xs font-bold px-2 py-1.5 rounded-lg border bg-white focus:ring-2 w-full text-center cursor-pointer"
                          >
                            {PIPELINE_STATUSES.map((statusOpt, i) => (
                              <option key={i} value={statusOpt}>{statusOpt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* TAB 2: JURNAL KAS KEUANGAN (HANYA BISA DIAKSES ADMIN) */
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

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-600" /> Buku Mutasi Kas Induk
                    </h3>
                    <div className="flex items-center gap-2">
                      <button onClick={handlePreviewReport} disabled={isLoading} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 font-bold text-[11px] rounded-lg transition flex items-center gap-1.5">
                        {isLoading ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} Pratinjau Laporan PDF
                      </button>
                      <button onClick={fetchKasData} className="text-slate-400 hover:text-indigo-600 p-1.5 bg-slate-50 border border-slate-200 rounded-lg"><RefreshCcw className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0">
                        <tr><th className="px-4 py-3">Tanggal & Ref</th><th className="px-4 py-3">Keterangan Transaksi</th><th className="px-4 py-3 text-right">Nominal (Rp)</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Belum ada riwayat transaksi.</td></tr>
                        ) : (
                          transactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-50 transition group">
                              <td className="px-4 py-3 align-top whitespace-nowrap">
                                <div className="font-semibold text-slate-800 flex items-center gap-1.5">{tx.type === 'Masuk' ? <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> : <ArrowUpRight className="w-3 h-3 text-rose-500" />}{formatDateIndo(tx.date)}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.reference_code}</div>
                              </td>
                              <td className="px-4 py-3 align-top text-slate-600 leading-relaxed max-w-[200px]">{tx.description}</td>
                              <td className="px-4 py-3 align-top text-right"><span className={`font-bold font-mono px-2.5 py-1 rounded bg-slate-50 border ${tx.type === 'Masuk' ? 'text-emerald-600 border-emerald-100' : 'text-rose-600 border-rose-100'}`}>{tx.type === 'Masuk' ? '+' : '-'} {formatIDR(tx.amount)}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="lg:col-span-5 relative"><TransactionForm onSuccess={() => fetchKasData()} /></div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL PRATINJAU PDF LAPORAN KAS */}
      {previewReportPdf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0">
              <h3 className="font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-400" /> Pratinjau Laporan Mutasi Kas & Keuangan</h3>
              <div className="flex items-center gap-4">
                <button onClick={() => previewReportPdf.doc.save(previewReportPdf.fileName)} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition"><Download className="w-4 h-4" /> Simpan & Unduh Laporan</button>
                <button onClick={() => setPreviewReportPdf(null)} className="text-slate-400 hover:text-white transition"><X className="w-6 h-6" /></button>
              </div>
            </div>
            <div className="flex-1 bg-slate-200 relative"><iframe src={previewReportPdf.url} className="w-full h-full border-none absolute inset-0" title="Report Preview" /></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Lock className="w-8 h-8 animate-pulse text-indigo-600" />
          <p className="font-mono text-sm font-medium">Membuka Enkripsi Konsol ERP...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}