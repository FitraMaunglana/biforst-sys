// ============================================================
// biforst-sys — Storage Service
// Data access layer untuk Supabase Storage operations.
// ============================================================

import { supabase } from '@/src/lib/supabaseClient';

/**
 * Upload file lampiran ke Supabase Storage bucket 'transaction-attachments'.
 * Mengembalikan path file yang bisa disimpan ke database.
 */
export async function uploadAttachment(
  file: File,
  transactionId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${transactionId}.${fileExt}`;

  const { error } = await supabase.storage
    .from('transaction-attachments')
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  // Update transaction record dengan path lampiran
  await supabase
    .from('transactions')
    .update({ attachment_url: filePath })
    .eq('id', transactionId);

  return filePath;
}

/**
 * Buat signed URL untuk melihat lampiran (berlaku 60 detik).
 */
export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('transaction-attachments')
    .createSignedUrl(path, 60);

  if (error || !data) {
    throw new Error('Gagal membuka lampiran: ' + (error?.message || 'tidak ditemukan.'));
  }

  return data.signedUrl;
}
