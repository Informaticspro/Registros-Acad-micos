import { supabase } from '@/infraestructura/supabase';
import { isDemoMode } from '@/infraestructura/entorno';

/** Fetch a bounded activity feed without loading the inventory or Excel engine. */
export async function listLaboratorioAlerts() {
  if (!supabase) {
    if (!isDemoMode()) throw new Error('Supabase no está configurado.');
    const { listLaboratorioData } = await import('./laboratorio.servicio');
    const data = await listLaboratorioData();
    const recent = [...data.bitacoras].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { bitacoras: [...new Map([...recent.slice(0, 6), ...recent.filter(item => item.estado === 'pendiente' || item.estado === 'en_proceso').slice(0, 2)].map(item => [item.id, item])).values()], prestamos: data.prestamos };

  }
  const [logs, pending, loans] = await Promise.all([
    supabase.from('laboratory_logs').select('id,status,title,work_type,location,created_at')
      .order('created_at', { ascending: false }).order('id').limit(6),
    supabase.from('laboratory_logs').select('id,status,title,work_type,location,created_at')
      .in('status', ['pendiente', 'en_proceso']).order('work_date', { ascending: false }).order('id').limit(2),
    supabase.from('laboratory_loans').select('id,status,equipment,delivered_to')
      .in('status', ['vencido', 'activo']).order('loaned_at', { ascending: false }).order('id').limit(2),
  ]);
  if (logs.error) throw logs.error;
  if (pending.error) throw pending.error;
  if (loans.error) throw loans.error;
  return {
    bitacoras: [...new Map([...logs.data, ...pending.data].map(row => [row.id, row])).values()].map(row => ({ createdAt: row.created_at, id: row.id, estado: row.status, titulo: row.title, tipoTrabajo: row.work_type, ubicacion: row.location })),
    prestamos: loans.data.map(row => ({ id: row.id, estado: row.status, equipo: row.equipment, entregadoA: row.delivered_to })),
  };
}
