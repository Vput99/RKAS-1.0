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

-- 11. Aktifkan Realtime (Agar data langsung muncul tanpa refresh)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE budgets, school_profiles, bank_statements, rapor_pendidikan, withdrawal_history;
COMMIT;

-- Selesai.