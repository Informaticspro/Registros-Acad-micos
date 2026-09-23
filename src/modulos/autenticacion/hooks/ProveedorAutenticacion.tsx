import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { isDemoMode } from '@/infraestructura/entorno';
import { supabase } from '@/infraestructura/supabase';
import { PerfilUsuario } from '@/tipos/dominio';



const demoProfile: PerfilUsuario = {
  id: 'demo-admin',
  fullName: 'Admin Academico',
  email: 'admin@academico.local',
  role: 'admin',
  organizationId: null,
};

import { AuthContext, type AuthContextValue } from './contexto-autenticacion';

async function loadProfile(user: User): Promise<PerfilUsuario> {
  if (!supabase && isDemoMode()) return demoProfile;
  if (!supabase) throw new Error('Supabase no esta configurado.');

  const { data: dbProfile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, organization_id')
    .eq('id', user.id)
    .single<{
      id: string;
      full_name: string;
      email: string;
      role: PerfilUsuario['role'];
      organization_id: string | null;
    }>();

  if (error || !dbProfile) {
    throw new Error('Tu usuario existe, pero no tiene perfil/rol en la tabla profiles.');
  }

  return {
    id: dbProfile.id,
    fullName: dbProfile.full_name,
    email: dbProfile.email,
    role: dbProfile.role,
    organizationId: dbProfile.organization_id,
  };
}

export function ProveedorAutenticacion({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<PerfilUsuario | null>(isDemoMode() ? demoProfile : null);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const sessionVersion = useRef(0);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function loadSession() {
      const version = ++sessionVersion.current;
      try {
        const { data, error } = await supabase!.auth.getUser();
        if (error) throw error;
        const nextProfile = data.user ? await loadProfile(data.user) : null;
        if (mounted && version === sessionVersion.current) setProfile(nextProfile);
      } catch {
        if (mounted && version === sessionVersion.current) setProfile(null);
      } finally {
        if (mounted && version === sessionVersion.current) setIsLoading(false);
      }
    }

    void loadSession();
    let refreshTimer: ReturnType<typeof setTimeout>;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      ++sessionVersion.current;
      clearTimeout(refreshTimer);
      if (!session) {
        setProfile(null);
        setIsLoading(false);
        return;
      }
      // Defer Supabase calls until its auth callback releases the session lock.
      refreshTimer = setTimeout(() => void loadSession(), 0);
    });

    return () => {
      mounted = false;
      clearTimeout(refreshTimer);
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      isAuthenticated: Boolean(profile),
      isLoading,
      async signIn(email, password) {
        if (!supabase) {
          if (!isDemoMode()) throw new Error('Supabase no esta configurado en este despliegue.');
          const profile = { ...demoProfile, email };
          setProfile(profile);
          return profile;
        }
        setIsLoading(true);
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (!data.user) throw new Error('No se pudo obtener el usuario autenticado.');
          const version = sessionVersion.current;
          const profile = await loadProfile(data.user);
          if (version === sessionVersion.current) setProfile(profile);
          return profile;
        } finally {
          setIsLoading(false);
        }
      },
      async signOut() {
        if (supabase) {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        }
        ++sessionVersion.current;
        setProfile(null);
      },
    }),
    [isLoading, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
