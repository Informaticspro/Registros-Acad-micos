import { isDemoMode } from '@/infraestructura/entorno';
import { supabase } from '@/infraestructura/supabase';
import {
  AplicacionFichaLaboratorio,
  BitacoraLaboratorio,
  CaracteristicaFichaLaboratorio,
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
  EstadoTrabajoLaboratorio,
  FichaTecnicaLaboratorio,
  InventarioFichaLaboratorio,
  PrestamoLaboratorio,
  PrioridadLaboratorio,
} from '@/tipos/dominio';
import { Json } from '@/tipos/supabase';

const STORAGE_KEY = 'acad-laboratorio-v1';

export type LaboratorioState = {
  fichas: FichaTecnicaLaboratorio[];
  equipos: EquipoLaboratorio[];
  bitacoras: BitacoraLaboratorio[];
  prestamos: PrestamoLaboratorio[];
};

export type LaboratorioSaveContext = {
  organizationId: string | null;
  userId: string;
};

export type FichaTecnicaLaboratorioInput = Omit<FichaTecnicaLaboratorio, 'id' | 'createdAt' | 'updatedAt'>;

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
    fichas: [],
    equipos: [],
    bitacoras: [],
    prestamos: [],
  };
}

function useLocalStorageFallback() {
  return !supabase && isDemoMode();
}

function readState(): LaboratorioState {
  if (typeof window === 'undefined') return emptyState();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();

  try {
    const parsed = JSON.parse(raw) as Partial<LaboratorioState>;
    return {
      fichas: Array.isArray(parsed.fichas) ? parsed.fichas : [],
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

function requireSupabase() {
  if (!supabase) throw new Error('Supabase no esta configurado.');
  return supabase;
}

function requireContext(context: LaboratorioSaveContext) {
  if (!context.organizationId) {
    throw new Error('Tu usuario no tiene organizacion asignada. Revisa la tabla profiles.');
  }
}

function jsonArray<T>(value: Json, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function mapFicha(row: {
  id: string;
  sheet_date: string;
  pc: string;
  ip_address: string;
  location: string;
  responsible: string;
  assigned_user: string;
  access_reference: string;
  applications: Json;
  technical_specs: Json;
  inventory: Json;
  actions: Json;
  general_notes: string;
  created_at: string;
  updated_at: string;
}): FichaTecnicaLaboratorio {
  return {
    id: row.id,
    fecha: row.sheet_date,
    pc: row.pc,
    direccionIp: row.ip_address,
    ubicacion: row.location,
    responsable: row.responsible,
    usuarioAsignado: row.assigned_user,
    referenciaAcceso: row.access_reference,
    aplicaciones: jsonArray<AplicacionFichaLaboratorio>(row.applications, []),
    caracteristicas: jsonArray<CaracteristicaFichaLaboratorio>(row.technical_specs, []),
    inventario: jsonArray<InventarioFichaLaboratorio>(row.inventory, []),
    acciones: jsonArray(row.actions, []),
    observacionGeneral: row.general_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEquipo(row: {
  id: string;
  code: string;
  name: string;
  category: string;
  brand_model: string;
  serial_number: string;
  location: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}): EquipoLaboratorio {
  return {
    id: row.id,
    codigo: row.code,
    nombre: row.name,
    categoria: row.category,
    marcaModelo: row.brand_model,
    serie: row.serial_number,
    ubicacion: row.location,
    estado: row.status as EstadoEquipoLaboratorio,
    observaciones: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBitacora(row: {
  id: string;
  work_date: string;
  work_type: string;
  title: string;
  description: string;
  responsible: string;
  priority: string;
  status: string;
  source_equipment: string;
  target_equipment: string;
  location: string;
  evidence_title: string;
  evidence_url: string;
  created_at: string;
}): BitacoraLaboratorio {
  return {
    id: row.id,
    fecha: row.work_date,
    tipoTrabajo: row.work_type,
    titulo: row.title,
    descripcion: row.description,
    responsable: row.responsible,
    prioridad: row.priority as PrioridadLaboratorio,
    estado: row.status as EstadoTrabajoLaboratorio,
    equipoOrigen: row.source_equipment,
    equipoDestino: row.target_equipment,
    ubicacion: row.location,
    evidenciaTitulo: row.evidence_title,
    evidenciaUrl: row.evidence_url,
    createdAt: row.created_at,
  };
}

function mapPrestamo(row: {
  id: string;
  equipment: string;
  delivered_to: string;
  beneficiary_type: string;
  document_id: string;
  delivered_by: string;
  loaned_at: string;
  returned_at: string | null;
  status: string;
  notes: string;
  created_at: string;
}): PrestamoLaboratorio {
  return {
    id: row.id,
    equipo: row.equipment,
    entregadoA: row.delivered_to,
    tipoBeneficiario: row.beneficiary_type as PrestamoLaboratorio['tipoBeneficiario'],
    documento: row.document_id,
    responsableEntrega: row.delivered_by,
    fechaPrestamo: row.loaned_at,
    fechaDevolucion: row.returned_at,
    estado: row.status as PrestamoLaboratorio['estado'],
    observaciones: row.notes,
    createdAt: row.created_at,
  };
}

export async function listLaboratorioData(): Promise<LaboratorioState> {
  if (useLocalStorageFallback()) {
    const state = readState();
    return {
      fichas: [...state.fichas].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
      equipos: [...state.equipos].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
      bitacoras: [...state.bitacoras].sort((first, second) => second.fecha.localeCompare(first.fecha)),
      prestamos: [...state.prestamos].sort((first, second) => second.fechaPrestamo.localeCompare(first.fechaPrestamo)),
    };
  }

  const client = requireSupabase();
  const [fichas, equipos, bitacoras, prestamos] = await Promise.all([
    client.from('laboratory_technical_sheets').select('*').order('updated_at', { ascending: false }),
    client.from('laboratory_equipment').select('*').order('updated_at', { ascending: false }),
    client.from('laboratory_logs').select('*').order('work_date', { ascending: false }),
    client.from('laboratory_loans').select('*').order('loaned_at', { ascending: false }),
  ]);

  if (fichas.error) throw fichas.error;
  if (equipos.error) throw equipos.error;
  if (bitacoras.error) throw bitacoras.error;
  if (prestamos.error) throw prestamos.error;

  return {
    fichas: (fichas.data ?? []).map(mapFicha),
    equipos: (equipos.data ?? []).map(mapEquipo),
    bitacoras: (bitacoras.data ?? []).map(mapBitacora),
    prestamos: (prestamos.data ?? []).map(mapPrestamo),
  };
}

export async function createFichaTecnicaLaboratorio(
  input: FichaTecnicaLaboratorioInput,
  context: LaboratorioSaveContext,
): Promise<FichaTecnicaLaboratorio> {
  if (useLocalStorageFallback()) {
    const state = readState();
    const now = new Date().toISOString();
    const ficha: FichaTecnicaLaboratorio = { ...input, id: createId('ficha'), createdAt: now, updatedAt: now };
    writeState({ ...state, fichas: [ficha, ...state.fichas] });
    return ficha;
  }

  requireContext(context);
  const { data, error } = await requireSupabase()
    .from('laboratory_technical_sheets')
    .insert({
      organization_id: context.organizationId,
      sheet_date: input.fecha,
      pc: input.pc,
      ip_address: input.direccionIp,
      location: input.ubicacion,
      responsible: input.responsable,
      assigned_user: input.usuarioAsignado,
      access_reference: input.referenciaAcceso,
      applications: input.aplicaciones,
      technical_specs: input.caracteristicas,
      inventory: input.inventario,
      actions: input.acciones,
      general_notes: input.observacionGeneral,
      created_by: context.userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapFicha(data);
}

export async function updateFichaTecnicaLaboratorio(
  id: string,
  input: FichaTecnicaLaboratorioInput,
): Promise<FichaTecnicaLaboratorio> {
  if (useLocalStorageFallback()) {
    const state = readState();
    const current = state.fichas.find((ficha) => ficha.id === id);
    if (!current) throw new Error('No se encontro la ficha tecnica.');
    const updated: FichaTecnicaLaboratorio = { ...current, ...input, updatedAt: new Date().toISOString() };
    writeState({ ...state, fichas: state.fichas.map((ficha) => (ficha.id === id ? updated : ficha)) });
    return updated;
  }

  const { data, error } = await requireSupabase()
    .from('laboratory_technical_sheets')
    .update({
      sheet_date: input.fecha,
      pc: input.pc,
      ip_address: input.direccionIp,
      location: input.ubicacion,
      responsible: input.responsable,
      assigned_user: input.usuarioAsignado,
      access_reference: input.referenciaAcceso,
      applications: input.aplicaciones,
      technical_specs: input.caracteristicas,
      inventory: input.inventario,
      actions: input.acciones,
      general_notes: input.observacionGeneral,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapFicha(data);
}

export async function deleteFichaTecnicaLaboratorio(id: string) {
  if (useLocalStorageFallback()) {
    const state = readState();
    writeState({ ...state, fichas: state.fichas.filter((ficha) => ficha.id !== id) });
    return;
  }

  const { error } = await requireSupabase().from('laboratory_technical_sheets').delete().eq('id', id);
  if (error) throw error;
}

export async function createEquipoLaboratorio(
  input: EquipoLaboratorioInput,
  context: LaboratorioSaveContext,
): Promise<EquipoLaboratorio> {
  if (useLocalStorageFallback()) {
    const state = readState();
    const now = new Date().toISOString();
    const equipo: EquipoLaboratorio = { ...input, id: createId('equipo'), createdAt: now, updatedAt: now };
    writeState({ ...state, equipos: [equipo, ...state.equipos] });
    return equipo;
  }

  requireContext(context);
  const { data, error } = await requireSupabase()
    .from('laboratory_equipment')
    .insert({
      organization_id: context.organizationId,
      code: input.codigo,
      name: input.nombre,
      category: input.categoria,
      brand_model: input.marcaModelo,
      serial_number: input.serie,
      location: input.ubicacion,
      status: input.estado,
      notes: input.observaciones,
      created_by: context.userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapEquipo(data);
}

export async function updateEquipoLaboratorio(id: string, input: EquipoLaboratorioInput): Promise<EquipoLaboratorio> {
  if (useLocalStorageFallback()) {
    const state = readState();
    const current = state.equipos.find((equipo) => equipo.id === id);
    if (!current) throw new Error('No se encontro el equipo.');
    const updated: EquipoLaboratorio = { ...current, ...input, updatedAt: new Date().toISOString() };
    writeState({ ...state, equipos: state.equipos.map((equipo) => (equipo.id === id ? updated : equipo)) });
    return updated;
  }

  const { data, error } = await requireSupabase()
    .from('laboratory_equipment')
    .update({
      code: input.codigo,
      name: input.nombre,
      category: input.categoria,
      brand_model: input.marcaModelo,
      serial_number: input.serie,
      location: input.ubicacion,
      status: input.estado,
      notes: input.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapEquipo(data);
}

export async function deleteEquipoLaboratorio(id: string) {
  if (useLocalStorageFallback()) {
    const state = readState();
    writeState({ ...state, equipos: state.equipos.filter((equipo) => equipo.id !== id) });
    return;
  }

  const { error } = await requireSupabase().from('laboratory_equipment').delete().eq('id', id);
  if (error) throw error;
}

export async function createBitacoraLaboratorio(
  input: BitacoraLaboratorioInput,
  context: LaboratorioSaveContext,
): Promise<BitacoraLaboratorio> {
  if (useLocalStorageFallback()) {
    const state = readState();
    const bitacora: BitacoraLaboratorio = { ...input, id: createId('bitacora'), createdAt: new Date().toISOString() };
    writeState({ ...state, bitacoras: [bitacora, ...state.bitacoras] });
    return bitacora;
  }

  requireContext(context);
  const { data, error } = await requireSupabase()
    .from('laboratory_logs')
    .insert({
      organization_id: context.organizationId,
      work_date: input.fecha,
      work_type: input.tipoTrabajo,
      title: input.titulo,
      description: input.descripcion,
      responsible: input.responsable,
      priority: input.prioridad,
      status: input.estado,
      source_equipment: input.equipoOrigen,
      target_equipment: input.equipoDestino,
      location: input.ubicacion,
      evidence_title: input.evidenciaTitulo,
      evidence_url: input.evidenciaUrl,
      created_by: context.userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapBitacora(data);
}

export async function updateBitacoraLaboratorio(id: string, input: BitacoraLaboratorioInput): Promise<BitacoraLaboratorio> {
  if (useLocalStorageFallback()) {
    const state = readState();
    const current = state.bitacoras.find((bitacora) => bitacora.id === id);
    if (!current) throw new Error('No se encontro la bitacora.');
    const updated: BitacoraLaboratorio = { ...current, ...input };
    writeState({ ...state, bitacoras: state.bitacoras.map((bitacora) => (bitacora.id === id ? updated : bitacora)) });
    return updated;
  }

  const { data, error } = await requireSupabase()
    .from('laboratory_logs')
    .update({
      work_date: input.fecha,
      work_type: input.tipoTrabajo,
      title: input.titulo,
      description: input.descripcion,
      responsible: input.responsable,
      priority: input.prioridad,
      status: input.estado,
      source_equipment: input.equipoOrigen,
      target_equipment: input.equipoDestino,
      location: input.ubicacion,
      evidence_title: input.evidenciaTitulo,
      evidence_url: input.evidenciaUrl,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapBitacora(data);
}

export async function deleteBitacoraLaboratorio(id: string) {
  if (useLocalStorageFallback()) {
    const state = readState();
    writeState({ ...state, bitacoras: state.bitacoras.filter((bitacora) => bitacora.id !== id) });
    return;
  }

  const { error } = await requireSupabase().from('laboratory_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function createPrestamoLaboratorio(
  input: PrestamoLaboratorioInput,
  context: LaboratorioSaveContext,
): Promise<PrestamoLaboratorio> {
  if (useLocalStorageFallback()) {
    const state = readState();
    const prestamo: PrestamoLaboratorio = { ...input, id: createId('prestamo'), createdAt: new Date().toISOString() };
    writeState({ ...state, prestamos: [prestamo, ...state.prestamos] });
    return prestamo;
  }

  requireContext(context);
  const { data, error } = await requireSupabase()
    .from('laboratory_loans')
    .insert({
      organization_id: context.organizationId,
      equipment: input.equipo,
      delivered_to: input.entregadoA,
      beneficiary_type: input.tipoBeneficiario,
      document_id: input.documento,
      delivered_by: input.responsableEntrega,
      loaned_at: input.fechaPrestamo,
      returned_at: input.fechaDevolucion,
      status: input.estado,
      notes: input.observaciones,
      created_by: context.userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapPrestamo(data);
}

export async function updatePrestamoLaboratorio(id: string, input: PrestamoLaboratorioInput): Promise<PrestamoLaboratorio> {
  if (useLocalStorageFallback()) {
    const state = readState();
    const current = state.prestamos.find((prestamo) => prestamo.id === id);
    if (!current) throw new Error('No se encontro el prestamo.');
    const updated: PrestamoLaboratorio = { ...current, ...input };
    writeState({ ...state, prestamos: state.prestamos.map((prestamo) => (prestamo.id === id ? updated : prestamo)) });
    return updated;
  }

  const { data, error } = await requireSupabase()
    .from('laboratory_loans')
    .update({
      equipment: input.equipo,
      delivered_to: input.entregadoA,
      beneficiary_type: input.tipoBeneficiario,
      document_id: input.documento,
      delivered_by: input.responsableEntrega,
      loaned_at: input.fechaPrestamo,
      returned_at: input.fechaDevolucion,
      status: input.estado,
      notes: input.observaciones,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapPrestamo(data);
}

export async function deletePrestamoLaboratorio(id: string) {
  if (useLocalStorageFallback()) {
    const state = readState();
    writeState({ ...state, prestamos: state.prestamos.filter((prestamo) => prestamo.id !== id) });
    return;
  }

  const { error } = await requireSupabase().from('laboratory_loans').delete().eq('id', id);
  if (error) throw error;
}

function csvEscape(value: string | number | null | undefined) {
  const normalized = String(value ?? '');
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function exportLaboratorioCsv(state: LaboratorioState) {
  const lines = [
    ['TIPO', 'FECHA', 'TITULO/EQUIPO', 'RESPONSABLE', 'ESTADO', 'DETALLE'].map(csvEscape).join(','),
    ...state.fichas.map((item) =>
      ['FICHA_TECNICA', item.fecha, item.pc, item.responsable, item.ubicacion, item.observacionGeneral]
        .map(csvEscape)
        .join(','),
    ),
    ...state.bitacoras.map((item) =>
      ['BITACORA', item.fecha, item.titulo, item.responsable, estadoTrabajoLabels[item.estado], item.descripcion]
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
    `Fichas tecnicas registradas: ${state.fichas.length}`,
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
