import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables in various environments (Vite, CRA, etc.)
const getEnv = (key: string) => {
  // 1. Try Vite (import.meta.env)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore error if import.meta is not available
  }

  // 2. Try Node/CRA (process.env)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore error if process is not available
  }

  return '';
};

// Support both REACT_APP_ (CRA) and VITE_ (Vite) prefixes
const supabaseUrl = getEnv('REACT_APP_SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('REACT_APP_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;