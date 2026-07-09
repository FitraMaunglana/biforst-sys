"use client";
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../src/lib/supabaseClient';
import AppLayout from '../src/components/layout/AppLayout';
import ProyekTab from '../src/components/dashboard/ProyekTab';
import KasTab from '../src/components/dashboard/KasTab';
import TabToggle from '../src/components/ui/TabToggle';
import { useAuth } from '../src/hooks/useAuth';
import { fetchTitikLokasi } from '../src/services/dashboard.service';
import { fetchKasData } from '../src/services/dashboard.service';
import { updateTitikStatus } from '../src/services/dashboard.service';
import type { TitikLokasi, FormattedTransaction, KasBalance } from '../src/types';
import { Briefcase, DollarSign, RefreshCcw } from 'lucide-react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const { role, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'proyek' | 'kas'>('proyek');
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);
  const [titikList, setTitikList] = useState<TitikLokasi[]>([]);
  const [transactions, setTransactions] = useState<FormattedTransaction[]>([]);
  const [kasBalance, setKasBalance] = useState<KasBalance>({ masuk: 0, keluar: 0, saldo: 0 });

  // Sinkronkan tab aktif dengan query param ?tab=kas di URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'kas' || tabParam === 'proyek') setActiveTab(tabParam);
  }, [searchParams]);

  // Pastikan staf selalu di tab proyek
  useEffect(() => {
    if (role === 'staff') setActiveTab('proyek');
  }, [role]);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const titikData = await fetchTitikLokasi();
      setTitikList(titikData);
      const kasResult = await fetchKasData();
      setTransactions(kasResult.transactions);
      setKasBalance(kasResult.balance);
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'titik_lokasi' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'titik_harga' }, () => fetchAllData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAllData]);

  const handleStatusChange = async (titikId: string, newStatus: string) => {
    setIsUpdatingStatusId(titikId);
    try {
      await updateTitikStatus(titikId, newStatus);
      setTitikList(prev => prev.map(item => item.id === titikId ? { ...item, status: newStatus } : item));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui status.";
      alert(message);
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  const refreshKas = useCallback(async () => {
    try {
      const kasResult = await fetchKasData();
      setTransactions(kasResult.transactions);
      setKasBalance(kasResult.balance);
    } catch (err) {
      console.error("Gagal memuat mutasi kas:", err);
    }
  }, []);

  const tabOptions = [
    { key: 'proyek', label: 'Komando Proyek', icon: <Briefcase className="w-4 h-4" /> },
    { key: 'kas', label: 'Jurnal Kas Keuangan', icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <AppLayout>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold tracking-tight text-lg text-slate-900">
            {activeTab === 'proyek' ? 'Komando Proyek' : 'Jurnal Kas Keuangan'}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            {role === 'admin' ? (
              <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded border border-indigo-200 font-mono font-medium">Manager Akses</span>
            ) : (
              <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded border border-emerald-200 font-mono font-medium">Staf Lapangan</span>
            )}
            <span className="text-slate-400 text-xs font-mono">{session?.email}</span>
          </div>
        </div>
        <button onClick={fetchAllData} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition">
          <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <main className="px-6 py-6 space-y-6">
        {role === 'admin' && (
          <TabToggle options={tabOptions} activeKey={activeTab} onChange={(key) => setActiveTab(key as 'proyek' | 'kas')} />
        )}

        {activeTab === 'proyek' ? (
          <ProyekTab titikList={titikList} isUpdatingStatusId={isUpdatingStatusId} onStatusChange={handleStatusChange} />
        ) : (
          <KasTab transactions={transactions} kasBalance={kasBalance} onRefresh={refreshKas} isLoading={isLoading} />
        )}
      </main>
    </AppLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 animate-pulse text-indigo-600" />
          <p className="font-mono text-sm font-medium">Membuka Enkripsi Konsol ERP...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}