import { createClient } from '@supabase/supabase-js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function getEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable de entorno ${name}`);
  return value;
}

function parseBody(event) {
  return event.body ? JSON.parse(event.body) : {};
}

function normalizeRole(value) {
  const role = String(value ?? 'organizador');
  if (!['admin', 'organizador', 'scanner'].includes(role)) throw new Error('Rol invalido');
  return role;
}

async function createContext(event) {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = event.headers.authorization ?? event.headers.Authorization ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) return { error: json(401, { error: 'Sesion requerida' }) };

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return { error: json(401, { error: 'Sesion invalida' }) };

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: currentProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, organization_id, role')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !currentProfile) return { error: json(403, { error: 'Perfil administrador no encontrado' }) };
  if (currentProfile.role !== 'admin') return { error: json(403, { error: 'Solo administradores pueden gestionar usuarios' }) };
  if (!currentProfile.organization_id) return { error: json(400, { error: 'El administrador no tiene organizacion asignada' }) };

  return { adminClient, currentProfile };
}

async function findAuthUserByEmail(adminClient, email) {
  let page = 1;
  const perPage = 100;

  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function listUsers(adminClient, organizationId) {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return json(200, { users: data ?? [] });
}

async function createUser(adminClient, organizationId, body) {
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const fullName = String(body.fullName ?? '').trim();
  const role = normalizeRole(body.role);

  if (!email || !email.includes('@')) return json(400, { error: 'Correo invalido' });
  if (password.length < 8) return json(400, { error: 'La contrasena debe tener minimo 8 caracteres' });
  if (!fullName) return json(400, { error: 'Nombre completo requerido' });

  let user = await findAuthUserByEmail(adminClient, email);

  if (!user) {
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !created.user) return json(400, { error: createError?.message ?? 'No se pudo crear el usuario en autenticacion' });
    user = created.user;
  } else {
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), full_name: fullName },
    });
    if (updateAuthError) return json(400, { error: updateAuthError.message });
  }

  const { data, error: upsertError } = await adminClient
    .from('profiles')
    .upsert({ id: user.id, organization_id: organizationId, full_name: fullName, email, role })
    .select('id, full_name, email, role, created_at')
    .single();

  if (upsertError) return json(400, { error: upsertError.message });
  return json(200, { user: data });
}

async function updateUser(adminClient, organizationId, body) {
  const id = String(body.id ?? '');
  const fullName = String(body.fullName ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const role = normalizeRole(body.role);

  if (!id) return json(400, { error: 'Usuario requerido' });
  if (!fullName) return json(400, { error: 'Nombre completo requerido' });
  if (!email || !email.includes('@')) return json(400, { error: 'Correo invalido' });

  const authPayload = { email, email_confirm: true, user_metadata: { full_name: fullName } };
  if (password) {
    if (password.length < 8) return json(400, { error: 'La contrasena debe tener minimo 8 caracteres' });
    authPayload.password = password;
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(id, authPayload);
  if (authError) return json(400, { error: authError.message });

  const { data, error } = await adminClient
    .from('profiles')
    .update({ full_name: fullName, email, role })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select('id, full_name, email, role, created_at')
    .single();

  if (error) return json(400, { error: error.message });
  return json(200, { user: data });
}

async function deleteUser(adminClient, organizationId, body, currentUserId) {
  const id = String(body.id ?? '');
  if (!id) return json(400, { error: 'Usuario requerido' });
  if (id === currentUserId) return json(400, { error: 'No puedes borrar tu propio usuario' });

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (profileError || !profile) return json(404, { error: 'Usuario no encontrado en la organizacion' });

  const { error: authError } = await adminClient.auth.admin.deleteUser(id);
  if (authError) return json(400, { error: authError.message });

  return json(200, { ok: true });
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  try {
    const context = await createContext(event);
    if (context.error) return context.error;

    const { adminClient, currentProfile } = context;
    const body = parseBody(event);

    if (event.httpMethod === 'GET') return await listUsers(adminClient, currentProfile.organization_id);
    if (event.httpMethod === 'POST') return await createUser(adminClient, currentProfile.organization_id, body);
    if (event.httpMethod === 'PUT') return await updateUser(adminClient, currentProfile.organization_id, body);
    if (event.httpMethod === 'DELETE') return await deleteUser(adminClient, currentProfile.organization_id, body, currentProfile.id);

    return json(405, { error: 'Metodo no permitido' });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Error interno' });
  }
}
