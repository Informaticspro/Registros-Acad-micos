import { supabase } from '@/infraestructura/supabase';
export type CambioPrograma = { accion: 'instalar' | 'actualizar' | 'retirar'; nombre: string; version: string; descripcion: string; requestId: string };

export async function registrarCambioPrograma(equipoId: string, cambio: CambioPrograma) {
  if (!supabase) throw new Error('El servicio no está disponible.');
  const { error } = await supabase.rpc('record_equipment_software', {
    p_equipment: equipoId, p_request: cambio.requestId, p_action: cambio.accion,
    p_name: cambio.nombre, p_version: cambio.version, p_description: cambio.descripcion,
  });
  if (error) throw new Error(error.message || 'No se pudo registrar el programa.');
}
