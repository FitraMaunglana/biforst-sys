// ============================================================
// biforst-sys — BAST Service
// Data access layer untuk modul Berita Acara Serah Terima.
// ============================================================

import { supabase } from '@/src/lib/supabaseClient';
import type { Kabupaten } from '@/src/types';

export async function fetchKabupatens(): Promise<Kabupaten[]> {
  const { data, error } = await supabase
    .from('kabupatens')
    .select('id, name, pic_name')
    .order('name');

  if (error) throw error;
  return (data as Kabupaten[]) || [];
}

export async function fetchTitikForBast(kabupatenId: string) {
  const { data, error } = await supabase
    .from('titik_lokasi')
    .select('dukcapil_name, status, isp_name, coordinates, address')
    .eq('kabupaten_id', kabupatenId)
    .eq('status', 'Sudah Aman');

  if (error) throw error;
  return data || [];
}

export async function generateBastNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_document_number', {
    p_doc_type: 'BAST',
    p_prefix: 'BAST/BFR',
  });

  if (error || !data) {
    throw new Error('Gagal membuat nomor BAST: ' + (error?.message || 'tidak ada respons dari server.'));
  }

  return data as string;
}
