// ============================================================
// biforst-sys — Application Constants
// Single source of truth untuk semua konstanta yang sebelumnya
// tersebar di 6+ file berbeda.
// ============================================================

import type { Account } from '@/src/types';

/** Email admin master — satu-satunya tempat di-define. */
export const ADMIN_EMAIL = 'biforsttechnologysolution@gmail.com';

/** Status pipeline proyek (urutan penting). */
export const PIPELINE_STATUSES = [
  'Belum Mulai',
  'Pitching',
  'Coverage',
  'Dealing',
  'Kontrak',
  'Sudah Aman',
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

/** Warna untuk setiap status pipeline (untuk progress bar). */
export const PIPELINE_COLORS = [
  'bg-slate-300',
  'bg-blue-400',
  'bg-purple-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-teal-500',
] as const;

/** Daftar founder perusahaan. */
export const FOUNDERS = ['Fitra', 'Dimas', 'Munif'] as const;

/** Mapping email → nama founder. */
export const EMAIL_TO_NAME: Record<string, string> = {
  'maulanafitra32@gmail.com': 'Fitra',
  'dimasdanang100@gmail.com': 'Dimas',
  'munifadam@gmail.com': 'Munif',
  [ADMIN_EMAIL]: 'Superadmin',
};

/** Nama-nama bulan bahasa Indonesia. */
export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

/** Label tabel untuk audit log. */
export const TABLE_LABELS: Record<string, string> = {
  accounts: 'Akun Bookkeeping',
  document_counters: 'Counter Dokumen',
  execution_stages: 'Tahapan Eksekusi (Master)',
  invoice_payments: 'Pembayaran Invoice',
  invoices: 'Invoice',
  journal_entries: 'Jurnal Entri',
  kabupatens: 'Kabupaten',
  projects: 'Proyek',
  titik_execution_checklist: 'Checklist Eksekusi',
  titik_harga: 'Harga Titik',
  titik_lokasi: 'Titik Lokasi',
  transactions: 'Transaksi Kas',
  vendor_bills: 'Tagihan Vendor',
};

/**
 * Chart of Accounts (CoA) statis untuk Double-Entry Bookkeeping.
 * Dipakai oleh TransactionForm dan services.
 */
export const ACCOUNTS_DB: Account[] = [
  // Cash Asset
  { id: 'acc-kas-101', code: '101', name: 'Kas & Setara Kas', type: 'Asset' },

  // Expenses (Kas Keluar Categories)
  { id: 'acc-exp-501', code: '501', name: 'Operasional: Bensin & Transportasi', type: 'Expense' },
  { id: 'acc-exp-502', code: '502', name: 'Operasional: Konsumsi & Makan', type: 'Expense' },
  { id: 'acc-exp-503', code: '503', name: 'Operasional: Atk & Perlengkapan', type: 'Expense' },
  { id: 'acc-exp-504', code: '504', name: 'Operasional: Sewa Ruangan', type: 'Expense' },
  { id: 'acc-exp-505', code: '505', name: 'Operasional: Gaji Karyawan', type: 'Expense' },
  { id: 'acc-exp-506', code: '506', name: 'Operasional: Internet & Domain', type: 'Expense' },
  { id: 'acc-asset-121', code: '121', name: 'Aset: Peralatan & Inventaris', type: 'Asset' },

  // Revenue & Equity (Kas Masuk Categories)
  { id: 'acc-rev-401', code: '401', name: 'Pendapatan: Penjualan Layanan', type: 'Revenue' },
  { id: 'acc-rev-402', code: '402', name: 'Pendapatan: Komisi & Cashback', type: 'Revenue' },
  { id: 'acc-eq-301', code: '301', name: 'Ekuitas: Modal Pemilik', type: 'Equity' },
];
