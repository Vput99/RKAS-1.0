import { createClient } from '@supabase/supabase-js';

// NOTE: In a real environment, these would come from process.env
// For this demo, if keys are missing, we will fallback to localStorage in the db.ts service.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;
