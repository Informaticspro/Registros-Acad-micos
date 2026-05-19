import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, hasSupabaseConfig } from '@/lib/env';
import { Database } from '@/types/supabase';

export const supabase: SupabaseClient<Database> | null = hasSupabaseConfig()
  ? createClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
