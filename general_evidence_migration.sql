
-- =========================================================
-- SKRIP MIGRASI DOKUMEN PENDUKUNG UMUM (GENERAL EVIDENCE)
-- Jalankan di: Supabase Dashboard > SQL Editor > Run
-- =========================================================

-- 1. Buat Tabel general_evidence
CREATE TABLE IF NOT EXISTS public.general_evidence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    name TEXT NOT NULL,           -- Nama file asli
    url TEXT NOT NULL,            -- Public URL
    path TEXT NOT NULL UNIQUE,    -- Storage path (juga jadi kunci unik)
    type TEXT,                    -- Jenis (Gambar/PDF)
    size BIGINT,                  -- Ukuran file dalam bytes
    
    vendor TEXT,                  -- Default: 'Dokumen Sekolah'
    description TEXT,             -- Keterangan dokumen
    amount NUMERIC DEFAULT 0,     -- Nominal (jika ada)
    date TIMESTAMP WITH TIME ZONE, -- Tanggal dokumen
    "isGeneral" BOOLEAN DEFAULT true
);

-- 2. Aktifkan RLS (Row Level Security)
ALTER TABLE public.general_evidence ENABLE ROW LEVEL SECURITY;

-- 3. Buat Policy: Setiap User hanya bisa akses miliknya sendiri
DROP POLICY IF EXISTS "User Access General Evidence" ON public.general_evidence;
CREATE POLICY "User Access General Evidence" ON public.general_evidence 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 4. Tambahkan ke Publikasi Realtime (Opsional agar auto-sync antar tab)
ALTER PUBLICATION supabase_realtime ADD TABLE general_evidence;

-- 5. Berikan Izin ke Role authenticated
GRANT ALL ON public.general_evidence TO authenticated;
GRANT ALL ON public.general_evidence TO service_role;
