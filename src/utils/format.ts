// ============================================================
// biforst-sys — Formatting Utilities
// Single source of truth untuk format angka, tanggal, terbilang.
// Menggantikan copy-paste di 4+ file.
// ============================================================

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Format angka ke string Rupiah: "Rp 1.500.000"
 * Dipakai di dashboard, invoices, tax, master-data.
 */
export function formatIDR(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format tanggal ISO ke format Indonesia: "9 Juli 2026"
 * Dipakai di dashboard, invoices, bast.
 */
export function formatDateIndo(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format tanggal ke locale Indonesia standar: "09/07/2026"
 */
export function formatDateLocaleID(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID');
}

/**
 * Mendapatkan nama hari dalam bahasa Indonesia: "Rabu"
 */
export function getDayNameIndo(date: Date): string {
  return DAY_NAMES_ID[date.getDay()];
}

/**
 * Auto-format input string menjadi format Rupiah (untuk input field).
 * Contoh: "1500000" → "Rp 1.500.000"
 */
export function formatRupiahInput(val: string): string {
  const numberString = val.replace(/[^0-9]/g, '');
  if (!numberString) return '';
  const number = parseInt(numberString, 10);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
}

/**
 * Ekstrak angka numerik dari string yang sudah di-format Rupiah.
 * Contoh: "Rp 1.500.000" → 1500000
 */
export function cleanNumericValue(val: string): number {
  const clean = val.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

/**
 * Konversi angka ke terbilang bahasa Indonesia.
 * Contoh: 1500000 → "satu juta lima ratus ribu"
 * Dipakai di invoice PDF.
 */
export function terbilang(angka: number): string {
  const bilangan = [
    '', 'satu', 'dua', 'tiga', 'empat', 'lima',
    'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas',
  ];
  if (angka < 12) return bilangan[angka];
  if (angka < 20) return terbilang(angka - 10) + ' belas';
  if (angka < 100) return terbilang(Math.floor(angka / 10)) + ' puluh' + (angka % 10 !== 0 ? ' ' + terbilang(angka % 10) : '');
  if (angka < 200) return 'seratus' + (angka - 100 !== 0 ? ' ' + terbilang(angka - 100) : '');
  if (angka < 1000) return terbilang(Math.floor(angka / 100)) + ' ratus' + (angka % 100 !== 0 ? ' ' + terbilang(angka % 100) : '');
  if (angka < 2000) return 'seribu' + (angka - 1000 !== 0 ? ' ' + terbilang(angka - 1000) : '');
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' ribu' + (angka % 1000 !== 0 ? ' ' + terbilang(angka % 1000) : '');
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' juta' + (angka % 1000000 !== 0 ? ' ' + terbilang(angka % 1000000) : '');
  if (angka < 1000000000000) return terbilang(Math.floor(angka / 1000000000)) + ' miliar' + (angka % 1000000000 !== 0 ? ' ' + terbilang(angka % 1000000000) : '');
  return '';
}
