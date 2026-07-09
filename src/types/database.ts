// ============================================================
// biforst-sys — Centralized Database Type Definitions
// Single source of truth untuk semua entitas database Supabase.
// ============================================================

// ---------- Kabupaten & Proyek ----------

export interface Kabupaten {
  id: string;
  name: string;
  pic_name: string;
}

export interface Project {
  id: string;
  name: string;
}

// ---------- Titik Lokasi & Harga ----------

export interface TitikHarga {
  id: string;
  modal_mrc: number;
  modal_cst: number;
  harga_jual_mrc: number;
  harga_jual_cst: number;
}

export interface TitikLokasi {
  id: string;
  status: string;
  dukcapil_name: string;
  address: string;
  coordinates: string;
  isp_name: string;
  notes: string;
  kabupaten_id: string;
  kabupatens: Kabupaten | Kabupaten[];
  titik_harga: TitikHarga | TitikHarga[] | null;
}

export interface TitikLokasiWithHarga {
  id: string;
  dukcapil_name: string;
  address: string;
  isp_name: string;
  status: string;
  titik_harga: TitikHarga | TitikHarga[] | null;
}

export interface TitikOption {
  id: string;
  dukcapil_name: string;
  isp_name: string | null;
}

// ---------- Transactions & Journal ----------

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  reference_code: string;
  created_at?: string;
  attachment_url?: string | null;
}

export interface JournalEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  debit: number;
  credit: number;
}

export interface TransactionWithEntries extends Transaction {
  journal_entries: JournalEntry[];
}

/** Transaction yang sudah di-format untuk tampilan UI (ada type & amount) */
export interface FormattedTransaction extends Transaction {
  type: 'Masuk' | 'Keluar' | 'Unknown';
  amount: number;
}

// ---------- Invoice ----------

export interface Invoice {
  id: string;
  kabupaten_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  billing_type: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'Terkirim' | 'Lunas' | 'Dibayar Sebagian';
  created_at: string;
  kabupatens?: { name: string } | null;
}

export interface InvoicePaymentData {
  invoice_id: string;
  invoice_number: string;
  total_amount: number;
  payment_date: string;
  amount: number;
  payment_method: string;
}

// ---------- Vendor Bills (PPN / Tax) ----------

export interface VendorBill {
  id: string;
  titik_id: string | null;
  vendor_name: string;
  bill_date: string;
  billing_type: 'CST' | 'MRC';
  amount_dpp: number;
  is_pkp: boolean;
  ppn_masukan: number;
  pph23_amount: number;
  total_amount: number;
  status: 'Belum Dibayar' | 'Lunas';
  notes: string | null;
  titik_lokasi?: { dukcapil_name: string } | null;
}

export interface MonthlySummary {
  bulan: number;
  ppn_keluaran: number;
  ppn_masukan: number;
  selisih: number;
}

// ---------- Tasks ----------

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  assigned_to: string;
  created_by: string;
  status: 'Belum Mulai' | 'Sedang Dikerjakan' | 'Selesai';
  priority: 'Rendah' | 'Sedang' | 'Tinggi';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  projects?: { name: string } | null;
}

// ---------- Audit Log ----------

export interface AuditRow {
  id: number;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_at: string;
}

// ---------- Reimbursement ----------

export interface ReimbursementAttachment {
  id: string;
  reimbursement_id: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export interface Reimbursement {
  id: string;
  submitted_by: string; // the founder who requested
  title: string;
  expense_date: string;
  description: string | null;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reject_reason: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null; // admin who approved
  reimbursement_attachments?: ReimbursementAttachment[];
}

// ---------- Aggregated / Computed Types ----------

export interface KasBalance {
  masuk: number;
  keluar: number;
  saldo: number;
}

export interface KabupatenAgregat {
  name: string;
  pic: string;
  total: number;
  aman: number;
}

export interface PdfPreviewState {
  url: string;
  doc: unknown;
  fileName: string;
}
