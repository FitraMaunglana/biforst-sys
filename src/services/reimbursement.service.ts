// ============================================================
// biforst-sys — Reimbursement Service
// Data access layer untuk modul reimbursement.
// ============================================================

import { supabase } from '@/src/lib/supabaseClient';
import type { Reimbursement } from '@/src/types';

/**
 * Tarik data reimbursement. Jika role adalah admin, tarik semua.
 * Jika role bukan admin, tarik hanya milik user yang sedang login.
 */
export async function fetchReimbursements(role: string, email: string): Promise<Reimbursement[]> {
  let query = supabase
    .from('reimbursements')
    .select(`
      *,
      reimbursement_attachments (*)
    `)
    .order('created_at', { ascending: false });

  if (role !== 'admin') {
    query = query.eq('user_email', email);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Reimbursement[]) || [];
}

/**
 * Ajukan reimbursement baru beserta lampiran
 */
export async function createReimbursement(
  data: { title: string; description: string; amount: number; user_email: string },
  files: File[]
): Promise<void> {
  // 1. Buat record reimbursement (Pending)
  const { data: insertedData, error: insertError } = await supabase
    .from('reimbursements')
    .insert({
      title: data.title,
      description: data.description,
      amount: data.amount,
      user_email: data.user_email,
      status: 'Pending'
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  const reimbursementId = insertedData.id;

  // 2. Upload file ke storage dan catat di tabel reimbursement_attachments
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    // Pastikan bucket sudah disiapkan sebelumnya, misalkan namanya 'reimbursements'
    const filePath = `${data.user_email}/${reimbursementId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('reimbursements')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Failed to upload file:', uploadError);
      continue;
    }

    const { data: publicUrlData } = supabase.storage
      .from('reimbursements')
      .getPublicUrl(filePath);

    await supabase.from('reimbursement_attachments').insert({
      reimbursement_id: reimbursementId,
      file_url: publicUrlData.publicUrl,
      file_name: file.name
    });
  }
}

/**
 * Approve reimbursement via RPC
 */
export async function approveReimbursement(id: string): Promise<void> {
  const { error } = await supabase.rpc('approve_reimbursement', { p_id: id });
  if (error) throw error;
}

/**
 * Reject reimbursement via RPC
 */
export async function rejectReimbursement(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_reimbursement', { p_id: id, p_reason: reason });
  if (error) throw error;
}
