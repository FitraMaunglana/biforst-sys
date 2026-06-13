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
  Map,
  Clock,
  User,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet
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

  // State Data Proyek
  const [titikList, setTitikList] = useState<TitikData[]>([]);
  const [selectedKabupaten, setSelectedKabupaten] = useState<string | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);

  // State Data Jurnal Kas
  const [transactions, setTransactions] = useState<any[]>([]);
  const [kasBalance, setKasBalance] = useState({ masuk: 0, keluar: 0, saldo: 0 });

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Data Proyek (Titik Lokasi)
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

      // 2. Fetch Data Jurnal Kas
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
          // Cari entri yang berhubungan dengan akun Kas Induk (acc-kas-101)
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
        setKasBalance({
          masuk: totalMasuk,
          keluar: totalKeluar,
          saldo: totalMasuk - totalKeluar
        });
      }
    } catch (err) {
      console.error("Gagal memuat mutasi kas:", err);
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

  const handleStatusChange = async (titikId: string, newStatus: string) => {
    setIsUpdatingStatusId(titikId);
    try {
      const { error } = await supabase
        .from('titik_lokasi')
        .update({ status: newStatus })
        .eq('id', titikId);

      if (error) throw error;
      setTitikList(prev => prev.map(item => item.id === titikId ? { ...item, status: newStatus } : item));
    } catch (err) {
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

  // --- Kalkulasi Metrik Proyek ---
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

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
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
            <button onClick={fetchDashboardData} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition">
              <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
              className="text-xs text-rose-400 font-medium px-3 py-1.5 border border-rose-500/20 rounded-lg hover:bg-rose-500/10"
            >
              Keluar
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <div className="flex bg-slate-200/60 p-1.5 rounded-xl max-w-2xl border border-slate-200">
          <button onClick={() => setActiveTab('proyek')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'proyek' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            <Briefcase className="w-4 h-4" /> Komando Proyek
          </button>
          <button onClick={() => setActiveTab('kas')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'kas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            <DollarSign className="w-4 h-4" /> Jurnal Kas Keuangan
          </button>
          <button onClick={() => router.push('/invoices')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-indigo-600 hover:bg-indigo-50`}>
            <FileText className="w-4 h-4" /> Penagihan Mitra
          </button>
        </div>

        {activeTab === 'proyek' ? (
          /* =======================================
             TAB 1: KOMANDO PROYEK (Sudah Sempurna)
             ======================================= */
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute right-4 top-4 p-2 bg-indigo-50 text-indigo-600 rounded-xl"><MapPin className="w-5 h-5" /></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ekspansi Titik</p>
                <h3 className="text-2xl font-black mt-1 text-slate-900">{totalTitik} <span className="text-xs text-slate-400 font-normal">Lokasi</span></h3>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute right-4 top-4 p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proyeksi Profit 1 Thn</p>
                <h3 className="text-2xl font-black mt-1 text-emerald-600">{formatIDR(totalProyeksiProfit1Tahun)}</h3>
              </div>
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
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-mono text-slate-500">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Belum Mulai ({statusCounts['Belum Mulai'] || 0})</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Pitching ({statusCounts['Pitching'] || 0})</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Kontrak ({statusCounts['Kontrak'] || 0})</div>
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
          /* =======================================
             TAB 2: JURNAL KAS KEUANGAN (UPDATE BARU)
             ======================================= */
          <div className="space-y-6">

            {/* 1. KARTU SALDO VISUAL */}
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

              {/* 2. TABEL RIWAYAT TRANSAKSI */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" /> Buku Mutasi Kas Induk (Buku Besar)
                  </h3>
                  <button onClick={fetchKasData} className="text-slate-400 hover:text-indigo-600"><RefreshCcw className="w-4 h-4" /></button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Tanggal & Ref</th>
                        <th className="px-4 py-3">Keterangan Transaksi</th>
                        <th className="px-4 py-3 text-right">Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Belum ada riwayat transaksi.</td></tr>
                      ) : (
                        transactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition group">
                            <td className="px-4 py-3 align-top whitespace-nowrap">
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                {tx.type === 'Masuk' ? <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> : <ArrowUpRight className="w-3 h-3 text-rose-500" />}
                                {tx.date}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.reference_code}</div>
                            </td>
                            <td className="px-4 py-3 align-top text-slate-600 leading-relaxed max-w-[200px]">
                              {tx.description}
                            </td>
                            <td className="px-4 py-3 align-top text-right">
                              <span className={`font-bold font-mono px-2.5 py-1 rounded bg-slate-50 border ${tx.type === 'Masuk' ? 'text-emerald-600 border-emerald-100' : 'text-rose-600 border-rose-100'}`}>
                                {tx.type === 'Masuk' ? '+' : '-'} {formatIDR(tx.amount)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. FORM INPUT KAS MANUAL */}
              <div className="lg:col-span-5 relative">
                {/* Menggunakan komponen TransactionForm yang sudah kita buat sebelumnya */}
                <TransactionForm onSuccess={() => fetchKasData()} />
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}