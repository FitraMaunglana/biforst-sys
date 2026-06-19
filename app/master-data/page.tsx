"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabaseClient';
import Sidebar from '../../src/components/Sidebar';
import {
    Database, Edit2, Save, X, Search, ShieldAlert, CheckCircle
} from 'lucide-react';

const ADMIN_EMAIL = 'biforsttechnologysolution@gmail.com';

export default function MasterDataPage() {
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [kabupatens, setKabupatens] = useState<any[]>([]);
    const [selectedKab, setSelectedKab] = useState('');
    const [titikList, setTitikList] = useState<any[]>([]);

    // State untuk mode edit
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        isp_name: '',
        harga_id: '',
        modal_cst: 0,
        harga_jual_cst: 0,
        modal_mrc: 0,
        harga_jual_mrc: 0
    });

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else if (session.user.email !== ADMIN_EMAIL) {
                alert('AKSES DITOLAK: Halaman ini hanya untuk Administrator Master Data.');
                router.push('/');
            } else {
                setIsCheckingAuth(false);
                fetchKabupaten();
            }
        };
        checkAuth();
    }, [router]);

    const fetchKabupaten = async () => {
        const { data } = await supabase.from('kabupatens').select('id, name').order('name');
        if (data) {
            setKabupatens(data);
            if (data.length > 0) {
                setSelectedKab(data[0].id);
            }
        }
    };

    useEffect(() => {
        if (selectedKab) fetchTitikLokasi();
    }, [selectedKab]);

    const fetchTitikLokasi = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('titik_lokasi')
                .select(`
                    id, dukcapil_name, address, isp_name, status,
                    titik_harga ( id, modal_cst, harga_jual_cst, modal_mrc, harga_jual_mrc )
                `)
                .eq('kabupaten_id', selectedKab)
                .order('dukcapil_name');

            if (error) throw error;
            setTitikList(data || []);
        } catch (error: any) {
            console.error(error);
            alert('Gagal menarik master data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (titik: any) => {
        const harga = Array.isArray(titik.titik_harga) ? titik.titik_harga[0] : titik.titik_harga;
        setEditingId(titik.id);
        setEditForm({
            isp_name: titik.isp_name || '',
            harga_id: harga?.id || '',
            modal_cst: harga?.modal_cst || 0,
            harga_jual_cst: harga?.harga_jual_cst || 0,
            modal_mrc: harga?.modal_mrc || 0,
            harga_jual_mrc: harga?.harga_jual_mrc || 0
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        try {
            // 1. Update ISP di tabel titik_lokasi
            const { error: errLokasi } = await supabase
                .from('titik_lokasi')
                .update({ isp_name: editForm.isp_name })
                .eq('id', editingId);
            if (errLokasi) throw errLokasi;

            // 2. Update Harga di tabel titik_harga
            if (editForm.harga_id) {
                const { error: errHarga } = await supabase
                    .from('titik_harga')
                    .update({
                        modal_cst: editForm.modal_cst,
                        harga_jual_cst: editForm.harga_jual_cst,
                        modal_mrc: editForm.modal_mrc,
                        harga_jual_mrc: editForm.harga_jual_mrc
                    })
                    .eq('id', editForm.harga_id);
                if (errHarga) throw errHarga;
            }

            alert('Master Data berhasil diperbarui! Perubahan langsung berlaku di seluruh sistem.');
            setEditingId(null);
            fetchTitikLokasi(); // Refresh data
        } catch (error: any) {
            alert('Gagal menyimpan data: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    if (isCheckingAuth) return null;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
            <Sidebar />
            <div className="flex-1 min-w-0 p-6">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* HEADER */}
                    <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                    <Database className="w-6 h-6 text-indigo-400" /> Manajemen Master Data
                                </h1>
                                <p className="text-slate-400 text-sm mt-1">Fase 4: Kendali Penuh Struktur Harga & Vendor ISP (Akses Khusus Direksi)</p>
                            </div>
                        </div>
                    </div>

                    {/* KONTEN */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <Search className="w-5 h-5 text-slate-400" />
                                <select
                                    value={selectedKab}
                                    onChange={(e) => setSelectedKab(e.target.value)}
                                    className="text-sm font-bold bg-slate-50 border border-slate-200 text-slate-700 py-2 px-4 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {kabupatens.map(k => (
                                        <option key={k.id} value={k.id}>{k.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                                <ShieldAlert className="w-4 h-4" />
                                <span>Perubahan di sini akan memengaruhi proyeksi profit dan pembuatan invoice.</span>
                            </div>
                        </div>

                        {isLoading ? (
                            <p className="text-center text-slate-400 py-10 animate-pulse">Menarik data dari brankas Supabase...</p>
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
                                                <tr key={titik.id} className={isEditing ? "bg-indigo-50/50" : "hover:bg-slate-50 transition"}>
                                                    <td className="px-4 py-4">
                                                        <span className="font-bold text-slate-800">{titik.dukcapil_name}</span>
                                                        <span className="block text-[10px] text-slate-400">{titik.status}</span>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        {isEditing ? (
                                                            <input type="text" value={editForm.isp_name} onChange={e => setEditForm({ ...editForm, isp_name: e.target.value })} className="w-28 p-1.5 border rounded text-xs" />
                                                        ) : (
                                                            <span className="text-slate-600 font-medium">{titik.isp_name || '-'}</span>
                                                        )}
                                                    </td>

                                                    {/* KOLOM CST */}
                                                    <td className="px-4 py-4 bg-slate-50">
                                                        {isEditing ? (
                                                            <input type="number" value={editForm.modal_cst} onChange={e => setEditForm({ ...editForm, modal_cst: Number(e.target.value) })} className="w-24 p-1.5 border rounded text-xs font-mono" />
                                                        ) : (
                                                            <span className="text-slate-500 font-mono">{formatIDR(harga?.modal_cst || 0)}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 bg-slate-50">
                                                        {isEditing ? (
                                                            <input type="number" value={editForm.harga_jual_cst} onChange={e => setEditForm({ ...editForm, harga_jual_cst: Number(e.target.value) })} className="w-24 p-1.5 border border-indigo-300 rounded text-xs font-mono font-bold text-indigo-700" />
                                                        ) : (
                                                            <span className="font-bold text-slate-800 font-mono">{formatIDR(harga?.harga_jual_cst || 0)}</span>
                                                        )}
                                                    </td>

                                                    {/* KOLOM MRC */}
                                                    <td className="px-4 py-4">
                                                        {isEditing ? (
                                                            <input type="number" value={editForm.modal_mrc} onChange={e => setEditForm({ ...editForm, modal_mrc: Number(e.target.value) })} className="w-24 p-1.5 border rounded text-xs font-mono" />
                                                        ) : (
                                                            <span className="text-slate-500 font-mono">{formatIDR(harga?.modal_mrc || 0)}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {isEditing ? (
                                                            <input type="number" value={editForm.harga_jual_mrc} onChange={e => setEditForm({ ...editForm, harga_jual_mrc: Number(e.target.value) })} className="w-24 p-1.5 border border-emerald-300 rounded text-xs font-mono font-bold text-emerald-700" />
                                                        ) : (
                                                            <span className="font-bold text-emerald-600 font-mono">{formatIDR(harga?.harga_jual_mrc || 0)}</span>
                                                        )}
                                                    </td>

                                                    {/* AKSI */}
                                                    <td className="px-4 py-4 text-center">
                                                        {isEditing ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button onClick={handleSaveEdit} disabled={isSaving} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded transition">
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={handleCancelEdit} disabled={isSaving} className="p-1.5 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded transition">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => handleEditClick(titik)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
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
                </div>
            </div>
        </div>
    );
}