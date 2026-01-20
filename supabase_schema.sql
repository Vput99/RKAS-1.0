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
    
    -- Detail Rincian Biaya (Penting untuk Inputan Anggaran)
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
    realizations JSONB DEFAULT '[]'::jsonb -- Menyimpan history realisasi per bulan
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
    CONSTRAINT single_row_check CHECK (id = 1) -- Menjaga hanya ada 1 baris data profil
);

-- 5. Data Awal Profil (Agar tidak error saat aplikasi pertama dibuka)
INSERT INTO public.school_profiles (id, name, fiscal_year)
VALUES (1, 'Sekolah Belum Diatur', '2026')
ON CONFLICT (id) DO NOTHING;

-- 6. Setup Row Level Security (RLS) - Izin Akses Publik untuk Demo
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;

-- Reset Policy lama agar bersih
DROP POLICY IF EXISTS "Public Access Budgets" ON public.budgets;
DROP POLICY IF EXISTS "Public Access Profiles" ON public.school_profiles;

-- Buat Policy Baru (Boleh Baca/Tulis untuk semua orang yang punya URL)
CREATE POLICY "Public Access Budgets" ON public.budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Profiles" ON public.school_profiles FOR ALL USING (true) WITH CHECK (true);

-- 7. Aktifkan Realtime (Agar data langsung muncul tanpa refresh)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE budgets, school_profiles;
COMMIT;

-- Selesai.
