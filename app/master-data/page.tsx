"use client";
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../src/components/layout/AppLayout';
import PageHeader from '../../src/components/ui/PageHeader';
import TabToggle from '../../src/components/ui/TabToggle';
import FinancialSummaryPanel from '../../src/components/FinancialSummaryPanel';
import CurrencyInput from '../../src/components/CurrencyInput';
import AccountsManagerPanel from '../../src/components/AccountsManagerPanel';
import KabupatenProjectManagerPanel from '../../src/components/KabupatenProjectManagerPanel';
import { fetchKabupatens, fetchTitikLokasi, updateTitikData } from '../../src/services/master-data.service';
import { formatIDR } from '../../src/utils/format';
import type { Kabupaten, TitikLokasiWithHarga } from '../../src/types';
import { Database, Edit2, X, Search, ShieldAlert, CheckCircle } from 'lucide-react';

export default function MasterDataPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeMasterTab, setActiveMasterTab] = useState<'harga' | 'akun' | 'proyek'>('harga');

    const [kabupatens, setKabupatens] = useState<Kabupaten[]>([]);
    const [selectedKab, setSelectedKab] = useState('');
    const [titikList, setTitikList] = useState<TitikLokasiWithHarga[]>([]);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        dukcapil_name: '', isp_name: '', harga_id: '',
        modal_cst: 0, harga_jual_cst: 0, modal_mrc: 0, harga_jual_mrc: 0
    });

    useEffect(() => {
        const loadKabupaten = async () => {
            try {
                const data = await fetchKabupatens();
                setKabupatens(data);
                if (data.length > 0) setSelectedKab(data[0].id);
            } catch (err) {
                console.error(err);
            }
        };
        loadKabupaten();
    }, []);

    const loadTitikLokasi = useCallback(async () => {
        if (!selectedKab) return;
        setIsLoading(true);
        try {
            const data = await fetchTitikLokasi(selectedKab);
            setTitikList(data);
        } catch (error) {
            console.error(error);
            alert('Gagal menarik master data.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedKab]);

    useEffect(() => {
        loadTitikLokasi();
    }, [loadTitikLokasi]);

    const handleEditClick = (titik: TitikLokasiWithHarga) => {
        const harga = Array.isArray(titik.titik_harga) ? titik.titik_harga[0] : titik.titik_harga;
        setEditingId(titik.id);
        setEditForm({
            dukcapil_name: titik.dukcapil_name || '',
            isp_name: titik.isp_name || '',
            harga_id: harga?.id || '',
            modal_cst: harga?.modal_cst || 0,
            harga_jual_cst: harga?.harga_jual_cst || 0,
            modal_mrc: harga?.modal_mrc || 0,
            harga_jual_mrc: harga?.harga_jual_mrc || 0
        });
    };

    const handleSaveEdit = async () => {
        if (!editForm.dukcapil_name.trim()) {
            alert('Nama lokasi (kecamatan) tidak boleh kosong.');
            return;
        }
        setIsSaving(true);
        try {
            await updateTitikData(
                editingId!,
                { dukcapil_name: editForm.dukcapil_name, isp_name: editForm.isp_name },
                editForm.harga_id,
                {
                    modal_cst: editForm.modal_cst,
                    harga_jual_cst: editForm.harga_jual_cst,
                    modal_mrc: editForm.modal_mrc,
                    harga_jual_mrc: editForm.harga_jual_mrc
                }
            );
            alert('Master Data berhasil diperbarui! Perubahan langsung berlaku di seluruh sistem.');
            setEditingId(null);
            loadTitikLokasi();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
            alert('Gagal menyimpan data: ' + message);
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { key: 'harga', label: 'Harga & ISP' },
        { key: 'akun', label: 'Kategori Akun' },
        { key: 'proyek', label: 'Proyek & Kabupaten' }
    ];

    return (
        <AppLayout requireAdmin>
            <div className="p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <PageHeader
                        icon={<Database className="w-6 h-6 text-indigo-400" />}
                        title="Manajemen Master Data"
                        subtitle="Fase 4: Kendali Penuh Struktur Harga & Vendor ISP (Akses Khusus Direksi)"
                    />

                    <FinancialSummaryPanel />

                    <div className="max-w-md">
                        <TabToggle options={tabs} activeKey={activeMasterTab} onChange={(k) => setActiveMasterTab(k as any)} />
                    </div>

                    {activeMasterTab === 'akun' && <AccountsManagerPanel />}
                    {activeMasterTab === 'proyek' && <KabupatenProjectManagerPanel />}

                    {activeMasterTab === 'harga' && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <Search className="w-5 h-5 text-slate-400" />
                                    <select
                                        value={selectedKab}
                                        onChange={(e) => setSelectedKab(e.target.value)}
                                        className="text-sm font-bold bg-slate-50 border border-slate-200 text-slate-700 py-2 px-4 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {kabupatens.map(k => (<option key={k.id} value={k.id}>{k.name}</option>))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                                    <ShieldAlert className="w-4 h-4" />
                                    <span>Perubahan di sini akan memengaruhi proyeksi profit dan pembuatan invoice.</span>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" /></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-900 text-white font-bold">
                                            <tr>
                                                <th className="px-4 py-3 rounded-tl-lg">Lokasi (Kecamatan)</th>
                                                <th className="px-4 py-3">Vendor ISP</th>
                                                <th className="px-4 py-3 bg-slate-800">Modal CST</th>
                                                <th className="px-4 py-3 bg-slate-800">Jual CST</th>
                                                <th className="px-4 py-3 bg-slate-700">Modal MRC</th>
                                                <th className="px-4 py-3 bg-slate-700">Jual MRC</th>
                                                <th className="px-4 py-3 text-center rounded-tr-lg">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {titikList.map((titik) => {
                                                const harga = Array.isArray(titik.titik_harga) ? titik.titik_harga[0] : titik.titik_harga;
                                                const isEditing = editingId === titik.id;

                                                return (
                                                    <tr key={titik.id} className={isEditing ? "bg-indigo-50 ring-2 ring-indigo-300 ring-inset" : "hover:bg-slate-50 transition"}>
                                                        <td className="px-4 py-4">
                                                            {isEditing ? (
                                                                <input type="text" value={editForm.dukcapil_name} onChange={e => setEditForm({ ...editForm, dukcapil_name: e.target.value })} className="w-32 p-1.5 border border-indigo-300 rounded text-xs font-bold" />
                                                            ) : (
                                                                <span className="font-bold text-slate-800">{titik.dukcapil_name}</span>
                                                            )}
                                                            <span className="block text-[10px] text-slate-400 mt-0.5">{titik.status}</span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {isEditing ? (
                                                                <input type="text" value={editForm.isp_name} onChange={e => setEditForm({ ...editForm, isp_name: e.target.value })} className="w-28 p-1.5 border rounded text-xs" />
                                                            ) : (
                                                                <span className="text-slate-600 font-medium">{titik.isp_name || '-'}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 bg-slate-50">
                                                            {isEditing ? (
                                                                <CurrencyInput value={editForm.modal_cst} onChange={(v) => setEditForm({ ...editForm, modal_cst: v })} className="w-28 p-1.5 border rounded text-xs font-mono" />
                                                            ) : (
                                                                <span className="text-slate-500 font-mono">{formatIDR(harga?.modal_cst || 0)}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 bg-slate-50">
                                                            {isEditing ? (
                                                                <div className="space-y-1">
                                                                    <CurrencyInput value={editForm.harga_jual_cst} onChange={(v) => setEditForm({ ...editForm, harga_jual_cst: v })} className="w-28 p-1.5 border border-indigo-300 rounded text-xs font-mono font-bold text-indigo-700" />
                                                                    <p className={`text-[10px] font-bold ${editForm.harga_jual_cst - editForm.modal_cst >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Margin: {formatIDR(editForm.harga_jual_cst - editForm.modal_cst)}</p>
                                                                </div>
                                                            ) : (
                                                                <span className="font-bold text-slate-800 font-mono">{formatIDR(harga?.harga_jual_cst || 0)}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {isEditing ? (
                                                                <CurrencyInput value={editForm.modal_mrc} onChange={(v) => setEditForm({ ...editForm, modal_mrc: v })} className="w-28 p-1.5 border rounded text-xs font-mono" />
                                                            ) : (
                                                                <span className="text-slate-500 font-mono">{formatIDR(harga?.modal_mrc || 0)}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {isEditing ? (
                                                                <div className="space-y-1">
                                                                    <CurrencyInput value={editForm.harga_jual_mrc} onChange={(v) => setEditForm({ ...editForm, harga_jual_mrc: v })} className="w-28 p-1.5 border border-emerald-300 rounded text-xs font-mono font-bold text-emerald-700" />
                                                                    <p className={`text-[10px] font-bold ${editForm.harga_jual_mrc - editForm.modal_mrc >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Margin: {formatIDR(editForm.harga_jual_mrc - editForm.modal_mrc)}/bln</p>
                                                                </div>
                                                            ) : (
                                                                <span className="font-bold text-emerald-600 font-mono">{formatIDR(harga?.harga_jual_mrc || 0)}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            {isEditing ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button onClick={handleSaveEdit} disabled={isSaving} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded transition"><CheckCircle className="w-4 h-4" /></button>
                                                                    <button onClick={() => setEditingId(null)} disabled={isSaving} className="p-1.5 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded transition"><X className="w-4 h-4" /></button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => handleEditClick(titik)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"><Edit2 className="w-4 h-4" /></button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}