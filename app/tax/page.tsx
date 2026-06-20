"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabaseClient';
import Sidebar from '../../src/components/Sidebar';
import {
    Receipt, Plus, X, CheckCircle2, Clock, TrendingUp, TrendingDown,
    Minus, Loader2, ChevronDown, AlertTriangle
} from 'lucide-react';

const ADMIN_EMAIL = 'biforsttechnologysolution@gmail.com';
const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface VendorBill {
    id: string;
    titik_id: string | null;
    vendor_name: string;
    bill_date: string;
    billing_type: 'CST' | 'MRC';
    amount_dpp: number;
    is_pkp: boolean;
    ppn_masukan: number;
    pph23_amount: number;
    total_amount: number;
    status: 'Belum Dibayar' | 'Lunas';
    notes: string | null;
    titik_lokasi?: { dukcapil_name: string } | null;
}

interface TitikOption {
    id: string;
    dukcapil_name: string;
    isp_name: string | null;
}

interface MonthlySummary {
    bulan: number;
    ppn_keluaran: number;
    ppn_masukan: number;
    selisih: number;
}

export default function TaxPage() {
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [payingId, setPayingId] = useState<string | null>(null);

    const [bills, setBills] = useState<VendorBill[]>([]);
    const [titikOptions, setTitikOptions] = useState<TitikOption[]>([]);
    const [yearlyData, setYearlyData] = useState<MonthlySummary[]>([]);

    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [viewMode, setViewMode] = useState<'bulanan' | 'tahunan'>('bulanan');

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        titik_id: '',
        vendor_name: '',
        bill_date: new Date().toISOString().split('T')[0],
        billing_type: 'MRC' as 'CST' | 'MRC',
        amount_dpp: '',
        is_pkp: false,
        notes: ''
    });

    // ---------------- AUTH GUARD ----------------
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else if (session.user.email !== ADMIN_EMAIL) {
                alert('AKSES DITOLAK: Halaman ini hanya untuk Administrator.');
                router.push('/');
            } else {
                setIsCheckingAuth(false);
            }
        };
        checkAuth();
    }, [router]);

    // ---------------- DATA FETCHING ----------------
    const fetchBills = async () => {
        const { data, error } = await supabase
            .from('vendor_bills')
            .select('*, titik_lokasi ( dukcapil_name )')
            .order('bill_date', { ascending: false });
        if (!error && data) setBills(data as unknown as VendorBill[]);
    };

    const fetchTitikOptions = async () => {
        const { data, error } = await supabase
            .from('titik_lokasi')
            .select('id, dukcapil_name, isp_name')
            .order('dukcapil_name');
        if (!error && data) setTitikOptions(data as TitikOption[]);
    };

    const fetchMonthlySummary = async () => {
        const { data, error } = await supabase.rpc('get_ppn_summary', {
            p_month: selectedMonth,
            p_year: selectedYear
        });
        if (!error && data) {
            setYearlyData([{
                bulan: selectedMonth,
                ppn_keluaran: data.ppn_keluaran,
                ppn_masukan: data.ppn_masukan,
                selisih: data.selisih
            }]);
        }
    };

    const fetchYearlySummary = async () => {
        const { data, error } = await supabase.rpc('get_ppn_summary_yearly', {
            p_year: selectedYear
        });
        if (!error && data) setYearlyData(data as MonthlySummary[]);
    };

    const loadAll = async () => {
        setIsLoading(true);
        await Promise.all([
            fetchBills(),
            fetchTitikOptions(),
            viewMode === 'bulanan' ? fetchMonthlySummary() : fetchYearlySummary()
        ]);
        setIsLoading(false);
    };

    useEffect(() => {
        if (!isCheckingAuth) loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCheckingAuth, selectedMonth, selectedYear, viewMode]);

    // ---------------- ACTIONS ----------------
    const handleSubmitBill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vendor_name || !formData.amount_dpp) {
            alert('Nama vendor dan nominal wajib diisi.');
            return;
        }
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('vendor_bills').insert({
                titik_id: formData.titik_id || null,
                vendor_name: formData.vendor_name,
                bill_date: formData.bill_date,
                billing_type: formData.billing_type,
                amount_dpp: Number(formData.amount_dpp),
                is_pkp: formData.is_pkp,
                notes: formData.notes || null
            });
            if (error) throw error;

            setShowForm(false);
            setFormData({
                titik_id: '', vendor_name: '', bill_date: new Date().toISOString().split('T')[0],
                billing_type: 'MRC', amount_dpp: '', is_pkp: false, notes: ''
            });
            loadAll();
        } catch (err: any) {
            alert('Gagal menyimpan tagihan: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePayBill = async (billId: string) => {
        if (!confirm('Tandai tagihan ini sebagai sudah dibayar? Jurnal kas keluar akan otomatis tercatat.')) return;
        setPayingId(billId);
        try {
            const { data, error } = await supabase.rpc('pay_vendor_bill', { p_bill_id: billId });
            if (error) throw error;
            alert(`Pembayaran tercatat (Ref: ${data.reference_code}).`);
            loadAll();
        } catch (err: any) {
            alert('Gagal mencatat pembayaran: ' + err.message);
        } finally {
            setPayingId(null);
        }
    };

    const formatIDR = (num: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    const totalKeluaran = yearlyData.reduce((sum, m) => sum + m.ppn_keluaran, 0);
    const totalMasukan = yearlyData.reduce((sum, m) => sum + m.ppn_masukan, 0);
    const totalSelisih = totalKeluaran - totalMasukan;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
            <Sidebar />
            <div className="flex-1 min-w-0 p-6">
                <div className="max-w-6xl mx-auto space-y-6">

                    {/* HEADER */}
                    <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <Receipt className="w-6 h-6 text-violet-400" /> Modul Pajak (PPN)
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Rekapitulasi PPN Keluaran vs PPN Masukan dari tagihan vendor ISP</p>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg"
                        >
                            <Plus size={16} /> Catat Tagihan Vendor
                        </button>
                    </div>

                    {/* Peringatan validasi profesional */}
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                        <p>
                            Angka di halaman ini adalah <strong>alat bantu rekapitulasi internal</strong>, bukan dokumen resmi.
                            Selalu validasi dengan akuntan/konsultan pajak BTS sebelum dipakai sebagai dasar pelaporan SPT Masa PPN ke DJP/Coretax.
                        </p>
                    </div>

                    {/* TOGGLE PERIODE */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex bg-slate-200/60 p-1.5 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setViewMode('bulanan')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${viewMode === 'bulanan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                            >
                                Bulanan
                            </button>
                            <button
                                onClick={() => setViewMode('tahunan')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${viewMode === 'tahunan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                            >
                                Tahunan
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {viewMode === 'bulanan' && (
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium bg-white"
                                >
                                    {MONTH_NAMES.map((name, idx) => (
                                        <option key={idx} value={idx + 1}>{name}</option>
                                    ))}
                                </select>
                            )}
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium bg-white"
                            >
                                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* RINGKASAN CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-2">
                                <TrendingUp size={14} className="text-indigo-500" /> PPN Keluaran
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{formatIDR(totalKeluaran)}</p>
                            <p className="text-xs text-slate-400 mt-1">Dari invoice ke klien (Comtelindo)</p>
                        </div>
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-2">
                                <TrendingDown size={14} className="text-emerald-500" /> PPN Masukan
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{formatIDR(totalMasukan)}</p>
                            <p className="text-xs text-slate-400 mt-1">Dari tagihan vendor ISP (PKP)</p>
                        </div>
                        <div className={`rounded-2xl p-5 border shadow-sm ${totalSelisih > 0 ? 'bg-rose-50 border-rose-200' : totalSelisih < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                            }`}>
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-2">
                                <Minus size={14} /> Selisih PPN
                            </div>
                            <p className={`text-2xl font-bold ${totalSelisih > 0 ? 'text-rose-700' : totalSelisih < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                                {formatIDR(Math.abs(totalSelisih))}
                            </p>
                            <p className="text-xs mt-1 font-medium">
                                {totalSelisih > 0 ? 'Kurang bayar (setor ke negara)' : totalSelisih < 0 ? 'Lebih bayar (kompensasi)' : 'Nihil'}
                            </p>
                        </div>
                    </div>

                    {/* BREAKDOWN TAHUNAN (kalau mode tahunan) */}
                    {viewMode === 'tahunan' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 font-bold text-sm text-slate-700">Breakdown per Bulan — {selectedYear}</div>
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                                    <tr>
                                        <th className="text-left px-5 py-2.5">Bulan</th>
                                        <th className="text-right px-5 py-2.5">PPN Keluaran</th>
                                        <th className="text-right px-5 py-2.5">PPN Masukan</th>
                                        <th className="text-right px-5 py-2.5">Selisih</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {yearlyData.map((m) => (
                                        <tr key={m.bulan} className={m.ppn_keluaran === 0 && m.ppn_masukan === 0 ? 'text-slate-400' : ''}>
                                            <td className="px-5 py-2.5 font-medium">{MONTH_NAMES[m.bulan - 1]}</td>
                                            <td className="px-5 py-2.5 text-right font-mono">{formatIDR(m.ppn_keluaran)}</td>
                                            <td className="px-5 py-2.5 text-right font-mono">{formatIDR(m.ppn_masukan)}</td>
                                            <td className={`px-5 py-2.5 text-right font-mono font-bold ${m.selisih > 0 ? 'text-rose-600' : m.selisih < 0 ? 'text-emerald-600' : ''}`}>
                                                {formatIDR(m.selisih)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* DAFTAR TAGIHAN VENDOR */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 font-bold text-sm text-slate-700">Daftar Tagihan Vendor ISP</div>
                        {isLoading ? (
                            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                        ) : bills.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 text-sm">Belum ada tagihan vendor tercatat.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                                    <tr>
                                        <th className="text-left px-5 py-2.5">Vendor</th>
                                        <th className="text-left px-5 py-2.5">Titik</th>
                                        <th className="text-left px-5 py-2.5">Tanggal</th>
                                        <th className="text-left px-5 py-2.5">Tipe</th>
                                        <th className="text-right px-5 py-2.5">DPP</th>
                                        <th className="text-right px-5 py-2.5">PPN Masukan</th>
                                        <th className="text-right px-5 py-2.5">Total</th>
                                        <th className="text-center px-5 py-2.5">Status</th>
                                        <th className="px-5 py-2.5"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bills.map((bill) => (
                                        <tr key={bill.id}>
                                            <td className="px-5 py-3 font-medium">
                                                {bill.vendor_name}
                                                {!bill.is_pkp && (
                                                    <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Non-PKP</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-slate-500">{bill.titik_lokasi?.dukcapil_name || '-'}</td>
                                            <td className="px-5 py-3 text-slate-500">{new Date(bill.bill_date).toLocaleDateString('id-ID')}</td>
                                            <td className="px-5 py-3 text-slate-500">{bill.billing_type}</td>
                                            <td className="px-5 py-3 text-right font-mono">{formatIDR(bill.amount_dpp)}</td>
                                            <td className="px-5 py-3 text-right font-mono">{formatIDR(bill.ppn_masukan)}</td>
                                            <td className="px-5 py-3 text-right font-mono font-bold">{formatIDR(bill.total_amount)}</td>
                                            <td className="px-5 py-3 text-center">
                                                {bill.status === 'Lunas' ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs px-2 py-1 rounded-full font-medium">
                                                        <CheckCircle2 size={12} /> Lunas
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-xs px-2 py-1 rounded-full font-medium">
                                                        <Clock size={12} /> Belum Bayar
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                {bill.status === 'Belum Dibayar' && (
                                                    <button
                                                        onClick={() => handlePayBill(bill.id)}
                                                        disabled={payingId === bill.id}
                                                        className="text-xs font-bold text-violet-600 hover:text-violet-800 disabled:opacity-50"
                                                    >
                                                        {payingId === bill.id ? 'Memproses...' : 'Bayar'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                </div>
            </div>

            {/* MODAL FORM TAGIHAN VENDOR */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                            <h3 className="font-bold flex items-center gap-2">
                                <Receipt size={18} className="text-violet-400" /> Catat Tagihan Vendor
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitBill} className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Nama Vendor / ISP</label>
                                <input
                                    type="text"
                                    value={formData.vendor_name}
                                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    placeholder="Contoh: PT ISP Jaya Network"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Titik Lokasi (opsional)</label>
                                <select
                                    value={formData.titik_id}
                                    onChange={(e) => {
                                        const titik = titikOptions.find(t => t.id === e.target.value);
                                        setFormData({
                                            ...formData,
                                            titik_id: e.target.value,
                                            vendor_name: titik?.isp_name || formData.vendor_name
                                        });
                                    }}
                                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">— Tidak terkait titik tertentu —</option>
                                    {titikOptions.map((t) => (
                                        <option key={t.id} value={t.id}>Kec. {t.dukcapil_name} {t.isp_name ? `(${t.isp_name})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tanggal Tagihan</label>
                                    <input
                                        type="date"
                                        value={formData.bill_date}
                                        onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                                        className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tipe Biaya</label>
                                    <select
                                        value={formData.billing_type}
                                        onChange={(e) => setFormData({ ...formData, billing_type: e.target.value as 'CST' | 'MRC' })}
                                        className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="MRC">MRC (Bulanan)</option>
                                        <option value="CST">CST (Sekali)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Nominal Tagihan (sebelum pajak)</label>
                                <input
                                    type="number"
                                    value={formData.amount_dpp}
                                    onChange={(e) => setFormData({ ...formData, amount_dpp: e.target.value })}
                                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    placeholder="1000000"
                                    min="0"
                                    required
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={formData.is_pkp}
                                    onChange={(e) => setFormData({ ...formData, is_pkp: e.target.checked })}
                                    className="rounded border-slate-300"
                                />
                                Vendor ini PKP (terbit faktur pajak PPN 11%)
                            </label>

                            {formData.is_pkp && formData.amount_dpp && (
                                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                                    PPN Masukan otomatis: <strong>{formatIDR(Number(formData.amount_dpp) * 0.11)}</strong>
                                </p>
                            )}

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Catatan (opsional)</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                    rows={2}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Tagihan'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}