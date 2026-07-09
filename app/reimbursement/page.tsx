"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '../../src/components/layout/AppLayout';
import PageHeader from '../../src/components/ui/PageHeader';
import EmptyState from '../../src/components/ui/EmptyState';
import Modal from '../../src/components/ui/Modal';
import StatusBadge from '../../src/components/ui/StatusBadge';
import StatCard from '../../src/components/ui/StatCard';
import TabToggle from '../../src/components/ui/TabToggle';
import { useAuth } from '../../src/hooks/useAuth';
import { fetchReimbursements, createReimbursement, approveReimbursement, rejectReimbursement } from '../../src/services/reimbursement.service';
import type { Reimbursement } from '../../src/types';
import { formatIDR } from '../../src/utils/format';
import { HandCoins, Plus, Paperclip, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function ReimbursementPage() {
    const { role, session } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
    const [activeTab, setActiveTab] = useState<'semua' | 'pending'>('semua');

    // Form Pengajuan
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', amount: 0, expense_date: '' });
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form Reject
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    const loadData = useCallback(async () => {
        if (!session?.email) return;
        setIsLoading(true);
        try {
            const data = await fetchReimbursements(role || 'founder', session.email);
            setReimbursements(data);
        } catch (error) {
            console.error('Failed to fetch reimbursements:', error);
            alert('Gagal mengambil data reimbursement.');
        } finally {
            setIsLoading(false);
        }
    }, [role, session?.email]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || form.amount <= 0 || files.length === 0 || !form.expense_date) {
            alert('Judul, nominal valid, tanggal pengeluaran, dan minimal 1 lampiran wajib diisi.');
            return;
        }

        setIsSubmitting(true);
        try {
            await createReimbursement(
                { ...form, submitted_by: session?.email || '' },
                files
            );
            alert('Reimbursement berhasil diajukan.');
            setShowForm(false);
            setForm({ title: '', description: '', amount: 0, expense_date: '' });
            setFiles([]);
            loadData();
        } catch (error: any) {
            console.error(error);
            alert('Gagal mengajukan reimbursement: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Setujui pengajuan ini? Transaksi kas akan tercatat otomatis.')) return;
        try {
            await approveReimbursement(id);
            alert('Reimbursement disetujui.');
            loadData();
        } catch (error: any) {
            console.error(error);
            alert('Gagal menyetujui: ' + error.message);
        }
    };

    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectId || !rejectReason.trim()) {
            alert('Alasan penolakan wajib diisi.');
            return;
        }
        setIsRejecting(true);
        try {
            await rejectReimbursement(rejectId, rejectReason);
            alert('Reimbursement ditolak.');
            setShowRejectForm(false);
            setRejectId(null);
            setRejectReason('');
            loadData();
        } catch (error: any) {
            console.error(error);
            alert('Gagal menolak: ' + error.message);
        } finally {
            setIsRejecting(false);
        }
    };

    const totalReimbursement = reimbursements.reduce((acc, curr) => acc + curr.amount, 0);
    const pendingCount = reimbursements.filter(r => r.status === 'Pending').length;
    const approvedTotal = reimbursements.filter(r => r.status === 'Approved').reduce((acc, curr) => acc + curr.amount, 0);

    const filteredReimbursements = reimbursements.filter(r => {
        if (activeTab === 'pending') return r.status === 'Pending';
        return true;
    });

    return (
        <AppLayout>
            <div className="p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <PageHeader
                        icon={<HandCoins className="w-6 h-6 text-rose-400" />}
                        title="Reimbursement"
                        subtitle={role === 'admin' ? "Manajemen persetujuan klaim pengeluaran" : "Pengajuan klaim dana operasional perusahaan"}
                        action={
                            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                                <Plus size={16} /> Ajukan Klaim Baru
                            </button>
                        }
                    />

                    {/* Dashboard Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            label={role === 'admin' ? "Total Klaim Diajukan" : "Total Klaim Saya"}
                            value={formatIDR(totalReimbursement)}
                            icon={<HandCoins className="w-5 h-5" />}
                            accent="rose"
                        />
                        <StatCard
                            label="Menunggu Persetujuan"
                            value={pendingCount}
                            icon={<Clock className="w-5 h-5" />}
                            accent="amber"
                            valueColor="text-amber-600"
                        />
                        <StatCard
                            label="Total Disetujui"
                            value={formatIDR(approvedTotal)}
                            icon={<CheckCircle className="w-5 h-5" />}
                            accent="emerald"
                            valueColor="text-emerald-600"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-slate-800">Riwayat Pengajuan</h2>
                        {role === 'admin' && (
                            <div className="w-full sm:w-auto">
                                <TabToggle
                                    options={[
                                        { key: 'semua', label: 'Semua Riwayat' },
                                        { key: 'pending', label: 'Perlu Persetujuan' }
                                    ]}
                                    activeKey={activeTab}
                                    onChange={(key) => setActiveTab(key as any)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Data List */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {isLoading ? (
                            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-rose-500 w-10 h-10" /></div>
                        ) : filteredReimbursements.length === 0 ? (
                            <EmptyState
                                message={activeTab === 'pending' ? "Tidak ada pengajuan yang menunggu persetujuan." : "Belum ada riwayat pengajuan reimbursement."}
                                dashed
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Informasi Pengajuan</th>
                                            {role === 'admin' && <th className="px-6 py-4">Diajukan Oleh</th>}
                                            <th className="px-6 py-4 text-right">Nominal</th>
                                            <th className="px-6 py-4">Lampiran</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            {role === 'admin' && <th className="px-6 py-4 text-center">Tindakan</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredReimbursements.map(r => (
                                            <tr key={r.id} className="hover:bg-rose-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-800 text-base">{r.title}</p>
                                                    <p className="text-xs text-slate-500 max-w-xs truncate mt-0.5">{r.description || 'Tidak ada catatan tambahan'}</p>
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2 font-mono">
                                                        <Clock size={10} />
                                                        {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                {role === 'admin' && (
                                                    <td className="px-6 py-4">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-slate-600 font-medium text-xs">
                                                            {r.submitted_by}
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-mono font-bold text-slate-900 text-base bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 group-hover:border-rose-200 group-hover:bg-white transition-colors">
                                                        {formatIDR(r.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {r.reimbursement_attachments && r.reimbursement_attachments.length > 0 ? (
                                                        <div className="flex flex-col gap-1.5">
                                                            {r.reimbursement_attachments.map(att => (
                                                                <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-md hover:bg-indigo-100 transition-colors max-w-[200px] truncate">
                                                                    <Paperclip size={12} className="shrink-0" /> <span className="truncate">{att.file_name}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs italic">
                                                            <AlertCircle size={12} /> Tanpa lampiran
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <StatusBadge status={r.status} />
                                                        {r.status === 'Rejected' && r.reject_reason && (
                                                            <p className="text-[11px] text-rose-500 max-w-[150px] truncate bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100" title={r.reject_reason}>
                                                                {r.reject_reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                {role === 'admin' && (
                                                    <td className="px-6 py-4 text-center">
                                                        {r.status === 'Pending' ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button onClick={() => handleApprove(r.id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors font-bold text-xs" title="Setujui">
                                                                    <CheckCircle size={14} /> Setujui
                                                                </button>
                                                                <button onClick={() => { setRejectId(r.id); setShowRejectForm(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg transition-colors font-bold text-xs" title="Tolak">
                                                                    <XCircle size={14} /> Tolak
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Diproses</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Pengajuan Baru */}
            <Modal open={showForm} onClose={() => setShowForm(false)} title="Ajukan Reimbursement">
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-700 font-medium">Pastikan semua data dan lampiran nota/kwitansi valid. Pengajuan yang disetujui akan otomatis memotong saldo Kas Pusat.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Judul Pengeluaran</label>
                        <input
                            type="text"
                            required
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl p-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                            placeholder="Contoh: Beli perlengkapan instalasi ISP..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Tanggal Pengeluaran</label>
                        <input
                            type="date"
                            required
                            value={form.expense_date}
                            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl p-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Nominal (Rp)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-400 font-bold">Rp</span>
                            <input
                                type="number"
                                required
                                min="1"
                                value={form.amount || ''}
                                onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                                className="w-full border border-slate-300 rounded-xl p-3 pl-10 text-lg font-mono font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Keterangan Tambahan <span className="text-slate-400 font-normal">(Opsional)</span></label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl p-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all min-h-[100px]"
                            placeholder="Detail pembelian atau alasan klaim..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Unggah Bukti Transaksi <span className="text-rose-500">*</span></label>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-slate-50 hover:border-rose-300 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <input
                                type="file"
                                multiple
                                required
                                ref={fileInputRef}
                                onChange={(e) => {
                                    if (e.target.files) {
                                        setFiles(Array.from(e.target.files));
                                    }
                                }}
                                className="hidden"
                            />
                            <Paperclip className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm font-bold text-slate-700">Klik untuk memilih file</p>
                            <p className="text-xs text-slate-500 mt-1">Dukung format gambar atau PDF</p>
                        </div>
                        {files.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {files.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg text-sm font-medium text-slate-700">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="truncate">{f.name}</span>
                                        <span className="text-xs text-slate-400 ml-auto">{(f.size / 1024).toFixed(1)} KB</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Batalkan</button>
                        <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-md hover:shadow-lg rounded-xl flex items-center gap-2 transition-all">
                            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : 'Ajukan Reimbursement'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Tolak Reimbursement */}
            <Modal open={showRejectForm} onClose={() => setShowRejectForm(false)} title="Tolak Pengajuan">
                <form onSubmit={handleReject} className="p-6 space-y-5">
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-700 font-medium">Pengajuan yang ditolak tidak dapat diubah lagi. Pastikan Anda menyertakan alasan yang jelas kepada pengaju.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Alasan Penolakan <span className="text-rose-500">*</span></label>
                        <textarea
                            required
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl p-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all min-h-[120px]"
                            placeholder="Misal: Bukti struk tidak jelas atau pengeluaran di luar kebijakan..."
                        />
                    </div>
                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={() => setShowRejectForm(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
                        <button type="submit" disabled={isRejecting} className="px-5 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md hover:shadow-lg rounded-xl flex items-center gap-2 transition-all">
                            {isRejecting ? <><Loader2 size={16} className="animate-spin" /> Menolak...</> : 'Tolak Pengajuan'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
