
-- =========================================================
-- SCRIPT PEMULIHAN DATA (VERSI ANTI-ERROR DUPLICATE)
-- =========================================================

DO $$
DECLARE
    -- Email sesuai screenshot Anda (GANTI JIKA PERLU)
    target_email TEXT := 'vput99@gmail.com'; 
    
    target_user_id UUID;
BEGIN
    -- 1. Cari ID User
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User dengan email % tidak ditemukan.', target_email;
    END IF;

    RAISE NOTICE 'Memperbaiki data untuk User ID: %', target_user_id;

    -- -----------------------------------------------------
    -- A. PERBAIKAN RAPOR PENDIDIKAN (Penyebab Error Utama)
    -- -----------------------------------------------------
    -- Hapus data Rapor di akun sekarang jika bentrok dengan data lama
    DELETE FROM public.rapor_pendidikan
    WHERE user_id = target_user_id
    AND (year, indicator_id) IN (
        SELECT year, indicator_id FROM public.rapor_pendidikan WHERE user_id IS NULL
    );
    
    -- Klaim data lama
    UPDATE public.rapor_pendidikan 
    SET user_id = target_user_id 
    WHERE user_id IS NULL;

    -- -----------------------------------------------------
    -- B. PERBAIKAN PROFIL SEKOLAH
    -- -----------------------------------------------------
    -- Jika ada profil lama yang 'nyangkut' (NULL), hapus profil baru biar bisa klaim yang lama
    IF EXISTS (SELECT 1 FROM public.school_profiles WHERE user_id IS NULL) THEN
        DELETE FROM public.school_profiles WHERE user_id = target_user_id;
        
        UPDATE public.school_profiles 
        SET user_id = target_user_id 
        WHERE user_id IS NULL;
    END IF;

    -- -----------------------------------------------------
    -- C. PERBAIKAN KODE REKENING (Custom Accounts)
    -- -----------------------------------------------------
    -- Hapus akun belanja baru jika kodenya sama dengan data lama
    DELETE FROM public.account_codes
    WHERE user_id = target_user_id
    AND code IN (
        SELECT code FROM public.account_codes WHERE user_id IS NULL
    );

    UPDATE public.account_codes 
    SET user_id = target_user_id 
    WHERE user_id IS NULL;

    -- -----------------------------------------------------
    -- D. KLAIM SISA DATA LAINNYA (Aman ditimpa)
    -- -----------------------------------------------------
    UPDATE public.budgets SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE public.bank_statements SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE public.withdrawal_history SET user_id = target_user_id WHERE user_id IS NULL;

    RAISE NOTICE 'Sukses! Semua data lama berhasil diklaim kembali.';
END $$;
