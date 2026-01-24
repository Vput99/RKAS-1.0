-- =================================================================
-- SCRIPT PERBAIKAN TOTAL (Jalankan ini di SQL Editor Supabase)
-- =================================================================

-- 1. Tambahkan kolom user_id jika belum ada
ALTER TABLE public.rapor_pendidikan 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Pastikan tabel lain juga punya user_id (Safety Check)
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.school_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bank_statements ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.withdrawal_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. PERBAIKI CONSTRAINT / INDEX UNIK
-- Hapus index lama yang mungkin menyebabkan konflik saat simpan
DROP INDEX IF EXISTS rapor_pendidikan_user_year_ind_idx;
DROP INDEX IF EXISTS unique_rapor_indicator; -- Nama constraint lama jika ada

-- Buat Index Unik baru (PENTING untuk fitur Upsert/Simpan)
CREATE UNIQUE INDEX IF NOT EXISTS rapor_pendidikan_user_year_ind_idx 
ON public.rapor_pendidikan (user_id, year, indicator_id);

-- 4. PERBAIKI SECURITY POLICY (RLS)
-- Pastikan tabel bisa diakses user setelah kolom ditambahkan
ALTER TABLE public.rapor_pendidikan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User Access Rapor" ON public.rapor_pendidikan;
CREATE POLICY "User Access Rapor" ON public.rapor_pendidikan
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. PAKSA REFRESH SCHEMA CACHE
-- Ini perintah inti untuk menghilangkan error "schema cache"
NOTIFY pgrst, 'reload schema';
