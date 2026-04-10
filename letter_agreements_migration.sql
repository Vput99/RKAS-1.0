-- ==================================================
-- MIGRATION: Tabel Surat Perjanjian Kerja (MOU/SPK)
-- Jalankan di Supabase SQL Editor
-- ==================================================

-- 1. Buat Tabel
CREATE TABLE IF NOT EXISTS public.letter_agreements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Jenis & Status
    type            TEXT NOT NULL CHECK (type IN ('ekstrakurikuler', 'tukang')),
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),

    -- Nomor & Tanggal Surat
    letter_number   TEXT,
    letter_date     TEXT,
    fiscal_year     TEXT,

    -- Data Sekolah (Pihak Pertama)
    school_name     TEXT,
    school_address  TEXT,
    headmaster      TEXT,
    headmaster_nip  TEXT,

    -- Data Pihak Kedua
    party_name      TEXT NOT NULL,
    party_address   TEXT,
    party_nik       TEXT,
    party_npwp      TEXT,

    -- Detail Pekerjaan
    activity_description TEXT,
    activity_location    TEXT,
    start_date           TEXT,
    end_date             TEXT,

    -- Keuangan
    total_amount         NUMERIC(15,2) DEFAULT 0,
    payment_schedule     JSONB DEFAULT '[]'::jsonb,

    -- Khusus Ekskul
    schedule_description TEXT,
    student_count        INTEGER DEFAULT 0,

    -- Khusus Tukang
    work_volume          TEXT,
    rab_total            NUMERIC(15,2) DEFAULT 0,
    work_guarantee       TEXT,

    notes                TEXT
);

-- 2. Buat Index
CREATE INDEX IF NOT EXISTS idx_letter_agreements_user_id
    ON public.letter_agreements(user_id);

CREATE INDEX IF NOT EXISTS idx_letter_agreements_type
    ON public.letter_agreements(type);

CREATE INDEX IF NOT EXISTS idx_letter_agreements_created_at
    ON public.letter_agreements(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.letter_agreements ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Users can view own letter agreements" ON public.letter_agreements;
DROP POLICY IF EXISTS "Users can insert own letter agreements" ON public.letter_agreements;
DROP POLICY IF EXISTS "Users can update own letter agreements" ON public.letter_agreements;
DROP POLICY IF EXISTS "Users can delete own letter agreements" ON public.letter_agreements;

-- Buat policy baru
CREATE POLICY "Users can view own letter agreements"
    ON public.letter_agreements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own letter agreements"
    ON public.letter_agreements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own letter agreements"
    ON public.letter_agreements FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own letter agreements"
    ON public.letter_agreements FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Berikan akses ke authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.letter_agreements TO authenticated;

-- Selesai!
-- Tabel 'letter_agreements' siap digunakan.
