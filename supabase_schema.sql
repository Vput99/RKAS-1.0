-- ==========================================
-- SKRIP SETUP DATABASE RKAS PINTAR
-- Jalankan skrip ini di Supabase SQL Editor
-- ==========================================

-- 1. Buat Table Budgets (Untuk Transaksi Pendapatan & Belanja)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL, -- 'pendapatan' atau 'belanja'
    description TEXT NOT NULL,
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    unit_price NUMERIC DEFAULT 0,
    amount NUMERIC NOT NULL,
    realizations JSONB DEFAULT '[]'::jsonb, -- Menyimpan detail realisasi (SPJ)
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    bosp_component TEXT,
    category TEXT,
    account_code TEXT,
    realization_months INTEGER[], -- Array bulan [1, 2, 12]
    status TEXT DEFAULT 'draft',
    is_bosp_eligible BOOLEAN DEFAULT true,
    warning_message TEXT,
    notes TEXT
);

-- 2. Buat Table Profil Sekolah (Hanya 1 Baris Data)
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
    student_count NUMERIC DEFAULT 0,
    budget_ceiling NUMERIC DEFAULT 0,
    CONSTRAINT single_row_check CHECK (id = 1) -- Memastikan hanya ada ID 1
);

-- 3. Insert Data Awal Profil (PENTING: Agar aplikasi tidak error saat load pertama)
INSERT INTO public.school_profiles (id, name, fiscal_year)
VALUES (1, 'Sekolah Belum Diatur', '2026')
ON CONFLICT (id) DO NOTHING;

-- 4. Pengaturan Keamanan (Row Level Security)
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada (untuk menghindari error duplikat saat run ulang)
DROP POLICY IF EXISTS "Public Access Budgets" ON public.budgets;
DROP POLICY IF EXISTS "Public Access Profiles" ON public.school_profiles;

-- Buat Policy agar aplikasi bisa Membaca & Menulis (Public Access)
CREATE POLICY "Public Access Budgets" ON public.budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Profiles" ON public.school_profiles FOR ALL USING (true) WITH CHECK (true);

-- 5. PENTING: Aktifkan Realtime (Agar data update otomatis antar device)
-- Menambahkan tabel ke publikasi supabase_realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE budgets, school_profiles;
COMMIT;

-- Selesai.
