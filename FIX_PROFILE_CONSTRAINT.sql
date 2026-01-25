
-- =========================================================
-- SQL Script untuk memperbaiki tabel school_profiles
-- Jalankan di SQL Editor Supabase untuk solusi PERMANEN
-- =========================================================

-- 1. Hapus constraint lama jika ada (untuk bersih-bersih)
ALTER TABLE public.school_profiles DROP CONSTRAINT IF EXISTS school_profiles_user_id_key;
DROP INDEX IF EXISTS school_profiles_user_id_key;

-- 2. Pastikan user_id unik
-- Hapus duplikat (ambil yang terbaru) jika ada data sampah
DELETE FROM public.school_profiles a USING public.school_profiles b
WHERE a.id < b.id AND a.user_id = b.user_id;

-- 3. Buat Index Unik pada user_id
CREATE UNIQUE INDEX school_profiles_user_id_key ON public.school_profiles (user_id);

-- 4. Tambahkan constraint (Agar perintah Upsert frontend aman 100%)
ALTER TABLE public.school_profiles ADD CONSTRAINT school_profiles_user_id_key UNIQUE USING INDEX school_profiles_user_id_key;

-- 5. Refresh Schema
NOTIFY pgrst, 'reload schema';
