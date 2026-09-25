import { createClient } from '@supabase/supabase-js';

// Read-only schema checks. Never print credentials or participant records.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Configure VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
// An optional server credential allows schema checks on tables that deny anon entirely.
const schemaClient = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : client;
let ready = true;
for (const [table, columns] of [
  ['registrations', 'id,registration_metadata'],
  ['events', 'id,is_permanent'],
  ['attendance_daily_logs', 'id,attendance_period'],
  ['laboratory_discards', 'id'],
  ['laboratory_component_assignments', 'id'],
  ['laboratory_technical_sheets', 'id,updated_at'],
  ['laboratory_equipment', 'id,updated_at'],
  ['laboratory_sections', 'id,name'],
  ['laboratory_catalogs', 'id,catalog_type,name'],
  ['laboratory_logs', 'id,work_date'],
  ['laboratory_loans', 'id,loaned_at'],
]) {
  const { error } = await schemaClient.from(table).select(columns).limit(0);
  console.log(`${table}: ${error ? `NO VERIFICADO (${error.code || 'red/permisos'})` : 'columnas disponibles'}`);
  if (error) ready = false;
}
const { error } = await client.rpc('lookup_participant_registration', {
  p_event_id: '00000000-0000-0000-0000-000000000000',
  p_document_id: 'schema-probe',
  p_certificate_code: 'schema-probe',
});
const lookupAvailable = error?.code === 'P0001' && error.message === 'Evento no encontrado';
console.log(`Consulta QR con código: ${lookupAvailable ? 'disponible' : 'NO VERIFICADA'}`);
console.log('Esta comprobación no certifica políticas RLS, backups ni despliegue de Edge Functions.');
process.exitCode = ready && lookupAvailable ? 0 : 1;
