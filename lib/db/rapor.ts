import { supabase } from '../supabase';
import { RaporIndicator, PBDRecommendation } from '../../types';
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
            const indicators: RaporIndicator[] = data.map(item => ({
                id: item.indicator_id,
                label: item.label,
                score: Number(item.score),
                prevScore: item.prev_score ? Number(item.prev_score) : undefined,
                trend: item.trend as any,
                category: item.category as any
            }));
            
            // Cache to IDB
            await db.raporPendidikan.where({ user_id: userId, year: year }).delete();
            await db.raporPendidikan.bulkAdd(indicators.map(ind => {
                const { id, ...rest } = ind;
                return { ...rest, indicator_id: id, user_id: userId, year: year } as any;
            }));
            
            return indicators;
        }
    }

    if (userId) {
        const local = await db.raporPendidikan.where({ user_id: userId, year: year }).toArray();
        if (local.length > 0) {
            return local.map(item => ({
                id: (item as any).indicator_id,
                label: item.label,
                score: item.score,
                prevScore: item.prevScore,
                trend: item.trend,
                category: item.category as any
            }));
        }
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
            prev_score: ind.prevScore,
            trend: ind.trend,
            category: ind.category,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('rapor_pendidikan')
            .upsert(upsertData, { onConflict: 'user_id,year,indicator_id' });

        if (!error) {
            await db.raporPendidikan.where({ user_id: userId, year: year }).delete();
            await db.raporPendidikan.bulkAdd(indicators.map(ind => {
                const { id, ...rest } = ind;
                return { ...rest, indicator_id: id, user_id: userId, year: year } as any;
            }));
            return true;
        }
    } else {
        await db.raporPendidikan.where({ user_id: userId, year: year }).delete();
        await db.raporPendidikan.bulkAdd(indicators.map(ind => {
            const { id, ...rest } = ind;
            return { ...rest, indicator_id: id, user_id: userId, year: year } as any;
        }));
        return true;
    }

    return false;
};

export const getRaporRecommendations = async (year: string): Promise<PBDRecommendation[] | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    if (supabase) {
        const { data, error } = await supabase
            .from('rapor_recommendations')
            .select('*')
            .eq('user_id', userId)
            .eq('year', year);

        if (!error && data && data.length > 0) {
            return data.map(item => ({
                indicatorId: item.indicator_id,
                activityName: item.activity_name,
                title: item.title,
                description: item.description,
                bospComponent: item.bosp_component,
                snpStandard: item.snp_standard,
                estimatedCost: Number(item.estimated_cost),
                priority: item.priority as any,
                componentAnalysis: item.component_analysis,
                comparisonSolution: item.comparison_solution,
                analysisSteps: item.analysis_steps || [],
                items: item.items || []
            }));
        }
    }

    return null;
};

export const saveRaporRecommendations = async (recommendations: PBDRecommendation[], year: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    if (supabase) {
        // Clear previous recommendations for this year
        await supabase.from('rapor_recommendations').delete().eq('user_id', userId).eq('year', year);

        const insertData = recommendations.map(rec => ({
            user_id: userId,
            year: year,
            indicator_id: rec.indicatorId,
            activity_name: rec.activityName || rec.activityName,
            title: rec.title,
            description: rec.description,
            bosp_component: rec.bospComponent,
            snp_standard: rec.snpStandard,
            estimated_cost: rec.estimatedCost,
            priority: rec.priority,
            component_analysis: rec.componentAnalysis,
            comparison_solution: rec.comparisonSolution,
            analysis_steps: rec.analysisSteps,
            items: rec.items,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('rapor_recommendations')
            .insert(insertData);

        return !error;
    }

    return true;
};

