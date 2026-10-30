import { fetchAllPages } from '@/infraestructura/paginacion';
import { isDemoMode } from '@/infraestructura/entorno';
import { supabase } from '@/infraestructura/supabase';
import {
  AplicacionFichaLaboratorio,
  AsignacionComponenteLaboratorio,
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
  asignacionesComponentes: AsignacionComponenteLaboratorio[];
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

export type AsignacionComponenteLaboratorioInput = Omit<
  AsignacionComponenteLaboratorio,
  'id' | 'createdAt' | 'updatedAt'
>;

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

const seccionesBaseLaboratorio = [
  'ORD',
  'Biblioteca',
  'Laboratorio 1',
  'Laboratorio 2',
  '3A',
  '3B',
  '3C',
  '3D',
  '3E',
  '3F',
  '3G',
  '3H',
  'Decanato',
  'Reparacion',
  'Deposito',
  'Seccion de Tecnologia',
] as const;

const categoriasBaseEquipo = [
  'Computadora',
  'Laptop',
  'Monitor',
  'Televisor',
  'Proyector',
  'Impresora',
  'Redes',
  'Accesorio',
] as const;

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

function mergeSeccionesBase(secciones: SeccionLaboratorio[]) {
  const existing = new Set(secciones.map((item) => item.nombre.trim().toLowerCase()).filter(Boolean));
  const missing = defaultSecciones().filter((item) => !existing.has(item.nombre.trim().toLowerCase()));
  return [...secciones, ...missing].sort((first, second) => first.nombre.localeCompare(second.nombre, 'es', { numeric: true }));
}

type CampoUnicoEquipo = 'codigo' | 'serie';

function normalizeUniqueEquipoValue(value: unknown, campo: CampoUnicoEquipo) {
  const normalized = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  const genericInventoryValues = new Set(['sn', 'na', 'noaplica', 'sininventario', 'sincodigo']);
  const genericSerialValues = new Set(['sn', 'na', 'noaplica', 'sinserie', 'sinserial', 'sindato', 'sininformacion']);

  if (!normalized) return '';
  if (campo === 'codigo' && genericInventoryValues.has(normalized)) return '';
  if (campo === 'serie' && genericSerialValues.has(normalized)) return '';
  return normalized;
}

function findDuplicateEquipoIdentity(
  input: Pick<EquipoLaboratorioInput, 'codigo' | 'serie'>,
  equipos: Array<{ id: string; codigo: string; nombre: string; serie: string }>,
  currentId?: string,
) {
  const checks: Array<{ campo: CampoUnicoEquipo; valor: string; etiqueta: string }> = [
    { campo: 'serie', valor: input.serie, etiqueta: 'numero de serie' },
  ];

  for (const check of checks) {
    const key = normalizeUniqueEquipoValue(check.valor, check.campo);
    if (!key) continue;

    const duplicate = equipos.find((equipo) => {
      if (equipo.id === currentId) return false;
      const value = check.campo === 'codigo' ? equipo.codigo : equipo.serie;
      return normalizeUniqueEquipoValue(value, check.campo) === key;
    });

    if (duplicate) return { ...check, duplicate };
  }

  return null;
}

function buildDuplicateEquipoMessage(duplicate: NonNullable<ReturnType<typeof findDuplicateEquipoIdentity>>) {
  return `Ya existe un equipo con ese ${duplicate.etiqueta}: ${duplicate.duplicate.codigo} - ${duplicate.duplicate.nombre}.`;
}

function buildImportEquipoIdentityKey(input: Pick<EquipoLaboratorioInput, 'codigo' | 'nombre' | 'categoria' | 'serie'>) {
  const serieKey = normalizeUniqueEquipoValue(input.serie, 'serie');
  if (serieKey) return `serie:${serieKey}`;

  return `equipo:${[
    normalizeUniqueEquipoValue(input.codigo, 'codigo'),
    String(input.categoria ?? '').trim().toLowerCase(),
    String(input.nombre ?? '').trim().toLowerCase(),
  ].join('|')}`;
}

async function assertUniqueEquipoIdentity(input: EquipoLaboratorioInput, currentId?: string) {
  if (shouldUseLocalStorageFallback()) {
    const duplicate = findDuplicateEquipoIdentity(input, readState().equipos, currentId);
    if (duplicate) throw new Error(buildDuplicateEquipoMessage(duplicate));
    return;
  }

  const { data, error } = await requireSupabase().from('laboratory_equipment').select('id, code, name, serial_number');
  if (error) throw error;

  const equipos = (data ?? []).map((item) => ({
    id: String(item.id),
    codigo: String(item.code ?? ''),
    nombre: String(item.name ?? ''),
    serie: String(item.serial_number ?? ''),
  }));
  const duplicate = findDuplicateEquipoIdentity(input, equipos, currentId);
  if (duplicate) throw new Error(buildDuplicateEquipoMessage(duplicate));
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
    asignacionesComponentes: [],
  };
}

function shouldUseLocalStorageFallback() {
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
      asignacionesComponentes: Array.isArray(parsed.asignacionesComponentes) ? parsed.asignacionesComponentes : [],
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
  equipment_id?: string | null;
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
    equipoId: row.equipment_id ?? '',
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
  evidence_title?: string;
  evidence_url?: string;
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
    evidenciaTitulo: row.evidence_title ?? '',
    evidenciaUrl: row.evidence_url ?? '',
    createdAt: row.created_at,
  };
}

function mapAsignacionComponente(row: {
  id: string;
  parent_equipment_id: string;
  component_equipment_id: string;
  component_type: AsignacionComponenteLaboratorio['tipo'];
  assigned_at: string;
  removed_at: string | null;
  detail: string;
  responsible: string;
  created_at: string;
  updated_at: string;
}): AsignacionComponenteLaboratorio {
  return {
    id: row.id,
    equipoPadreId: row.parent_equipment_id,
    componenteId: row.component_equipment_id,
    tipo: row.component_type,
    fechaAsignacion: row.assigned_at,
    fechaRetiro: row.removed_at,
    detalle: row.detail,
    responsable: row.responsible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLaboratorioData(): Promise<LaboratorioState> {
  if (shouldUseLocalStorageFallback()) {
    const state = readState();
    return {
      fichas: [...state.fichas].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
      equipos: [...state.equipos].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
      secciones: mergeSeccionesBase(state.secciones),
      categoriasEquipo: [...state.categoriasEquipo].sort((first, second) => first.nombre.localeCompare(second.nombre)),
      estadosEquipo: [...state.estadosEquipo].sort((first, second) => first.nombre.localeCompare(second.nombre)),
      bitacoras: [...state.bitacoras].sort((first, second) => second.fecha.localeCompare(first.fecha)),
      prestamos: [...state.prestamos].sort((first, second) => second.fechaPrestamo.localeCompare(first.fechaPrestamo)),
      descartes: [...state.descartes].sort((first, second) => second.fecha.localeCompare(first.fecha)),
      asignacionesComponentes: [...state.asignacionesComponentes].sort((first, second) =>
        second.fechaAsignacion.localeCompare(first.fechaAsignacion),
      ),
    };
  }

  const client = requireSupabase();
  const [fichas, equipos, secciones, catalogos, bitacoras, prestamos, descartes, asignacionesComponentes] = await Promise.all([
    fetchAllPages((from, to) => client.from('laboratory_technical_sheets').select('*').order('updated_at', { ascending: false }).order('id').range(from, to)).then(data => ({ data, error: null })),
    fetchAllPages((from, to) => client.from('laboratory_equipment').select('*').order('updated_at', { ascending: false }).order('id').range(from, to)).then(data => ({ data, error: null })),
    fetchAllPages((from, to) => client.from('laboratory_sections').select('*').order('name', { ascending: true }).order('id').range(from, to)).then(data => ({ data, error: null })),
    fetchAllPages((from, to) => client.from('laboratory_catalogs').select('*').order('name', { ascending: true }).order('id').range(from, to)).then(data => ({ data, error: null })),
    fetchAllPages((from, to) => client.from('laboratory_logs').select('*').order('work_date', { ascending: false }).order('id').range(from, to)).then(data => ({ data, error: null })),
    fetchAllPages((from, to) => client.from('laboratory_loans').select('*').order('loaned_at', { ascending: false }).order('id').range(from, to)).then(data => ({ data, error: null })),
    fetchAllPages((from, to) => client.from('laboratory_discards').select('*').order('discard_date', { ascending: false }).order('id').range(from, to)).then(data => ({ data, error: null })),
    fetchAllPages((from, to) => client.from('laboratory_component_assignments').select('*').order('assigned_at', { ascending: false }).order('id').range(from, to)).then(data => ({ data, error: null })),
  ]);

  if (fichas.error) throw fichas.error;
  if (equipos.error) throw equipos.error;
  if (secciones.error) throw secciones.error;
  const seccionesData = (secciones.data ?? []).map(mapSeccion);
  if (catalogos.error) throw catalogos.error;
  const catalogosData = (catalogos.data ?? []).map(mapCatalogo);
  const categoriasEquipo = catalogosData.filter((item) => item.tipo === 'categoria_equipo');
  const estadosEquipo = catalogosData.filter((item) => item.tipo === 'estado_equipo');
  if (bitacoras.error) throw bitacoras.error;
  if (prestamos.error) throw prestamos.error;
  if (descartes.error) throw descartes.error;
  if (asignacionesComponentes.error) throw asignacionesComponentes.error;

  return {
    fichas: (fichas.data ?? []).map(mapFicha),
    equipos: (equipos.data ?? []).map(mapEquipo),
    secciones: mergeSeccionesBase(seccionesData),
    categoriasEquipo: categoriasEquipo.length > 0 ? categoriasEquipo : defaultCatalogos('categoria_equipo'),
    estadosEquipo: estadosEquipo.length > 0 ? estadosEquipo : defaultCatalogos('estado_equipo'),
    bitacoras: (bitacoras.data ?? []).map(mapBitacora),
    prestamos: (prestamos.data ?? []).map(mapPrestamo),
    descartes: descartes.error ? [] : (descartes.data ?? []).map(mapDescarte),
    asignacionesComponentes: asignacionesComponentes.error
      ? []
      : (asignacionesComponentes.data ?? []).map(mapAsignacionComponente),
  };
}

export async function createFichaTecnicaLaboratorio(
  input: FichaTecnicaLaboratorioInput,
  context: LaboratorioSaveContext,
): Promise<FichaTecnicaLaboratorio> {
  if (shouldUseLocalStorageFallback()) {
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
      equipment_id: input.equipoId || null,
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
  expectedUpdatedAt?: string,
): Promise<FichaTecnicaLaboratorio> {
  if (shouldUseLocalStorageFallback()) {
    const state = readState();
    const current = state.fichas.find((ficha) => ficha.id === id);
    if (!current) throw new Error('No se encontro la ficha tecnica.');
    if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) throw new Error('La ficha cambió. Vuelva a abrirla antes de guardar para conservar los cambios recientes.');
    const updated: FichaTecnicaLaboratorio = { ...current, ...input, updatedAt: new Date().toISOString() };
    writeState({ ...state, fichas: state.fichas.map((ficha) => (ficha.id === id ? updated : ficha)) });
    return updated;
  }

  let query = requireSupabase()
    .from('laboratory_technical_sheets')
    .update({
      equipment_id: input.equipoId || null,
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
    .eq('id', id);
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt);
  const { data, error } = await query.select('*').maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('La ficha cambió. Vuelva a abrirla antes de guardar para conservar los cambios recientes.');
  return mapFicha(data);
}

export async function deleteFichaTecnicaLaboratorio(id: string) {
  if (shouldUseLocalStorageFallback()) {
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
  await assertUniqueEquipoIdentity(input);

  if (shouldUseLocalStorageFallback()) {
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
  await assertUniqueEquipoIdentity(input, id);

  if (shouldUseLocalStorageFallback()) {
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

// Work registration must not resend a potentially stale equipment form.
export async function updateEstadoEquipoLaboratorio(id: string, estado: EstadoEquipoLaboratorio): Promise<EquipoLaboratorio> {
  const updatedAt = new Date().toISOString();
  if (shouldUseLocalStorageFallback()) {
    const state = readState();
    const current = state.equipos.find((equipo) => equipo.id === id);
    if (!current) throw new Error('No se encontro el equipo.');
    const updated = { ...current, estado, updatedAt };
    writeState({ ...state, equipos: state.equipos.map((equipo) => equipo.id === id ? updated : equipo) });
    return updated;
  }
  const { data, error } = await requireSupabase()
    .from('laboratory_equipment')
    .update({ status: estado, updated_at: updatedAt })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return mapEquipo(data);
}

export async function deleteEquipoLaboratorio(id: string) {
  if (shouldUseLocalStorageFallback()) {
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

  if (shouldUseLocalStorageFallback()) {
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

  if (shouldUseLocalStorageFallback()) {
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

  if (shouldUseLocalStorageFallback()) {
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

  if (shouldUseLocalStorageFallback()) {
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

  if (shouldUseLocalStorageFallback()) {
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

  if (shouldUseLocalStorageFallback()) {
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

  if (shouldUseLocalStorageFallback()) {
    const state = readState();
    const now = new Date().toISOString();
    const existingByIdentity = new Map(state.equipos.map((item) => [buildImportEquipoIdentityKey(item), item]));
    const nextEquipos = [...state.equipos];

    validInputs.forEach((input) => {
      const key = buildImportEquipoIdentityKey(input);
      const current = existingByIdentity.get(key);

      if (current) {
        const updated = { ...current, ...input, updatedAt: now };
        const index = nextEquipos.findIndex((item) => item.id === current.id);
        if (index >= 0) nextEquipos[index] = updated;
        existingByIdentity.set(key, updated);
        result.updated += 1;
        return;
      }

      const created: EquipoLaboratorio = { ...input, id: createId('equipo'), registradoPor: context.userId, createdAt: now, updatedAt: now };
      nextEquipos.unshift(created);
      existingByIdentity.set(key, created);
      result.created += 1;
    });

    writeState({ ...state, equipos: nextEquipos });
    return result;
  }

  requireContext(context);
  const client = requireSupabase();
  const existingRows = await fetchAllPages((from, to) => client.from('laboratory_equipment').select('*').order('id').range(from, to));

  const existingByIdentity = new Map(
    (existingRows ?? []).map((item) => [
      buildImportEquipoIdentityKey({
        codigo: String(item.code ?? ''),
        nombre: String(item.name ?? ''),
        categoria: String(item.category ?? ''),
        serie: String(item.serial_number ?? ''),
      }),
      item,
    ]),
  );

  try {
  for (const input of validInputs) {
    const key = buildImportEquipoIdentityKey(input);
    const current = existingByIdentity.get(key);

    if (current) {
      await updateEquipoLaboratorio(current.id, input);
      result.updated += 1;
      continue;
    }

    const created = await createEquipoLaboratorio(input, context);
    existingByIdentity.set(key, {
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

  } catch (error) {
    throw new Error(`Importación interrumpida: ${result.created} equipos creados y ${result.updated} actualizados. Los cambios ya guardados se conservan; revise el inventario antes de reintentar. Detalle: ${error instanceof Error ? error.message : 'Error de base de datos'}`);
  }
  return result;
}

export async function createBitacoraLaboratorio(
  input: BitacoraLaboratorioInput,
  context: LaboratorioSaveContext,
): Promise<BitacoraLaboratorio> {
  if (shouldUseLocalStorageFallback()) {
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
  if (shouldUseLocalStorageFallback()) {
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
  if (shouldUseLocalStorageFallback()) {
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
  if (shouldUseLocalStorageFallback()) {
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
  if (shouldUseLocalStorageFallback()) {
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
  if (shouldUseLocalStorageFallback()) {
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
  if (shouldUseLocalStorageFallback()) {
    const state = readState();
    const descarte: DescarteLaboratorio = { ...input, id: createId('descarte'), createdAt: new Date().toISOString() };
    writeState({ ...state, descartes: [descarte, ...state.descartes] });
    return descarte;
  }

  requireContext(context);
  const { data, error } = await requireSupabase()
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
      evidence_title: input.evidenciaTitulo,
      evidence_url: input.evidenciaUrl,
      created_by: context.userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapDescarte(data);
}

export async function deleteDescarteLaboratorio(id: string) {
  if (shouldUseLocalStorageFallback()) {
    const state = readState();
    writeState({ ...state, descartes: state.descartes.filter((descarte) => descarte.id !== id) });
    return;
  }

  const { error } = await requireSupabase().from('laboratory_discards').delete().eq('id', id);
  if (error) throw error;
}

export async function createAsignacionComponenteLaboratorio(
  input: AsignacionComponenteLaboratorioInput,
  context: LaboratorioSaveContext,
): Promise<AsignacionComponenteLaboratorio> {
  if (input.equipoPadreId === input.componenteId) {
    throw new Error('Un equipo no puede asignarse como componente de si mismo.');
  }

  if (shouldUseLocalStorageFallback()) {
    const state = readState();
    const parent = state.equipos.find((item) => item.id === input.equipoPadreId);
    const component = state.equipos.find((item) => item.id === input.componenteId);
    if (!parent || !component) throw new Error('No se encontro el equipo o componente seleccionado.');
    const exists = state.asignacionesComponentes.some(
      (item) => item.componenteId === input.componenteId && !item.fechaRetiro,
    );
    if (exists) throw new Error('Este componente ya esta asignado a otro equipo.');

    const now = new Date().toISOString();
    const asignacion: AsignacionComponenteLaboratorio = {
      ...input,
      id: createId('componente'),
      createdAt: now,
      updatedAt: now,
    };
    writeState({
      ...state,
      asignacionesComponentes: [asignacion, ...state.asignacionesComponentes],
      equipos: state.equipos.map((item) =>
        item.id === component.id ? { ...item, ubicacion: parent.ubicacion, updatedAt: now } : item,
      ),
    });
    return asignacion;
  }

  requireContext(context);
  const client = requireSupabase();
  const { data: parent, error: parentError } = await client
    .from('laboratory_equipment')
    .select('location')
    .eq('id', input.equipoPadreId)
    .single();
  if (parentError) throw parentError;

  const { count, error: countError } = await client
    .from('laboratory_component_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('component_equipment_id', input.componenteId)
    .is('removed_at', null);
  if (countError) throw countError;
  if ((count ?? 0) > 0) throw new Error('Este componente ya esta asignado a otro equipo.');

  const { data, error } = await client
    .from('laboratory_component_assignments')
    .insert({
      organization_id: context.organizationId,
      parent_equipment_id: input.equipoPadreId,
      component_equipment_id: input.componenteId,
      component_type: input.tipo,
      assigned_at: input.fechaAsignacion,
      removed_at: input.fechaRetiro,
      detail: input.detalle,
      responsible: input.responsable,
      created_by: context.userId,
    })
    .select('*')
    .single();
  if (error) throw error;

  await client
    .from('laboratory_equipment')
    .update({ location: parent.location, updated_at: new Date().toISOString() })
    .eq('id', input.componenteId);

  return mapAsignacionComponente(data);
}

export async function retirarAsignacionComponenteLaboratorio(
  id: string,
  context: LaboratorioSaveContext,
): Promise<AsignacionComponenteLaboratorio> {
  const now = new Date().toISOString();

  if (shouldUseLocalStorageFallback()) {
    const state = readState();
    const current = state.asignacionesComponentes.find((item) => item.id === id);
    if (!current) throw new Error('No se encontro la asignacion del componente.');
    const updated: AsignacionComponenteLaboratorio = {
      ...current,
      fechaRetiro: current.fechaRetiro ?? now,
      updatedAt: now,
    };
    writeState({
      ...state,
      asignacionesComponentes: state.asignacionesComponentes.map((item) => (item.id === id ? updated : item)),
    });
    return updated;
  }

  requireContext(context);
  const { data, error } = await requireSupabase()
    .from('laboratory_component_assignments')
    .update({ removed_at: now, updated_at: now })
    .eq('id', id)
    .eq('organization_id', context.organizationId!)
    .select('*')
    .single();

  if (error) throw error;
  return mapAsignacionComponente(data);
}
