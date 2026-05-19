import { createClient } from '@supabase/supabase-js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function getEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable de entorno ${name}`);
  return value;
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Metodo no permitido' });

  try {
    const supabaseUrl = getEnv('VITE_SUPABASE_URL');
    const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    const authHeader = event.headers.authorization ?? event.headers.Authorization ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json(401, { error: 'Sesion requerida' });

    const body = JSON.parse(event.body ?? '{}');
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const fullName = String(body.fullName ?? '').trim();
    const role = String(body.role ?? 'organizador');

    if (!email || !email.includes('@')) return json(400, { error: 'Correo invalido' });
    if (password.length < 8) return json(400, { error: 'La contrasena debe tener minimo 8 caracteres' });
    if (!fullName) return json(400, { error: 'Nombre completo requerido' });
    if (!['admin', 'organizador', 'scanner'].includes(role)) return json(400, { error: 'Rol invalido' });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return json(401, { error: 'Sesion invalida' });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: currentProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !currentProfile) return json(403, { error: 'Perfil administrador no encontrado' });
    if (currentProfile.role !== 'admin') return json(403, { error: 'Solo administradores pueden crear usuarios' });
    if (!currentProfile.organization_id) return json(400, { error: 'El administrador no tiene organizacion asignada' });

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError || !created.user) {
      return json(400, { error: createError?.message ?? 'No se pudo crear el usuario en autenticacion' });
    }

    const { error: insertError } = await adminClient.from('profiles').upsert({
      id: created.user.id,
      organization_id: currentProfile.organization_id,
      full_name: fullName,
      email,
      role,
    });

    if (insertError) return json(400, { error: insertError.message });

    return json(200, {
      id: created.user.id,
      email,
      role,
    });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Error interno' });
  }
}
