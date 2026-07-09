"use client";
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../src/components/layout/AppLayout';
import PageHeader from '../../src/components/ui/PageHeader';
import EmptyState from '../../src/components/ui/EmptyState';
import { fetchAuditLogs, getAuditDiff } from '../../src/services/audit.service';
import type { AuditRow } from '../../src/types';
import { TABLE_LABELS } from '../../src/utils/constants';
import { History, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const OPERATION_STYLE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    INSERT: { icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    UPDATE: { icon: Pencil, color: 'text-amber-600', bg: 'bg-amber-50' },
    DELETE: { icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50' },
};

export default function AuditLogPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [tableFilter, setTableFilter] = useState<string>('');
    const [operationFilter, setOperationFilter] = useState<string>('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 30;

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchAuditLogs({ page, pageSize: PAGE_SIZE, tableFilter, operationFilter });
            setRows(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [page, tableFilter, operationFilter]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    return (
        <AppLayout requireAdmin>
            <div className="p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    <PageHeader
                        icon={<History className="w-6 h-6 text-amber-400" />}
                        title="Audit Log"
                        subtitle="Riwayat lengkap siapa mengubah apa, dan kapan, di seluruh sistem"
                    />

                    <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <Filter size={16} className="text-slate-400" />
                        <select value={tableFilter} onChange={(e) => { setTableFilter(e.target.value); setPage(0); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-500">
                            <option value="">Semua Tabel</option>
                            {Object.entries(TABLE_LABELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                        </select>
                        <select value={operationFilter} onChange={(e) => { setOperationFilter(e.target.value); setPage(0); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-500">
                            <option value="">Semua Aksi</option>
                            <option value="INSERT">Tambah Baru</option>
                            <option value="UPDATE">Ubah</option>
                            <option value="DELETE">Hapus</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {isLoading ? (
                            <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-amber-400 animate-spin" /></div>
                        ) : rows.length === 0 ? (
                            <EmptyState message="Tidak ada riwayat yang cocok dengan filter." dashed />
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {rows.map((row) => {
                                    const style = OPERATION_STYLE[row.operation] || { icon: History, color: 'text-slate-600', bg: 'bg-slate-50' };
                                    const Icon = style.icon;
                                    const diffs = getAuditDiff(row.old_data, row.new_data);
                                    const isExpanded = expandedId === row.id;

                                    return (
                                        <div key={row.id} className="p-4">
                                            <button onClick={() => setExpandedId(isExpanded ? null : row.id)} className="w-full flex items-center justify-between gap-3 text-left outline-none">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${style.bg} ${style.color} shrink-0`}><Icon size={14} /></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">
                                                            <span className={`font-bold ${style.color}`}>{row.operation === 'INSERT' ? 'Menambah' : row.operation === 'UPDATE' ? 'Mengubah' : 'Menghapus'}</span>
                                                            {' '}{TABLE_LABELS[row.table_name as keyof typeof TABLE_LABELS] || row.table_name}
                                                            {row.operation === 'UPDATE' && diffs.length > 0 && <span className="text-slate-400"> · {diffs.length} field berubah</span>}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{row.changed_by} · {new Date(row.changed_at).toLocaleString('id-ID')}</p>
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
                                                        <pre className="text-xs bg-slate-50 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(row.new_data, null, 2)}</pre>
                                                    )}
                                                    {row.operation === 'DELETE' && (
                                                        <pre className="text-xs bg-slate-50 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(row.old_data, null, 2)}</pre>
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
                        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="text-xs font-bold text-slate-500 disabled:opacity-30 px-3 py-2 rounded-lg hover:bg-slate-100 transition">← Sebelumnya</button>
                        <span className="text-xs text-slate-400 font-medium">Halaman {page + 1}</span>
                        <button onClick={() => setPage(page + 1)} disabled={rows.length < PAGE_SIZE} className="text-xs font-bold text-slate-500 disabled:opacity-30 px-3 py-2 rounded-lg hover:bg-slate-100 transition">Selanjutnya →</button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}