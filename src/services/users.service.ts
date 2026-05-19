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

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { full_name: input.fullName.trim() },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('No se pudo crear el usuario en autenticación.');

  const { error: profileError } = await supabase.rpc('admin_assign_staff_profile', {
    p_user_id: data.user.id,
    p_full_name: input.fullName.trim(),
    p_email: input.email.trim(),
    p_role: input.role,
  });

  if (profileError) throw profileError;
}
