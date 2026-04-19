import { supabase } from '../supabase';
import { RaporIndicator } from '../../types';
import { getCurrentUserId } from './auth';
import { db } from './dexie';

export const getRaporData = async (year: string): Promise<RaporIndicator[] | null> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        const { data, error } = await supabase
            .from('rapor_pendidikan')
            .select('*')
            .eq('user_id', userId)
            .eq('year', year);

        if (!error && data && data.length > 0) {
            const indicators = data.map(item => ({
                id: item.indicator_id,
                label: item.label,
                score: Number(item.score),
                category: item.category
            }));
            
            // Cache to IDB
            await db.raporPendidikan.where({ user_id: userId, year: year }).delete();
            await db.raporPendidikan.bulkAdd(indicators.map(ind => ({ ...ind, user_id: userId, year: year })));
            
            return indicators;
        }
    }

    if (userId) {
        const local = await db.raporPendidikan.where({ user_id: userId, year: year }).toArray();
        if (local.length > 0) return local;
    }
    
    return null;
};

export const saveRaporData = async (indicators: RaporIndicator[], year: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    if (supabase) {
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

        if (!error) {
            await db.raporPendidikan.where({ user_id: userId, year: year }).delete();
            await db.raporPendidikan.bulkAdd(indicators.map(ind => ({ ...ind, user_id: userId, year: year })));
            return true;
        }
    } else {
        await db.raporPendidikan.where({ user_id: userId, year: year }).delete();
        await db.raporPendidikan.bulkAdd(indicators.map(ind => ({ ...ind, user_id: userId, year: year })));
        return true;
    }

    return false;
};
