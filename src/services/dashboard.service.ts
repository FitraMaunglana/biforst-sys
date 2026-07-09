// ============================================================
// biforst-sys — Dashboard Service
// Data access layer untuk halaman dashboard (proyek + kas).
// ============================================================

import { supabase } from '@/src/lib/supabaseClient';
import type {
  TitikLokasi,
  FormattedTransaction,
  KasBalance,
} from '@/src/types';

/**
 * Fetch semua titik lokasi beserta data kabupaten dan harga.
 */
export async function fetchTitikLokasi(): Promise<TitikLokasi[]> {
  const { data, error } = await supabase
    .from('titik_lokasi')
    .select(`
      id, status, dukcapil_name, address, coordinates, isp_name, notes, kabupaten_id,
      kabupatens ( name, pic_name ),
      titik_harga ( modal_mrc, modal_cst, harga_jual_mrc, harga_jual_cst )
    `);

  if (error) throw error;
  return (data as unknown as TitikLokasi[]) || [];
}

/**
 * Fetch transaksi kas beserta journal entries, lalu format
 * menjadi FormattedTransaction dengan type (Masuk/Keluar) dan amount.
 * Juga menghitung KasBalance.
 */
export async function fetchKasData(): Promise<{
  transactions: FormattedTransaction[];
  balance: KasBalance;
}> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id, date, description, reference_code, created_at, attachment_url,
      journal_entries ( account_id, debit, credit )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  let totalMasuk = 0;
  let totalKeluar = 0;

  const transactions: FormattedTransaction[] = (data || []).map((tx: Record<string, unknown>) => {
    const entries = tx.journal_entries as Array<{ account_id: string; debit: number; credit: number }>;
    const kasEntry = entries?.find((je) => je.account_id === 'acc-kas-101');
    let type: FormattedTransaction['type'] = 'Unknown';
    let amount = 0;

    if (kasEntry) {
      if (kasEntry.debit > 0) {
        type = 'Masuk';
        amount = kasEntry.debit;
        totalMasuk += amount;
      } else if (kasEntry.credit > 0) {
        type = 'Keluar';
        amount = kasEntry.credit;
        totalKeluar += amount;
      }
    }

    return {
      id: tx.id as string,
      date: tx.date as string,
      description: tx.description as string,
      reference_code: tx.reference_code as string,
      created_at: tx.created_at as string,
      attachment_url: tx.attachment_url as string | null,
      type,
      amount,
    };
  });

  return {
    transactions,
    balance: {
      masuk: totalMasuk,
      keluar: totalKeluar,
      saldo: totalMasuk - totalKeluar,
    },
  };
}

/**
 * Update status sebuah titik lokasi.
 */
export async function updateTitikStatus(titikId: string, newStatus: string): Promise<void> {
  const { error } = await supabase
    .from('titik_lokasi')
    .update({ status: newStatus })
    .eq('id', titikId);

  if (error) throw error;
}

/**
 * Edit transaksi via RPC (safe edit, triggers audit log).
 */
export async function editTransaction(
  transactionId: string,
  newDate: string,
  newDescription: string,
  newAmount: number
): Promise<void> {
  const { error } = await supabase.rpc('edit_transaction_safe', {
    p_transaction_id: transactionId,
    p_new_date: newDate,
    p_new_description: newDescription,
    p_new_amount: newAmount,
  });

  if (error) throw error;
}
