export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Registro de Eventos Academicos',
  isDev: import.meta.env.DEV,
};

export function hasSupabaseConfig() {
  return Boolean(
    env.supabaseUrl &&
      env.supabaseAnonKey &&
      !env.supabaseUrl.includes('your-project') &&
      !env.supabaseAnonKey.includes('your-anon'),
  );
}

export function isDemoMode() {
  return env.isDev && !hasSupabaseConfig();
}

