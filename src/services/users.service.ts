import { isDemoMode } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { AppRole } from '@/types/domain';

export type CreateStaffUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: AppRole;
};

export async function createStaffUser(input: CreateStaffUserInput): Promise<void> {
  if (!supabase && isDemoMode()) return;
  if (!supabase) throw new Error('Supabase no esta configurado en este despliegue.');

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error('Debe iniciar sesion como administrador para crear usuarios.');
  }

  const response = await fetch('/.netlify/functions/create-staff-user', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      fullName: input.fullName.trim(),
      role: input.role,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'No se pudo crear el usuario.');
  }
}
