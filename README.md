
# Panduan Implementasi RKAS Pintar (Multi-Sekolah / SaaS)

Aplikasi ini telah dikonfigurasi untuk mendukung banyak sekolah sekaligus (Multi-Tenant). Data antar sekolah diisolasi menggunakan **Row Level Security (RLS)** di Supabase.

Berikut adalah langkah-langkah untuk menyiapkan aplikasi agar bisa digunakan oleh banyak sekolah.

---

## Tahap 1: Persiapan Database (Supabase)

1.  **Buat Proyek Baru**: Buka [Supabase Dashboard](https://app.supabase.com) dan buat proyek baru.
2.  **Buka SQL Editor**: Di menu sebelah kiri, pilih icon SQL Editor.
3.  **Jalankan Skrip**:
    *   Buka file `supabase_schema.sql` yang ada di source code aplikasi ini.
    *   Copy semua isinya.
    *   Paste ke SQL Editor Supabase dan klik **RUN**.
    *   *Penting:* Skrip ini akan membuat tabel, mengaktifkan RLS, dan membuat Policy keamanan agar Sekolah A tidak bisa melihat data Sekolah B.

4.  **Konfigurasi Storage (Upload Bukti/Rekening Koran)**:
    *   Pergi ke menu **Storage**.
    *   Buat Bucket baru bernama `rkas_storage`.
    *   Set sebagai **Public** (atau Private jika ingin lebih ketat, tapi code saat ini menggunakan Public URL).
    *   *Note:* Skrip SQL di atas sudah otomatis membuat policy agar user hanya bisa upload ke foldernya sendiri.

---

## Tahap 2: Koneksi Frontend ke Backend

Agar aplikasi bisa berkomunikasi dengan database, Anda perlu mengatur Environment Variables.

1.  Di Supabase Dashboard, buka **Project Settings > API**.
2.  Salin **URL** dan **anon public key**.
3.  Di folder proyek aplikasi ini, buat file `.env` (copy dari `.env.example`).
4.  Isi data berikut:

```env
VITE_SUPABASE_URL=https://project-id-anda.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh... (kunci panjang anda)
VITE_API_KEY= (Kunci API Google Gemini untuk fitur AI)
```

---

## Tahap 3: Deployment (Online)

Untuk bisa diakses oleh banyak sekolah dari berbagai lokasi, aplikasi harus di-hosting.

### Opsi A: Vercel (Rekomendasi)
1.  Push kode ini ke GitHub/GitLab.
2.  Buka [Vercel](https://vercel.com) -> **Add New Project**.
3.  Import repository GitHub tadi.
4.  Di bagian **Environment Variables**, masukkan 3 variabel dari Tahap 2 (`VITE_SUPABASE_URL`, dll).
5.  Klik **Deploy**.
6.  Anda akan mendapatkan URL (misal: `rkas-pintar.vercel.app`). Bagikan URL ini ke sekolah-sekolah.

---

## Tahap 4: Cara Penggunaan oleh Sekolah

Setelah dideploy, alur penggunaannya adalah:

1.  **Registrasi Sekolah**:
    *   Sekolah membuka URL aplikasi.
    *   Pilih tab **"Daftar Sekolah"**.
    *   Masukkan Nama Sekolah, Email, dan Password.
    *   Klik **Daftar**. Akun dan Profil Sekolah akan otomatis dibuat di database.

2.  **Login**:
    *   Setelah daftar, sekolah login menggunakan Email & Password tadi.
    *   Setiap data yang diinput (Anggaran, SPJ, dll) akan otomatis ditandai dengan ID sekolah tersebut.

3.  **Pengaturan**:
    *   Sekolah masuk ke menu **Pengaturan** untuk melengkapi data (Kepala Sekolah, Bendahara, Logo Kop Surat).

---

## Troubleshooting Umum

*   **Error: "Duplicate Key Value" saat menyimpan Rapor/Profil**:
    *   Pastikan Anda sudah menjalankan file `FIX_CONSTRAINT.sql` atau `supabase_schema.sql` versi terbaru di SQL Editor. Ini memperbaiki aturan unik di database.
*   **Data Offline Bocor**:
    *   Aplikasi sudah dilengkapi fitur `clearLocalData` saat logout. Namun, disarankan sekolah menggunakan perangkat masing-masing atau menggunakan Mode Incognito jika berbagi komputer.
