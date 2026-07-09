// ============================================================
// biforst-sys — Tax (PPN) Service
// Data access layer untuk modul pajak.
// ============================================================

import { supabase } from '@/src/lib/supabaseClient';
import type { VendorBill, TitikOption, MonthlySummary } from '@/src/types';

export async function fetchVendorBills(): Promise<VendorBill[]> {
  const { data, error } = await supabase
    .from('vendor_bills')
    .select('*, titik_lokasi ( dukcapil_name )')
    .order('bill_date', { ascending: false });

  if (error) throw error;
  return (data as unknown as VendorBill[]) || [];
}

export async function fetchTitikOptions(): Promise<TitikOption[]> {
  const { data, error } = await supabase
    .from('titik_lokasi')
    .select('id, dukcapil_name, isp_name')
    .order('dukcapil_name');

  if (error) throw error;
  return (data as TitikOption[]) || [];
}

export async function fetchMonthlySummary(month: number, year: number): Promise<MonthlySummary[]> {
  const { data, error } = await supabase.rpc('get_ppn_summary', {
    p_month: month,
    p_year: year,
  });

  if (error) throw error;

  if (!data) return [];
  return [{
    bulan: month,
    ppn_keluaran: data.ppn_keluaran,
    ppn_masukan: data.ppn_masukan,
    selisih: data.selisih,
  }];
}

export async function fetchYearlySummary(year: number): Promise<MonthlySummary[]> {
  const { data, error } = await supabase.rpc('get_ppn_summary_yearly', {
    p_year: year,
  });

  if (error) throw error;
  return (data as MonthlySummary[]) || [];
}

export async function insertVendorBill(bill: {
  titik_id: string | null;
  vendor_name: string;
  bill_date: string;
  billing_type: 'CST' | 'MRC';
  amount_dpp: number;
  is_pkp: boolean;
  notes: string | null;
}): Promise<void> {
  const { error } = await supabase.from('vendor_bills').insert(bill);
  if (error) throw error;
}

export async function payVendorBill(billId: string): Promise<{ reference_code: string }> {
  const { data, error } = await supabase.rpc('pay_vendor_bill', { p_bill_id: billId });
  if (error) throw error;
  return data as { reference_code: string };
}
