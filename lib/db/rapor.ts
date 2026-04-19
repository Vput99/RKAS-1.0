import { supabase } from '../supabase';
import { RaporIndicator } from '../../types';
import { getCurrentUserId } from './core';

export const getRaporData = async (year: string): Promise<RaporIndicator[] | null> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return null;

        const { data, error } = await supabase
            .from('rapor_pendidikan')
            .select('*')
            .eq('user_id', userId)
            .eq('year', year);

        if (error) {
            console.error("Error fetching rapor:", error);
            return null;
        }

        if (data && data.length > 0) {
            return data.map(item => ({
                id: item.indicator_id,
                label: item.label,
                score: Number(item.score),
                category: item.category
            }));
        }
    }
    return null;
};

export const saveRaporData = async (indicators: RaporIndicator[], year: string): Promise<boolean> => {
    if (!supabase) return false;
    const userId = await getCurrentUserId();

    if (!userId) {
        console.error("User not authenticated");
        alert("Sesi login berakhir. Silakan login ulang.");
        return false;
    }

    const upsertData = indicators.map(ind => ({
        user_id: userId,
        year: year,
        indicator_id: ind.id,
        label: ind.label,
        score: ind.score,
        category: ind.category,
        updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('rapor_pendidikan')
        .upsert(upsertData, { onConflict: 'user_id,year,indicator_id' });

    if (error) {
        console.error("Error saving rapor (Upsert):", error);
        try {
            await supabase.from('rapor_pendidikan').delete().eq('user_id', userId).eq('year', year);
            const { error: insertError } = await supabase.from('rapor_pendidikan').insert(upsertData);
            if (insertError) throw insertError;
            return true;
        } catch (retryError: any) {
            console.error("Retry save failed:", retryError);
            alert("Gagal menyimpan data rapor: " + retryError.message);
            return false;
        }
    }
    return true;
};
