
-- =========================================================
-- SKRIP SETUP DATABASE RKAS PINTAR (MULTI-SCHOOL / SAAS VERSION)
-- Jalankan di: Supabase Dashboard > SQL Editor > Run
-- =========================================================

-- 1. Aktifkan Ekstensi yang dibutuhkan
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- A. TABEL UTAMA (CREATE TABLES)
-- =========================================================

-- 1. Tabel Budgets (Anggaran & SPJ)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'draft',
    
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    unit_price NUMERIC DEFAULT 0,
    
    account_code TEXT,
    bosp_component TEXT,
    category TEXT,
    
    realization_months INTEGER[],
    is_bosp_eligible BOOLEAN DEFAULT true,
    warning_message TEXT,
    notes TEXT,

    realizations JSONB DEFAULT '[]'::jsonb,
    transfer_details JSONB DEFAULT '{}'::jsonb
);
-- Migrasi: Pastikan kolom user_id ada (jika tabel sudah ada sebelumnya)
DO $$ BEGIN 
    ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE; 
EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- 2. Tabel Profil Sekolah
CREATE TABLE IF NOT EXISTS public.school_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
    
    city TEXT,
    district TEXT,
    postal_code TEXT,

    bank_name TEXT,
    bank_branch TEXT,
    bank_address TEXT,
    account_no TEXT,

    header_image TEXT,
    
    CONSTRAINT school_profiles_user_id_key UNIQUE (user_id)
);
DO $$ BEGIN 
    ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE; 
EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- 3. Tabel Bank Statements (Rekening Koran)
CREATE TABLE IF NOT EXISTS public.bank_statements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
DO $$ BEGIN 
    ALTER TABLE public.bank_statements ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE; 
EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- 4. Tabel Rapor Pendidikan
CREATE TABLE IF NOT EXISTS public.rapor_pendidikan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    year TEXT NOT NULL,
    indicator_id TEXT NOT NULL,
    label TEXT NOT NULL,
    score NUMERIC DEFAULT 0,
    category TEXT
);
DO $$ BEGIN 
    ALTER TABLE public.rapor_pendidikan ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE; 
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Fix Index Unik untuk Rapor (Hapus lama, buat baru yang benar)
DROP INDEX IF EXISTS rapor_pendidikan_year_indicator_id_key; 
DROP INDEX IF EXISTS rapor_pendidikan_user_year_ind_idx;
CREATE UNIQUE INDEX IF NOT EXISTS rapor_pendidikan_user_year_ind_idx 
ON public.rapor_pendidikan (user_id, year, indicator_id);


-- 5. Tabel Riwayat Pencairan (Withdrawal History)
CREATE TABLE IF NOT EXISTS public.withdrawal_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    letter_number TEXT,
    letter_date DATE,
    bank_name TEXT,
    bank_branch TEXT,
    total_amount NUMERIC DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    snapshot_data JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    file_url TEXT,
    file_path TEXT
);
DO $$ BEGIN 
    ALTER TABLE public.withdrawal_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE; 
EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- 6. Account Codes (Kode Rekening Custom)
CREATE TABLE IF NOT EXISTS public.account_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_account_codes_user ON public.account_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_account_codes_code ON public.account_codes(code);


-- =========================================================
-- B. SECURITY POLICIES (RLS) - WAJIB DIAKTIFKAN
-- =========================================================
-- Bagian ini memastikan setiap sekolah HANYA bisa melihat datanya sendiri

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapor_pendidikan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_codes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Budgets
DROP POLICY IF EXISTS "User Access Budgets" ON public.budgets;
CREATE POLICY "User Access Budgets" ON public.budgets 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Policy 2: Profiles
DROP POLICY IF EXISTS "User Access Profiles" ON public.school_profiles;
CREATE POLICY "User Access Profiles" ON public.school_profiles 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Bank Statements
DROP POLICY IF EXISTS "User Access Bank Statements" ON public.bank_statements;
CREATE POLICY "User Access Bank Statements" ON public.bank_statements 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Rapor
DROP POLICY IF EXISTS "User Access Rapor" ON public.rapor_pendidikan;
CREATE POLICY "User Access Rapor" ON public.rapor_pendidikan 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Policy 5: History
DROP POLICY IF EXISTS "User Access History" ON public.withdrawal_history;
CREATE POLICY "User Access History" ON public.withdrawal_history 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Policy 6: Account Codes
-- User bisa melihat akun milik sendiri ATAU akun sistem (user_id NULL)
-- User hanya bisa mengedit akun milik sendiri
DROP POLICY IF EXISTS "User Access Accounts" ON public.account_codes;
CREATE POLICY "User Access Accounts" ON public.account_codes 
    USING (user_id = auth.uid() OR user_id IS NULL) 
    WITH CHECK (user_id = auth.uid());


-- =========================================================
-- C. STORAGE SETUP (OTOMATIS)
-- =========================================================

-- Buat Bucket 'rkas_storage'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rkas_storage', 'rkas_storage', true) 
ON CONFLICT (id) DO NOTHING;

-- Policy Storage: Download Public
DROP POLICY IF EXISTS "Public Download" ON storage.objects;
CREATE POLICY "Public Download" ON storage.objects 
    FOR SELECT USING ( bucket_id = 'rkas_storage' );

-- Policy Storage: Upload (Hanya User Login)
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects 
    FOR INSERT TO authenticated 
    WITH CHECK ( bucket_id = 'rkas_storage' AND auth.uid() = owner );

-- Policy Storage: Delete (Hanya Pemilik File)
DROP POLICY IF EXISTS "Owner Manage" ON storage.objects;
CREATE POLICY "Owner Manage" ON storage.objects 
    FOR DELETE TO authenticated 
    USING ( bucket_id = 'rkas_storage' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
CREATE POLICY "Owner Update" ON storage.objects 
    FOR UPDATE TO authenticated 
    USING ( bucket_id = 'rkas_storage' AND auth.uid() = owner );


-- =========================================================
-- D. REALTIME SETUP
-- =========================================================

-- Perbaikan Error 42710: Menggunakan SET TABLE agar tidak duplikat
ALTER PUBLICATION supabase_realtime SET TABLE budgets, school_profiles, bank_statements, rapor_pendidikan, withdrawal_history, account_codes;
