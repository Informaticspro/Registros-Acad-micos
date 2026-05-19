import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { isDemoMode } from '@/infraestructura/entorno';
import { supabase } from '@/infraestructura/supabase';
import { PerfilUsuario } from '@/tipos/dominio';

type AuthContextValue = {
  profile: PerfilUsuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const demoProfile: PerfilUsuario = {
  id: 'demo-admin',
  fullName: 'Admin Academico',
  email: 'admin@academico.local',
  role: 'admin',
  organizationId: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function loadSession() {
      const { data } = await supabase!.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        setProfile(await loadProfile(data.user));
      } catch {
        setProfile(null);
      }
      setIsLoading(false);
    }

    void loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void loadSession());

    return () => {
      mounted = false;
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
          setProfile({ ...demoProfile, email });
          return;
        }
        setIsLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setIsLoading(false);
          throw error;
        }
        if (!data.user) {
          setIsLoading(false);
          throw new Error('No se pudo obtener el usuario autenticado.');
        }
        setProfile(await loadProfile(data.user));
        setIsLoading(false);
      },
      async signOut() {
        if (supabase) await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [isLoading, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAutenticacion() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAutenticacion debe usarse dentro de ProveedorAutenticacion');
  }
  return value;
}

