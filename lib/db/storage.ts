import { supabase } from '../supabase';
import { getCurrentUserId } from './auth';

export const uploadEvidenceFile = async (file: File, budgetId: string = 'general'): Promise<{ url: string | null, path: string | null }> => {
    if (!supabase) return { url: null, path: null };

    const userId = await getCurrentUserId();
    if (!userId) {
        console.error("Upload failed: No authenticated user");
        return { url: null, path: null };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const gid = budgetId || 'general';
    const filePath = `${userId}/evidence/${gid}/${fileName}`;

    try {
        const { error: uploadError } = await supabase.storage
            .from('rkas_storage')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload error detail:', uploadError);
            return { url: null, path: null };
        }

        const { data } = supabase.storage
            .from('rkas_storage')
            .getPublicUrl(filePath);

        return { url: data.publicUrl, path: filePath };
    } catch (error) {
        console.error("Exception during evidence upload:", error);
        return { url: null, path: null };
    }
};

export const uploadBankStatementFile = async (file: File): Promise<{ url: string | null, path: string | null }> => {
    if (!supabase) return { url: null, path: null };

    const userId = await getCurrentUserId();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    try {
        const { error: uploadError } = await supabase.storage
            .from('rkas_storage')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('rkas_storage')
            .getPublicUrl(filePath);

        return { url: data.publicUrl, path: filePath };
    } catch (error) {
        console.error("Error uploading file:", error);
        return { url: null, path: null };
    }
};

export const uploadWithdrawalFile = async (fileBlob: Blob, fileName: string): Promise<{ url: string | null, path: string | null }> => {
    if (!supabase) return { url: null, path: null };
    const userId = await getCurrentUserId();
    const filePath = `${userId}/withdrawal_docs/${Date.now()}_${fileName}`;

    try {
        const { error: uploadError } = await supabase.storage
            .from('rkas_storage')
            .upload(filePath, fileBlob, { contentType: 'application/pdf', upsert: true });

        if (uploadError) return { url: null, path: null };

        const { data } = supabase.storage.from('rkas_storage').getPublicUrl(filePath);
        return { url: data.publicUrl, path: filePath };
    } catch (error) {
        return { url: null, path: null };
    }
};
