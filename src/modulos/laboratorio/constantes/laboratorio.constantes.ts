import type { LaboratorioState } from '@/servicios/laboratorio.servicio';
import type { EstadoTrabajoLaboratorio, PrioridadLaboratorio } from '@/tipos/dominio';
import type { LabTab } from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';

const emptyState: LaboratorioState = {
  fichas: [],
  equipos: [],
  secciones: [],
  categoriasEquipo: [],
  estadosEquipo: [],
  bitacoras: [],
  prestamos: [],
  descartes: [],
  asignacionesComponentes: [],
};

const tabLabels: Record<LabTab, string> = {
  inicio: 'Inicio',
  mapa: 'Mapa',
  fichas: 'Ficha tecnica',
  bitacoras: 'Mantenimientos e incidencias',
  inventario: 'Inventario',
  descartes: 'Descartes',
  prestamos: 'Prestamos',
  informes: 'Informes',
};

const labTabOrder: LabTab[] = ['inicio', 'inventario', 'fichas', 'bitacoras', 'descartes', 'prestamos', 'informes', 'mapa'];

const aplicacionesBase = [
  'Windows',
  'Linux',
  'Office',
  'LibreOffice',
  'Visual Basic',
  'Navegador',
  'Antivirus',
  'WinRAR',
  'Adobe Reader',
  'SPSS',
] as const;

const caracteristicasBase = ['Tarjeta madre', 'Memoria', 'Procesador', 'Disco duro', 'Sistema operativo'] as const;

const inventarioBase = ['Torre', 'Monitor', 'Teclado', 'Mouse', 'UPS', 'Impresora'] as const;
const filtroComponentesAsignados = 'Componentes asignados';

const estadoEquipoLabels: Record<string, string> = {
  operativo: 'Operativo',
  mantenimiento: 'Mantenimiento',
  en_reparacion: 'En reparacion',
  prestado: 'Prestado',
  baja: 'Baja',
  pendiente_revision: 'Pendiente de revision',
};

const estadoTrabajoLabels: Record<EstadoTrabajoLaboratorio, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

const prioridadLabels: Record<PrioridadLaboratorio, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Critica',
};

export {
  aplicacionesBase,
  caracteristicasBase,
  emptyState,
  estadoEquipoLabels,
  estadoTrabajoLabels,
  filtroComponentesAsignados,
  inventarioBase,
  labTabOrder,
  prioridadLabels,
  tabLabels,
};
