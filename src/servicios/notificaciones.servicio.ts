import { supabase } from '@/infraestructura/supabase';
import { isDemoMode } from '@/infraestructura/entorno';

/** The header only needs four alerts, not the complete inventory and Excel engine. */
export async function listLaboratorioAlerts() {
  if (!supabase) {
    if (!isDemoMode()) throw new Error('Supabase no está configurado.');
    const { listLaboratorioData } = await import('./laboratorio.servicio');
    return listLaboratorioData();
  }
  const [logs, loans] = await Promise.all([
    supabase.from('laboratory_logs').select('id,status,title,work_type,location')
      .in('status', ['pendiente', 'en_proceso']).order('work_date', { ascending: false }).order('id').limit(2),
    supabase.from('laboratory_loans').select('id,status,equipment,delivered_to')
      .in('status', ['vencido', 'activo']).order('loaned_at', { ascending: false }).order('id').limit(2),
  ]);
  if (logs.error) throw logs.error;
  if (loans.error) throw loans.error;
  return {
    bitacoras: logs.data.map(row => ({ id: row.id, estado: row.status, titulo: row.title, tipoTrabajo: row.work_type, ubicacion: row.location })),
    prestamos: loans.data.map(row => ({ id: row.id, estado: row.status, equipo: row.equipment, entregadoA: row.delivered_to })),
  };
}
