-- =========================================================
-- SKRIP SETUP DATABASE RKAS PINTAR (MULTI-SCHOOL / SAAS VERSION)
-- Jalankan di: Supabase Dashboard > SQL Editor > Run
-- =========================================================

-- 1. Aktifkan Ekstensi
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Buat Table Budgets (Dengan User ID)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Link ke User Login
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

-- Update kolom jika tabel sudah ada
DO $$
BEGIN
    ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Kolom user_id sudah ada.';
END $$;

-- 3. Buat Table Profil Sekolah (Multi-User)
-- HAPUS CONSTRAINT LAMA (id=1) agar bisa banyak sekolah
ALTER TABLE public.school_profiles DROP CONSTRAINT IF EXISTS single_row_check;

CREATE TABLE IF NOT EXISTS public.school_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE, -- 1 User = 1 Profil Sekolah
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

    header_image TEXT
);

DO $$
BEGIN
    ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    -- Pastikan user_id unique agar 1 user cuma punya 1 profil
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_profiles_user_id_key') THEN
        ALTER TABLE public.school_profiles ADD CONSTRAINT school_profiles_user_id_key UNIQUE (user_id);
    END IF;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'Kolom sudah ada.';
END $$;

-- 4. Table Pendukung Lainnya (Tambahkan User ID)

-- Bank Statements
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
DO $$ BEGIN ALTER TABLE public.bank_statements ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Rapor Pendidikan
CREATE TABLE IF NOT EXISTS public.rapor_pendidikan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    year TEXT NOT NULL,
    indicator_id TEXT NOT NULL,
    label TEXT NOT NULL,
    score NUMERIC DEFAULT 0,
    category TEXT,
    UNIQUE(user_id, year, indicator_id) -- Unik per User
);
DO $$ BEGIN ALTER TABLE public.rapor_pendidikan ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Withdrawal History
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
DO $$ BEGIN ALTER TABLE public.withdrawal_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Account Codes (Kode Rekening)
-- User bisa punya akun custom sendiri, tapi akun default sistem (user_id NULL) bisa dibaca semua
CREATE TABLE IF NOT EXISTS public.account_codes (
    code TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means Global/System Default
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (code, user_id) -- Kode boleh sama jika beda user
);
-- Hapus Primary Key lama jika cuma 'code'
ALTER TABLE public.account_codes DROP CONSTRAINT IF EXISTS account_codes_pkey;
-- Buat Composite Primary Key baru agar user bisa punya kode custom yang sama dengan sistem tapi beda nama
-- Note: Supabase UI mungkin butuh satu kolom PK, tapi ini logic SQL standar.

-- =========================================================
-- SECURITY POLICIES (ROW LEVEL SECURITY - RLS)
-- INI BAGIAN TERPENTING AGAR DATA ANTAR SEKOLAH TIDAK BOCOR
-- =========================================================

-- 1. Budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Access Budgets" ON public.budgets;
CREATE POLICY "User Access Budgets" ON public.budgets
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. School Profiles
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Access Profiles" ON public.school_profiles;
CREATE POLICY "User Access Profiles" ON public.school_profiles
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Bank Statements
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Access Bank Statements" ON public.bank_statements;
CREATE POLICY "User Access Bank Statements" ON public.bank_statements
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Rapor Pendidikan
ALTER TABLE public.rapor_pendidikan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Access Rapor" ON public.rapor_pendidikan;
CREATE POLICY "User Access Rapor" ON public.rapor_pendidikan
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Withdrawal History
ALTER TABLE public.withdrawal_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Access History" ON public.withdrawal_history;
CREATE POLICY "User Access History" ON public.withdrawal_history
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Account Codes (Spesial: User bisa lihat punya sendiri ATAU punya sistem/null)
ALTER TABLE public.account_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Access Accounts" ON public.account_codes;
CREATE POLICY "User Access Accounts" ON public.account_codes
    USING (user_id = auth.uid() OR user_id IS NULL) -- Lihat punya sendiri atau global
    WITH CHECK (user_id = auth.uid()); -- Cuma bisa edit/tambah punya sendiri

-- 7. Storage Bucket (User folder isolation)
-- Kita ubah policy storage agar user hanya bisa akses file di folder miliknya (opsional, tapi bagus untuk keamanan)
DROP POLICY IF EXISTS "Authenticated Access RKAS Storage" ON storage.objects;
CREATE POLICY "Authenticated Access RKAS Storage"
ON storage.objects FOR ALL TO authenticated
USING ( bucket_id = 'rkas_storage' AND (auth.uid() = owner) ) 
WITH CHECK ( bucket_id = 'rkas_storage' AND (auth.uid() = owner) );

-- Aktifkan Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE budgets, school_profiles, bank_statements, rapor_pendidikan, withdrawal_history, account_codes;

-- Selesai. Data sekolah A aman dari sekolah B.