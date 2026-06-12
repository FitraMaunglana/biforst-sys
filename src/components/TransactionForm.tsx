"use client";
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    Calendar,
    FileText,
    DollarSign,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle,
    Info,
    Code,
    X,
    ListOrdered,
    PlusCircle,
    Clock,
    Briefcase
} from 'lucide-react';

// Type definitions to match Supabase database structure
export interface Account {
    id: string;
    code: string;
    name: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

export interface Transaction {
    id: string;
    date: string;
    description: string;
    reference_code: string;
}

export interface JournalEntry {
    id: string;
    transaction_id: string;
    account_id: string;
    debit: number;
    credit: number;
}

// Pre-defined static accounts for Double-Entry Bookkeeping
const ACCOUNTS_DB: Account[] = [
    // Cash Asset
    { id: 'acc-kas-101', code: '101', name: 'Kas & Setara Kas', type: 'Asset' },

    // Expenses (Kas Keluar Categories)
    { id: 'acc-exp-501', code: '501', name: 'Operasional: Bensin & Transportasi', type: 'Expense' },
    { id: 'acc-exp-502', code: '502', name: 'Operasional: Konsumsi & Makan', type: 'Expense' },
    { id: 'acc-exp-503', code: '503', name: 'Operasional: Atk & Perlengkapan', type: 'Expense' },
    { id: 'acc-exp-504', code: '504', name: 'Operasional: Sewa Ruangan', type: 'Expense' },
    { id: 'acc-exp-505', code: '505', name: 'Operasional: Gaji Karyawan', type: 'Expense' },
    { id: 'acc-asset-121', code: '121', name: 'Aset: Peralatan & Inventaris', type: 'Asset' },

    // Revenue & Equity (Kas Masuk Categories)
    { id: 'acc-rev-401', code: '401', name: 'Pendapatan: Penjualan Layanan', type: 'Revenue' },
    { id: 'acc-rev-402', code: '402', name: 'Pendapatan: Komisi & Cashback', type: 'Revenue' },
    { id: 'acc-eq-301', code: '301', name: 'Ekuitas: Modal Pemilik', type: 'Equity' },
];

interface TransactionFormProps {
    onSuccess?: (data: { transaction: Transaction; entries: JournalEntry[] }) => void;
}

export default function TransactionForm({ onSuccess }: TransactionFormProps) {
    // 1. Core local states for inputs
    const [transactionType, setTransactionType] = useState<'kas_masuk' | 'kas_keluar'>('kas_keluar');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState<string>('');
    const [amountInput, setAmountInput] = useState<string>('');
    const [categoryAccountId, setCategoryAccountId] = useState<string>('');

    // Status states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showDevDetails, setShowDevDetails] = useState<boolean>(true);

    // Formatter functions
    const formatRupiah = (val: string): string => {
        const numberString = val.replace(/[^0-9]/g, '');
        if (!numberString) return '';
        const number = parseInt(numberString, 10);
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(number);
    };

    const cleanNumericValue = (val: string): string => {
        return val.replace(/[^0-9]/g, '');
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawVal = e.target.value;
        const cleanVal = cleanNumericValue(rawVal);
        setAmountInput(formatRupiah(cleanVal));
    };

    const getNumericAmount = (): number => {
        const clean = cleanNumericValue(amountInput);
        return clean ? parseInt(clean, 10) : 0;
    };

    // Filter accounts based on type
    const categories = ACCOUNTS_DB.filter(acc => {
        if (transactionType === 'kas_keluar') {
            // Outflows can be coded as expenses, assets (purchasing equipment), etc.
            return acc.type === 'Expense' || (acc.type === 'Asset' && acc.id !== 'acc-kas-101');
        } else {
            // Inflows are revenues or capital equity
            return acc.type === 'Revenue' || acc.type === 'Equity';
        }
    });

    // Automatically reset category when transaction type changes
    const handleTypeChange = (type: 'kas_masuk' | 'kas_keluar') => {
        setTransactionType(type);
        setCategoryAccountId('');
    };

    // Derive double entry mapping dynamically to show user / developer what's going on under the hood
    const getDoubleEntryPreview = () => {
        const amount = getNumericAmount();
        const cashAccount = ACCOUNTS_DB.find(a => a.id === 'acc-kas-101')!;
        const selectedCategoryAccount = ACCOUNTS_DB.find(a => a.id === categoryAccountId);

        if (!amount || !selectedCategoryAccount) return null;

        if (transactionType === 'kas_masuk') {
            // Cash In: Debit Cash (Asset increases), Credit Class/Revenue (Revenue/Equity increases)
            return {
                debit: {
                    account: cashAccount,
                    amount: amount,
                },
                credit: {
                    account: selectedCategoryAccount,
                    amount: amount,
                }
            };
        } else {
            // Cash Out: Debit Expense/Asset (Expense increases / Asset increases), Credit Cash (Asset decreases)
            return {
                debit: {
                    account: selectedCategoryAccount,
                    amount: amount,
                },
                credit: {
                    account: cashAccount,
                    amount: amount,
                }
            };
        }
    };

    // Fungsi handleSubmit yang sudah terhubung ke database Supabase
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        const numericAmount = getNumericAmount();

        // Validations
        if (!date) {
            setErrorMessage('Silakan pilih tanggal transaksi.');
            return;
        }
        if (!description.trim()) {
            setErrorMessage('Deskripsi transaksi tidak boleh kosong.');
            return;
        }
        if (numericAmount <= 0) {
            setErrorMessage('Nominal transaksi harus lebih besar dari Rp 0.');
            return;
        }
        if (!categoryAccountId) {
            setErrorMessage('Hubungkan dengan satu jenis kategori alokasi.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Generate standard reference code
            const prefix = transactionType === 'kas_masuk' ? 'KM' : 'KK';
            const randHex = Math.floor(1000 + Math.random() * 9000);
            const referenceCode = `${prefix}-${date.replace(/-/g, '')}-${randHex}`;

            const doubleEntry = getDoubleEntryPreview();
            if (!doubleEntry) throw new Error("Gagal memetakan jurnal");

            // 1. Eksekusi Insert ke tabel `transactions` di Supabase
            const { data: txData, error: txError } = await supabase
                .from('transactions')
                .insert({
                    date: date,
                    description: description,
                    reference_code: referenceCode
                })
                .select()
                .single();

            if (txError) throw txError;

            // 2. Eksekusi Insert penyeimbang ke tabel `journal_entries` di Supabase
            const entriesToInsert = [
                {
                    transaction_id: txData.id,
                    account_id: doubleEntry.debit.account.id,
                    debit: doubleEntry.debit.amount,
                    credit: 0
                },
                {
                    transaction_id: txData.id,
                    account_id: doubleEntry.credit.account.id,
                    debit: 0,
                    credit: doubleEntry.credit.amount
                }
            ];

            const { error: jeError } = await supabase
                .from('journal_entries')
                .insert(entriesToInsert);

            if (jeError) throw jeError;

            // 3. Persiapkan balikan data agar UI list di samping langsung ter-update
            const newTransaction: Transaction = {
                id: txData.id,
                date: txData.date,
                description: txData.description,
                reference_code: txData.reference_code
            };

            // Format ulang entries untuk state UI (menggunakan ID sementara untuk tabel UI)
            const journalEntries: JournalEntry[] = entriesToInsert.map(entry => ({
                id: `je-temp-${Math.random().toString(36).substring(2, 9)}`,
                ...entry
            }));

            setSuccessMessage(`Transaksi berhasil disimpan ke jurnal bookkeeping! Rujukan: ${referenceCode}`);

            // Reset form states
            setDescription('');
            setAmountInput('');
            setCategoryAccountId('');

            if (onSuccess) {
                onSuccess({ transaction: newTransaction, entries: journalEntries });
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat menyimpan transaksi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const preview = getDoubleEntryPreview();

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6" id="biforst-sys-transaction-container">
            {/* Outer Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden" id="main-form-card">
                {/* Form Header */}
                <div className="bg-slate-900 px-6 py-5 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight md:text-2xl" id="app-title-text">
                            Pencatatan Transaksi Kas
                        </h2>
                        <p className="text-slate-400 text-sm mt-1" id="app-subtitle-description">
                            Sistem Jurnal Akrual Otomatis &amp; Double-Entry Bookkeeping `biforst-sys`
                        </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-mono self-start md:self-center">
                        Supabase Bookkeeping Client V1
                    </span>
                </div>

                {/* Form Body */}
                <div className="p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6" id="transaction-form-element">

                        {/* 1. Transaction Type Toggle */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-3">Jenis Aliran Kas</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    id="tab-kas-keluar"
                                    onClick={() => handleTypeChange('kas_keluar')}
                                    className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl font-medium transition-all duration-200 border-2 text-sm md:text-base ${transactionType === 'kas_keluar'
                                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                                        : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-lg ${transactionType === 'kas_keluar' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        <ArrowUpRight className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-bold">Kas Keluar</span>
                                        <span className="block text-xs opacity-85 font-normal">Pengeluaran &amp; Biaya</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    id="tab-kas-masuk"
                                    onClick={() => handleTypeChange('kas_masuk')}
                                    className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl font-medium transition-all duration-200 border-2 text-sm md:text-base ${transactionType === 'kas_masuk'
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                        : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-lg ${transactionType === 'kas_masuk' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        <ArrowDownLeft className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-bold">Kas Masuk</span>
                                        <span className="block text-xs opacity-85 font-normal">Pemasukan &amp; Modal</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Success and Error Alerts inside Form Container */}
                        {successMessage && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3" id="success-alert-message">
                                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-sm">Berhasil!</p>
                                    <p className="text-xs text-emerald-700 mt-1">{successMessage}</p>
                                </div>
                            </div>
                        )}

                        {errorMessage && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-3" id="error-alert-message">
                                <X className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-sm">Kesalahan Input</p>
                                    <p className="text-xs text-rose-700 mt-1">{errorMessage}</p>
                                </div>
                            </div>
                        )}

                        {/* 2. Structured Inputs Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Field A: Tanggal */}
                            <div className="space-y-2">
                                <label htmlFor="tx-date" className="block text-sm font-semibold text-slate-700">Tanggal Transaksi</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Calendar className="h-5 h-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="date"
                                        id="tx-date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm text-slate-800 font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Field B: Nominal Masuk/Keluar (AUTO-FORMATTED RUPIAH) */}
                            <div className="space-y-2">
                                <label htmlFor="tx-amount" className="block text-sm font-semibold text-slate-700">
                                    Nominal Transaksi (Rupiah)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <span className="text-sm font-bold text-slate-500">Rp</span>
                                    </div>
                                    <input
                                        type="text"
                                        id="tx-amount"
                                        value={amountInput}
                                        onChange={handleAmountChange}
                                        placeholder="Rp 0"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-base font-bold text-slate-800 transition"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-slate-400">
                                    Masukkan nilai numerik tanpa simbol titik, format otomatis diaplikasikan.
                                </p>
                            </div>

                            {/* Field C: Dynamic Category Dropdown (Double-Entry Under-the-Hood) */}
                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="tx-category" className="block text-sm font-semibold text-slate-700">
                                    Kategori {transactionType === 'kas_masuk' ? 'Penerimaan' : 'Alokasi Pengeluaran'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Briefcase className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <select
                                        id="tx-category"
                                        value={categoryAccountId}
                                        onChange={(e) => setCategoryAccountId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm text-slate-800 font-medium cursor-pointer"
                                        required
                                    >
                                        <option value="" disabled>-- Pilih kategori alokasi akun --</option>
                                        {categories.map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                [{acc.code}] - {acc.name} ({acc.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Kategori akan merepresentasikan akun lawan dari akun kas utama di buku besar.
                                </p>
                            </div>

                            {/* Field D: Deskripsi Transaksi */}
                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="tx-description" className="block text-sm font-semibold text-slate-700">Deskripsi / Keterangan</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 pt-3.5 flex items-start pointer-events-none">
                                        <FileText className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <textarea
                                        id="tx-description"
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Contoh: Pembelian bensin operasional mobil boks, or Pembayaran modal awal PT"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm text-slate-800 transition"
                                        required
                                    />
                                </div>
                            </div>

                        </div>

                        {/* 3. Submit Action Block */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Info className="w-4 h-4 hover:text-slate-700 cursor-pointer" />
                                <span className="text-xs">
                                    Sistem akan melacak kode referensi rujukan secara unik.
                                </span>
                            </div>

                            <button
                                type="submit"
                                id="submit-transaction-btn"
                                disabled={isSubmitting}
                                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white transition-all cursor-pointer ${isSubmitting
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : transactionType === 'kas_masuk'
                                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/10 active:scale-[0.98]'
                                        : 'bg-slate-900 hover:bg-slate-800 shadow-md active:scale-[0.98]'
                                    }`}
                            >
                                {isSubmitting ? 'Menyimpan di Supabase...' : 'Simpan Transaksi'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>

            {/* Under-The-Hood Double Entry Developer Sandbox Preview Box */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-200 rounded-lg text-slate-700">
                            <Code className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm md:text-base">Under-the-Hood: Double-Entry Matrix</h3>
                            <p className="text-slate-500 text-xs mt-0.5">Analisis pemetaan debit / kredit instan untuk database Supabase Anda</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowDevDetails(!showDevDetails)}
                        className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                        {showDevDetails ? 'Sembunyikan' : 'Tampilkan Detail'}
                    </button>
                </div>

                {showDevDetails && (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Meskipun UI sangat sederhana bagi staff lapangan (hanya memilih Kas Masuk/Keluar &amp; Kategori), di belakang layar sistem memaksakan aturan akuntansi keuangan berpasangan dengan membagi nominal tersebut ke baris jurnal entry penyeimbang secara instan:
                        </p>

                        {preview ? (
                            <div className="overflow-hidden bg-white border border-slate-200 rounded-xl">
                                <div className="grid grid-cols-12 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 border-b border-slate-200">
                                    <div className="col-span-3">Akun Bookkeeping</div>
                                    <div className="col-span-3 text-center">Kode Akun</div>
                                    <div className="col-span-2 text-center">Tipe</div>
                                    <div className="col-span-2 text-right">Debit</div>
                                    <div className="col-span-2 text-right">Kredit</div>
                                </div>

                                {/* DEBIT ROW */}
                                <div className="grid grid-cols-12 px-4 py-3 text-xs border-b border-slate-100 items-center">
                                    <div className="col-span-3 font-semibold text-slate-800">{preview.debit.account.name}</div>
                                    <div className="col-span-3 text-center font-mono bg-slate-50 rounded py-0.5 px-1.5 text-slate-600 inline-block mx-auto text-[10px]">
                                        {preview.debit.account.code}
                                    </div>
                                    <div className="col-span-2 text-center text-slate-500">{preview.debit.account.type}</div>
                                    <div className="col-span-2 text-right text-emerald-600 font-bold">
                                        {formatRupiah(preview.debit.amount.toString())}
                                    </div>
                                    <div className="col-span-2 text-right text-slate-400 font-mono">-</div>
                                </div>

                                {/* CREDIT ROW */}
                                <div className="grid grid-cols-12 px-4 py-3 text-xs items-center">
                                    <div className="col-span-3 font-semibold text-slate-800 pl-4">{preview.credit.account.name}</div>
                                    <div className="col-span-3 text-center font-mono bg-slate-50 rounded py-0.5 px-1.5 text-slate-600 inline-block mx-auto text-[10px]">
                                        {preview.credit.account.code}
                                    </div>
                                    <div className="col-span-2 text-center text-slate-500">{preview.credit.account.type}</div>
                                    <div className="col-span-2 text-right text-slate-400 font-mono">-</div>
                                    <div className="col-span-2 text-right text-rose-600 font-bold">
                                        {formatRupiah(preview.credit.amount.toString())}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 text-slate-400 text-xs">
                                Masukkan nilai nominal Rupiah dan pilih kategori akun untuk melihat skema mutasi instan di sini.
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                <span>Tabel 1: <strong>transactions</strong> insert (1 baris)</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full"></span>
                                <span>Tabel 2: <strong>journal_entries</strong> (2 baris penyeimbang)</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                <span>Balancing status: <strong>Matched (Dr = Cr)</strong></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
