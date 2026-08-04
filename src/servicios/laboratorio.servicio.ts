import { isDemoMode } from '@/infraestructura/entorno';
import { supabase } from '@/infraestructura/supabase';
import { utils, writeFile } from 'xlsx-js-style';
import {
  AplicacionFichaLaboratorio,
  BitacoraLaboratorio,
  ClaseRegistroLaboratorio,
  CatalogoLaboratorio,
  CaracteristicaFichaLaboratorio,
  DescarteLaboratorio,
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
  EstadoTrabajoLaboratorio,
  FichaTecnicaLaboratorio,
  InventarioFichaLaboratorio,
  PrestamoLaboratorio,
  PrioridadLaboratorio,
  SeccionLaboratorio,
} from '@/tipos/dominio';
import { Json } from '@/tipos/supabase';

const STORAGE_KEY = 'acad-laboratorio-v1';

export type LaboratorioState = {
  fichas: FichaTecnicaLaboratorio[];
  equipos: EquipoLaboratorio[];
  secciones: SeccionLaboratorio[];
  categoriasEquipo: CatalogoLaboratorio[];
  estadosEquipo: CatalogoLaboratorio[];
  bitacoras: BitacoraLaboratorio[];
  prestamos: PrestamoLaboratorio[];
  descartes: DescarteLaboratorio[];
};

export type LaboratorioSaveContext = {
  organizationId: string | null;
  userId: string;
};

export type FichaTecnicaLaboratorioInput = Omit<FichaTecnicaLaboratorio, 'id' | 'createdAt' | 'updatedAt'>;

export type EquipoLaboratorioInput = Omit<EquipoLaboratorio, 'id' | 'registradoPor' | 'createdAt' | 'updatedAt'>;

export type SeccionLaboratorioInput = Omit<SeccionLaboratorio, 'id' | 'createdAt' | 'updatedAt'>;

export type CatalogoLaboratorioInput = Omit<CatalogoLaboratorio, 'id' | 'tipo' | 'createdAt' | 'updatedAt'>;

export type BitacoraLaboratorioInput = Omit<BitacoraLaboratorio, 'id' | 'createdAt'>;

export type PrestamoLaboratorioInput = Omit<PrestamoLaboratorio, 'id' | 'createdAt'>;

export type DescarteLaboratorioInput = Omit<DescarteLaboratorio, 'id' | 'createdAt'>;

export type ImportEquiposLaboratorioResult = {
  total: number;
  created: number;
  updated: number;
  ignored: number;
};

function shouldRetryLegacyLaboratoryLog(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const details = [
    'message' in error ? String(error.message) : '',
    'details' in error ? String(error.details) : '',
    'hint' in error ? String(error.hint) : '',
    'code' in error ? String(error.code) : '',
  ]
    .join(' ')
    .toLowerCase();

  return (
    details.includes('entry_type') ||
    details.includes('equipment_id') ||
    details.includes('schema cache') ||
    details.includes('pgrst204')
  );
}

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

const excelBorderStyle = {
  top: { style: 'thin', color: { rgb: 'D9E2EC' } },
  right: { style: 'thin', color: { rgb: 'D9E2EC' } },
  bottom: { style: 'thin', color: { rgb: 'D9E2EC' } },
  left: { style: 'thin', color: { rgb: 'D9E2EC' } },
};

const excelTitleStyle = {
  font: { bold: true, sz: 15, color: { rgb: '102A43' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const excelSubtitleStyle = {
  font: { bold: true, sz: 12, color: { rgb: '334E68' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const excelSectionStyle = {
  font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  fill: { fgColor: { rgb: '0F5132' } },
};

const excelGeneratedStyle = {
  font: { italic: true, sz: 10, color: { rgb: '486581' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const excelHeaderStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  fill: { fgColor: { rgb: '1F2937' } },
  border: excelBorderStyle,
};

const excelCellStyle = {
  alignment: { vertical: 'center', wrapText: true },
  border: excelBorderStyle,
};

const excelAlternateCellStyle = {
  ...excelCellStyle,
  fill: { fgColor: { rgb: 'F8FAFC' } },
};

const seccionesBaseLaboratorio = [
  'ORD',
  'Biblioteca',
  'Laboratorio 1',
  'Laboratorio 2',
  'Decanato',
  'Reparacion',
  'Deposito',
  'Seccion de Tecnologia',
] as const;

const categoriasBaseEquipo = ['Computadora', 'Laptop', 'Monitor', 'Proyector', 'Impresora', 'Redes', 'Accesorio'] as const;

const estadosBaseEquipo = [
  { nombre: 'operativo', descripcion: 'Operativo' },
  { nombre: 'mantenimiento', descripcion: 'Mantenimiento' },
  { nombre: 'en_reparacion', descripcion: 'En reparacion' },
  { nombre: 'prestado', descripcion: 'Prestado' },
  { nombre: 'pendiente_revision', descripcion: 'Pendiente de revision' },
  { nombre: 'baja', descripcion: 'Baja' },
] as const;

function defaultSecciones(): SeccionLaboratorio[] {
  const now = new Date().toISOString();
  return seccionesBaseLaboratorio.map((nombre, index) => ({
    id: `base-${index + 1}`,
    nombre,
    descripcion: '',
    createdAt: now,
    updatedAt: now,
  }));
}

function defaultCatalogos(tipo: CatalogoLaboratorio['tipo']): CatalogoLaboratorio[] {
  const now = new Date().toISOString();
  const items =
    tipo === 'categoria_equipo'
      ? categoriasBaseEquipo.map((nombre) => ({ nombre, descripcion: '' }))
      : estadosBaseEquipo;

  return items.map((item, index) => ({
    id: `base-${tipo}-${index + 1}`,
    tipo,
    nombre: item.nombre,
    descripcion: item.descripcion,
    createdAt: now,
    updatedAt: now,
  }));
}

function emptyState(): LaboratorioState {
  return {
    fichas: [],
    equipos: [],
    secciones: defaultSecciones(),
    categoriasEquipo: defaultCatalogos('categoria_equipo'),
    estadosEquipo: defaultCatalogos('estado_equipo'),
    bitacoras: [],
    prestamos: [],
    descartes: [],
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
      secciones: Array.isArray(parsed.secciones) ? parsed.secciones : defaultSecciones(),
      categoriasEquipo: Array.isArray(parsed.categoriasEquipo)
        ? parsed.categoriasEquipo
        : defaultCatalogos('categoria_equipo'),
      estadosEquipo: Array.isArray(parsed.estadosEquipo)
        ? parsed.estadosEquipo
        : defaultCatalogos('estado_equipo'),
      bitacoras: Array.isArray(parsed.bitacoras) ? parsed.bitacoras : [],
      prestamos: Array.isArray(parsed.prestamos) ? parsed.prestamos : [],
      descartes: Array.isArray(parsed.descartes) ? parsed.descartes : [],
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
  created_by?: string | null;
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
    registradoPor: row.created_by ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSeccion(row: {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}): SeccionLaboratorio {
  return {
    id: row.id,
    nombre: row.name,
    descripcion: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCatalogo(row: {
  id: string;
  catalog_type: CatalogoLaboratorio['tipo'];
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}): CatalogoLaboratorio {
  return {
    id: row.id,
    tipo: row.catalog_type,
    nombre: row.name,
    descripcion: row.description,
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
  entry_type?: string;
  equipment_id?: string | null;
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
    clase: (row.entry_type ?? 'mantenimiento') as ClaseRegistroLaboratorio,
    equipoId: row.equipment_id ?? '',
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

function mapDescarte(row: {
  id: string;
  discard_date: string;
  equipment_id?: string | null;
  inventory_code: string;
  equipment: string;
  brand: string;
  model: string;
  serial_number: string;
  detail: string;
  location: string;
  responsible: string;
  created_at: string;
}): DescarteLaboratorio {
  return {
    id: row.id,
    fecha: row.discard_date,
    equipoId: row.equipment_id ?? '',
    inventario: row.inventory_code,
    equipo: row.equipment,
    marca: row.brand,
    modelo: row.model,
    serie: row.serial_number,
    detalle: row.detail,
    ubicacion: row.location,
    responsable: row.responsible,
    createdAt: row.created_at,
  };
}

export async function listLaboratorioData(): Promise<LaboratorioState> {
  if (useLocalStorageFallback()) {
    const state = readState();
    return {
      fichas: [...state.fichas].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
      equipos: [...state.equipos].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
      secciones: [...state.secciones].sort((first, second) => first.nombre.localeCompare(second.nombre)),
      categoriasEquipo: [...state.categoriasEquipo].sort((first, second) => first.nombre.localeCompare(second.nombre)),
      estadosEquipo: [...state.estadosEquipo].sort((first, second) => first.nombre.localeCompare(second.nombre)),
      bitacoras: [...state.bitacoras].sort((first, second) => second.fecha.localeCompare(first.fecha)),
      prestamos: [...state.prestamos].sort((first, second) => second.fechaPrestamo.localeCompare(first.fechaPrestamo)),
      descartes: [...state.descartes].sort((first, second) => second.fecha.localeCompare(first.fecha)),
    };
  }

  const client = requireSupabase();
  const [fichas, equipos, secciones, catalogos, bitacoras, prestamos, descartes] = await Promise.all([
    client.from('laboratory_technical_sheets').select('*').order('updated_at', { ascending: false }),
    client.from('laboratory_equipment').select('*').order('updated_at', { ascending: false }),
    client.from('laboratory_sections').select('*').order('name', { ascending: true }),
    client.from('laboratory_catalogs').select('*').order('name', { ascending: true }),
    client.from('laboratory_logs').select('*').order('work_date', { ascending: false }),
    client.from('laboratory_loans').select('*').order('loaned_at', { ascending: false }),
    (client as any).from('laboratory_discards').select('*').order('discard_date', { ascending: false }),
  ]);

  if (fichas.error) throw fichas.error;
  if (equipos.error) throw equipos.error;
  const seccionesData = secciones.error ? defaultSecciones() : (secciones.data ?? []).map(mapSeccion);
  const catalogosData = catalogos.error ? [] : (catalogos.data ?? []).map(mapCatalogo);
  const categoriasEquipo = catalogosData.filter((item) => item.tipo === 'categoria_equipo');
  const estadosEquipo = catalogosData.filter((item) => item.tipo === 'estado_equipo');
  if (bitacoras.error) throw bitacoras.error;
  if (prestamos.error) throw prestamos.error;
  if (descartes.error && !String(descartes.error.message).toLowerCase().includes('laboratory_discards')) {
    throw descartes.error;
  }

  return {
    fichas: (fichas.data ?? []).map(mapFicha),
    equipos: (equipos.data ?? []).map(mapEquipo),
    secciones: seccionesData.length > 0 ? seccionesData : defaultSecciones(),
    categoriasEquipo: categoriasEquipo.length > 0 ? categoriasEquipo : defaultCatalogos('categoria_equipo'),
    estadosEquipo: estadosEquipo.length > 0 ? estadosEquipo : defaultCatalogos('estado_equipo'),
    bitacoras: (bitacoras.data ?? []).map(mapBitacora),
    prestamos: (prestamos.data ?? []).map(mapPrestamo),
    descartes: descartes.error ? [] : (descartes.data ?? []).map(mapDescarte),
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
    const equipo: EquipoLaboratorio = { ...input, id: createId('equipo'), registradoPor: context.userId, createdAt: now, updatedAt: now };
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
    const updated: EquipoLaboratorio = { ...current, ...input, registradoPor: current.registradoPor ?? '', updatedAt: new Date().toISOString() };
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

export async function createSeccionLaboratorio(
  input: SeccionLaboratorioInput,
  context: LaboratorioSaveContext,
): Promise<SeccionLaboratorio> {
  const nombre = input.nombre.trim();
  if (!nombre) throw new Error('Ingrese el nombre de la seccion.');

  if (useLocalStorageFallback()) {
    const state = readState();
    const exists = state.secciones.some((item) => item.nombre.trim().toLowerCase() === nombre.toLowerCase());
    if (exists) throw new Error('Ya existe una seccion con ese nombre.');
    const now = new Date().toISOString();
    const seccion: SeccionLaboratorio = {
      id: createId('seccion'),
      nombre,
      descripcion: input.descripcion.trim(),
      createdAt: now,
      updatedAt: now,
    };
    writeState({ ...state, secciones: [seccion, ...state.secciones] });
    return seccion;
  }

  requireContext(context);
  const { data, error } = await requireSupabase()
    .from('laboratory_sections')
    .insert({
      organization_id: context.organizationId,
      name: nombre,
      description: input.descripcion.trim(),
      created_by: context.userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapSeccion(data);
}

export async function updateSeccionLaboratorio(
  id: string,
  input: SeccionLaboratorioInput,
): Promise<SeccionLaboratorio> {
  const nombre = input.nombre.trim();
  if (!nombre) throw new Error('Ingrese el nombre de la seccion.');

  if (useLocalStorageFallback()) {
    const state = readState();
    const current = state.secciones.find((seccion) => seccion.id === id);
    if (!current) throw new Error('No se encontro la seccion.');
    const exists = state.secciones.some(
      (item) => item.id !== id && item.nombre.trim().toLowerCase() === nombre.toLowerCase(),
    );
    if (exists) throw new Error('Ya existe una seccion con ese nombre.');
    const updated: SeccionLaboratorio = {
      ...current,
      nombre,
      descripcion: input.descripcion.trim(),
      updatedAt: new Date().toISOString(),
    };
    writeState({
      ...state,
      secciones: state.secciones.map((seccion) => (seccion.id === id ? updated : seccion)),
    });
    return updated;
  }

  const { data, error } = await requireSupabase()
    .from('laboratory_sections')
    .update({
      name: nombre,
      description: input.descripcion.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapSeccion(data);
}

export async function deleteSeccionLaboratorio(id: string) {
  if (id.startsWith('base-')) {
    throw new Error('Esta seccion base no se puede eliminar. Puede crear otra seccion personalizada.');
  }

  if (useLocalStorageFallback()) {
    const state = readState();
    const current = state.secciones.find((seccion) => seccion.id === id);
    if (!current) throw new Error('No se encontro la seccion.');
    const hasEquipment = state.equipos.some((equipo) => equipo.ubicacion === current.nombre);
    if (hasEquipment) throw new Error('No se puede eliminar una seccion que tiene equipos asignados.');
    writeState({ ...state, secciones: state.secciones.filter((seccion) => seccion.id !== id) });
    return;
  }

  const client = requireSupabase();
  const { data: current, error: currentError } = await client
    .from('laboratory_sections')
    .select('name')
    .eq('id', id)
    .single();
  if (currentError) throw currentError;

  const { count, error: countError } = await client
    .from('laboratory_equipment')
    .select('id', { count: 'exact', head: true })
    .eq('location', current.name as string);
  if (countError) throw countError;
  if ((count ?? 0) > 0) throw new Error('No se puede eliminar una seccion que tiene equipos asignados.');

  const { error } = await client.from('laboratory_sections').delete().eq('id', id);
  if (error) throw error;
}

export async function createCatalogoLaboratorio(
  tipo: CatalogoLaboratorio['tipo'],
  input: CatalogoLaboratorioInput,
  context: LaboratorioSaveContext,
): Promise<CatalogoLaboratorio> {
  const nombre = input.nombre.trim();
  if (!nombre) throw new Error('Ingrese el nombre de la opcion.');

  if (useLocalStorageFallback()) {
    const state = readState();
    const listKey = tipo === 'categoria_equipo' ? 'categoriasEquipo' : 'estadosEquipo';
    const exists = state[listKey].some((item) => item.nombre.trim().toLowerCase() === nombre.toLowerCase());
    if (exists) throw new Error('Ya existe una opcion con ese nombre.');
    const now = new Date().toISOString();
    const catalogo: CatalogoLaboratorio = {
      id: createId('catalogo'),
      tipo,
      nombre,
      descripcion: input.descripcion.trim(),
      createdAt: now,
      updatedAt: now,
    };
    writeState({ ...state, [listKey]: [catalogo, ...state[listKey]] });
    return catalogo;
  }

  requireContext(context);
  const { data, error } = await requireSupabase()
    .from('laboratory_catalogs')
    .insert({
      organization_id: context.organizationId,
      catalog_type: tipo,
      name: nombre,
      description: input.descripcion.trim(),
      created_by: context.userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapCatalogo(data);
}

export async function updateCatalogoLaboratorio(
  id: string,
  tipo: CatalogoLaboratorio['tipo'],
  input: CatalogoLaboratorioInput,
): Promise<CatalogoLaboratorio> {
  const nombre = input.nombre.trim();
  if (!nombre) throw new Error('Ingrese el nombre de la opcion.');

  if (useLocalStorageFallback()) {
    const state = readState();
    const listKey = tipo === 'categoria_equipo' ? 'categoriasEquipo' : 'estadosEquipo';
    const current = state[listKey].find((item) => item.id === id);
    if (!current) throw new Error('No se encontro la opcion.');
    const exists = state[listKey].some(
      (item) => item.id !== id && item.nombre.trim().toLowerCase() === nombre.toLowerCase(),
    );
    if (exists) throw new Error('Ya existe una opcion con ese nombre.');
    const updated: CatalogoLaboratorio = {
      ...current,
      nombre,
      descripcion: input.descripcion.trim(),
      updatedAt: new Date().toISOString(),
    };
    writeState({ ...state, [listKey]: state[listKey].map((item) => (item.id === id ? updated : item)) });
    return updated;
  }

  const { data, error } = await requireSupabase()
    .from('laboratory_catalogs')
    .update({
      name: nombre,
      description: input.descripcion.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('catalog_type', tipo)
    .select('*')
    .single();

  if (error) throw error;
  return mapCatalogo(data);
}

export async function deleteCatalogoLaboratorio(id: string, tipo: CatalogoLaboratorio['tipo']) {
  if (id.startsWith('base-')) {
    throw new Error('Esta opcion base no se puede eliminar. Puede crear otra opcion personalizada.');
  }

  if (useLocalStorageFallback()) {
    const state = readState();
    const listKey = tipo === 'categoria_equipo' ? 'categoriasEquipo' : 'estadosEquipo';
    const current = state[listKey].find((item) => item.id === id);
    if (!current) throw new Error('No se encontro la opcion.');
    const hasEquipment =
      tipo === 'categoria_equipo'
        ? state.equipos.some((equipo) => equipo.categoria === current.nombre)
        : state.equipos.some((equipo) => equipo.estado === current.nombre);
    if (hasEquipment) throw new Error('No se puede eliminar una opcion que tiene equipos asignados.');
    writeState({ ...state, [listKey]: state[listKey].filter((item) => item.id !== id) });
    return;
  }

  const client = requireSupabase();
  const { data: current, error: currentError } = await client
    .from('laboratory_catalogs')
    .select('name')
    .eq('id', id)
    .eq('catalog_type', tipo)
    .single();
  if (currentError) throw currentError;

  const field = tipo === 'categoria_equipo' ? 'category' : 'status';
  const { count, error: countError } = await client
    .from('laboratory_equipment')
    .select('id', { count: 'exact', head: true })
    .eq(field, current.name as string);
  if (countError) throw countError;
  if ((count ?? 0) > 0) throw new Error('No se puede eliminar una opcion que tiene equipos asignados.');

  const { error } = await client.from('laboratory_catalogs').delete().eq('id', id).eq('catalog_type', tipo);
  if (error) throw error;
}

export async function importEquiposLaboratorio(
  inputs: EquipoLaboratorioInput[],
  context: LaboratorioSaveContext,
): Promise<ImportEquiposLaboratorioResult> {
  const validInputs = inputs.filter((item) => item.codigo && item.nombre);
  const result: ImportEquiposLaboratorioResult = {
    total: inputs.length,
    created: 0,
    updated: 0,
    ignored: inputs.length - validInputs.length,
  };

  if (useLocalStorageFallback()) {
    const state = readState();
    const now = new Date().toISOString();
    const existingByCode = new Map(state.equipos.map((item) => [item.codigo.trim().toLowerCase(), item]));
    const nextEquipos = [...state.equipos];

    validInputs.forEach((input) => {
      const key = input.codigo.trim().toLowerCase();
      const current = existingByCode.get(key);

      if (current) {
        const updated = { ...current, ...input, updatedAt: now };
        const index = nextEquipos.findIndex((item) => item.id === current.id);
        if (index >= 0) nextEquipos[index] = updated;
        existingByCode.set(key, updated);
        result.updated += 1;
        return;
      }

      const created: EquipoLaboratorio = { ...input, id: createId('equipo'), registradoPor: context.userId, createdAt: now, updatedAt: now };
      nextEquipos.unshift(created);
      existingByCode.set(key, created);
      result.created += 1;
    });

    writeState({ ...state, equipos: nextEquipos });
    return result;
  }

  requireContext(context);
  const client = requireSupabase();
  const { data: existingRows, error } = await client.from('laboratory_equipment').select('*');
  if (error) throw error;

  const existingByCode = new Map((existingRows ?? []).map((item) => [item.code.trim().toLowerCase(), item]));

  for (const input of validInputs) {
    const key = input.codigo.trim().toLowerCase();
    const current = existingByCode.get(key);

    if (current) {
      await updateEquipoLaboratorio(current.id, input);
      result.updated += 1;
      continue;
    }

    const created = await createEquipoLaboratorio(input, context);
    existingByCode.set(key, {
      id: created.id,
      organization_id: context.organizationId!,
      code: created.codigo,
      name: created.nombre,
      category: created.categoria,
      brand_model: created.marcaModelo,
      serial_number: created.serie,
      location: created.ubicacion,
      status: created.estado,
      notes: created.observaciones,
      created_by: context.userId,
      created_at: created.createdAt,
      updated_at: created.updatedAt,
    });
    result.created += 1;
  }

  return result;
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
  const basePayload = {
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
  };
  const payload = {
    ...basePayload,
    entry_type: input.clase,
    equipment_id: input.equipoId || null,
  };
  let response = await requireSupabase().from('laboratory_logs').insert(payload).select('*').single();

  if (response.error && shouldRetryLegacyLaboratoryLog(response.error)) {
    response = await requireSupabase().from('laboratory_logs').insert(basePayload).select('*').single();
  }

  if (response.error) throw response.error;
  return mapBitacora(response.data);
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

  const basePayload = {
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
  };
  const payload = {
    ...basePayload,
    entry_type: input.clase,
    equipment_id: input.equipoId || null,
  };
  let response = await requireSupabase()
    .from('laboratory_logs')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (response.error && shouldRetryLegacyLaboratoryLog(response.error)) {
    response = await requireSupabase()
      .from('laboratory_logs')
      .update(basePayload)
      .eq('id', id)
      .select('*')
      .single();
  }

  if (response.error) throw response.error;
  return mapBitacora(response.data);
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

export async function createDescarteLaboratorio(
  input: DescarteLaboratorioInput,
  context: LaboratorioSaveContext,
): Promise<DescarteLaboratorio> {
  if (useLocalStorageFallback()) {
    const state = readState();
    const descarte: DescarteLaboratorio = { ...input, id: createId('descarte'), createdAt: new Date().toISOString() };
    writeState({ ...state, descartes: [descarte, ...state.descartes] });
    return descarte;
  }

  requireContext(context);
  const { data, error } = await (requireSupabase() as any)
    .from('laboratory_discards')
    .insert({
      organization_id: context.organizationId,
      discard_date: input.fecha,
      equipment_id: input.equipoId || null,
      inventory_code: input.inventario,
      equipment: input.equipo,
      brand: input.marca,
      model: input.modelo,
      serial_number: input.serie,
      detail: input.detalle,
      location: input.ubicacion,
      responsible: input.responsable,
      created_by: context.userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapDescarte(data);
}

export async function deleteDescarteLaboratorio(id: string) {
  if (useLocalStorageFallback()) {
    const state = readState();
    writeState({ ...state, descartes: state.descartes.filter((descarte) => descarte.id !== id) });
    return;
  }

  const { error } = await (requireSupabase() as any).from('laboratory_discards').delete().eq('id', id);
  if (error) throw error;
}

function csvEscape(value: string | number | null | undefined) {
  const normalized = String(value ?? '');
  return `"${normalized.replace(/"/g, '""')}"`;
}

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatExcelDate(value: string | null | undefined) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-PA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function splitMarcaModeloReporte(value: string) {
  const normalized = value.trim();
  if (!normalized) return { marca: 'S/N', modelo: 'S/N' };

  const separatorMatch = normalized.match(/^(.+?)(?:\s+[-/|]\s+|\s{2,})(.+)$/);
  if (separatorMatch) {
    return { marca: separatorMatch[1].trim() || 'S/N', modelo: separatorMatch[2].trim() || 'S/N' };
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) return { marca: parts[0], modelo: 'S/N' };

  return { marca: parts[0], modelo: parts.slice(1).join(' ') };
}

function applyInventoryWorksheetStyles(
  worksheet: ReturnType<typeof utils.aoa_to_sheet>,
  dataRowCount: number,
  columnCount: number,
) {
  const headerRowIndex = 6;
  const lastColumn = columnCount - 1;

  worksheet['A1'].s = excelTitleStyle;
  worksheet['A2'].s = excelSubtitleStyle;
  worksheet['A4'].s = excelSectionStyle;
  worksheet['A5'].s = excelGeneratedStyle;

  for (let column = 0; column <= lastColumn; column += 1) {
    const headerCell = utils.encode_cell({ r: headerRowIndex, c: column });
    if (worksheet[headerCell]) worksheet[headerCell].s = excelHeaderStyle;
  }

  for (let row = headerRowIndex + 1; row < headerRowIndex + 1 + dataRowCount; row += 1) {
    const rowStyle = (row - headerRowIndex) % 2 === 0 ? excelAlternateCellStyle : excelCellStyle;
    for (let column = 0; column <= lastColumn; column += 1) {
      const cell = utils.encode_cell({ r: row, c: column });
      if (worksheet[cell]) worksheet[cell].s = rowStyle;
    }
  }
}

function applySummaryWorksheetStyles(
  worksheet: ReturnType<typeof utils.aoa_to_sheet>,
  dataRowCount: number,
  columnCount: number,
) {
  const headerRowIndex = 5;
  const lastColumn = columnCount - 1;

  worksheet['A1'].s = excelTitleStyle;
  worksheet['A2'].s = excelSubtitleStyle;
  worksheet['A4'].s = excelSectionStyle;

  for (let column = 0; column <= lastColumn; column += 1) {
    const headerCell = utils.encode_cell({ r: headerRowIndex, c: column });
    if (worksheet[headerCell]) worksheet[headerCell].s = excelHeaderStyle;
  }

  for (let row = headerRowIndex + 1; row < headerRowIndex + 1 + dataRowCount; row += 1) {
    const rowStyle = (row - headerRowIndex) % 2 === 0 ? excelAlternateCellStyle : excelCellStyle;
    for (let column = 0; column <= lastColumn; column += 1) {
      const cell = utils.encode_cell({ r: row, c: column });
      if (worksheet[cell]) worksheet[cell].s = rowStyle;
    }
  }
}

function createFormalWorksheet(
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
  widths: number[],
) {
  const generatedAt = new Date().toLocaleString('es-PA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const sheetRows = [
    ['UNIVERSIDAD AUTONOMA DE CHIRIQUI'],
    ['FACULTAD DE ECONOMIA'],
    [],
    [title],
    [`Generado: ${generatedAt}`],
    [],
    headers,
    ...rows,
  ];
  const worksheet = utils.aoa_to_sheet(sheetRows);
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: headers.length - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: headers.length - 1 } },
  ];
  worksheet['!cols'] = widths.map((wch) => ({ wch }));
  worksheet['!rows'] = [{ hpt: 22 }, { hpt: 20 }, { hpt: 8 }, { hpt: 26 }, { hpt: 18 }, { hpt: 8 }];
  worksheet['!autofilter'] = { ref: `A7:${utils.encode_col(headers.length - 1)}${Math.max(7, rows.length + 7)}` };
  applyInventoryWorksheetStyles(worksheet, rows.length, headers.length);
  return worksheet;
}

function countBy<T extends string>(items: EquipoLaboratorio[], getKey: (item: EquipoLaboratorio) => T) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item) || 'Sin clasificar';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function getEstadoEquipoDisplay(value: string) {
  return estadoEquipoLabels[value] ?? value;
}

function getMovimientoEstadoLaboratorio(item: BitacoraLaboratorio) {
  const auditMatch = item.descripcion.match(/Auditoria de inventario:\s*([^-\n]+?)\s*->\s*([^\.\n]+)/i);
  const automaticMatch = item.descripcion.match(/Cambio de estado tecnico:\s*([^-\n]+?)\s*->\s*([^\.\n]+)/i);
  const isAutomaticStateChange = item.tipoTrabajo === 'Cambio de estado' || item.tipoTrabajo === 'Cierre de mantenimiento';
  const match = auditMatch ?? automaticMatch;

  if (!match && !isAutomaticStateChange) return null;

  return {
    fecha: item.fecha,
    equipo: item.equipoDestino || item.equipoOrigen || 'Equipo no indicado',
    estadoAnterior: match?.[1]?.trim() || getEstadoEquipoDisplay(item.equipoOrigen),
    estadoNuevo: match?.[2]?.trim() || (item.tipoTrabajo === 'Cierre de mantenimiento' ? 'Operativo' : 'No indicado'),
    responsable: item.responsable || 'No indicado',
    detalle: item.descripcion,
  };
}

function isInventoryNoteRow(item: EquipoLaboratorio) {
  const normalized = [item.codigo, item.nombre, item.marcaModelo, item.observaciones]
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return (
    item.nombre.trim().toLowerCase().startsWith('nota') ||
    normalized.includes('debidalaincorporaciondenuevosequipos') ||
    normalized.includes('ajustesrealizadosenellaboratorio') ||
    normalized.includes('numeracionsecuencial') ||
    normalized.includes('manteneruncontroladecuado')
  );
}

export function exportInventarioLaboratorioExcel(state: LaboratorioState) {
  const sortedEquipos = state.equipos.filter((item) => !isInventoryNoteRow(item)).sort((first, second) => {
    const byLocation = first.ubicacion.localeCompare(second.ubicacion, 'es');
    if (byLocation !== 0) return byLocation;
    const byCategory = first.categoria.localeCompare(second.categoria, 'es');
    if (byCategory !== 0) return byCategory;
    return first.nombre.localeCompare(second.nombre, 'es');
  });

  const headers = [
    'Fila',
    'Codigo interno',
    'Equipo',
    'Categoria',
    'Marca',
    'Modelo',
    'Serie',
    'Ubicacion',
    'Estado',
    'Observaciones',
    'Actualizado',
  ];

  const rows = sortedEquipos.map((item, index) => {
    const { marca, modelo } = splitMarcaModeloReporte(item.marcaModelo);
    return [
      index + 1,
      item.codigo,
      item.nombre,
      item.categoria,
      marca,
      modelo,
      item.serie,
      item.ubicacion,
      estadoEquipoLabels[item.estado] ?? item.estado,
      item.observaciones,
      formatExcelDate(item.updatedAt),
    ];
  });

  const generatedAt = new Date().toLocaleString('es-PA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const inventorySheetRows = [
    ['UNIVERSIDAD AUTONOMA DE CHIRIQUI'],
    ['FACULTAD DE ECONOMIA'],
    [],
    ['INVENTARIO DE LA FACULTAD'],
    [`Generado: ${generatedAt}`],
    [],
    headers,
    ...rows,
  ];

  const workbook = utils.book_new();
  const inventoryWorksheet = utils.aoa_to_sheet(inventorySheetRows);
  inventoryWorksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: headers.length - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: headers.length - 1 } },
  ];
  inventoryWorksheet['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 18 },
    { wch: 36 },
    { wch: 20 },
  ];
  inventoryWorksheet['!rows'] = [{ hpt: 22 }, { hpt: 20 }, { hpt: 8 }, { hpt: 26 }, { hpt: 18 }, { hpt: 8 }];
  inventoryWorksheet['!autofilter'] = { ref: `A7:K${Math.max(7, rows.length + 7)}` };
  applyInventoryWorksheetStyles(inventoryWorksheet, rows.length, headers.length);
  utils.book_append_sheet(workbook, inventoryWorksheet, 'Inventario');

  const byLocation = countBy(sortedEquipos, (item) => item.ubicacion || 'Sin ubicacion');
  const byStatus = countBy(sortedEquipos, (item) => estadoEquipoLabels[item.estado] ?? item.estado);
  const summaryRows = [
    ['UNIVERSIDAD AUTONOMA DE CHIRIQUI'],
    ['FACULTAD DE ECONOMIA'],
    [],
    ['RESUMEN DEL INVENTARIO'],
    [],
    ['Grupo', 'Detalle', 'Total'],
    ['General', 'Equipos registrados', sortedEquipos.length],
    ...Object.entries(byLocation)
      .sort(([first], [second]) => first.localeCompare(second, 'es'))
      .map(([label, count]) => ['Ubicacion', label, count]),
    ...Object.entries(byStatus)
      .sort(([first], [second]) => first.localeCompare(second, 'es'))
      .map(([label, count]) => ['Estado', label, count]),
  ];
  const summaryWorksheet = utils.aoa_to_sheet(summaryRows);
  summaryWorksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
  ];
  summaryWorksheet['!cols'] = [{ wch: 18 }, { wch: 34 }, { wch: 12 }];
  applySummaryWorksheetStyles(summaryWorksheet, summaryRows.length - 6, 3);
  utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen');

  writeFile(workbook, `inventario-facultad-${slugifyFileName(new Date().toISOString().slice(0, 10))}.xlsx`);
}

export function exportDescartesLaboratorioExcel(state: LaboratorioState) {
  const headers = ['Fila', 'Inventario', 'Equipo', 'Marca', 'Modelo', 'Serie', 'Detalle', 'Ubicacion'];
  const rows = [...state.descartes]
    .sort((first, second) => first.fecha.localeCompare(second.fecha))
    .map((item, index) => [
      index + 1,
      item.inventario || 'S/N',
      item.equipo,
      item.marca || 'S/N',
      item.modelo || 'S/N',
      item.serie || 'S/N',
      item.detalle,
      item.ubicacion || 'Sin ubicacion',
    ]);

  const generatedAt = new Date().toLocaleDateString('es-PA');
  const worksheetRows = [
    ['UNIVERSIDAD AUTONOMA DE CHIRIQUI'],
    ['FACULTAD DE ECONOMIA'],
    [],
    ['DESCARTE DE EQUIPOS'],
    [generatedAt],
    [],
    headers,
    ...rows,
  ];

  const workbook = utils.book_new();
  const worksheet = utils.aoa_to_sheet(worksheetRows);
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: headers.length - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: headers.length - 1 } },
  ];
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 26 },
    { wch: 42 },
    { wch: 26 },
  ];
  worksheet['!rows'] = [{ hpt: 22 }, { hpt: 20 }, { hpt: 8 }, { hpt: 26 }, { hpt: 18 }, { hpt: 8 }];
  worksheet['!autofilter'] = { ref: `A7:H${Math.max(7, rows.length + 7)}` };
  applyInventoryWorksheetStyles(worksheet, rows.length, headers.length);
  utils.book_append_sheet(workbook, worksheet, 'Descartes');
  writeFile(workbook, `descarte-equipos-${slugifyFileName(new Date().toISOString().slice(0, 10))}.xlsx`);
}

export function exportInformeMensualMantenimientoExcel(state: LaboratorioState, month: string) {
  const selectedMonth = month || new Date().toISOString().slice(0, 7);
  const workbook = utils.book_new();
  const bitacoras = state.bitacoras
    .filter((item) => item.fecha.startsWith(selectedMonth))
    .sort((first, second) => second.fecha.localeCompare(first.fecha));
  const movimientosEstado = bitacoras.map(getMovimientoEstadoLaboratorio).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const fichas = state.fichas
    .filter((item) => item.fecha.startsWith(selectedMonth))
    .sort((first, second) => second.fecha.localeCompare(first.fecha));
  const prestamos = state.prestamos
    .filter((item) => item.fechaPrestamo.startsWith(selectedMonth))
    .sort((first, second) => second.fechaPrestamo.localeCompare(first.fechaPrestamo));
  const descartes = state.descartes
    .filter((item) => item.fecha.startsWith(selectedMonth))
    .sort((first, second) => second.fecha.localeCompare(first.fecha));

  const resumenRows = [
    ['Bitacoras registradas', bitacoras.length],
    ['Cambios de estado auditados', movimientosEstado.length],
    ['Fichas tecnicas registradas', fichas.length],
    ['Prestamos registrados', prestamos.length],
    ['Descartes registrados', descartes.length],
    ['Trabajos abiertos al generar', state.bitacoras.filter((item) => item.estado !== 'cerrado').length],
    ['Equipos no operativos', state.equipos.filter((item) => item.estado !== 'operativo').length],
  ];
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet('INFORME MENSUAL DE MANTENIMIENTO', ['Indicador', 'Total'], resumenRows, [34, 14]),
    'Resumen',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'BITACORAS DEL MES',
      ['Fecha', 'Titulo', 'Tipo', 'Prioridad', 'Estado', 'Responsable', 'Ubicacion', 'Descripcion'],
      bitacoras.map((item) => [
        formatExcelDate(item.fecha),
        item.titulo,
        item.tipoTrabajo,
        prioridadLabels[item.prioridad],
        estadoTrabajoLabels[item.estado],
        item.responsable,
        item.ubicacion,
        item.descripcion,
      ]),
      [20, 28, 18, 14, 16, 22, 22, 44],
    ),
    'Bitacoras',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'AUDITORIA DE CAMBIOS DE ESTADO',
      ['Fecha', 'Equipo', 'Estado anterior', 'Estado nuevo', 'Responsable', 'Detalle'],
      movimientosEstado.map((item) => [
        formatExcelDate(item.fecha),
        item.equipo,
        item.estadoAnterior,
        item.estadoNuevo,
        item.responsable,
        item.detalle,
      ]),
      [20, 30, 22, 22, 24, 56],
    ),
    'Auditoria',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'FICHAS TECNICAS DEL MES',
      ['Fecha', 'Equipo', 'Ubicacion', 'Responsable', 'Usuario asignado', 'Observacion'],
      fichas.map((item) => [
        formatExcelDate(item.fecha),
        item.pc,
        item.ubicacion,
        item.responsable,
        item.usuarioAsignado,
        item.observacionGeneral,
      ]),
      [20, 24, 22, 22, 22, 46],
    ),
    'Fichas tecnicas',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'DESCARTES DEL MES',
      ['Fecha', 'Inventario', 'Equipo', 'Marca', 'Modelo', 'Serie', 'Ubicacion', 'Responsable', 'Detalle'],
      descartes.map((item) => [
        formatExcelDate(item.fecha),
        item.inventario,
        item.equipo,
        item.marca,
        item.modelo,
        item.serie,
        item.ubicacion,
        item.responsable,
        item.detalle,
      ]),
      [20, 18, 24, 18, 24, 24, 24, 22, 52],
    ),
    'Descartes',
  );
  writeFile(workbook, `informe-mantenimiento-${slugifyFileName(selectedMonth)}.xlsx`);
}

/** Informe bajo demanda: no presupone una periodicidad fija. */
export function exportInformeMantenimientoPorRangoExcel(state: LaboratorioState, desde: string, hasta: string) {
  const start = desde ? new Date(`${desde}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const end = hasta ? new Date(`${hasta}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  const inRange = (fecha: string) => {
    const time = new Date(fecha).getTime();
    return time >= start && time <= end;
  };
  const registros = state.bitacoras.filter((item) => inRange(item.fecha)).sort((first, second) => second.fecha.localeCompare(first.fecha));
  const descartes = state.descartes.filter((item) => inRange(item.fecha)).sort((first, second) => second.fecha.localeCompare(first.fecha));
  const mantenimientos = registros.filter((item) => item.tipoTrabajo !== 'Incidencia');
  const incidencias = registros.filter((item) => item.tipoTrabajo === 'Incidencia');
  const movimientosEstado = registros.map(getMovimientoEstadoLaboratorio).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const atendidos = new Set(registros.map((item) => item.equipoId || item.equipoDestino || item.equipoOrigen).filter(Boolean));
  const abiertos = state.bitacoras.filter((item) => item.tipoTrabajo === 'Incidencia' && item.estado !== 'resuelto' && item.estado !== 'cerrado');
  const equiposValidos = state.equipos.filter((item) => !isInventoryNoteRow(item));
  const equiposNoOperativos = equiposValidos.filter((item) => item.estado !== 'operativo');
  const registrosPorUbicacion = registros.reduce<Record<string, number>>((acc, item) => {
    const ubicacion = item.ubicacion || 'Sin ubicacion';
    acc[ubicacion] = (acc[ubicacion] ?? 0) + 1;
    return acc;
  }, {});
  const equiposPorEstado = countBy(equiposValidos, (item) => estadoEquipoLabels[item.estado] ?? item.estado);
  const rango = `${desde || 'Inicio'} a ${hasta || 'Hoy'}`;
  const workbook = utils.book_new();

  utils.book_append_sheet(
    workbook,
    createFormalWorksheet('INFORME DE MANTENIMIENTO POR RANGO', ['Indicador', 'Total'], [
      ['Periodo seleccionado', rango],
      ['Movimientos tecnicos registrados', registros.length],
      ['Mantenimientos efectuados', mantenimientos.length],
      ['Cambios de estado auditados', movimientosEstado.length],
      ['Equipos atendidos', atendidos.size],
      ['Daños o incidencias encontrados', incidencias.length],
      ['Descartes registrados', descartes.length],
      ['Reparaciones pendientes o en proceso', abiertos.length],
      ['Equipos no operativos al generar', equiposNoOperativos.length],
    ], [42, 32]),
    'Resumen',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet('MANTENIMIENTOS E INCIDENCIAS', ['Fecha', 'Clase', 'Tipo', 'Equipo', 'Ubicacion', 'Titulo', 'Estado', 'Responsable', 'Detalle'],
      registros.map((item) => [
        formatExcelDate(item.fecha),
        item.tipoTrabajo === 'Incidencia' ? 'Incidencia' : 'Mantenimiento',
        item.tipoTrabajo,
        item.equipoDestino || item.equipoOrigen || 'Equipo no indicado',
        item.ubicacion || 'No indicada',
        item.titulo,
        estadoTrabajoLabels[item.estado],
        item.responsable,
        item.descripcion,
      ]),
      [20, 18, 22, 28, 22, 30, 16, 22, 52]),
    'Detalle',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'AUDITORIA DE CAMBIOS DE ESTADO',
      ['Fecha', 'Equipo', 'Estado anterior', 'Estado nuevo', 'Responsable', 'Detalle'],
      movimientosEstado.map((item) => [
        formatExcelDate(item.fecha),
        item.equipo,
        item.estadoAnterior,
        item.estadoNuevo,
        item.responsable,
        item.detalle,
      ]),
      [20, 30, 22, 22, 24, 56],
    ),
    'Auditoria',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'DESCARTES DEL PERIODO',
      ['Fecha', 'Inventario', 'Equipo', 'Marca', 'Modelo', 'Serie', 'Ubicacion', 'Responsable', 'Detalle'],
      descartes.map((item) => [
        formatExcelDate(item.fecha),
        item.inventario,
        item.equipo,
        item.marca,
        item.modelo,
        item.serie,
        item.ubicacion,
        item.responsable,
        item.detalle,
      ]),
      [20, 18, 24, 18, 24, 24, 24, 22, 52],
    ),
    'Descartes',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'RESUMEN POR UBICACION',
      ['Ubicacion', 'Registros del periodo'],
      Object.entries(registrosPorUbicacion)
        .sort(([first], [second]) => first.localeCompare(second, 'es'))
        .map(([ubicacion, total]) => [ubicacion, total]),
      [34, 20],
    ),
    'Por ubicacion',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'ESTADO ACTUAL DEL INVENTARIO',
      ['Estado', 'Total de equipos'],
      Object.entries(equiposPorEstado)
        .sort(([first], [second]) => first.localeCompare(second, 'es'))
        .map(([estado, total]) => [estado, total]),
      [30, 18],
    ),
    'Estados actuales',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'PENDIENTES ACTUALES',
      ['Equipo', 'Ubicacion', 'Estado', 'Serie', 'Observaciones'],
      equiposNoOperativos.map((item) => [
        item.nombre,
        item.ubicacion,
        estadoEquipoLabels[item.estado] ?? item.estado,
        item.serie,
        item.observaciones,
      ]),
      [28, 24, 18, 24, 52],
    ),
    'Pendientes actuales',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'CONCLUSIONES DEL PERIODO',
      ['Conclusion'],
      [
        [`Durante el periodo seleccionado se registraron ${registros.length} movimientos tecnicos.`],
        [`Se atendieron ${atendidos.size} equipos entre mantenimientos, incidencias, cierres o cambios de estado.`],
        [`Se documentaron ${descartes.length} descartes de equipos en el periodo.`],
        [`Al generar este informe quedan ${equiposNoOperativos.length} equipos no operativos o pendientes de seguimiento.`],
        [`Las reparaciones o incidencias abiertas suman ${abiertos.length} registros.`],
      ],
      [92],
    ),
    'Conclusiones',
  );
  writeFile(workbook, `informe-mantenimiento-${slugifyFileName(desde || 'inicio')}-a-${slugifyFileName(hasta || 'hoy')}.xlsx`);
}

export function buildInformeMantenimientoPorRango(state: LaboratorioState, desde: string, hasta: string) {
  const start = desde ? new Date(`${desde}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const end = hasta ? new Date(`${hasta}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  const registros = state.bitacoras.filter((item) => { const time = new Date(item.fecha).getTime(); return time >= start && time <= end; });
  const descartes = state.descartes.filter((item) => { const time = new Date(item.fecha).getTime(); return time >= start && time <= end; });
  const mantenimientos = registros.filter((item) => item.tipoTrabajo !== 'Incidencia');
  const incidencias = registros.filter((item) => item.tipoTrabajo === 'Incidencia');
  const equipos = new Set(registros.map((item) => item.equipoId || item.equipoDestino || item.equipoOrigen).filter(Boolean));
  const abiertos = state.bitacoras.filter((item) => item.tipoTrabajo === 'Incidencia' && !['resuelto', 'cerrado'].includes(item.estado));
  return [`INFORME DE MANTENIMIENTO`, `Periodo: ${desde || 'Inicio'} a ${hasta || 'Hoy'}`, '', `Movimientos tecnicos registrados: ${registros.length}`, `Mantenimientos efectuados: ${mantenimientos.length}`, `Equipos atendidos: ${equipos.size}`, `Daños/incidencias encontrados: ${incidencias.length}`, `Descartes registrados: ${descartes.length}`, `Reparaciones pendientes o en proceso: ${abiertos.length}`, '', ...registros.map((item) => `- ${item.fecha.slice(0, 10)} | ${item.tipoTrabajo === 'Incidencia' ? 'INCIDENCIA' : 'MANTENIMIENTO'} | ${item.equipoDestino || item.equipoOrigen || 'Equipo no indicado'} | ${item.titulo} | ${estadoTrabajoLabels[item.estado]}`), ...descartes.map((item) => `- ${item.fecha.slice(0, 10)} | DESCARTE | ${item.inventario} - ${item.equipo} | ${item.responsable}`)].join('\n');
}

export function exportInformeUbicacionLaboratorioExcel(state: LaboratorioState, ubicacion: string) {
  const selectedLocation = ubicacion || 'Todas';
  const equipos = state.equipos
    .filter((item) => !isInventoryNoteRow(item))
    .filter((item) => selectedLocation === 'Todas' || item.ubicacion === selectedLocation)
    .sort((first, second) => {
      const byStatus = (estadoEquipoLabels[first.estado] ?? first.estado).localeCompare(
        estadoEquipoLabels[second.estado] ?? second.estado,
        'es',
      );
      if (byStatus !== 0) return byStatus;
      return first.nombre.localeCompare(second.nombre, 'es');
    });
  const bitacoras = state.bitacoras
    .filter((item) => selectedLocation === 'Todas' || item.ubicacion === selectedLocation)
    .sort((first, second) => second.fecha.localeCompare(first.fecha));
  const workbook = utils.book_new();

  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      `INFORME POR UBICACION: ${selectedLocation.toUpperCase()}`,
      ['Fila', 'Equipo', 'Categoria', 'Marca', 'Modelo', 'Serie', 'Estado', 'Observaciones'],
      equipos.map((item, index) => {
        const { marca, modelo } = splitMarcaModeloReporte(item.marcaModelo);
        return [
          index + 1,
          item.nombre,
          item.categoria,
          marca,
          modelo,
          item.serie,
          estadoEquipoLabels[item.estado] ?? item.estado,
          item.observaciones,
        ];
      }),
      [8, 24, 18, 18, 24, 24, 18, 44],
    ),
    'Equipos',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'BITACORAS RELACIONADAS',
      ['Fecha', 'Titulo', 'Prioridad', 'Estado', 'Responsable', 'Descripcion'],
      bitacoras.map((item) => [
        formatExcelDate(item.fecha),
        item.titulo,
        prioridadLabels[item.prioridad],
        estadoTrabajoLabels[item.estado],
        item.responsable,
        item.descripcion,
      ]),
      [20, 28, 14, 16, 22, 46],
    ),
    'Bitacoras',
  );

  writeFile(workbook, `informe-ubicacion-${slugifyFileName(selectedLocation)}.xlsx`);
}

export function exportInformePendientesLaboratorioExcel(state: LaboratorioState) {
  const workbook = utils.book_new();
  const equiposPendientes = state.equipos
    .filter((item) => !isInventoryNoteRow(item) && item.estado !== 'operativo')
    .sort((first, second) => first.ubicacion.localeCompare(second.ubicacion, 'es'));
  const trabajosAbiertos = state.bitacoras
    .filter((item) => item.estado !== 'cerrado')
    .sort((first, second) => second.fecha.localeCompare(first.fecha));
  const prestamosActivos = state.prestamos
    .filter((item) => item.estado !== 'devuelto')
    .sort((first, second) => second.fechaPrestamo.localeCompare(first.fechaPrestamo));

  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'EQUIPOS PENDIENTES O NO OPERATIVOS',
      ['Equipo', 'Categoria', 'Ubicacion', 'Estado', 'Serie', 'Observaciones', 'Actualizado'],
      equiposPendientes.map((item) => [
        item.nombre,
        item.categoria,
        item.ubicacion,
        estadoEquipoLabels[item.estado] ?? item.estado,
        item.serie,
        item.observaciones,
        formatExcelDate(item.updatedAt),
      ]),
      [24, 18, 22, 18, 22, 44, 20],
    ),
    'Equipos pendientes',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'TRABAJOS ABIERTOS',
      ['Fecha', 'Titulo', 'Prioridad', 'Estado', 'Responsable', 'Ubicacion', 'Descripcion'],
      trabajosAbiertos.map((item) => [
        formatExcelDate(item.fecha),
        item.titulo,
        prioridadLabels[item.prioridad],
        estadoTrabajoLabels[item.estado],
        item.responsable,
        item.ubicacion,
        item.descripcion,
      ]),
      [20, 28, 14, 16, 22, 22, 46],
    ),
    'Trabajos abiertos',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'PRESTAMOS ACTIVOS O VENCIDOS',
      ['Fecha prestamo', 'Equipo', 'Entregado a', 'Documento', 'Responsable', 'Estado', 'Devolucion', 'Observaciones'],
      prestamosActivos.map((item) => [
        formatExcelDate(item.fechaPrestamo),
        item.equipo,
        item.entregadoA,
        item.documento,
        item.responsableEntrega,
        item.estado,
        item.fechaDevolucion ? formatExcelDate(item.fechaDevolucion) : 'Pendiente',
        item.observaciones,
      ]),
      [20, 24, 24, 18, 22, 14, 20, 44],
    ),
    'Prestamos',
  );
  writeFile(workbook, `informe-pendientes-laboratorio-${slugifyFileName(new Date().toISOString().slice(0, 10))}.xlsx`);
}

export function exportHistorialEquipoLaboratorioExcel(state: LaboratorioState, equipoId: string) {
  const equipo = state.equipos.find((item) => item.id === equipoId);
  if (!equipo) return;

  const normalizedKeys = [equipo.codigo, equipo.nombre, equipo.serie, equipo.marcaModelo]
    .filter(Boolean)
    .map((value) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
    );
  const matchesEquipo = (value: string) => {
    const normalizedValue = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalizedKeys.some((key) => key && normalizedValue.includes(key));
  };
  const fichas = state.fichas
    .filter((item) => matchesEquipo(`${item.pc} ${item.inventario.map((field) => field.numero).join(' ')}`))
    .sort((first, second) => second.fecha.localeCompare(first.fecha));
  const bitacoras = state.bitacoras
    .filter((item) => item.equipoId === equipo.id || matchesEquipo(`${item.equipoOrigen} ${item.equipoDestino} ${item.titulo} ${item.descripcion}`))
    .sort((first, second) => second.fecha.localeCompare(first.fecha));
  const descartes = state.descartes
    .filter((item) => item.equipoId === equipo.id || matchesEquipo(`${item.inventario} ${item.equipo} ${item.serie} ${item.detalle}`))
    .sort((first, second) => second.fecha.localeCompare(first.fecha));

  const workbook = utils.book_new();
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      `HISTORIAL TECNICO: ${equipo.nombre.toUpperCase()}`,
      ['Campo', 'Valor'],
      [
        ['Codigo interno', equipo.codigo],
        ['Equipo', equipo.nombre],
        ['Categoria', equipo.categoria],
        ['Marca', splitMarcaModeloReporte(equipo.marcaModelo).marca],
        ['Modelo', splitMarcaModeloReporte(equipo.marcaModelo).modelo],
        ['Serie', equipo.serie],
        ['Ubicacion', equipo.ubicacion],
        ['Estado', estadoEquipoLabels[equipo.estado] ?? equipo.estado],
        ['Observaciones', equipo.observaciones],
      ],
      [24, 60],
    ),
    'Equipo',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'FICHAS TECNICAS RELACIONADAS',
      ['Fecha', 'Equipo', 'Responsable', 'Usuario asignado', 'Observacion'],
      fichas.map((item) => [
        formatExcelDate(item.fecha),
        item.pc,
        item.responsable,
        item.usuarioAsignado,
        item.observacionGeneral,
      ]),
      [20, 24, 22, 22, 48],
    ),
    'Fichas',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'BITACORAS RELACIONADAS',
      ['Fecha', 'Titulo', 'Prioridad', 'Estado', 'Responsable', 'Descripcion'],
      bitacoras.map((item) => [
        formatExcelDate(item.fecha),
        item.titulo,
        prioridadLabels[item.prioridad],
        estadoTrabajoLabels[item.estado],
        item.responsable,
        item.descripcion,
      ]),
      [20, 28, 14, 16, 22, 48],
    ),
    'Bitacoras',
  );
  utils.book_append_sheet(
    workbook,
    createFormalWorksheet(
      'DESCARTES RELACIONADOS',
      ['Fecha', 'Inventario', 'Equipo', 'Serie', 'Ubicacion', 'Responsable', 'Detalle'],
      descartes.map((item) => [
        formatExcelDate(item.fecha),
        item.inventario,
        item.equipo,
        item.serie,
        item.ubicacion,
        item.responsable,
        item.detalle,
      ]),
      [20, 18, 24, 22, 22, 22, 48],
    ),
    'Descartes',
  );
  writeFile(workbook, `historial-${slugifyFileName(equipo.nombre || equipo.codigo)}.xlsx`);
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
      ['EQUIPO', item.updatedAt, item.nombre, item.ubicacion, estadoEquipoLabels[item.estado] ?? item.estado, item.observaciones]
        .map(csvEscape)
        .join(','),
    ),
    ...state.prestamos.map((item) =>
      ['PRESTAMO', item.fechaPrestamo, item.equipo, item.responsableEntrega, item.estado, item.entregadoA]
        .map(csvEscape)
        .join(','),
    ),
    ...state.descartes.map((item) =>
      ['DESCARTE', item.fecha, `${item.inventario} - ${item.equipo}`, item.responsable, 'baja', item.detalle]
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
    `Descartes registrados: ${state.descartes.length}`,
    `Equipos con atencion pendiente: ${pendientes}`,
    `Prestamos activos: ${prestamosActivos}`,
    '',
    'ULTIMAS BITACORAS',
    ...state.bitacoras.slice(0, 10).map((item) =>
      `- ${item.fecha} | ${item.titulo} | ${prioridadLabels[item.prioridad]} | ${estadoTrabajoLabels[item.estado]}`,
    ),
  ].join('\n');
}




