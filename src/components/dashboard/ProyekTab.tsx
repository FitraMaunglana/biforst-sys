"use client";
import React, { useMemo } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { PipelineDonutChart, KabupatenProgressChart } from '@/src/components/DashboardCharts';
import ExecutionChecklistModal from '@/src/components/ExecutionChecklistModal';
import StatCard from '@/src/components/ui/StatCard';
import { PIPELINE_STATUSES, PIPELINE_COLORS } from '@/src/utils/constants';
import { formatIDR } from '@/src/utils/format';
import type { TitikLokasi, KabupatenAgregat } from '@/src/types';
import { MapPin, TrendingUp, CheckCircle2, Layers, BarChart3, Map, ListTodo, ShieldAlert } from 'lucide-react';

interface ProyekTabProps {
  titikList: TitikLokasi[];
  isUpdatingStatusId: string | null;
  onStatusChange: (titikId: string, newStatus: string) => void;
}

export default function ProyekTab({ titikList, isUpdatingStatusId, onStatusChange }: ProyekTabProps) {
  const { role } = useAuth();
  const [selectedKabupaten, setSelectedKabupaten] = React.useState<string | null>(null);
  const [checklistTitik, setChecklistTitik] = React.useState<{ id: string; label: string } | null>(null);

  const totalTitik = titikList.length;
  const statusCounts = useMemo(() => titikList.reduce((acc: Record<string, number>, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {}), [titikList]);

  const totalProyeksiProfit1Tahun = useMemo(() => {
    let total = 0;
    titikList.forEach(item => {
      if (item.titik_harga) {
        const harga = Array.isArray(item.titik_harga) ? item.titik_harga[0] : item.titik_harga;
        const pendapatan = (Number(harga?.harga_jual_mrc) * 12) + Number(harga?.harga_jual_cst);
        const modal = (Number(harga?.modal_mrc) * 12) + Number(harga?.modal_cst);
        total += (pendapatan - modal);
      }
    });
    return total;
  }, [titikList]);

  const kabupatenAgregat = useMemo(() => titikList.reduce((acc: Record<string, KabupatenAgregat>, item) => {
    const kabData = item.kabupatens;
    const kabName = Array.isArray(kabData) ? kabData[0]?.name : kabData?.name || 'Unknown';
    const picName = Array.isArray(kabData) ? kabData[0]?.pic_name : kabData?.pic_name || 'Unassigned';
    if (!acc[kabName]) acc[kabName] = { name: kabName, pic: picName, total: 0, aman: 0 };
    acc[kabName].total += 1;
    if (item.status === 'Sudah Aman' || item.status === 'Kontrak') acc[kabName].aman += 1;
    return acc;
  }, {}), [titikList]);

  React.useEffect(() => {
    if (titikList.length > 0 && !selectedKabupaten) {
      const kabData = titikList[0].kabupatens;
      const firstKab = Array.isArray(kabData) ? kabData[0]?.name : kabData?.name;
      if (firstKab) setSelectedKabupaten(firstKab);
    }
  }, [titikList, selectedKabupaten]);

  const filteredTitik = useMemo(() => titikList.filter(t => {
    const kabData = t.kabupatens;
    const name = Array.isArray(kabData) ? kabData[0]?.name : kabData?.name;
    return name === selectedKabupaten;
  }), [titikList, selectedKabupaten]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard icon={<MapPin className="w-5 h-5" />} label="Total Ekspansi Titik" value={<>{totalTitik} <span className="text-xs text-slate-400 font-normal">Lokasi</span></>} accent="indigo" />
        {role === 'admin' ? (
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Proyeksi Profit 1 Thn" value={formatIDR(totalProyeksiProfit1Tahun)} accent="emerald" valueColor="text-emerald-600" />
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-400">
            <div className="text-center space-y-1"><ShieldAlert className="w-6 h-6 mx-auto opacity-50" /><p className="text-[10px] font-mono">Dibatasi Manajemen</p></div>
          </div>
        )}
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Tahap Dealing" value={<>{statusCounts['Dealing'] || 0} <span className="text-xs text-slate-400 font-normal">Titik</span></>} accent="amber" valueColor="text-amber-600" />
        <StatCard icon={<Layers className="w-5 h-5" />} label="Belum Dimulai" value={<>{statusCounts['Belum Mulai'] || 0} <span className="text-xs text-slate-400 font-normal">Titik</span></>} accent="slate" valueColor="text-slate-700" />
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-600" /> Ringkasan Pipeline Nasional</h3>
        <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden">
          {PIPELINE_STATUSES.map((st, idx) => {
            const pct = totalTitik > 0 ? ((statusCounts[st] || 0) / totalTitik) * 100 : 0;
            return pct > 0 ? <div key={idx} className={`${PIPELINE_COLORS[idx]} h-full transition-all duration-300`} style={{ width: `${pct}%` }} /> : null;
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-indigo-600" /> Distribusi Tahapan Pipeline</h3>
          <PipelineDonutChart statusCounts={statusCounts} pipelineStatuses={[...PIPELINE_STATUSES]} />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2"><Map className="w-4 h-4 text-indigo-600" /> Progres per Kabupaten</h3>
          <KabupatenProgressChart kabupatenAgregat={kabupatenAgregat} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2"><Map className="w-4 h-4 text-indigo-600" /> Pilih Wilayah Kerja</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {Object.values(kabupatenAgregat).map((kab, i) => {
              const isSelected = selectedKabupaten === kab.name;
              return (
                <button key={i} onClick={() => setSelectedKabupaten(kab.name)} className={`w-full text-left p-3.5 rounded-xl border transition flex justify-between ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <div><h4 className="font-bold text-sm truncate">{kab.name}</h4><p className={`text-[11px] font-mono flex items-center gap-1 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>PIC: {kab.pic}</p></div>
                  <div className="text-right"><span className="text-xs block font-bold font-mono">{kab.total} Titik</span></div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Eksplorasi Titik: {selectedKabupaten}</h3>
          <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredTitik.map((titik) => (
              <div key={titik.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex justify-between items-start gap-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-sm">Kec. {titik.dukcapil_name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{titik.address}</p>
                  <button onClick={() => setChecklistTitik({ id: titik.id, label: titik.dukcapil_name })} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"><ListTodo size={12} /> Checklist Eksekusi</button>
                </div>
                <div className="w-[35%] text-right shrink-0">
                  <select value={titik.status} disabled={isUpdatingStatusId === titik.id} onChange={(e) => onStatusChange(titik.id, e.target.value)} className="text-xs font-bold px-2 py-1.5 rounded-lg border bg-white focus:ring-2 w-full text-center cursor-pointer">
                    {PIPELINE_STATUSES.map((statusOpt, i) => (<option key={i} value={statusOpt}>{statusOpt}</option>))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {checklistTitik && <ExecutionChecklistModal titikId={checklistTitik.id} titikLabel={checklistTitik.label} onClose={() => setChecklistTitik(null)} />}
    </>
  );
}
