import type { BitacoraLaboratorio } from '@/tipos/dominio';

export function esTrabajoAbierto(item: Pick<BitacoraLaboratorio, 'estado'>) {
  return item.estado === 'pendiente' || item.estado === 'en_proceso';
}
