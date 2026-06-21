"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, TrendingUp } from 'lucide-react';

interface KabupatenFinancial {
    kabupatenId: string;
    picName: string;
    kabupatenName: string;
    totalTitik: number;
    titikBerharga: number;
    modalMrc: number;
    modalCst: number;
    hjMrc: number;
    hjCst: number;
    marginMrc: number;
    marginCst: number;
    biaya1Tahun: number;
    pendapatan1Tahun: number;
    profit1Tahun: number;
    marginPct: number;
}

const formatIDR = (num: number) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);

export default function FinancialSummaryPanel() {
    const [rows, setRows] = useState<KabupatenFinancial[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSummary = async () => {
        setIsLoading(true);
        try {
            const { data: kabupatens, error: kabErr } = await supabase
                .from('kabupatens')
                .select('id, name, pic_name')
                .order('name');
            if (kabErr) throw kabErr;

            const { data: titikData, error: titikErr } = await supabase
                .from('titik_lokasi')
                .select('id, kabupaten_id, titik_harga ( modal_mrc, modal_cst, harga_jual_mrc, harga_jual_cst )');
            if (titikErr) throw titikErr;

            const result: KabupatenFinancial[] = (kabupatens || []).map((kab) => {
                const titikKab = (titikData || []).filter((t: any) => t.kabupaten_id === kab.id);

                let modalMrc = 0, modalCst = 0, hjMrc = 0, hjCst = 0, titikBerharga = 0;

                titikKab.forEach((t: any) => {
                    const harga = Array.isArray(t.titik_harga) ? t.titik_harga[0] : t.titik_harga;
                    if (harga) {
                        modalMrc += Number(harga.modal_mrc) || 0;
                        modalCst += Number(harga.modal_cst) || 0;
                        hjMrc += Number(harga.harga_jual_mrc) || 0;
                        hjCst += Number(harga.harga_jual_cst) || 0;
                        if (harga.modal_mrc || harga.harga_jual_mrc) titikBerharga += 1;
                    }
                });

                const marginMrc = hjMrc - modalMrc;
                const marginCst = hjCst - modalCst;
                const biaya1Tahun = modalMrc * 12 + modalCst;
                const pendapatan1Tahun = hjMrc * 12 + hjCst;
                const profit1Tahun = pendapatan1Tahun - biaya1Tahun;
                const marginPct = pendapatan1Tahun > 0 ? (profit1Tahun / pendapatan1Tahun) * 100 : 0;

                return {
                    kabupatenId: kab.id,
                    picName: kab.pic_name || '-',
                    kabupatenName: kab.name,
                    totalTitik: titikKab.length,
                    titikBerharga,
                    modalMrc, modalCst, hjMrc, hjCst,
                    marginMrc, marginCst,
                    biaya1Tahun, pendapatan1Tahun, profit1Tahun, marginPct,
                };
            });

            setRows(result);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSummary();

        // Dengarkan perubahan realtime di titik_harga dan titik_lokasi,
        // supaya Grand Total otomatis update tanpa perlu refresh halaman --
        // baik dari tab ini sendiri maupun dari device/kolega lain.
        const channel = supabase
            .channel('financial-summary-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'titik_harga' }, () => {
                loadSummary();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'titik_lokasi' }, () => {
                loadSummary();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const grandTotal = rows.reduce((acc, r) => ({
        modalMrc: acc.modalMrc + r.modalMrc,
        modalCst: acc.modalCst + r.modalCst,
        hjMrc: acc.hjMrc + r.hjMrc,
        hjCst: acc.hjCst + r.hjCst,
        marginMrc: acc.marginMrc + r.marginMrc,
        marginCst: acc.marginCst + r.marginCst,
        biaya1Tahun: acc.biaya1Tahun + r.biaya1Tahun,
        pendapatan1Tahun: acc.pendapatan1Tahun + r.pendapatan1Tahun,
        profit1Tahun: acc.profit1Tahun + r.profit1Tahun,
        titikBerharga: acc.titikBerharga + r.titikBerharga,
    }), { modalMrc: 0, modalCst: 0, hjMrc: 0, hjCst: 0, marginMrc: 0, marginCst: 0, biaya1Tahun: 0, pendapatan1Tahun: 0, profit1Tahun: 0, titikBerharga: 0 });

    const grandMarginPct = grandTotal.pendapatan1Tahun > 0 ? (grandTotal.profit1Tahun / grandTotal.pendapatan1Tahun) * 100 : 0;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                    <TrendingUp size={16} className="text-indigo-600" /> Summary Keuangan — Proyek 1 Tahun
                </h3>
                <span className="text-[11px] text-slate-400">MRC × 12 bulan + CST sekali bayar</span>
            </div>

            {isLoading ? (
                <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="text-left px-3 py-2.5">PIC</th>
                                <th className="text-left px-3 py-2.5">Kabupaten</th>
                                <th className="text-right px-3 py-2.5">Modal MRC/bln</th>
                                <th className="text-right px-3 py-2.5">Modal CST</th>
                                <th className="text-right px-3 py-2.5">HJ MRC/bln</th>
                                <th className="text-right px-3 py-2.5">HJ CST</th>
                                <th className="text-right px-3 py-2.5">Biaya 1 Thn</th>
                                <th className="text-right px-3 py-2.5">Pendapatan 1 Thn</th>
                                <th className="text-right px-3 py-2.5 font-bold">Profit 1 Thn</th>
                                <th className="text-right px-3 py-2.5">Margin %</th>
                                <th className="text-right px-3 py-2.5">Titik Berharga</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((r) => (
                                <tr key={r.kabupatenId} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2.5 text-slate-500">{r.picName}</td>
                                    <td className="px-3 py-2.5 font-medium text-slate-800">{r.kabupatenName}</td>
                                    <td className="px-3 py-2.5 text-right font-mono">{formatIDR(r.modalMrc)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono">{formatIDR(r.modalCst)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono">{formatIDR(r.hjMrc)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono">{formatIDR(r.hjCst)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono">{formatIDR(r.biaya1Tahun)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono">{formatIDR(r.pendapatan1Tahun)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">{formatIDR(r.profit1Tahun)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono">{r.marginPct.toFixed(1)}%</td>
                                    <td className="px-3 py-2.5 text-right">{r.titikBerharga}/{r.totalTitik}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                            <tr>
                                <td className="px-3 py-3" colSpan={2}>GRAND TOTAL</td>
                                <td className="px-3 py-3 text-right font-mono">{formatIDR(grandTotal.modalMrc)}</td>
                                <td className="px-3 py-3 text-right font-mono">{formatIDR(grandTotal.modalCst)}</td>
                                <td className="px-3 py-3 text-right font-mono">{formatIDR(grandTotal.hjMrc)}</td>
                                <td className="px-3 py-3 text-right font-mono">{formatIDR(grandTotal.hjCst)}</td>
                                <td className="px-3 py-3 text-right font-mono">{formatIDR(grandTotal.biaya1Tahun)}</td>
                                <td className="px-3 py-3 text-right font-mono">{formatIDR(grandTotal.pendapatan1Tahun)}</td>
                                <td className="px-3 py-3 text-right font-mono text-emerald-700">{formatIDR(grandTotal.profit1Tahun)}</td>
                                <td className="px-3 py-3 text-right font-mono">{grandMarginPct.toFixed(1)}%</td>
                                <td className="px-3 py-3 text-right">{grandTotal.titikBerharga}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}