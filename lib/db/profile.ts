import { supabase } from '../supabase';
import { SchoolProfile } from '../../types';
import { getCurrentUserId, SCHOOL_PROFILE_KEY, DEFAULT_PROFILE } from './core';

export const getSchoolProfile = async (): Promise<SchoolProfile> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return DEFAULT_PROFILE;

            const { data } = await supabase.from('school_profiles')
                .select('*')
                .eq('user_id', userId) // Explicit Filter
                .single();

            if (data) {
                return {
                    name: data.name,
                    npsn: data.npsn,
                    address: data.address,
                    headmaster: data.headmaster,
                    headmasterNip: data.headmaster_nip,
                    treasurer: data.treasurer,
                    treasurerNip: data.treasurer_nip,
                    fiscalYear: data.fiscal_year,
                    studentCount: data.student_count,
                    budgetCeiling: data.budget_ceiling,
                    city: data.city,
                    district: data.district,
                    postalCode: data.postal_code,
                    bankName: data.bank_name,
                    bankBranch: data.bank_branch,
                    bankAddress: data.bank_address,
                    accountNo: data.account_no,
                    headerImage: data.header_image
                };
            }
        } catch (error) {
            console.log("No profile found for this user yet.");
        }
    }

    const local = localStorage.getItem(SCHOOL_PROFILE_KEY);
    if (local) return JSON.parse(local);
    return DEFAULT_PROFILE;
};

export const saveSchoolProfile = async (profile: SchoolProfile): Promise<SchoolProfile> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) {
                await new Promise(r => setTimeout(r, 500));
                const retryUser = await getCurrentUserId();
                if (!retryUser) {
                    console.warn("User not authenticated to save profile");
                    return profile;
                }
            }

            const confirmedUserId = await getCurrentUserId();

            const dbPayload = {
                user_id: confirmedUserId,
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
                updated_at: new Date().toISOString(),
                city: profile.city,
                district: profile.district,
                postal_code: profile.postalCode,
                bank_name: profile.bankName,
                bank_branch: profile.bankBranch,
                bank_address: profile.bankAddress,
                account_no: profile.accountNo,
                header_image: profile.headerImage
            };

            const { data: existing } = await supabase
                .from('school_profiles')
                .select('id')
                .eq('user_id', confirmedUserId)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase.from('school_profiles').update(dbPayload).eq('user_id', confirmedUserId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('school_profiles').insert([dbPayload]);
                if (error) throw error;
            }
        } catch (error: any) {
            console.error("Supabase profile save error:", error);
            alert(`Gagal menyimpan profil: ${error.message}`);
        }
    }

    localStorage.setItem(SCHOOL_PROFILE_KEY, JSON.stringify(profile));
    return profile;
};
