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

  if (profileError || profile?.role !== 'admin') {
    return jsonResponse({ error: 'Solo administradores pueden restablecer contrasenas.' }, 403);
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!userId || password.length < 8) {
    return jsonResponse({ error: 'Usuario y contrasena valida son obligatorios.' }, 400);
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

  if (targetProfileError || !targetProfile) {
    return jsonResponse({ error: 'El usuario no pertenece a tu organizacion.' }, 404);
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password });
  if (updateError) return jsonResponse({ error: updateError.message }, 400);

  return jsonResponse({ message: 'Contrasena restablecida.' });
});
