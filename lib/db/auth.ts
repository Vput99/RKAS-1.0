import { supabase } from '../supabase';

// Helper: Get Current User ID
export const getCurrentUserId = async () => {
    if (!supabase) return null;
    try {
        const { data } = await supabase.auth.getSession();
        return data.session?.user?.id || null;
    } catch (e) {
        return null;
    }
};
