-- =========================================================
-- SKRIP SETUP DATABASE RKAS PINTAR (FULL VERSION)
-- Jalankan di: Supabase Dashboard > SQL Editor > Run
-- =========================================================

-- 1. Aktifkan Ekstensi UUID (Untuk ID unik otomatis)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Buat Table Budgets (Menyimpan Inputan Anggaran & Pendapatan)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Data Dasar Transaksi
    type TEXT NOT NULL, -- 'pendapatan' atau 'belanja'
    description TEXT NOT NULL, -- Uraian Kegiatan
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    amount NUMERIC NOT NULL, -- Total Pagu Anggaran (Volume x Harga Satuan)
    status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'rejected'
    
    -- Detail Rincian Biaya (RAB - Penting untuk Breakdown PBD)
    quantity NUMERIC DEFAULT 0, -- Volume (Jumlah Barang/Jasa)
    unit TEXT, -- Satuan (Paket, Orang, Bulan, Rim, dll)
    unit_price NUMERIC DEFAULT 0, -- Harga Satuan
    
    -- Klasifikasi Akun & Juknis
    account_code TEXT, -- Kode Rekening (Contoh: 5.1.02.01.01.0024)
    bosp_component TEXT, -- Komponen BOSP (Contoh: 1. Penerimaan Peserta Didik Baru)
    category TEXT, -- Standar SNP (Contoh: 5. Pengembangan Sarana Prasarana)
    
    -- Perencanaan Waktu & Validasi
    realization_months INTEGER[], -- Array Bulan Rencana Realisasi (Contoh: [1, 2, 12])
    is_bosp_eligible BOOLEAN DEFAULT true, -- Apakah diperbolehkan Juknis?
    warning_message TEXT, -- Pesan peringatan dari AI jika ada larangan
    notes TEXT,

    -- Data Realisasi (SPJ)
    realizations JSONB DEFAULT '[]'::jsonb, -- Menyimpan history realisasi per bulan
    
    -- Transfer Details (Penerima & Pajak)
    transfer_details JSONB DEFAULT '{}'::jsonb
);

-- 3. Pastikan Kolom Ada (Jika tabel sudah dibuat sebelumnya tanpa kolom ini)
DO $$
BEGIN
    ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0;
    ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS unit TEXT;
    ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
    ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS account_code TEXT;
    ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS realization_months INTEGER[];
    ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS realizations JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS transfer_details JSONB DEFAULT '{}'::jsonb;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Kolom sudah ada, aman.';
END $$;

-- 4. Buat Table Profil Sekolah (Identitas & Pagu)
CREATE TABLE IF NOT EXISTS public.school_profiles (
    id INTEGER DEFAULT 1 PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT,
    npsn TEXT,
    address TEXT,
    headmaster TEXT,
    headmaster_nip TEXT,
    treasurer TEXT,
    treasurer_nip TEXT,
    fiscal_year TEXT DEFAULT '2026',
    student_count NUMERIC DEFAULT 0, -- Jumlah Siswa
    budget_ceiling NUMERIC DEFAULT 0, -- Pagu Anggaran Total
    
    -- Data Lokasi Detail
    city TEXT,
    district TEXT,
    postal_code TEXT,

    -- Data Bank Sekolah
    bank_name TEXT,
    bank_branch TEXT,
    bank_address TEXT,
    account_no TEXT,

    -- Kop Surat (Base64 Image)
    header_image TEXT,

    CONSTRAINT single_row_check CHECK (id = 1) -- Menjaga hanya ada 1 baris data profil
);

-- UPDATE: Tambahkan kolom baru untuk profil jika belum ada
DO $$
BEGIN
    ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS district TEXT;
    ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
    ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
    ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS bank_branch TEXT;
    ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS bank_address TEXT;
    ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS account_no TEXT;
    ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS header_image TEXT;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Kolom profil sudah ada.';
END $$;

-- 5. Data Awal Profil (Agar tidak error saat aplikasi pertama dibuka)
INSERT INTO public.school_profiles (id, name, fiscal_year)
VALUES (1, 'Sekolah Belum Diatur', '2026')
ON CONFLICT (id) DO NOTHING;

-- 6. Setup Row Level Security (RLS) - ACCESS CONTROL
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;

-- Reset Policy lama (yang Public)
DROP POLICY IF EXISTS "Public Access Budgets" ON public.budgets;
DROP POLICY IF EXISTS "Public Access Profiles" ON public.school_profiles;
DROP POLICY IF EXISTS "Authenticated Access Budgets" ON public.budgets;
DROP POLICY IF EXISTS "Authenticated Access Profiles" ON public.school_profiles;

-- Buat Policy Baru: HANYA USER YANG SUDAH LOGIN (Authenticated) yang bisa akses
CREATE POLICY "Authenticated Access Budgets" ON public.budgets 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated Access Profiles" ON public.school_profiles 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. (Baru) Table Bank Statements (Rekening Koran)
CREATE TABLE IF NOT EXISTS public.bank_statements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    closing_balance NUMERIC DEFAULT 0,
    file_name TEXT,
    file_url TEXT,
    file_path TEXT,
    notes TEXT
);

-- UPDATE PENTING: Jika tabel sudah ada, tambahkan kolom yang kurang
DO $$
BEGIN
    ALTER TABLE public.bank_statements ADD COLUMN IF NOT EXISTS file_url TEXT;
    ALTER TABLE public.bank_statements ADD COLUMN IF NOT EXISTS file_path TEXT;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Kolom sudah ada.';
END $$;

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated Access Bank Statements" ON public.bank_statements;

CREATE POLICY "Authenticated Access Bank Statements" ON public.bank_statements 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. STORAGE BUCKET SETUP (PENTING UNTUK UPLOAD)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rkas_storage', 'rkas_storage', true)
ON CONFLICT (id) DO NOTHING;

-- Policy Storage
DROP POLICY IF EXISTS "Public Access RKAS Storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Access RKAS Storage" ON storage.objects;

CREATE POLICY "Authenticated Access RKAS Storage"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id = 'rkas_storage' )
WITH CHECK ( bucket_id = 'rkas_storage' );

-- 9. TABEL RAPOR PENDIDIKAN (BARU - UNTUK PBD)
-- Menyimpan nilai rapor pendidikan agar tidak hilang saat refresh
CREATE TABLE IF NOT EXISTS public.rapor_pendidikan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    year TEXT NOT NULL, -- Tahun Data Rapor (Misal: 2025)
    indicator_id TEXT NOT NULL, -- Kode Indikator (Misal: A.1, D.4)
    label TEXT NOT NULL, -- Nama Indikator (Misal: Kemampuan Literasi)
    score NUMERIC DEFAULT 0, -- Nilai Capaian (0-100)
    category TEXT, -- Kategori (Baik, Sedang, Kurang)
    
    -- Constraint: Satu indikator hanya boleh muncul sekali per tahun
    UNIQUE(year, indicator_id)
);

ALTER TABLE public.rapor_pendidikan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated Access Rapor" ON public.rapor_pendidikan;

CREATE POLICY "Authenticated Access Rapor" ON public.rapor_pendidikan 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. TABEL RIWAYAT PENCAIRAN (ARSIP)
CREATE TABLE IF NOT EXISTS public.withdrawal_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    letter_number TEXT,
    letter_date DATE,
    bank_name TEXT,
    bank_branch TEXT,
    
    total_amount NUMERIC DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    
    snapshot_data JSONB DEFAULT '{}'::jsonb, -- JSON Lengkap Data Penerima
    notes TEXT,
    file_url TEXT,
    file_path TEXT
);

ALTER TABLE public.withdrawal_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated Access History" ON public.withdrawal_history;

CREATE POLICY "Authenticated Access History" ON public.withdrawal_history 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. TABEL KODE REKENING (ACCOUNT CODES) -- BARU
CREATE TABLE IF NOT EXISTS public.account_codes (
    code TEXT PRIMARY KEY, -- Kode Rekening (Primary Key)
    name TEXT NOT NULL,    -- Uraian Rekening
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.account_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated Access Accounts" ON public.account_codes;
CREATE POLICY "Authenticated Access Accounts" ON public.account_codes 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SEED DATA: Masukkan Kode Rekening Standar (Hanya jika tabel kosong)
INSERT INTO public.account_codes (code, name)
VALUES 
  ('5.1.02.01.01.0002', 'Belanja Perangko, Materai Dan Benda Pos Lainnya'),
  ('5.1.02.01.01.0004', 'Belanja Bahan-Bahan Bakar dan Pelumas'),
  ('5.1.02.01.01.0008', 'Belanja Pengisian Tabung Gas'),
  ('5.1.02.01.01.0012', 'Belanja Bahan/Bibit Tanaman'),
  ('5.1.02.01.01.0014', 'Belanja Perlengkapan Kebersihan dan Bahan Pembersih'),
  ('5.1.02.01.01.0016', 'Belanja Bahan Praktek Sekolah/Laboratorium'),
  ('5.1.02.01.01.0024', 'Belanja Alat Tulis Kantor (ATK)'),
  ('5.1.02.01.01.0025', 'Belanja Kertas dan Cover'),
  ('5.1.02.01.01.0026', 'Belanja Bahan Cetak (Fotocopy/Cetak/Penggandaan)'),
  ('5.1.02.01.01.0027', 'Belanja Benda Pos (Materai)'),
  ('5.1.02.01.01.0029', 'Belanja Peralatan Kebersihan dan Bahan Pembersih'),
  ('5.1.02.01.01.0030', 'Belanja Alat Listrik dan Elektronik (Lampu, Kabel, Baterai)'),
  ('5.1.02.01.01.0031', 'Belanja Pengisian Tabung Gas'),
  ('5.1.02.01.01.0032', 'Belanja Perlengkapan Medis/Obat-obatan (UKS)'),
  ('5.1.02.01.01.0034', 'Belanja Perlengkapan Olahraga (Pakai Habis)'),
  ('5.1.02.01.01.0035', 'Belanja Spanduk/Banner/Baliho/Umbul-umbul'),
  ('5.1.02.01.01.0036', 'Belanja Dokumentasi/Foto/Video'),
  ('5.1.02.01.01.0037', 'Belanja Dekorasi'),
  ('5.1.02.01.01.0039', 'Belanja Konsumsi Rapat (Makan/Minum)'),
  ('5.1.02.01.01.0044', 'Belanja Pakan Ternak/Ikan'),
  ('5.1.02.01.01.0052', 'Belanja Makanan dan Minuman Harian Pegawai/Guru'),
  ('5.1.02.01.01.0053', 'Belanja Makanan dan Minuman Peserta Kegiatan'),
  ('5.1.02.01.01.0055', 'Belanja Pakaian Dinas/Seragam/Atribut'),
  ('5.1.02.01.01.0063', 'Belanja Perlengkapan Pendukung Kegiatan Pendidikan'),
  ('5.1.02.01.01.0064', 'Belanja Obat-Obatan (UKS)'),
  ('5.1.02.02.01.0003', 'Belanja Jasa Narasumber/Instruktur/Pembicara'),
  ('5.1.02.02.01.0006', 'Belanja Jasa Tenaga Kerja (Tukang/Kebersihan/Keamanan)'),
  ('5.1.02.02.01.0011', 'Belanja Jasa Kebersihan Kantor'),
  ('5.1.02.02.01.0013', 'Belanja Jasa Tenaga Pendidikan (Guru Honorer BOS)'),
  ('5.1.02.02.01.0014', 'Belanja Jasa Tenaga Kependidikan (Tendik/Admin)'),
  ('5.1.02.02.01.0016', 'Belanja Jasa Keamanan Kantor'),
  ('5.1.02.02.01.0026', 'Belanja Jasa Publikasi/Iklan'),
  ('5.1.02.02.01.0029', 'Belanja Jasa Pengiriman Surat/Barang'),
  ('5.1.02.02.01.0030', 'Belanja Langganan Jurnal/Surat Kabar/Majalah'),
  ('5.1.02.02.01.0049', 'Belanja Jasa Pembuatan Website/Aplikasi'),
  ('5.1.02.02.01.0061', 'Belanja Tagihan Listrik (PLN)'),
  ('5.1.02.02.01.0062', 'Belanja Tagihan Telepon'),
  ('5.1.02.02.01.0063', 'Belanja Tagihan Air (PDAM)'),
  ('5.1.02.02.01.0064', 'Belanja Paket/Voucher Internet (Wifi)'),
  ('5.1.02.02.01.0067', 'Belanja Kawat/Faksimili/Internet/TV Kabel'),
  ('5.1.02.02.04.0004', 'Belanja Sewa Peralatan dan Mesin (Sound System, Genset)'),
  ('5.1.02.02.05.0033', 'Belanja Sewa Tenda/Kursi/Perlengkapan Pesta'),
  ('5.1.02.03.02.0111', 'Belanja Pemeliharaan Gedung dan Bangunan (Ringan)'),
  ('5.1.02.03.02.0120', 'Belanja Pemeliharaan Peralatan dan Mesin (AC/Elektronik)'),
  ('5.1.02.03.02.0121', 'Belanja Pemeliharaan Alat Angkutan'),
  ('5.1.02.03.02.0401', 'Belanja Pemeliharaan Alat Kantor dan Rumah Tangga'),
  ('5.1.02.03.02.0405', 'Belanja Pemeliharaan Komputer/Laptop/Printer'),
  ('5.1.02.04.01.0001', 'Belanja Perjalanan Dinas Dalam Daerah'),
  ('5.1.02.04.01.0003', 'Belanja Perjalanan Dinas Dalam Kota'),
  ('5.1.02.04.01.0004', 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota'),
  ('5.1.02.04.01.0005', 'Belanja Perjalanan Dinas Paket Meeting Luar Kota'),
  ('5.2.02.05.01.0004', 'Belanja Modal Alat Pendingin (AC, Kipas Angin)'),
  ('5.2.02.05.01.0005', 'Belanja Modal Alat Kantor Lainnya (Mesin Tik, Penghancur Kertas)'),
  ('5.2.02.05.02.0001', 'Belanja Modal Meja dan Kursi Kerja/Murid'),
  ('5.2.02.05.02.0004', 'Belanja Modal Lemari/Brankas/Filing Cabinet'),
  ('5.2.02.05.02.0006', 'Belanja Modal Rak/Locker'),
  ('5.2.02.06.01.0000', 'Belanja Modal Alat Rumah Tangga (Sapu, Pel, Ember - Jika Aset)'),
  ('5.2.02.08.01.0005', 'Belanja Modal Peralatan Laboratorium (Mikroskop, Alat Peraga)'),
  ('5.2.02.10.01.0002', 'Belanja Modal Komputer Unit (PC)'),
  ('5.2.02.10.02.0003', 'Belanja Modal Laptop/Notebook'),
  ('5.2.02.10.02.0004', 'Belanja Modal Printer/Scanner'),
  ('5.2.02.10.02.0005', 'Belanja Modal Proyektor (Infocus)/Layar'),
  ('5.2.02.10.02.0006', 'Belanja Modal Peralatan Jaringan (Router, Switch)'),
  ('5.2.02.13.01.0001', 'Belanja Modal Buku Umum/Pelajaran/Perpustakaan'),
  ('5.2.02.13.01.0010', 'Belanja Modal Barang Bercorak Kesenian/Kebudayaan (Alat Musik)'),
  ('5.2.02.13.01.0012', 'Belanja Modal Alat Olahraga'),
  ('5.2.02.18.01.0003', 'Belanja Modal Software/Aplikasi'),
  ('5.2.03.01.01.0001', 'Belanja Modal Bangunan Gedung Sekolah (Renovasi Berat/Penambahan Ruang)')
ON CONFLICT (code) DO NOTHING;

-- 12. Aktifkan Realtime (Update)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE budgets, school_profiles, bank_statements, rapor_pendidikan, withdrawal_history, account_codes;
COMMIT;

-- Selesai.