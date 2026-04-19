# Ringkasan Arsitektur RKAS Pintar

## 1. Arsitektur Saat Ini
Aplikasi "RKAS Pintar" dibangun menggunakan arsitektur modern berbasis **Frontend React (Vite)** dan **Backend-as-a-Service (BaaS) Supabase**. Aplikasi ini mendukung lingkungan Multi-Tenant (SaaS) dengan isolasi data antar sekolah menggunakan fitur **Row Level Security (RLS)** dari Supabase.

Secara garis besar, arsitekturnya meliputi:
- **Frontend**: Menggunakan React 19 dengan Vite, styling dengan Tailwind CSS. Mendukung fitur PWA (Progressive Web App) dengan prompt instalasi kustom.
- **Backend & Database**: Menggunakan PostgreSQL melalui Supabase untuk menyimpan data seperti anggaran, SPJ, profil sekolah, inventaris, dan riwayat penarikan bank. Supabase Storage digunakan untuk menyimpan file bukti transaksi dan rekening koran.
- **Offline/Local Fallback**: Diimplementasikan mekanisme fallback menggunakan `localStorage` jika koneksi ke Supabase terputus atau untuk penggunaan offline/tamu (Guest Mode).

## 2. Struktur yang Tidak Konsisten & File yang Tidak Efisien

Dari analisis kode, terdapat beberapa masalah desain dan inefisiensi yang dapat menghambat skalabilitas dan maintainability aplikasi ke depannya:

### A. *God Object* pada `lib/db.ts`
File `lib/db.ts` sangat besar (>1600 baris kode). File ini menangani seluruh logika database untuk semua entitas (Anggaran, Profil Sekolah, Rapor, Rekening Koran, Inventaris, Riwayat Penarikan, dll).
- **Masalah**: Sangat sulit untuk dikelola, memicu konflik saat kolaborasi (merge conflicts), dan sulit untuk diuji (testing).
- **Inefisiensi**: Setiap kali aplikasi memuat fungsi kecil, seluruh module berpotensi ikut ter-load jika tree-shaking tidak optimal.

### B. Penggunaan `localStorage` untuk Data Besar
Aplikasi menggunakan `localStorage` sebagai strategi *offline-first* atau cache lokal (misal: `rkas_local_data_v7`, `rkas_inventory_overrides_v1`).
- **Masalah**: `localStorage` memiliki batasan kapasitas yang sangat kecil (sekitar 5MB) dan bersifat sinkron (*synchronous*). Menyimpan ratusan item inventaris atau data base64 ke dalam `localStorage` akan memblokir *main thread* UI dan membuat aplikasi *lagging* atau lambat.

### C. File SQL yang Berserakan di Root Directory
Terdapat banyak file eksekusi SQL di root aplikasi (`supabase_schema.sql`, `FIX_CONSTRAINT.sql`, `inventory_migration.sql`, `populate_account_codes.sql`, dll).
- **Masalah**: Tidak ada manajemen versi database (*database migration management*) yang jelas. Ini membuat sulit untuk melacak urutan skrip mana yang harus dieksekusi terlebih dahulu.

### D. Manajemen State (Prop-Drilling di `App.tsx`)
Komponen utama `App.tsx` menyimpan dan mengelola state data yang masif (`data`, `schoolProfile`) dan mendistribusikannya via *props* ke komponen anak (`AppContent`, `Header`, dll).
- **Masalah**: *Prop-drilling* membuat komponen menjadi kaku. Setiap ada perubahan pada data anggaran, seluruh pohon komponen berpotensi mengalami *re-render* yang tidak perlu.

## 3. Saran Peningkatan Performa dan Stabilitas

Untuk meningkatkan stabilitas dan performa sistem, terutama dalam mengelola data anggaran sekolah yang bisa menjadi sangat besar, berikut adalah saran perbaikannya:

### 1. Refactor `lib/db.ts` menjadi Modul Terpisah
Pecah `lib/db.ts` berdasarkan domain entitas (Domain-Driven Design). Buat direktori `lib/api/` atau `lib/db/` yang berisi:
- `budget.ts` (Anggaran & SPJ)
- `inventory.ts` (Inventaris)
- `profile.ts` (Profil Sekolah)
- `storage.ts` (Upload File & Evidence)
Hal ini akan membuat kode lebih modular, mudah dibaca, dan mempermudah unit testing.

### 2. Migrasi dari `localStorage` ke `IndexedDB`
Untuk penyimpanan lokal (*offline support*), tinggalkan `localStorage` untuk data berat. Gunakan **IndexedDB** melalui library seperti `Dexie.js` atau `idb`. IndexedDB bersifat asinkron dan memiliki kapasitas penyimpanan yang jauh lebih besar (ratusan MB), sehingga tidak akan membebani performa UI dan sangat cocok untuk aplikasi PWA yang kompleks.

### 3. Gunakan Data Fetching Library (React Query / SWR)
Ganti logika *fetch* manual (`useEffect` untuk get data dan set state) dengan pustaka seperti **TanStack React Query** atau **SWR**. Pustaka ini otomatis menangani:
- *Caching* data di memori.
- *Loading* dan *Error states*.
- Sinkronisasi *background* ketika internet kembali online.
- Mengurangi kebutuhan *subscription* *real-time* Supabase yang membebankan memori klien jika tidak diperlukan.

### 4. Implementasi Global State Management
Untuk state yang tidak berasal dari database (seperti status Sidebar, status Online/Offline, atau profil user yang login), gunakan Context API yang dioptimalkan atau *state manager* ringan seperti **Zustand** atau **Jotai**. Ini akan mengeliminasi *prop-drilling* dari `App.tsx`.

### 5. Rapikan Skrip Database (Migrations)
Kumpulkan semua file `.sql` ke dalam satu folder khusus (misal: `supabase/migrations/`). Gunakan penamaan berurutan (misal: `0001_initial_schema.sql`, `0002_fix_constraints.sql`) untuk memudahkan pelacakan perubahan skema database oleh developer lain.

### 6. Optimasi Kueri PostgreSQL (Supabase)
Pastikan file `remediate_postgres_performance.sql` dijalankan di production. Penggunaan `(select auth.uid())` daripada `auth.uid()` secara langsung dalam Policy RLS sangat disarankan untuk mengurangi beban pemrosesan *Sequential Scan* oleh PostgreSQL setiap kali kueri dieksekusi.

## 4. Laporan Perbaikan & Penambahan Fitur (Scan & Fix)

Berdasarkan permintaan pengguna untuk melakukan *scan ulang*, memperbaiki *trouble*, dan menambahkan fitur menarik, berikut adalah perbaikan dan penambahan yang telah dilakukan:

### A. Perbaikan (*Fixes & Optimizations*)
1. **Pembersihan Kode**: Menemukan dan menghapus *unused import* (`Archive`) di `components/withdrawal/HistoryTab.tsx` yang menyebabkan pesan peringatan pada saat *linting*.
2. **Optimasi Build Vite**: Proses *build* sebelumnya menghasilkan *warning* terkait `chunk size limit` yang melebihi 500kB. Kami telah memperbaiki `vite.config.ts` dengan mengimplementasikan strategi pemecahan chunk secara manual (`manualChunks`) untuk `vendor` (React), `charts` (Recharts), `pdf` (jsPDF, html2canvas), dan `utils` (framer-motion, xlsx). Hal ini secara signifikan merapikan *bundling* aplikasi, mempercepat pemuatan awal (Initial Load), dan menghilangkan *warning* dari *compiler*.

### B. Fitur Baru (*Sesuatu yang Menarik*)
1. **AI Financial Insight pada Dashboard**: Kami menambahkan widget cerdas berbentuk *banner* di halaman Dashboard utama (`components/Dashboard.tsx`).
   - Fitur ini menganalisis secara *real-time* data anggaran, sisa kas, dan persentase serapan (SPJ).
   - Ia memberikan kalimat naratif layaknya asisten finansial. Contohnya: jika kas menipis namun serapan masih rendah, sistem akan mengeluarkan pesan peringatan khusus.
   - Menggunakan *icon* Sparkles dari `lucide-react` dan styling UI/UX gradasi *teal/emerald* yang modern agar terlihat kontras dan menarik perhatian pengguna (Kepala Sekolah/Bendahara).
