"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../src/lib/supabaseClient';
import TransactionForm from '../src/components/TransactionForm';
import {
  Layers,
  TrendingUp,
  MapPin,
  Users,
  Database,
  Lock,
  RefreshCcw,
  BarChart3,
  DollarSign,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Map,
  Clock,
  User
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

export default function DashboardPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'proyek' | 'kas'>('proyek');

  // State Data Titik & Interaksi Wilayah
  const [titikList, setTitikList] = useState<TitikData[]>([]);
  const [selectedKabupaten, setSelectedKabupaten] = useState<string | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('titik_lokasi')
        .select(`
          id, status, dukcapil_name, address, coordinates, isp_name, notes, kabupaten_id,
          kabupatens ( name, pic_name ),
          titik_harga ( modal_mrc, modal_cst, harga_jual_mrc, harga_jual_cst )
        `);

      if (error) throw error;

      if (data) {
        const rawData = data as any[]; // Menjinakkan TypeScript dengan 'any'
        setTitikList(rawData);

        // Set otomatis kabupaten pertama sebagai default aktif jika belum ada yang dipilih
        if (rawData.length > 0 && !selectedKabupaten) {
          const kabData = rawData[0].kabupatens;
          // Aman dieksekusi di runtime, baik terbaca sebagai Array maupun Object
          const firstKab = Array.isArray(kabData) ? kabData[0]?.name : kabData?.name;

          if (firstKab) setSelectedKabupaten(firstKab);
        }
      }
    } catch (err) {
      console.error("Gagal memuat data komando proyek:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setIsCheckingAuth(false);
        await fetchDashboardData();
      }
    };
    initDashboard();
  }, [router]);

  // FUNGSI UPDATE STATUS TITIK DARI LAPANGAN (PRD PRJ-03)
  const handleStatusChange = async (titikId: string, newStatus: string) => {
    setIsUpdatingStatusId(titikId);
    try {
      const { error } = await supabase
        .from('titik_lokasi')
        .update({
          status: newStatus,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', titikId);

      if (error) throw error;

      // Perbarui state lokal secara instan agar UI terasa sangat cepat
      setTitikList(prev => prev.map(item =>
        item.id === titikId ? { ...item, status: newStatus } : item
      ));
    } catch (err) {
      console.error("Gagal memperbarui status titik:", err);
      alert("Gagal memperbarui status. Periksa jaringan Anda.");
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

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

  // --- LOGIKA AGREGASI METRIK DATA RIIL ---
  const totalTitik = titikList.length;

  const statusCounts = titikList.reduce((acc: Record<string, number>, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  let totalProyeksiProfit1Tahun = 0;
  let totalProyeksiPendapatan1Tahun = 0;

  titikList.forEach(item => {
    if (item.titik_harga) {
      const hjMRC = Number(item.titik_harga.harga_jual_mrc) || 0;
      const hjCST = Number(item.titik_harga.harga_jual_cst) || 0;
      const mdMRC = Number(item.titik_harga.modal_mrc) || 0;
      const mdCST = Number(item.titik_harga.modal_cst) || 0;

      const pendapatan = (hjMRC * 12) + hjCST;
      const modal = (mdMRC * 12) + mdCST;

      totalProyeksiPendapatan1Tahun += pendapatan;
      totalProyeksiProfit1Tahun += (pendapatan - modal);
    }
  });

  const avgMarginPercentage = totalProyeksiPendapatan1Tahun > 0
    ? (totalProyeksiProfit1Tahun / totalProyeksiPendapatan1Tahun) * 100
    : 0;

  // Grup Agregat per Kabupaten
  const kabupatenAgregat = titikList.reduce((acc: Record<string, any>, item) => {
    const kabName = item.kabupatens?.name || 'Unknown';
    const picName = item.kabupatens?.pic_name || 'Unassigned';

    if (!acc[kabName]) {
      acc[kabName] = { name: kabName, pic: picName, total: 0, aman: 0 };
    }
    acc[kabName].total += 1;
    if (item.status === 'Sudah Aman' || item.status === 'Kontrak') {
      acc[kabName].aman += 1;
    }
    return acc;
  }, {});

  // Ambil titik khusus untuk kabupaten yang sedang dipilih/aktif di layar
  const filteredTitikByKabupaten = titikList.filter(t => t.kabupatens?.name === selectedKabupaten);

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="BTS Logo" className="w-10 h-10 object-contain rounded-md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold tracking-tight text-lg text-white">biforst-erp</h1>
                <span className="bg-indigo-500/15 text-indigo-400 text-[10px] px-2 py-0.5 rounded border border-indigo-500/30 font-mono font-medium">Enterprise Core</span>
              </div>
              <p className="text-slate-400 text-xs font-mono">PT Bifrost Technology Solution</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchDashboardData}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 border border-slate-700/60 rounded-xl transition"
              title="Sinkronisasi Data Eksternal"
            >
              <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium transition px-3 py-1.5 border border-rose-500/20 rounded-lg hover:bg-rose-500/10"
            >
              Keluar
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/60 p-1.5 rounded-xl max-w-sm border border-slate-200">
          <button
            onClick={() => setActiveTab('proyek')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'proyek' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Briefcase className="w-4 h-4" />
            Komando Proyek
          </button>
          <button
            onClick={() => setActiveTab('kas')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'kas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <DollarSign className="w-4 h-4" />
            Jurnal Kas Keuangan
          </button>
        </div>

        {activeTab === 'proyek' ? (
          <>
            {/* PANEL STATISTIK UTAMA */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute right-4 top-4 p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ekspansi Titik</p>
                <h3 className="text-2xl font-black mt-1 text-slate-900">{totalTitik} <span className="text-xs text-slate-400 font-normal">Lokasi</span></h3>
                <p className="text-[11px] text-slate-500 font-mono mt-2 border-t border-slate-100 pt-2">Mitra: PT Comtelindo</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute right-4 top-4 p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proyeksi Profit 1 Thn</p>
                <h3 className="text-2xl font-black mt-1 text-emerald-600">{formatIDR(totalProyeksiProfit1Tahun)}</h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-2 border-t border-slate-100 pt-2 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Margin Netto: {avgMarginPercentage.toFixed(1)}%
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute right-4 top-4 p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tahap Dealing</p>
                <h3 className="text-2xl font-black mt-1 text-amber-600">{statusCounts['Dealing'] || 0} <span className="text-xs text-slate-400 font-normal">Titik</span></h3>
                <p className="text-[11px] text-slate-500 font-mono mt-2 border-t border-slate-100 pt-2">Progres Lapangan Tinggi</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute right-4 top-4 p-2 bg-slate-100 text-slate-600 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Belum Dimulai</p>
                <h3 className="text-2xl font-black mt-1 text-slate-700">{statusCounts['Belum Mulai'] || 0} <span className="text-xs text-slate-400 font-normal">Titik</span></h3>
                <p className="text-[11px] text-slate-500 font-mono mt-2 border-t border-slate-100 pt-2">Menunggu Survei TIKOR</p>
              </div>
            </div>

            {/* PIPELINE VISUAL STATUS BAR */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" /> Ringkasan Pipeline Nasional
              </h3>
              <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden">
                {PIPELINE_STATUSES.map((st, idx) => {
                  const count = statusCounts[st] || 0;
                  const pct = totalTitik > 0 ? (count / totalTitik) * 100 : 0;
                  const colors = ['bg-slate-300', 'bg-blue-400', 'bg-purple-400', 'bg-amber-400', 'bg-emerald-400', 'bg-teal-500'];
                  return pct > 0 ? (
                    <div key={idx} className={`${colors[idx]} h-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                  ) : null;
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-mono text-slate-500">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Belum Mulai ({statusCounts['Belum Mulai'] || 0})</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Pitching ({statusCounts['Pitching'] || 0})</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Coverage ({statusCounts['Coverage'] || 0})</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Dealing ({statusCounts['Dealing'] || 0})</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Kontrak ({statusCounts['Kontrak'] || 0})</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span> Aman ({statusCounts['Sudah Aman'] || 0})</div>
              </div>
            </div>

            {/* INTERACTIVE WORKSPACE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* SEKTOR KIRI: DAFTAR KABUPATEN (SELEKTOR INTERAKTIF) */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Map className="w-4 h-4 text-indigo-600" /> Pilih Wilayah Kerja
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {Object.values(kabupatenAgregat).map((kab: any, i) => {
                    const isSelected = selectedKabupaten === kab.name;
                    const rasio = kab.total > 0 ? (kab.aman / kab.total) * 100 : 0;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedKabupaten(kab.name)}
                        className={`w-full text-left p-3.5 rounded-xl border transition duration-150 flex items-center justify-between group ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100 text-slate-800'}`}
                      >
                        <div className="space-y-1 max-w-[80%]">
                          <h4 className="font-bold text-xs md:text-sm truncate">{kab.name}</h4>
                          <p className={`text-[11px] font-mono flex items-center gap-1 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            <User className="w-3 h-3" /> PIC: {kab.pic}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2 shrink-0">
                          <div className="space-y-0.5">
                            <span className={`text-xs block font-bold font-mono ${isSelected ? 'text-white' : 'text-slate-900'}`}>{kab.total} Titik</span>
                            <span className={`text-[10px] block font-semibold ${isSelected ? 'text-indigo-200' : 'text-emerald-600'}`}>{kab.aman} Aman</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 opacity-50 group-hover:opacity-100 transition ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SEKTOR KANAN: TITIK LOKASI & CONTROLLER STATUS MOBILE-FRIENDLY (PRD PRJ-03) */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Eksplorasi Titik: {selectedKabupaten}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">Daftar koordinat lapangan terverifikasi Supabase</p>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-indigo-100 font-mono">
                    {filteredTitikByKabupaten.length} Titik Terdeteksi
                  </span>
                </div>

                <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                  {filteredTitikByKabupaten.map((titik) => {
                    return (
                      <div key={titik.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition relative overflow-hidden group">

                        {/* Header Titik */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 max-w-[65%]">
                            <h4 className="font-bold text-slate-900 text-xs md:text-sm">Kec/Dukcapil: {titik.dukcapil_name}</h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1" title={titik.address}>{titik.address}</p>
                            <p className="text-[10px] font-mono text-slate-400">TIKOR: {titik.coordinates}</p>
                          </div>

                          {/* CONTROLLER SELECT STATUS (PRD PRJ-03) - RESPONSIVE & MOBILE FRIENDLY */}
                          <div className="w-[35%] text-right shrink-0">
                            <label className="text-[10px] font-bold font-mono text-slate-400 block mb-1">Update Progres:</label>
                            <select
                              value={titik.status}
                              disabled={isUpdatingStatusId === titik.id}
                              onChange={(e) => handleStatusChange(titik.id, e.target.value)}
                              className={`text-xs font-bold px-2 py-1.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-center cursor-pointer ${titik.status === 'Sudah Aman' ? 'text-teal-700 border-teal-200 bg-teal-50' :
                                titik.status === 'Kontrak' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' :
                                  titik.status === 'Dealing' ? 'text-amber-700 border-amber-200 bg-amber-50' :
                                    'text-slate-700 border-slate-200'
                                }`}
                            >
                              {PIPELINE_STATUSES.map((statusOpt, i) => (
                                <option key={i} value={statusOpt} className="text-slate-900 font-sans text-left font-semibold">{statusOpt}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Footer / Catatan Titik Lapangan */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ISP: {titik.isp_name}</span>
                          <span className="italic truncate max-w-[60%]" title={titik.notes}>{titik.notes ? `"${titik.notes}"` : 'Tidak ada catatan'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </>
        ) : (
          /* TAB MODUL AKUNTANSI KAS OPERASIONAL */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-12">
              <TransactionForm onSuccess={() => { }} />
            </div>
          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-20 py-6 font-mono text-[11px] text-center">
        biforst-erp v1.0.0 · Core System Connected to Supabase Engine · Yogyakarta 2026
      </footer>
    </div>
  );
}