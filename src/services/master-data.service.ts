// ============================================================
// biforst-sys — Master Data Service
// Data access layer untuk manajemen master data.
// ============================================================

import { supabase } from '@/src/lib/supabaseClient';
import type { Kabupaten, TitikLokasiWithHarga } from '@/src/types';

export async function fetchKabupatens(): Promise<Kabupaten[]> {
  const { data, error } = await supabase
    .from('kabupatens')
    .select('id, name, pic_name')
    .order('name');

  if (error) throw error;
  return (data as Kabupaten[]) || [];
}

export async function fetchTitikLokasi(kabupatenId: string): Promise<TitikLokasiWithHarga[]> {
  const { data, error } = await supabase
    .from('titik_lokasi')
    .select(`
      id, dukcapil_name, address, isp_name, status,
      titik_harga ( id, modal_cst, harga_jual_cst, modal_mrc, harga_jual_mrc )
    `)
    .eq('kabupaten_id', kabupatenId)
    .order('dukcapil_name');

  if (error) throw error;
  return (data as unknown as TitikLokasiWithHarga[]) || [];
}

export async function updateTitikData(
  titikId: string,
  lokasiData: { dukcapil_name: string; isp_name: string },
  hargaId: string | null,
  hargaData: {
    modal_cst: number;
    harga_jual_cst: number;
    modal_mrc: number;
    harga_jual_mrc: number;
  }
): Promise<void> {
  // 1. Update nama lokasi & ISP di tabel titik_lokasi
  const { error: errLokasi } = await supabase
    .from('titik_lokasi')
    .update({ dukcapil_name: lokasiData.dukcapil_name.trim(), isp_name: lokasiData.isp_name })
    .eq('id', titikId);

  if (errLokasi) {
    if (errLokasi.code === '23505') {
      throw new Error(`Nama "${lokasiData.dukcapil_name}" sudah dipakai titik lain di kabupaten ini.`);
    }
    throw errLokasi;
  }

  // 2. Update Harga di tabel titik_harga
  if (hargaId) {
    const { error: errHarga } = await supabase
      .from('titik_harga')
      .update(hargaData)
      .eq('id', hargaId);

    if (errHarga) throw errHarga;
  }
}
