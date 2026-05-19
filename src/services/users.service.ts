import { isDemoMode } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { AppRole } from '@/types/domain';

export type CreateStaffUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: AppRole;
};

export type UpdateStaffUserInput = CreateStaffUserInput & {
  id: string;
  password?: string;
};

export type StaffUser = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  createdAt?: string;
};

async function getSessionToken() {
  if (!supabase && isDemoMode()) return null;
  if (!supabase) throw new Error('Supabase no esta configurado en este despliegue.');

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Debe iniciar sesion como administrador para gestionar usuarios.');
  return token;
}

function mapStaffUser(row: { id: string; full_name: string; email: string; role: AppRole; created_at?: string }): StaffUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

async function requestStaffUsers<T>(method: string, body?: unknown): Promise<T> {
  const token = await getSessionToken();
  if (!token && isDemoMode()) return undefined as T;

  const response = await fetch('/.netlify/functions/staff-users', {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'No se pudo gestionar el usuario.');
  }

  return (await response.json()) as T;
}

export async function listStaffUsers(): Promise<StaffUser[]> {
  if (!supabase && isDemoMode()) return [];
  const payload = await requestStaffUsers<{
    users: Array<{ id: string; full_name: string; email: string; role: AppRole; created_at?: string }>;
  }>('GET');
  return payload.users.map(mapStaffUser);
}

export async function createStaffUser(input: CreateStaffUserInput): Promise<StaffUser | null> {
  if (!supabase && isDemoMode()) return null;
  const payload = await requestStaffUsers<{
    user: { id: string; full_name: string; email: string; role: AppRole; created_at?: string };
  }>('POST', input);
  return mapStaffUser(payload.user);
}

export async function updateStaffUser(input: UpdateStaffUserInput): Promise<StaffUser | null> {
  if (!supabase && isDemoMode()) return null;
  const payload = await requestStaffUsers<{
    user: { id: string; full_name: string; email: string; role: AppRole; created_at?: string };
  }>('PUT', input);
  return mapStaffUser(payload.user);
}

export async function deleteStaffUser(id: string): Promise<void> {
  if (!supabase && isDemoMode()) return;
  await requestStaffUsers('DELETE', { id });
}
