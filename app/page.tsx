"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../src/lib/supabaseClient';
import TransactionForm, { Transaction, JournalEntry } from '../src/components/TransactionForm';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Database,
  Search,
  Trash2,
  Lock,
  RefreshCcw,
  BookOpen,
  Clock
} from 'lucide-react';

interface HydratedEntryRow {
  id: string;
  transactionId: string;
  date: string;
  description: string;
  reference_code: string;
  type: 'kas_masuk' | 'kas_keluar';
  categoryName: string;
  amount: number;
}

// Peta Akun Global untuk menerjemahkan ID menjadi teks yang mudah dibaca
const ACCOUNTS_DB_MAP: Record<string, string> = {
  'acc-exp-501': 'Operasional: Bensin & Transportasi',
  'acc-exp-502': 'Operasional: Konsumsi & Makan',
  'acc-exp-503': 'Operasional: Atk & Perlengkapan',
  'acc-exp-504': 'Operasional: Sewa Ruangan',
  'acc-exp-505': 'Operasional: Gaji Karyawan',
  'acc-asset-121': 'Aset: Peralatan & Inventaris',
  'acc-rev-401': 'Pendapatan: Penjualan Layanan',
  'acc-rev-402': 'Pendapatan: Komisi & Cashback',
  'acc-eq-301': 'Ekuitas: Modal Pemilik',
};

export default function App() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);

  // State sekarang dimulai dari array kosong, bukan data palsu
  const [ledgerRows, setLedgerRows] = useState<HydratedEntryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'kas_masuk' | 'kas_keluar'>('all');

  // Fungsi utama untuk menarik data dari PostgreSQL
  const fetchLedgerData = async () => {
    setIsFetchingData(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, date, description, reference_code, created_at,
          journal_entries ( id, account_id, debit, credit )
        `)
        .order('created_at', { ascending: false }); // Urutkan dari yang terbaru

      if (error) throw error;

      if (data) {
        const formattedRows: HydratedEntryRow[] = data.map((tx: any) => {
          const entries = tx.journal_entries || [];
          const cashAccountId = 'acc-kas-101';

          // Cari baris jurnal yang bukan akun kas untuk mengetahui kategorinya
          const categoryEntry = entries.find((e: any) => e.account_id !== cashAccountId);
          const amount = categoryEntry ? (categoryEntry.debit || categoryEntry.credit) : 0;
          const categoryName = categoryEntry ? (ACCOUNTS_DB_MAP[categoryEntry.account_id] || 'Akun Tidak Dikenal') : 'Kas';
          const isMasuk = tx.reference_code.startsWith('KM');

          return {
            id: tx.id,
            transactionId: tx.id,
            date: tx.date,
            description: tx.description,
            reference_code: tx.reference_code,
            type: isMasuk ? 'kas_masuk' : 'kas_keluar',
            categoryName: categoryName,
            amount: amount
          };
        });

        setLedgerRows(formattedRows);
      }
    } catch (error) {
      console.error("Gagal menarik data:", error);
    } finally {
      setIsFetchingData(false);
    }
  };

  // Efek Pengecekan Sesi & Penarikan Data Awal
  useEffect(() => {
    const initApp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setIsCheckingAuth(false);
        await fetchLedgerData(); // Tarik data setelah dipastikan login
      }
    };
    initApp();
  }, [router]);

  // Handler saat form sukses menyimpan data baru
  const handleNewTransactionAdded = () => {
    // Tarik ulang data segar dari database agar tabel langsung terbarui
    fetchLedgerData();
  };

  const deleteLedgerRow = async (id: string) => {
    // Karena menggunakan ON DELETE CASCADE, menghapus transaction otomatis menghapus journal_entries-nya
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setLedgerRows(prev => prev.filter(row => row.id !== id));
    }
  };

  // Calculations for KPI Cards
  const totalInflow = ledgerRows
    .filter(r => r.type === 'kas_masuk')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalOutflow = ledgerRows
    .filter(r => r.type === 'kas_keluar')
    .reduce((sum, r) => sum + r.amount, 0);

  const netBalance = totalInflow - totalOutflow;

  // Formatting utilities
  const formatRupiah = (num: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Filtering Rows
  const filteredRows = ledgerRows.filter(row => {
    const matchesSearch =
      row.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.reference_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.categoryName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      filterType === 'all' ||
      row.type === filterType;

    return matchesSearch && matchesType;
  });

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Lock className="w-8 h-8 animate-pulse text-emerald-500" />
          <p className="font-mono text-sm font-medium">Memverifikasi Sesi Terenkripsi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" id="biforst-app-root">
      <nav id="top-nav-bar" className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Biforst Logo" className="w-12 h-12 object-contain rounded-md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold tracking-tight text-lg text-white">biforst-sys</h1>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20 font-mono font-medium">Internal System</span>
              </div>
              <p className="text-slate-400 text-xs font-mono">Bookkeeping &amp; General Ledger Console</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-300 font-medium">Supabase Status: Secured & Syncing</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="dashboard-content-grid">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="kpi-financial-panels">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden">
            <div className="absolute right-4 top-4 p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Kas Masuk</p>
            <h4 className="text-xl md:text-2xl font-black text-slate-900 mt-2 tracking-tight">
              {formatRupiah(totalInflow)}
            </h4>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-emerald-600 font-medium">
              <span className="bg-emerald-50 px-1.5 py-0.5 rounded-md font-mono">
                {ledgerRows.filter(r => r.type === 'kas_masuk').length} Transaksi
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden">
            <div className="absolute right-4 top-4 p-2 bg-rose-50 text-rose-600 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Kas Keluar</p>
            <h4 className="text-xl md:text-2xl font-black text-slate-900 mt-2 tracking-tight">
              {formatRupiah(totalOutflow)}
            </h4>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-rose-600 font-medium">
              <span className="bg-rose-50 px-1.5 py-0.5 rounded-md font-mono">
                {ledgerRows.filter(r => r.type === 'kas_keluar').length} Transaksi
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden">
            <div className="absolute right-4 top-4 p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Kas Balance (Netto)</p>
            <h4 className={`text-xl md:text-2xl font-black mt-2 tracking-tight ${netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {formatRupiah(netBalance)}
            </h4>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-indigo-600 font-medium">
              <span className="bg-indigo-50 px-1.5 py-0.5 rounded-md font-mono">Real-time Sync</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex gap-3 text-emerald-800 text-xs">
              <Lock className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold block">Developer Notice:</span>
                Sistem database Supabase menggunakan pola relasi relational yang mengikat satu `transaction` dengan minimal dua `journal_entries` berpasangan.
              </div>
            </div>

            <TransactionForm onSuccess={handleNewTransactionAdded} />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-lg">Daftar Buku Jurnal</h3>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={fetchLedgerData}
                    disabled={isFetchingData}
                    className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded transition disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-3 h-3 ${isFetchingData ? 'animate-spin' : ''}`} />
                    <span>{isFetchingData ? 'Memuat...' : 'Refresh'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari deskripsi, kategori, rujukan..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Semua</button>
                  <button onClick={() => setFilterType('kas_masuk')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${filterType === 'kas_masuk' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>Masuk</button>
                  <button onClick={() => setFilterType('kas_keluar')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${filterType === 'kas_keluar' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'}`}>Keluar</button>
                </div>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {isFetchingData && ledgerRows.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">Menarik data dari brankas...</div>
                ) : filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <div key={row.id} className={`relative p-4 rounded-xl border transition duration-150 group hover:shadow-md ${row.type === 'kas_masuk' ? 'bg-emerald-50/20 border-emerald-100' : 'bg-rose-50/20 border-rose-100'}`}>
                      <button onClick={() => deleteLedgerRow(row.id)} className="absolute right-3 top-3 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-white rounded-md border border-slate-100 shadow-sm" title="Hapus entri">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-start justify-between gap-2 max-w-[90%]">
                        <div>
                          <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            <span>{row.date}</span><span>•</span>
                            <span className="bg-slate-100 px-1 rounded text-[10px] text-slate-600 font-bold">{row.reference_code}</span>
                          </p>
                          <h5 className="font-bold text-slate-800 text-xs md:text-sm mt-1.5 leading-relaxed">{row.description}</h5>
                          <span className="inline-block text-[10px] uppercase font-bold tracking-wider mt-2 bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">{row.categoryName}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Balanced
                        </span>
                        <p className={`font-black text-sm ${row.type === 'kas_masuk' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {row.type === 'kas_masuk' ? '+' : '-'} {formatRupiah(row.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                    Entri transaksi belum ada.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200/80 mt-16 py-8" id="footer-copyright-pane">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-xs font-semibold text-slate-400 font-mono">
            biforst-sys v2.0.1 • Double-Entry Ledger Core Engine
          </p>
        </div>
      </footer>
    </div>
  );
}