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
    X,
    Paperclip,
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
    { id: 'acc-exp-506', code: '506', name: 'Operasional: Internet & Domain', type: 'Expense' },
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
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);

    // Status states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

            // 1b. Upload lampiran bukti (opsional) ke Supabase Storage,
            // lalu simpan path-nya ke kolom attachment_url di transaksi ini.
            if (attachmentFile) {
                setIsUploadingFile(true);
                const fileExt = attachmentFile.name.split('.').pop();
                const filePath = `${txData.id}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('transaction-attachments')
                    .upload(filePath, attachmentFile, { upsert: true });

                if (uploadError) {
                    // Lampiran gagal upload TIDAK membatalkan transaksi yang sudah
                    // tersimpan -- cukup beri tahu, supaya data keuangan tidak hilang
                    // hanya karena masalah upload file.
                    setErrorMessage('Transaksi tersimpan, tapi gagal upload lampiran: ' + uploadError.message);
                } else {
                    await supabase
                        .from('transactions')
                        .update({ attachment_url: filePath })
                        .eq('id', txData.id);
                }
                setIsUploadingFile(false);
            }

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
            setAttachmentFile(null);

            if (onSuccess) {
                onSuccess({ transaction: newTransaction, entries: journalEntries });
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat menyimpan transaksi.');
        } finally {
            setIsSubmitting(false);
        }
    };

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

                            {/* Lampiran Bukti (Opsional) */}
                            <div className="space-y-2">
                                <label htmlFor="tx-attachment" className="block text-sm font-semibold text-slate-700">
                                    Lampiran Bukti <span className="text-slate-400 font-normal">(opsional)</span>
                                </label>
                                <label
                                    htmlFor="tx-attachment"
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition bg-slate-50/50"
                                >
                                    <Paperclip className="w-5 h-5 text-slate-400 shrink-0" />
                                    <span className="text-sm text-slate-500 truncate">
                                        {attachmentFile ? attachmentFile.name : 'Unggah invoice/struk (PDF, JPG, PNG)'}
                                    </span>
                                    <input
                                        id="tx-attachment"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                                    />
                                </label>
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
                                disabled={isSubmitting || isUploadingFile}
                                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white transition-all cursor-pointer ${(isSubmitting || isUploadingFile)
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : transactionType === 'kas_masuk'
                                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/10 active:scale-[0.98]'
                                        : 'bg-slate-900 hover:bg-slate-800 shadow-md active:scale-[0.98]'
                                    }`}
                            >
                                {isUploadingFile ? 'Mengunggah Lampiran...' : isSubmitting ? 'Menyimpan di Supabase...' : 'Simpan Transaksi'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}