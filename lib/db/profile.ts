import { supabase } from '../supabase';
import { SchoolProfile } from '../../types';
import { getCurrentUserId } from './auth';
import { DEFAULT_PROFILE } from './core';
import { db } from './dexie';

export const getSchoolProfile = async (): Promise<SchoolProfile> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        try {
            const { data, error } = await supabase.from('school_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (data && !error) {
                const profile = {
                    name: data.name,
                    npsn: data.npsn,
                    address: data.address,
                    headmaster: data.headmaster,
                    headmasterNip: data.headmaster_nip,
                    treasurer: data.treasurer,
                    treasurerNip: data.treasurer_nip,
                    fiscalYear: data.fiscal_year,
                    studentCount: Number(data.student_count),
                    budgetCeiling: Number(data.budget_ceiling),
                    bankName: data.bank_name || '',
                    bankBranch: data.bank_branch || '',
                    bankAddress: data.bank_address || '',
                    accountNo: data.account_no || '',
                    headerImage: data.header_image || ''
                } as SchoolProfile;

                // Sync to IDB
                await db.schoolProfiles.where('user_id').equals(userId).delete();
                await db.schoolProfiles.add({ ...profile, user_id: userId });
                return profile;
            }
        } catch (e) { console.error("Cloud profile fetch error:", e); }
    }

    if (userId) {
        const local = await db.schoolProfiles.where('user_id').equals(userId).first();
        if (local) {
            const { user_id, ...profile } = local as any;
            return profile as SchoolProfile;
        }
    }

    return DEFAULT_PROFILE;
};

export const saveSchoolProfile = async (profile: SchoolProfile): Promise<SchoolProfile> => {
    const userId = await getCurrentUserId();
    
    if (userId) {
        if (supabase) {
            try {
                const dbPayload = {
                    user_id: userId,
                    name: profile.name,
                    npsn: profile.npsn,
                    address: profile.address,
                    headmaster: profile.headmaster,
                    headmaster_nip: profile.headmasterNip,
                    treasurer: profile.treasurer,
                    treasurer_nip: profile.treasurerNip,
                    fiscal_year: profile.fiscalYear,
                    student_count: profile.studentCount,
                    budget_ceiling: profile.budgetCeiling,
                    bank_name: profile.bankName,
                    bank_branch: profile.bankBranch,
                    bank_address: profile.bankAddress,
                    account_no: profile.accountNo,
                    header_image: profile.headerImage
                };

                await supabase.from('school_profiles').upsert(dbPayload, { onConflict: 'user_id' });
            } catch (error: any) {
                console.error("Cloud profile save error:", error);
                alert(`Gagal menyimpan ke cloud: ${error.message}`);
            }
        }
        
        await db.schoolProfiles.where('user_id').equals(userId).delete();
        await db.schoolProfiles.add({ ...profile, user_id: userId });
    }

    return profile;
};
