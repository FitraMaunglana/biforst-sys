# biforst-sys — ERP Internal PT Bifrost Technology Solution (BTS)

## Stack
- Frontend: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Shadcn UI
- Backend: Supabase (PostgreSQL + RLS + Realtime + Storage + Auth)
- Payments: Midtrans (QRIS)
- Deploy: Vercel + custom domain app.biforsttechnology.site
- Package manager: npm
- Shell: zsh

## Aturan wajib sebelum mengerjakan apapun
1. Before executing any task or writing a full response, evaluate if you have all necessary details, context, and specific preferences. If any information is missing or ambiguous, DO NOT make assumptions or guess. Instead, ask me targeted clarification questions one by one to refine our approach. Repeat this process until you are 95% confident you have the exact details needed for a high-quality answer.
2. JANGAN jalankan `git push` atau deploy tanpa konfirmasi eksplisit dari user.
3. SELALU jalankan `npm run build` setelah selesai edit kode untuk verifikasi tidak ada TypeScript error.
4. Untuk perubahan database (SQL), JANGAN jalankan otomatis — tampilkan SQL-nya dan minta user jalankan manual di Supabase SQL Editor.
5. JANGAN hardcode credentials, API keys, atau secrets apapun di kode.
6. Semua operasi multi-tabel sensitif harus menggunakan Supabase RPC (SECURITY DEFINER), bukan multi-insert dari client.

## Struktur project penting
- `app/` — Next.js App Router pages
- `src/components/` — Reusable React components
- `src/lib/supabaseClient.ts` — Supabase client (sudah dikonfigurasi, jangan diubah)
- `.env.local` — Environment variables (JANGAN dibaca atau dimodifikasi)

## Konvensi kode
- Semua komponen baru: TypeScript strict, gunakan `interface` bukan `type` untuk props
- Styling: Tailwind CSS v4 utility classes, tidak ada inline style
- Warna aksen per modul: indigo (dashboard/kas), emerald (BAST), violet (PPN), amber (master data), rose (audit), teal (tugas)
- Format tanggal: `toLocaleDateString('id-ID')` untuk konsistensi
- Format currency: `toLocaleString('id-ID')` tanpa simbol Rp di dalam tabel

## Database
- Supabase project: biforst-core (Singapore)
- RLS aktif di SEMUA tabel — jangan buat query yang akan gagal karena RLS
- Helper functions: `is_admin()`, `get_my_founder_name()`, `get_my_org_id()`
- Tabel utama: accounts, transactions, journal_entries, invoices, invoice_payments, vendor_bills, kabupatens, projects, titik_lokasi, titik_harga, titik_execution_checklist, tasks, task_updates, task_update_attachments, reimbursements, reimbursement_attachments, audit_log

## Fitur yang sudah selesai (jangan dibangun ulang)
- Auth + RBAC (superadmin vs founder)
- Jurnal Kas + double-entry accounting otomatis
- Modul Invoice (Penagihan Mitra)
- Modul BAST
- Modul PPN (vendor_bills)
- Master Data dengan CRUD lengkap
- Audit Log universal (13 tabel)
- Checklist Eksekusi 6 tahap per titik
- Summary Keuangan per kabupaten (realtime)
- Modul Tugas/Jobdesk (tasks + task_updates + lampiran)
- Modul Reimbursement (Selesai 100%: Storage Bucket config, RPC Approve/Reject, Clean Arch API, UI Premium dengan Toast Notifications)
- **Migrasi ke Clean Architecture (Selesai)**: Semua halaman telah dimodifikasi untuk menggunakan komponen UI yang konsisten (`AppLayout`, `PageHeader`, dll.) dan logika bisnis dipisahkan ke dalam `src/services/*.service.ts`. JANGAN tambahkan logika database langsung ke file page di `app/`.

## Fitur yang SEDANG dalam pengerjaan
- Tidak ada fitur yang sedang berjalan (selesai).
