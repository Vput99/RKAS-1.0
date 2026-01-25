
-- =========================================================
-- SQL FIX: CONSTRAINT & INDEX UNIK (Jalankan di SQL Editor)
-- =========================================================

-- 1. PERBAIKAN TABEL PROFIL SEKOLAH (school_profiles)
-- Hapus constraint/index lama yang mungkin error
ALTER TABLE public.school_profiles DROP CONSTRAINT IF EXISTS school_profiles_user_id_key;
DROP INDEX IF EXISTS school_profiles_user_id_key;

-- Hapus data duplikat (jika ada) sebelum membuat index unik
DELETE FROM public.school_profiles a USING public.school_profiles b
WHERE a.id < b.id AND a.user_id = b.user_id;

-- Buat Unique Constraint pada user_id agar perintah UPSERT bekerja
ALTER TABLE public.school_profiles ADD CONSTRAINT school_profiles_user_id_key UNIQUE (user_id);


-- 2. PERBAIKAN TABEL RAPOR PENDIDIKAN (rapor_pendidikan)
-- Hapus constraint lama
ALTER TABLE public.rapor_pendidikan DROP CONSTRAINT IF EXISTS rapor_pendidikan_year_indicator_id_key;
DROP INDEX IF EXISTS rapor_pendidikan_year_indicator_id_key;
DROP INDEX IF EXISTS rapor_pendidikan_user_year_ind_idx;

-- Buat Index Unik Kombinasi (User + Tahun + Indikator)
CREATE UNIQUE INDEX rapor_pendidikan_user_year_ind_idx 
ON public.rapor_pendidikan (user_id, year, indicator_id);


-- 3. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
