// Retired endpoint: all current user operations use Supabase.
export async function handler() {
  return { statusCode: 410, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: 'Servicio retirado. Utilice la administración de usuarios de la aplicación.' }) };
}
