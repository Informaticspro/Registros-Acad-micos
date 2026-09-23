import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Metodo no permitido.' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!authorization || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'No se pudo validar la solicitud.' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const jwt = authorization.replace('Bearer ', '');
  const { data: userData, error: userError } = await adminClient.auth.getUser(jwt);

  if (userError || !userData.user) return jsonResponse({ error: 'Sesion invalida.' }, 401);

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role, organization_id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || (profile?.role !== 'admin' && profile?.role !== 'propietario')) {
    return jsonResponse({ error: 'Solo propietarios o administradores pueden restablecer contrasenas.' }, 403);
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const editingProfile = body?.action === 'update-profile';

  if (!userId || (!editingProfile && password.length < 8)) {
    return jsonResponse({ error: 'Usuario y contrasena valida son obligatorios.' }, 400);
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from('profiles')
    .select('id, role, email, full_name')
    .eq('id', userId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

  if (targetProfileError || !targetProfile) {
    return jsonResponse({ error: 'El usuario no pertenece a tu organizacion.' }, 404);
  }

  if (targetProfile.role === 'propietario') {
    return jsonResponse({ error: 'La cuenta propietaria cambia su contrasena desde Mi cuenta o recuperacion.' }, 403);
  }

  if (editingProfile) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const role = typeof body.role === 'string' ? body.role : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName || !['admin', 'organizador', 'scanner', 'soporte'].includes(role)) {
      return jsonResponse({ error: 'Datos de usuario inválidos.' }, 400);
    }
    const { data: targetAuth, error: targetError } = await adminClient.auth.admin.getUserById(userId);
    if (targetError || !targetAuth.user) return jsonResponse({ error: 'No se pudo verificar la cuenta.' }, 400);
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      email, user_metadata: { ...targetAuth.user.user_metadata, full_name: fullName },
    });
    if (authError) return jsonResponse({ error: authError.message }, 400);
    const { data: updated, error: saveError } = await adminClient.from('profiles')
      .update({ email, full_name: fullName, role }).eq('id', userId)
      .eq('organization_id', profile.organization_id).neq('role', 'propietario').select('id').maybeSingle();
    if (saveError || !updated) {
      const { error: rollbackError } = await adminClient.auth.admin.updateUserById(userId, {
        email: targetAuth.user.email, user_metadata: targetAuth.user.user_metadata,
      });
      return jsonResponse({ error: rollbackError ? 'La actualización quedó incompleta. Contacte al propietario para verificar el correo de acceso.' : 'No se guardó el perfil. Se restauraron los datos de acceso.' }, 500);
    }
    return jsonResponse({ message: 'Perfil y correo de acceso actualizados.' });
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password });
  if (updateError) return jsonResponse({ error: updateError.message }, 400);

  return jsonResponse({ message: 'Contrasena restablecida.' });
});
