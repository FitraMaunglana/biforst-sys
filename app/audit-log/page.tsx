"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabaseClient';
import Sidebar from '../../src/components/Sidebar';
import {
    History, Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Filter
} from 'lucide-react';

const ADMIN_EMAIL = 'biforsttechnologysolution@gmail.com';

const TABLE_LABELS: Record<string, string> = {
    accounts: 'Akun Bookkeeping',
    document_counters: 'Counter Dokumen',
    execution_stages: 'Tahapan Eksekusi (Master)',
    invoice_payments: 'Pembayaran Invoice',
    invoices: 'Invoice',
    journal_entries: 'Jurnal Entri',
    kabupatens: 'Kabupaten',
    projects: 'Proyek',
    titik_execution_checklist: 'Checklist Eksekusi',
    titik_harga: 'Harga Titik',
    titik_lokasi: 'Titik Lokasi',
    transactions: 'Transaksi Kas',
    vendor_bills: 'Tagihan Vendor',
};

interface AuditRow {
    id: number;
    table_name: string;
    record_id: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    changed_by: string;
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
    changed_at: string;
}

const OPERATION_STYLE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    INSERT: { icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    UPDATE: { icon: Pencil, color: 'text-amber-600', bg: 'bg-amber-50' },
    DELETE: { icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50' },
};

// Bandingkan old_data vs new_data, kembalikan hanya kolom yang benar-benar berubah.
function getDiff(oldData: Record<string, any> | null, newData: Record<string, any> | null) {
    if (!oldData || !newData) return [];
    const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    const diffs: { field: string; from: any; to: any }[] = [];
    keys.forEach((key) => {
        if (key === 'last_updated_at' || key === 'created_at') return; // noise, tidak relevan
        const a = oldData[key];
        const b = newData[key];
        if (JSON.stringify(a) !== JSON.stringify(b)) {
            diffs.push({ field: key, from: a, to: b });
        }
    });
    return diffs;
}

export default function AuditLogPage() {
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [tableFilter, setTableFilter] = useState<string>('');
    const [operationFilter, setOperationFilter] = useState<string>('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 30;

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

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('audit_log')
                .select('*')
                .order('changed_at', { ascending: false })
                .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

            if (tableFilter) query = query.eq('table_name', tableFilter);
            if (operationFilter) query = query.eq('operation', operationFilter);

            const { data, error } = await query;
            if (error) throw error;
            setRows((data as AuditRow[]) || []);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isCheckingAuth) loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCheckingAuth, tableFilter, operationFilter, page]);

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
            <Sidebar />
            <div className="flex-1 min-w-0 p-6">
                <div className="max-w-5xl mx-auto space-y-6">

                    <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <History className="w-6 h-6 text-amber-400" /> Audit Log
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Riwayat lengkap siapa mengubah apa, dan kapan, di seluruh sistem</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <Filter size={16} className="text-slate-400" />
                        <select
                            value={tableFilter}
                            onChange={(e) => { setTableFilter(e.target.value); setPage(0); }}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                        >
                            <option value="">Semua Tabel</option>
                            {Object.entries(TABLE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <select
                            value={operationFilter}
                            onChange={(e) => { setOperationFilter(e.target.value); setPage(0); }}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                        >
                            <option value="">Semua Aksi</option>
                            <option value="INSERT">Tambah Baru</option>
                            <option value="UPDATE">Ubah</option>
                            <option value="DELETE">Hapus</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {isLoading ? (
                            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                        ) : rows.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 text-sm">Tidak ada riwayat yang cocok dengan filter.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {rows.map((row) => {
                                    const style = OPERATION_STYLE[row.operation];
                                    const Icon = style.icon;
                                    const diffs = getDiff(row.old_data, row.new_data);
                                    const isExpanded = expandedId === row.id;

                                    return (
                                        <div key={row.id} className="p-4">
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : row.id)}
                                                className="w-full flex items-center justify-between gap-3 text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${style.bg} ${style.color} shrink-0`}>
                                                        <Icon size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">
                                                            <span className={`font-bold ${style.color}`}>
                                                                {row.operation === 'INSERT' ? 'Menambah' : row.operation === 'UPDATE' ? 'Mengubah' : 'Menghapus'}
                                                            </span>
                                                            {' '}{TABLE_LABELS[row.table_name] || row.table_name}
                                                            {row.operation === 'UPDATE' && diffs.length > 0 && (
                                                                <span className="text-slate-400"> · {diffs.length} field berubah</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {row.changed_by} · {new Date(row.changed_at).toLocaleString('id-ID')}
                                                        </p>
                                                    </div>
                                                </div>
                                                {(row.operation === 'UPDATE' && diffs.length > 0) || row.operation !== 'UPDATE' ? (
                                                    isExpanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />
                                                ) : null}
                                            </button>

                                            {isExpanded && (
                                                <div className="mt-3 ml-11 space-y-2">
                                                    {row.operation === 'UPDATE' && diffs.map((d, i) => (
                                                        <div key={i} className="text-xs bg-slate-50 rounded-lg p-2.5 flex flex-wrap items-center gap-2">
                                                            <span className="font-mono font-bold text-slate-600">{d.field}:</span>
                                                            <span className="text-rose-500 line-through font-mono">{JSON.stringify(d.from)}</span>
                                                            <span className="text-slate-400">→</span>
                                                            <span className="text-emerald-600 font-mono font-bold">{JSON.stringify(d.to)}</span>
                                                        </div>
                                                    ))}
                                                    {row.operation === 'INSERT' && (
                                                        <pre className="text-xs bg-slate-50 rounded-lg p-2.5 overflow-x-auto">{JSON.stringify(row.new_data, null, 2)}</pre>
                                                    )}
                                                    {row.operation === 'DELETE' && (
                                                        <pre className="text-xs bg-slate-50 rounded-lg p-2.5 overflow-x-auto">{JSON.stringify(row.old_data, null, 2)}</pre>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="text-xs font-bold text-slate-500 disabled:opacity-30 px-3 py-2 rounded-lg hover:bg-slate-100"
                        >
                            ← Sebelumnya
                        </button>
                        <span className="text-xs text-slate-400">Halaman {page + 1}</span>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={rows.length < PAGE_SIZE}
                            className="text-xs font-bold text-slate-500 disabled:opacity-30 px-3 py-2 rounded-lg hover:bg-slate-100"
                        >
                            Selanjutnya →
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}