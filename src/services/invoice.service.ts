// ============================================================
// biforst-sys — Invoice Service
// Data access layer untuk modul penagihan & invoice.
// ============================================================

import { supabase } from '@/src/lib/supabaseClient';
import type { Invoice, Kabupaten } from '@/src/types';

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, kabupatens(name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as Invoice[]) || [];
}

export async function fetchKabupatens(): Promise<Kabupaten[]> {
  const { data, error } = await supabase
    .from('kabupatens')
    .select('id, name, pic_name')
    .order('name');

  if (error) throw error;
  return (data as Kabupaten[]) || [];
}

export async function fetchTitikForInvoice(kabupatenId: string) {
  const { data, error } = await supabase
    .from('titik_lokasi')
    .select(`
      dukcapil_name, status, isp_name,
      titik_harga ( modal_mrc, modal_cst, harga_jual_mrc, harga_jual_cst )
    `)
    .eq('kabupaten_id', kabupatenId)
    .in('status', ['Kontrak', 'Sudah Aman']);

  if (error) throw error;
  return data || [];
}

export async function generateDocumentNumber(docType: string, prefix: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_document_number', {
    p_doc_type: docType,
    p_prefix: prefix,
  });

  if (error || !data) {
    throw new Error('Gagal membuat nomor dokumen: ' + (error?.message || 'tidak ada respons dari server.'));
  }

  return data as string;
}

export async function insertInvoice(invoice: {
  kabupaten_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  billing_type: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
}) {
  const { data, error } = await supabase
    .from('invoices')
    .insert(invoice)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordInvoicePayment(params: {
  invoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
}) {
  const { data, error } = await supabase.rpc('record_invoice_payment', {
    p_invoice_id: params.invoiceId,
    p_payment_date: params.paymentDate,
    p_amount: params.amount,
    p_payment_method: params.paymentMethod,
  });

  if (error) throw error;
  return data as { status: string; reference_code: string };
}
