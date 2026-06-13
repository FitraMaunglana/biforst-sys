"use client";
import React, { useState } from 'react';
import * as xlsx from 'xlsx';
import { supabase } from '../../src/lib/supabaseClient';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface TitikParsed {
    pic: string;
    dukcapil: string;
    alamat: string;
    koordinat: string;
    isp: string;
    modal_mrc: number;
    modal_cst: number;
    hj_mrc: number;
    hj_cst: number;
    status: string;
    catatan: string;
}

export default function ImportPage() {
    const [fileName, setFileName] = useState<string | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [activeSheet, setActiveSheet] = useState<string>('');
    const [workbook, setWorkbook] = useState<xlsx.WorkBook | null>(null);
    const [parsedData, setParsedData] = useState<TitikParsed[]>([]);

    // Status Proses
    const [isImporting, setIsImporting] = useState(false);
    const [importLog, setImportLog] = useState<string[]>([]);

    const extractDataFromSheet = (ws: xlsx.WorkSheet) => {
        const rows: any[] = xlsx.utils.sheet_to_json(ws);

        // Lewati baris pertama (header berantakan), ambil baris indeks 1 ke bawah
        const mappedData: TitikParsed[] = rows.slice(1).map(row => ({
            pic: row['__EMPTY'] || '',
            dukcapil: row['__EMPTY_1'] || '',
            alamat: row['__EMPTY_2'] || '',
            koordinat: row['__EMPTY_3'] || '',
            isp: row['__EMPTY_4'] || '-',
            modal_mrc: Number(row['__EMPTY_5']) || 0,
            modal_cst: Number(row['__EMPTY_6']) || 0,
            hj_mrc: Number(row['__EMPTY_7']) || 0,
            hj_cst: Number(row['__EMPTY_8']) || 0,
            status: row['__EMPTY_11'] || 'Belum Mulai',
            catatan: row['__EMPTY_12'] || '',
        })).filter(t => t.dukcapil !== ''); // Buang baris kosong atau baris persentase bawah

        return mappedData;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setImportLog([]); // Reset log

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = xlsx.read(bstr, { type: 'binary' });

            setWorkbook(wb);
            setSheetNames(wb.SheetNames);

            // Filter sheet yang kemungkinan besar bukan sheet kabupaten (misal 'Ringkasan' atau 'Keuangan')
            const probableKabupatenSheet = wb.SheetNames.find(name => name.toLowerCase().includes('kab')) || wb.SheetNames[0];
            setActiveSheet(probableKabupatenSheet);

            const ws = wb.Sheets[probableKabupatenSheet];
            setParsedData(extractDataFromSheet(ws));
        };
        reader.readAsBinaryString(file);
    };

    const handleSheetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sheetName = e.target.value;
        setActiveSheet(sheetName);
        if (workbook) {
            const ws = workbook.Sheets[sheetName];
            setParsedData(extractDataFromSheet(ws));
            setImportLog([]);
        }
    };

    const addLog = (message: string) => {
        setImportLog(prev => [...prev, message]);
    };

    const processImportToSupabase = async () => {
        setIsImporting(true);
        setImportLog([]);
        addLog(`Memulai proses sinkronisasi untuk sheet: ${activeSheet}...`);

        try {
            // 1. Siapkan Induk Proyek (Hardcode untuk Fase 1 PRD)
            let { data: proj, error: projErr } = await supabase
                .from('projects')
                .select('id')
                .eq('name', 'Ekspansi Jaringan Jateng - Comtelindo')
                .single();

            if (!proj) {
                addLog("Menciptakan entri Proyek baru: Ekspansi Jaringan Jateng...");
                const { data: newProj, error: errP } = await supabase
                    .from('projects')
                    .insert({
                        name: 'Ekspansi Jaringan Jateng - Comtelindo',
                        client: 'PT Comtelindo',
                        period: '2026'
                    })
                    .select().single();
                if (errP) throw errP;
                proj = newProj;
            }

            // 2. Siapkan Entri Kabupaten
            let { data: kab } = await supabase
                .from('kabupatens')
                .select('id')
                .eq('name', activeSheet)
                .eq('project_id', proj.id)
                .single();

            if (!kab) {
                const picName = parsedData.length > 0 ? parsedData[0].pic : 'Tim Lapangan';
                addLog(`Mendaftarkan Kabupaten baru: ${activeSheet} (PIC: ${picName})...`);
                const { data: newKab, error: errK } = await supabase
                    .from('kabupatens')
                    .insert({
                        project_id: proj.id,
                        name: activeSheet,
                        pic_name: picName
                    })
                    .select().single();
                if (errK) throw errK;
                kab = newKab;
            }

            // 3. Loop Injeksi Titik dan Harga
            let successCount = 0;
            addLog(`Mempersiapkan injeksi ${parsedData.length} titik koordinat...`);

            for (const titik of parsedData) {
                // Cek duplikasi berdasar nama dukcapil dan kabupaten
                const { data: existingTitik } = await supabase
                    .from('titik_lokasi')
                    .select('id')
                    .eq('kabupaten_id', kab.id)
                    .eq('dukcapil_name', titik.dukcapil)
                    .single();

                if (existingTitik) {
                    addLog(`[Lewati] Titik ${titik.dukcapil} sudah ada di database.`);
                    continue; // Skip jika sudah ada agar tidak ganda
                }

                // Injeksi Lokasi (Data Lapangan)
                const { data: newTitik, error: errTitik } = await supabase
                    .from('titik_lokasi')
                    .insert({
                        kabupaten_id: kab.id,
                        dukcapil_name: titik.dukcapil,
                        address: titik.alamat,
                        coordinates: titik.koordinat,
                        isp_name: titik.isp,
                        status: titik.status,
                        notes: titik.catatan
                    })
                    .select().single();

                if (errTitik) {
                    addLog(`[Gagal] Lokasi ${titik.dukcapil}: ${errTitik.message}`);
                    continue;
                }

                // Injeksi Harga (Data Rahasia)
                if (newTitik) {
                    const { error: errHarga } = await supabase
                        .from('titik_harga')
                        .insert({
                            titik_id: newTitik.id,
                            modal_mrc: titik.modal_mrc,
                            modal_cst: titik.modal_cst,
                            harga_jual_mrc: titik.hj_mrc,
                            harga_jual_cst: titik.hj_cst
                        });

                    if (errHarga) {
                        addLog(`[Peringatan] Gagal menyimpan harga untuk ${titik.dukcapil}`);
                    } else {
                        successCount++;
                    }
                }
            }

            addLog(`✅ Misi Selesai: ${successCount} titik berhasil masuk brankas Supabase.`);

        } catch (error: any) {
            addLog(`❌ Kesalahan Fatal: ${error.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
            <div className="max-w-5xl mx-auto space-y-6">

                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Migrasi Data Tracker Excel</h1>
                        <p className="text-slate-400 text-sm mt-1">Fase 1: Penarikan Data Operasional dan Keuangan</p>
                    </div>
                    <FileSpreadsheet className="w-10 h-10 text-emerald-400" />
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600"><span className="font-bold">Unggah Tracker Excel PT Comtelindo</span></p>
                        </div>
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                    </label>
                </div>

                {parsedData.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Kolom Kiri: Pratinjau */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                <h3 className="font-bold text-slate-800">Pratinjau Data ({parsedData.length} Titik)</h3>
                                <select
                                    value={activeSheet}
                                    onChange={handleSheetChange}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                                >
                                    {sheetNames.map((name, idx) => (
                                        <option key={idx} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead className="text-slate-500 bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-2 rounded-l-lg">Dukcapil</th>
                                            <th className="px-3 py-2">PIC</th>
                                            <th className="px-3 py-2">Status</th>
                                            <th className="px-3 py-2">H. Jual MRC</th>
                                            <th className="px-3 py-2 rounded-r-lg">ISP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.slice(0, 10).map((t, idx) => (
                                            <tr key={idx} className="border-b border-slate-50">
                                                <td className="px-3 py-2 font-semibold text-slate-800">{t.dukcapil}</td>
                                                <td className="px-3 py-2 text-slate-500">{t.pic}</td>
                                                <td className="px-3 py-2">
                                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">{t.status}</span>
                                                </td>
                                                <td className="px-3 py-2 text-slate-500 text-right">Rp {t.hj_mrc.toLocaleString('id-ID')}</td>
                                                <td className="px-3 py-2 text-slate-500">{t.isp}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 10 && (
                                    <p className="text-center text-xs text-slate-400 mt-3 italic">Menampilkan 10 baris pertama...</p>
                                )}
                            </div>
                        </div>

                        {/* Kolom Kanan: Kontrol Injeksi */}
                        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden flex flex-col">
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span>Tindakan Sistem</span>
                                </div>
                                <p className="text-sm text-slate-300">
                                    Sistem akan membuat/mencari proyek <strong>Ekspansi Jateng</strong>, mendaftarkan kabupaten <strong>{activeSheet}</strong>, lalu menyuntikkan data ke tabel RLS secara terpisah.
                                </p>

                                <button
                                    onClick={processImportToSupabase}
                                    disabled={isImporting || parsedData.length === 0}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition"
                                >
                                    {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    {isImporting ? 'Menyuntikkan Data...' : 'Mulai Injeksi ke Database'}
                                </button>
                            </div>

                            {/* Terminal Log */}
                            <div className="bg-black/50 flex-1 p-4 overflow-y-auto font-mono text-[10px] text-emerald-400 border-t border-slate-800 min-h-[150px]">
                                {importLog.length === 0 ? (
                                    <span className="text-slate-600">Terminal siap...</span>
                                ) : (
                                    importLog.map((log, idx) => (
                                        <div key={idx} className="mb-1">{">"} {log}</div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}