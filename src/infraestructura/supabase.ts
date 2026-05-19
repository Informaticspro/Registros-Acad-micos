import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, hasSupabaseConfig } from '@/infraestructura/entorno';
import { BaseDatos } from '@/tipos/supabase';

export const supabase: SupabaseClient<BaseDatos> | null = hasSupabaseConfig()
  ? createClient<BaseDatos>(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

