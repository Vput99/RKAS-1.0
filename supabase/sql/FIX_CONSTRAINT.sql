-- =========================================================
-- SCRIPT HAPUS ERROR DUPLICATE KEY (Jalankan di SQL Editor)
-- =========================================================

-- 1. Hapus Constraint/Index Lama yang menyebabkan error
-- Constraint ini membuat data bersifat unik global (salah), harusnya unik per user.
ALTER TABLE public.rapor_pendidikan DROP CONSTRAINT IF EXISTS rapor_pendidikan_year_indicator_id_key;
DROP INDEX IF EXISTS rapor_pendidikan_year_indicator_id_key;

-- Hapus juga index lama lain jika ada
DROP INDEX IF EXISTS unique_rapor_indicator;
DROP INDEX IF EXISTS rapor_pendidikan_user_year_ind_idx;

-- 2. Pastikan kolom user_id ada dan tidak null (hapus data yatim piatu jika perlu)
DELETE FROM public.rapor_pendidikan WHERE user_id IS NULL;

ALTER TABLE public.rapor_pendidikan 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Buat Index Unik Baru (User + Tahun + Indikator)
-- Ini membolehkan User A dan User B punya data tahun 2026 masing-masing.
CREATE UNIQUE INDEX rapor_pendidikan_user_year_ind_idx 
ON public.rapor_pendidikan (user_id, year, indicator_id);

-- 4. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
