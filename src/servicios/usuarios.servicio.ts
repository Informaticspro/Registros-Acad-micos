import { createClient } from '@supabase/supabase-js';
import { env } from '@/infraestructura/entorno';
import { supabase } from '@/infraestructura/supabase';
import { RolAplicacion } from '@/tipos/dominio';
import { BaseDatos } from '@/tipos/supabase';

export type CrearUsuarioInput = {
  email: string;
  password: string;
  fullName: string;
  role: RolAplicacion;
};

export type ActualizarUsuarioInput = {
  id: string;
  email: string;
  fullName: string;
  role: RolAplicacion;
};

export type UsuarioSistema = {
  id: string;
  fullName: string;
  email: string;
  role: RolAplicacion;
  createdAt?: string;
};

type PerfilRow = {
  id: string;
  full_name: string;
  email: string;
  role: RolAplicacion;
  created_at?: string;
};

function validarRol(role: RolAplicacion) {
  if (!['admin', 'organizador', 'scanner'].includes(role)) throw new Error('Rol invalido.');
}

function validarCorreo(email: string) {
  if (!email.trim() || !email.includes('@')) throw new Error('Correo requerido para iniciar sesion.');
}

function mapUsuario(row: PerfilRow): UsuarioSistema {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

function crearClienteRegistro() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Supabase no esta configurado.');
  }

  return createClient<BaseDatos>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function listStaffUsers(): Promise<UsuarioSistema[]> {
  if (!supabase) throw new Error('Supabase no esta configurado.');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('created_at', { ascending: false })
    .returns<PerfilRow[]>();

  if (error) throw error;
  return data.map(mapUsuario);
}

export async function createStaffUser(input: CrearUsuarioInput): Promise<UsuarioSistema> {
  if (!supabase) throw new Error('Supabase no esta configurado.');

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  validarCorreo(email);
  validarRol(input.role);
  if (!fullName) throw new Error('El nombre completo es obligatorio.');
  if (input.password.length < 8) throw new Error('La contrasena debe tener minimo 8 caracteres.');

  const registroClient = crearClienteRegistro();
  const { data, error } = await registroClient.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error('Supabase no devolvio el usuario creado. Revisa si la confirmacion de correo esta activada.');
  }

  const { error: profileError } = await supabase.rpc('admin_assign_staff_profile', {
    p_user_id: data.user.id,
    p_full_name: fullName,
    p_email: email,
    p_role: input.role,
  });

  if (profileError) throw profileError;

  return {
    id: data.user.id,
    fullName,
    email,
    role: input.role,
    createdAt: new Date().toISOString(),
  };
}

export async function updateStaffUser(input: ActualizarUsuarioInput): Promise<UsuarioSistema> {
  if (!supabase) throw new Error('Supabase no esta configurado.');

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  validarCorreo(email);
  validarRol(input.role);
  if (!fullName) throw new Error('El nombre completo es obligatorio.');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      email,
      role: input.role,
    })
    .eq('id', input.id)
    .select('id, full_name, email, role, created_at')
    .single<PerfilRow>();

  if (error) throw error;
  return mapUsuario(data);
}

export async function deleteStaffUser(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no esta configurado.');

  const { error } = await supabase.rpc('admin_disable_staff_profile', {
    p_user_id: id,
  });

  if (error) throw error;
}
