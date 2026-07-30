import {
  BitacoraLaboratorio,
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
  EstadoTrabajoLaboratorio,
  PrestamoLaboratorio,
  PrioridadLaboratorio,
} from '@/tipos/dominio';

const STORAGE_KEY = 'acad-laboratorio-v1';

export type LaboratorioState = {
  equipos: EquipoLaboratorio[];
  bitacoras: BitacoraLaboratorio[];
  prestamos: PrestamoLaboratorio[];
};

export type EquipoLaboratorioInput = Omit<EquipoLaboratorio, 'id' | 'createdAt' | 'updatedAt'>;

export type BitacoraLaboratorioInput = Omit<BitacoraLaboratorio, 'id' | 'createdAt'>;

export type PrestamoLaboratorioInput = Omit<PrestamoLaboratorio, 'id' | 'createdAt'>;

const estadoEquipoLabels: Record<EstadoEquipoLaboratorio, string> = {
  operativo: 'Operativo',
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

function emptyState(): LaboratorioState {
  return {
    equipos: [],
    bitacoras: [],
    prestamos: [],
  };
}

function readState(): LaboratorioState {
  if (typeof window === 'undefined') return emptyState();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();

  try {
    const parsed = JSON.parse(raw) as Partial<LaboratorioState>;
    return {
      equipos: Array.isArray(parsed.equipos) ? parsed.equipos : [],
      bitacoras: Array.isArray(parsed.bitacoras) ? parsed.bitacoras : [],
      prestamos: Array.isArray(parsed.prestamos) ? parsed.prestamos : [],
    };
  } catch {
    return emptyState();
  }
}

function writeState(state: LaboratorioState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function listLaboratorioData(): LaboratorioState {
  const state = readState();
  return {
    equipos: [...state.equipos].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
    bitacoras: [...state.bitacoras].sort((first, second) => second.fecha.localeCompare(first.fecha)),
    prestamos: [...state.prestamos].sort((first, second) => second.fechaPrestamo.localeCompare(first.fechaPrestamo)),
  };
}

export function createEquipoLaboratorio(input: EquipoLaboratorioInput): EquipoLaboratorio {
  const state = readState();
  const now = new Date().toISOString();
  const equipo: EquipoLaboratorio = {
    ...input,
    id: createId('equipo'),
    createdAt: now,
    updatedAt: now,
  };

  writeState({ ...state, equipos: [equipo, ...state.equipos] });
  return equipo;
}

export function updateEquipoLaboratorio(id: string, input: EquipoLaboratorioInput): EquipoLaboratorio {
  const state = readState();
  const current = state.equipos.find((equipo) => equipo.id === id);
  if (!current) throw new Error('No se encontro el equipo.');

  const updated: EquipoLaboratorio = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  writeState({
    ...state,
    equipos: state.equipos.map((equipo) => (equipo.id === id ? updated : equipo)),
  });

  return updated;
}

export function deleteEquipoLaboratorio(id: string) {
  const state = readState();
  writeState({
    ...state,
    equipos: state.equipos.filter((equipo) => equipo.id !== id),
  });
}

export function createBitacoraLaboratorio(input: BitacoraLaboratorioInput): BitacoraLaboratorio {
  const state = readState();
  const bitacora: BitacoraLaboratorio = {
    ...input,
    id: createId('bitacora'),
    createdAt: new Date().toISOString(),
  };

  writeState({ ...state, bitacoras: [bitacora, ...state.bitacoras] });
  return bitacora;
}

export function updateBitacoraLaboratorio(id: string, input: BitacoraLaboratorioInput): BitacoraLaboratorio {
  const state = readState();
  const current = state.bitacoras.find((bitacora) => bitacora.id === id);
  if (!current) throw new Error('No se encontro la bitacora.');

  const updated: BitacoraLaboratorio = {
    ...current,
    ...input,
  };

  writeState({
    ...state,
    bitacoras: state.bitacoras.map((bitacora) => (bitacora.id === id ? updated : bitacora)),
  });

  return updated;
}

export function deleteBitacoraLaboratorio(id: string) {
  const state = readState();
  writeState({
    ...state,
    bitacoras: state.bitacoras.filter((bitacora) => bitacora.id !== id),
  });
}

export function createPrestamoLaboratorio(input: PrestamoLaboratorioInput): PrestamoLaboratorio {
  const state = readState();
  const prestamo: PrestamoLaboratorio = {
    ...input,
    id: createId('prestamo'),
    createdAt: new Date().toISOString(),
  };

  writeState({ ...state, prestamos: [prestamo, ...state.prestamos] });
  return prestamo;
}

export function updatePrestamoLaboratorio(id: string, input: PrestamoLaboratorioInput): PrestamoLaboratorio {
  const state = readState();
  const current = state.prestamos.find((prestamo) => prestamo.id === id);
  if (!current) throw new Error('No se encontro el prestamo.');

  const updated: PrestamoLaboratorio = {
    ...current,
    ...input,
  };

  writeState({
    ...state,
    prestamos: state.prestamos.map((prestamo) => (prestamo.id === id ? updated : prestamo)),
  });

  return updated;
}

export function deletePrestamoLaboratorio(id: string) {
  const state = readState();
  writeState({
    ...state,
    prestamos: state.prestamos.filter((prestamo) => prestamo.id !== id),
  });
}

function csvEscape(value: string | number | null | undefined) {
  const normalized = String(value ?? '');
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function exportLaboratorioCsv(state: LaboratorioState) {
  const lines = [
    ['TIPO', 'FECHA', 'TITULO/EQUIPO', 'RESPONSABLE', 'ESTADO', 'DETALLE'].map(csvEscape).join(','),
    ...state.bitacoras.map((item) =>
      [
        'BITACORA',
        item.fecha,
        item.titulo,
        item.responsable,
        estadoTrabajoLabels[item.estado],
        item.descripcion,
      ]
        .map(csvEscape)
        .join(','),
    ),
    ...state.equipos.map((item) =>
      ['EQUIPO', item.updatedAt, item.nombre, item.ubicacion, estadoEquipoLabels[item.estado], item.observaciones]
        .map(csvEscape)
        .join(','),
    ),
    ...state.prestamos.map((item) =>
      ['PRESTAMO', item.fechaPrestamo, item.equipo, item.responsableEntrega, item.estado, item.entregadoA]
        .map(csvEscape)
        .join(','),
    ),
  ];

  return lines.join('\n');
}

export function buildLaboratorioReport(state: LaboratorioState) {
  const abiertas = state.bitacoras.filter((item) => item.estado !== 'cerrado').length;
  const pendientes = state.equipos.filter((item) => item.estado !== 'operativo').length;
  const prestamosActivos = state.prestamos.filter((item) => item.estado === 'activo').length;

  return [
    'UNIVERSIDAD AUTONOMA DE CHIRIQUI',
    'FACULTAD DE ECONOMIA',
    'INFORME DEL LABORATORIO DE INFORMATICA',
    '',
    `Generado: ${new Date().toLocaleString('es-PA')}`,
    '',
    `Bitacoras registradas: ${state.bitacoras.length}`,
    `Trabajos abiertos: ${abiertas}`,
    `Equipos inventariados: ${state.equipos.length}`,
    `Equipos con atencion pendiente: ${pendientes}`,
    `Prestamos activos: ${prestamosActivos}`,
    '',
    'ULTIMAS BITACORAS',
    ...state.bitacoras.slice(0, 10).map((item) =>
      `- ${item.fecha} | ${item.titulo} | ${prioridadLabels[item.prioridad]} | ${estadoTrabajoLabels[item.estado]}`,
    ),
  ].join('\n');
}
