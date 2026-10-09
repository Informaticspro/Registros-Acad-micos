import { supabase } from '@/infraestructura/supabase';
import type { SolicitudEquipo } from './componentes/PortalSolicitudes';

export type SolicitudPrestamo = {
  id: string;
  applicant: string;
  affiliation: string;
  equipment: string;
  room: string;
  starts_at: string;
  ends_at: string | null;
  status: 'pendiente' | 'entregado' | 'devuelto' | 'cancelado';
  created_at: string;
  delivered_at: string | null;
  returned_at: string | null;
};

export async function registrarSolicitud(organizationId: string, solicitud: SolicitudEquipo, receipt: string) {
  if (!supabase) throw new Error('El servicio no está disponible.');
  const { error } = await supabase.rpc('submit_laboratory_request', {
    p_org: organizationId, p_receipt: receipt,
    p_data: { name: solicitud.nombre, affiliation: solicitud.procedencia, equipment: solicitud.equipo, room: solicitud.aula, startsAt: solicitud.inicio, endsAt: solicitud.fin, accepted: true },
  });
  if (error) throw error;
}

export async function listarSolicitudes(): Promise<SolicitudPrestamo[]> {
  if (!supabase) throw new Error('El servicio no está disponible.');
  const { data, error } = await supabase.rpc('manage_laboratory_requests', { p_action: 'list' });
  if (error) throw error;
  return Array.isArray(data) ? data as SolicitudPrestamo[] : [];
}

export async function gestionarSolicitud(action: 'deliver' | 'return' | 'cancel', id: string) {
  if (!supabase) throw new Error('El servicio no está disponible.');
  const { error } = await supabase.rpc('manage_laboratory_requests', { p_action: action, p_id: id });
  if (error) throw error;
}

export type PrestamoRecepcion = Pick<SolicitudPrestamo, 'id' | 'applicant' | 'equipment' | 'room' | 'delivered_at'>;
export async function prestamosRecepcion(action: 'list' | 'return' = 'list', id?: string): Promise<PrestamoRecepcion[]> {
  if (!supabase) throw new Error('El servicio no está disponible.');
  const { data, error } = await supabase.rpc('reception_laboratory_returns', { p_action: action, p_id: id });
  if (error) throw error;
  return Array.isArray(data) ? data as PrestamoRecepcion[] : [];
}
