import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  HardDrive,
  History,
  Moon,
  PackageCheck,
  Pencil,
  Save,
  Search,
  Settings2,
  Sun,
  Trash2,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BitacoraLaboratorioInput,
  EquipoLaboratorioInput,
  FichaTecnicaLaboratorioInput,
  LaboratorioState,
  PrestamoLaboratorioInput,
  buildLaboratorioReport,
  buildInformeMantenimientoPorRango,
  createAsignacionComponenteLaboratorio,
  createBitacoraLaboratorio,
  createCatalogoLaboratorio,
  createDescarteLaboratorio,
  createEquipoLaboratorio,
  createFichaTecnicaLaboratorio,
  createPrestamoLaboratorio,
  createSeccionLaboratorio,
  deleteBitacoraLaboratorio,
  deleteCatalogoLaboratorio,
  deleteDescarteLaboratorio,
  deleteEquipoLaboratorio,
  deleteFichaTecnicaLaboratorio,
  deletePrestamoLaboratorio,
  deleteSeccionLaboratorio,
  exportHistorialEquipoLaboratorioExcel,
  exportDescartesLaboratorioExcel,
  exportInformeMensualMantenimientoExcel,
  exportInformeMantenimientoPorRangoExcel,
  exportInformePendientesLaboratorioExcel,
  exportInformeUbicacionLaboratorioExcel,
  exportInventarioLaboratorioExcel,
  exportLaboratorioCsv,
  importEquiposLaboratorio,
  listLaboratorioData,
  retirarAsignacionComponenteLaboratorio,
  updateBitacoraLaboratorio,
  updateCatalogoLaboratorio,
  updateEquipoLaboratorio,
  updateFichaTecnicaLaboratorio,
  updatePrestamoLaboratorio,
  updateSeccionLaboratorio,
} from '@/servicios/laboratorio.servicio';
import {
  AsignacionComponenteLaboratorio,
  BitacoraLaboratorio,
  CatalogoLaboratorio,
  DescarteLaboratorio,
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
  EstadoTrabajoLaboratorio,
  ClaseRegistroLaboratorio,
  FichaTecnicaLaboratorio,
  PrestamoLaboratorio,
  PrioridadLaboratorio,
  SeccionLaboratorio,
} from '@/tipos/dominio';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { supabase } from '@/infraestructura/supabase';
import { formatDateTime } from '@/utilidades/formato';

type LabTab = 'inicio' | 'fichas' | 'bitacoras' | 'inventario' | 'descartes' | 'prestamos' | 'informes';
type CatalogManagerType = 'secciones' | 'categorias' | 'estados';
type TemaVisual = 'dark' | 'light';
type ConfirmacionOperativoPendiente = {
  input: BitacoraLaboratorioInput;
  equipoAtendido: EquipoLaboratorio;
  nextEquipoEstado: EstadoEquipoLaboratorio;
  form: HTMLFormElement;
};

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
  fichas: 'Ficha tecnica',
  bitacoras: 'Mantenimientos e incidencias',
  inventario: 'Inventario',
  descartes: 'Descartes',
  prestamos: 'Prestamos',
  informes: 'Informes',
};

const labTabOrder: LabTab[] = ['inicio', 'inventario', 'fichas', 'bitacoras', 'descartes', 'prestamos', 'informes'];

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

function localDateTimeValue(value = new Date()) {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function getInitialTheme(): TemaVisual {
  try {
    return localStorage.getItem('acad-theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function readString(data: FormData, key: string) {
  return String(data.get(key) ?? '').trim();
}

function normalizeExcelKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeLooseText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsExactLooseText(source: string, term: string) {
  const normalizedSource = normalizeLooseText(source);
  const normalizedTerm = normalizeLooseText(term);
  if (!normalizedSource || !normalizedTerm) return false;
  if (normalizedSource === normalizedTerm) return true;
  return new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}(\\s|$)`).test(normalizedSource);
}

function getTechnicalIdentifiers(value: string) {
  return Array.from(value.toLowerCase().matchAll(/[a-z0-9]+/g), (match) => match[0]).filter(
    (item) => item.length >= 3 && !['sin', 'sna', 'nan'].includes(item),
  );
}

function getEstadoEquipoLabel(value: string) {
  return estadoEquipoLabels[value] ?? value;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function getEstadoEquipoClass(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return normalized || 'personalizado';
}

function shouldRequestIssueDetailForEstado(estado: string) {
  if (estado === 'operativo' || estado === 'baja' || estado === 'prestado') return false;
  const normalized = normalizeExcelKey(estado);
  return (
    normalized.includes('pend') ||
    normalized.includes('revision') ||
    normalized.includes('repar') ||
    normalized.includes('manten') ||
    normalized.includes('incid')
  );
}

function getEstadoChangeWorkType(estado: string) {
  if (estado === 'operativo') return 'Cierre de mantenimiento';
  if (shouldRequestIssueDetailForEstado(estado)) return 'Incidencia';
  return 'Cambio de estado';
}

function getEstadoChangeWorkStatus(estado: string): EstadoTrabajoLaboratorio {
  if (estado === 'operativo' || estado === 'baja') return 'cerrado';
  if (estado === 'pendiente_revision') return 'pendiente';
  return 'en_proceso';
}

function readExcelCell(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeExcelKey);
  const entry = Object.entries(row).find(([key]) => normalizedAliases.includes(normalizeExcelKey(key)));
  return String(entry?.[1] ?? '').trim();
}

function normalizeEstadoEquipo(value: string): EstadoEquipoLaboratorio {
  const normalized = normalizeExcelKey(value);

  if (normalized.includes('repar')) return 'en_reparacion';
  if (normalized.includes('prest')) return 'prestado';
  if (normalized.includes('baja') || normalized.includes('descart')) return 'baja';
  if (normalized.includes('pend') || normalized.includes('revision')) return 'pendiente_revision';
  return 'operativo';
}

function splitMarcaModelo(value: string) {
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

function getNaturalInventorySortKey(item: EquipoLaboratorio) {
  const source = [item.nombre, item.codigo, item.serie].filter(Boolean).join(' ');
  const normalized = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const numberMatch = normalized.match(/\b(?:pc|est|estacion|equipo|lab)\s*[-#:]?\s*(\d+)\b/) ?? normalized.match(/\b(\d+)\b/);
  const number = numberMatch ? Number(numberMatch[1]) : Number.MAX_SAFE_INTEGER;
  const prefix = normalized.match(/[a-z]+/)?.[0] ?? 'zz';

  return { prefix, number, label: normalized };
}

function getInventoryStatusPriorityValue(estado: string) {
  const priority: Record<string, number> = {
    en_reparacion: 0,
    pendiente_revision: 1,
    mantenimiento: 2,
    prestado: 3,
    operativo: 5,
    baja: 6,
  };

  return priority[estado] ?? 4;
}

function getInventoryStatusPriority(item: EquipoLaboratorio) {
  return getInventoryStatusPriorityValue(item.estado);
}

function isRepairInventoryFilter(value: string) {
  return normalizeExcelKey(value).includes('repar');
}

function matchesInventoryLocationFilter(item: EquipoLaboratorio, ubicacion: string) {
  if (ubicacion === 'Todas') return true;
  if (isRepairInventoryFilter(ubicacion)) {
    return item.ubicacion === ubicacion || normalizeExcelKey(item.estado).includes('repar');
  }
  return item.ubicacion === ubicacion;
}

function matchesInventorySearch(item: EquipoLaboratorio, search: string) {
  const query = normalizeExcelKey(search);
  if (!query) return true;

  const haystack = normalizeExcelKey(
    [
      item.codigo,
      item.nombre,
      item.categoria,
      item.marcaModelo,
      item.serie,
      item.ubicacion,
      item.estado,
      item.observaciones,
    ].join(' '),
  );

  return haystack.includes(query);
}

function appendUniqueInventoryValue(baseValue: string, componentValues: string[]) {
  const values = [baseValue || 'S/N'];
  const seen = new Set(values.map(normalizeExcelKey).filter(Boolean));

  componentValues.forEach((value) => {
    const cleanValue = value.trim();
    const normalized = normalizeExcelKey(cleanValue);
    if (!cleanValue || !normalized || normalized === 'sn') return;
    const alreadyInsideBase = values.some((current) => normalizeExcelKey(current).includes(normalized));
    if (seen.has(normalized) || alreadyInsideBase) return;
    values.push(cleanValue);
    seen.add(normalized);
  });

  return values.join(' / ');
}

function resolveInventoryStatusFromBitacora(input: BitacoraLaboratorioInput): EstadoEquipoLaboratorio | null {
  const tipo = input.tipoTrabajo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (input.estado === 'resuelto' || input.estado === 'cerrado') return 'operativo';
  if (tipo.includes('preventivo')) return 'mantenimiento';
  if (
    tipo.includes('incidencia') ||
    tipo.includes('reparacion') ||
    tipo.includes('correctivo') ||
    tipo.includes('cambio de pieza') ||
    tipo.includes('diagnostico')
  ) {
    return 'en_reparacion';
  }
  if (tipo.includes('instalacion') || tipo.includes('soporte')) return 'mantenimiento';

  return null;
}

function sortEquiposInventario(items: EquipoLaboratorio[], prioritizeStatus = false) {
  return [...items].sort((first, second) => {
    if (prioritizeStatus) {
      const byStatus = getInventoryStatusPriority(first) - getInventoryStatusPriority(second);
      if (byStatus !== 0) return byStatus;
    }

    const firstKey = getNaturalInventorySortKey(first);
    const secondKey = getNaturalInventorySortKey(second);
    const byPrefix = firstKey.prefix.localeCompare(secondKey.prefix, 'es', { numeric: true });
    if (byPrefix !== 0) return byPrefix;
    if (firstKey.number !== secondKey.number) return firstKey.number - secondKey.number;
    return firstKey.label.localeCompare(secondKey.label, 'es', { numeric: true });
  });
}

function parseEquipoExcelRow(row: Record<string, unknown>, index: number): EquipoLaboratorioInput {
  const codigo =
    readExcelCell(row, ['codigo', 'codigo interno', 'inventario', 'n inventario', 'numero inventario', 'placa', 'asset', 'id']) ||
    `IMPORT-${index + 1}`;
  const nombre =
    readExcelCell(row, ['nombre', 'equipo', 'dispositivo', 'descripcion', 'pc', 'computadora']) || `Equipo ${codigo}`;
  const marca = readExcelCell(row, ['marca modelo', 'marca/modelo', 'marca', 'brand model']);
  const modelo = readExcelCell(row, ['modelo']);
  const marcaModelo = marca && modelo && !marca.toLowerCase().includes(modelo.toLowerCase()) ? `${marca} ${modelo}` : marca;

  return {
    codigo,
    nombre,
    categoria: readExcelCell(row, ['categoria', 'tipo', 'clase']) || 'Computadora',
    marcaModelo,
    serie: readExcelCell(row, ['serie', 'serial', 'numero serie', 's/n', 'sn']),
    ubicacion: readExcelCell(row, ['ubicacion', 'lugar', 'area', 'laboratorio', 'salon']) || 'Sin ubicacion',
    estado: normalizeEstadoEquipo(readExcelCell(row, ['estado', 'status', 'condicion'])),
    observaciones: readExcelCell(row, ['observaciones', 'observacion', 'notas', 'nota', 'detalle']),
  };
}

function shouldImportEquipoRow(input: EquipoLaboratorioInput) {
  const normalizedName = normalizeExcelKey(input.nombre);
  const normalizedText = normalizeExcelKey(
    [input.codigo, input.nombre, input.marcaModelo, input.observaciones].join(' '),
  );
  const isNoteRow =
    normalizedName.startsWith('nota') ||
    normalizedText.includes('debidalaincorporaciondenuevosequipos') ||
    normalizedText.includes('manteneruncontroladecuado');
  const hasLongNoteAsModel = input.marcaModelo.length > 70;
  const looksLikeNote =
    normalizedText.includes('nota') &&
    (normalizedText.includes('ajustesrealizados') ||
      normalizedText.includes('ordenfisico') ||
      normalizedText.includes('numeracionsecuencial'));
  const isGenericEquipmentName = normalizedName === 'computadora' || normalizedName.startsWith('equipo');

  return Boolean(input.codigo && input.nombre) && !isNoteRow && !looksLikeNote && !(isGenericEquipmentName && hasLongNoteAsModel);
}

type CampoUnicoEquipo = 'codigo' | 'serie';

function normalizeUniqueEquipoValue(value: string, campo: CampoUnicoEquipo) {
  const normalized = normalizeExcelKey(value);
  const genericInventoryValues = new Set(['sn', 'na', 'noaplica', 'sininventario', 'sincodigo']);
  const genericSerialValues = new Set(['sn', 'na', 'noaplica', 'sinserie', 'sinserial', 'sindato', 'sininformacion']);

  if (!normalized) return '';
  if (campo === 'codigo' && genericInventoryValues.has(normalized)) return '';
  if (campo === 'serie' && genericSerialValues.has(normalized)) return '';
  return normalized;
}

function findDuplicateEquipoIdentity(
  input: EquipoLaboratorioInput,
  equipos: EquipoLaboratorio[],
  currentId?: string,
) {
  const checks: Array<{ campo: CampoUnicoEquipo; valor: string; etiqueta: string }> = [
    { campo: 'codigo', valor: input.codigo, etiqueta: 'numero de inventario' },
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

    if (duplicate) {
      return { ...check, duplicate };
    }
  }

  return null;
}

function buildDuplicateEquipoMessage(duplicate: NonNullable<ReturnType<typeof findDuplicateEquipoIdentity>>) {
  return `Ya existe un equipo con ese ${duplicate.etiqueta}: ${duplicate.duplicate.codigo} - ${duplicate.duplicate.nombre}.`;
}

function filterUniqueEquipoInputsForImport(inputs: EquipoLaboratorioInput[], equipos: EquipoLaboratorio[]) {
  const existingByCodigo = new Map(
    equipos
      .map((equipo) => [normalizeUniqueEquipoValue(equipo.codigo, 'codigo'), equipo] as const)
      .filter(([key]) => Boolean(key)),
  );
  const existingBySerie = new Map(
    equipos
      .map((equipo) => [normalizeUniqueEquipoValue(equipo.serie, 'serie'), equipo] as const)
      .filter(([key]) => Boolean(key)),
  );
  const seenCodigo = new Set<string>();
  const seenSerie = new Set<string>();
  let ignoredDuplicates = 0;

  const uniqueInputs = inputs.filter((input) => {
    const codigoKey = normalizeUniqueEquipoValue(input.codigo, 'codigo');
    const serieKey = normalizeUniqueEquipoValue(input.serie, 'serie');
    const existingBySameCode = codigoKey ? existingByCodigo.get(codigoKey) : undefined;
    const existingBySameSerie = serieKey ? existingBySerie.get(serieKey) : undefined;
    const serialBelongsToAnotherEquipo =
      existingBySameSerie && (!existingBySameCode || existingBySameSerie.id !== existingBySameCode.id);

    if ((codigoKey && seenCodigo.has(codigoKey)) || (serieKey && seenSerie.has(serieKey)) || serialBelongsToAnotherEquipo) {
      ignoredDuplicates += 1;
      return false;
    }

    if (codigoKey) seenCodigo.add(codigoKey);
    if (serieKey) seenSerie.add(serieKey);
    return true;
  });

  return { uniqueInputs, ignoredDuplicates };
}

function stringifyExcelValue(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? '').trim();
}

function formatImportedExcelDate(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + value * 24 * 60 * 60 * 1000).toISOString();
  }

  const raw = stringifyExcelValue(value);
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function parseDescartesExcelRows(rows: unknown[][], fileName: string, responsable: string) {
  const headerIndex = rows.findIndex((row) => {
    const keys = row.map((cell) => normalizeExcelKey(stringifyExcelValue(cell)));
    return keys.includes('inventario') && keys.includes('equipo') && keys.includes('serie');
  });

  if (headerIndex < 0) {
    throw new Error('No se encontro la fila de encabezados del descarte. Debe incluir Inventario, Equipo y Serie.');
  }

  const header = rows[headerIndex].map((cell) => normalizeExcelKey(stringifyExcelValue(cell)));
  const columnIndex = (aliases: string[]) => header.findIndex((key) => aliases.map(normalizeExcelKey).includes(key));
  const readColumn = (row: unknown[], aliases: string[]) => {
    const index = columnIndex(aliases);
    return index >= 0 ? stringifyExcelValue(row[index]) : '';
  };
  const sheetDate = rows
    .slice(0, headerIndex)
    .flat()
    .find((cell) => cell instanceof Date || typeof cell === 'number' || /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(stringifyExcelValue(cell)));
  const fecha = formatImportedExcelDate(sheetDate);

  return rows
    .slice(headerIndex + 1)
    .map((row) => ({
      fecha,
      equipoId: '',
      inventario: readColumn(row, ['inventario', 'numero inventario', 'n inventario']),
      equipo: readColumn(row, ['equipo', 'dispositivo', 'tipo']),
      marca: readColumn(row, ['marca']),
      modelo: readColumn(row, ['modelo']),
      serie: readColumn(row, ['serie', 'serial']),
      detalle: readColumn(row, ['detalle', 'observacion', 'observaciones']) || `Importado desde ${fileName}`,
      ubicacion: readColumn(row, ['ubicacion', 'ubicación', 'lugar']) || 'Deposito',
      responsable,
      evidenciaTitulo: `Excel importado: ${fileName}`,
      evidenciaUrl: '',
    }))
    .filter((item) => item.inventario || item.equipo || item.serie || item.detalle);
}

function downloadTextFile(content: string, fileName: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function buildBitacoraInput(form: HTMLFormElement): BitacoraLaboratorioInput {
  const data = new FormData(form);
  const equipoId = readString(data, 'equipoId');
  const equipoLabel = readString(data, 'equipoLabel');
  const tipoTrabajo = readString(data, 'tipoTrabajo');
  const clase = tipoTrabajo === 'Incidencia' ? 'incidencia' : 'mantenimiento';
  return {
    fecha: new Date(readString(data, 'fecha')).toISOString(),
    tipoTrabajo,
    titulo: readString(data, 'titulo'),
    descripcion: readString(data, 'descripcion'),
    responsable: readString(data, 'responsable'),
    prioridad: readString(data, 'prioridad') as PrioridadLaboratorio,
    estado: readString(data, 'estado') as EstadoTrabajoLaboratorio,
    clase,
    equipoId,
    equipoOrigen: readString(data, 'equipoOrigenInventario') || readString(data, 'equipoOrigen'),
    equipoDestino: equipoLabel || readString(data, 'equipoDestino'),
    ubicacion: readString(data, 'ubicacion'),
    evidenciaTitulo: readString(data, 'evidenciaTitulo'),
    evidenciaUrl: readString(data, 'evidenciaUrl'),
  };
}

function buildFichaTecnicaInput(form: HTMLFormElement): FichaTecnicaLaboratorioInput {
  const data = new FormData(form);

  return {
    fecha: new Date(readString(data, 'fecha')).toISOString(),
    pc: readString(data, 'pc'),
    direccionIp: readString(data, 'direccionIp'),
    ubicacion: readString(data, 'ubicacion'),
    responsable: readString(data, 'responsable'),
    usuarioAsignado: readString(data, 'usuarioAsignado'),
    referenciaAcceso: readString(data, 'referenciaAcceso'),
    aplicaciones: aplicacionesBase.map((nombre) => ({
      nombre,
      instalada: data.get(`app-${nombre}`) === 'on',
      observacion: readString(data, `appObs-${nombre}`),
    })),
    caracteristicas: caracteristicasBase.map((nombre) => ({
      nombre,
      valor: readString(data, `caracteristica-${nombre}`),
    })),
    inventario: inventarioBase.map((equipo) => ({
      equipo,
      numero: readString(data, `inventario-${equipo}`),
    })),
    acciones: Array.from({ length: 6 }, (_, index) => ({
      fecha: readString(data, `accionFecha-${index}`),
      accion: readString(data, `accion-${index}`),
      observacion: readString(data, `accionObs-${index}`),
      responsable: readString(data, `accionResponsable-${index}`),
    })).filter((accion) => accion.fecha || accion.accion || accion.observacion || accion.responsable),
    observacionGeneral: readString(data, 'observacionGeneral'),
  };
}

function buildEquipoInput(form: HTMLFormElement): EquipoLaboratorioInput {
  const data = new FormData(form);
  const marca = readString(data, 'marca');
  const modelo = readString(data, 'modelo');
  return {
    codigo: readString(data, 'codigo'),
    nombre: readString(data, 'nombre'),
    categoria: readString(data, 'categoria'),
    marcaModelo: [marca, modelo].filter(Boolean).join(' '),
    serie: readString(data, 'serie'),
    ubicacion: readString(data, 'ubicacion'),
    estado: readString(data, 'estado') as EstadoEquipoLaboratorio,
    observaciones: readString(data, 'observaciones'),
  };
}

function buildDescarteInput(form: HTMLFormElement, responsableSesion: string) {
  const data = new FormData(form);
  const fecha = readString(data, 'fecha');
  return {
    fecha: fecha ? new Date(`${fecha}T12:00:00`).toISOString() : new Date().toISOString(),
    equipoId: readString(data, 'equipoId'),
    inventario: readString(data, 'inventario'),
    equipo: readString(data, 'equipo'),
    marca: readString(data, 'marca'),
    modelo: readString(data, 'modelo'),
    serie: readString(data, 'serie'),
    detalle: readString(data, 'detalle'),
    ubicacion: readString(data, 'ubicacion'),
    responsable: readString(data, 'responsable') || responsableSesion,
    evidenciaTitulo: readString(data, 'evidenciaTitulo'),
    evidenciaUrl: readString(data, 'evidenciaUrl'),
  };
}

function buildSeccionInput(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    nombre: readString(data, 'nombre'),
    descripcion: readString(data, 'descripcion'),
  };
}

function buildPrestamoInput(form: HTMLFormElement): PrestamoLaboratorioInput {
  const data = new FormData(form);
  const fechaDevolucion = readString(data, 'fechaDevolucion');

  return {
    equipo: readString(data, 'equipo'),
    entregadoA: readString(data, 'entregadoA'),
    tipoBeneficiario: readString(data, 'tipoBeneficiario') as PrestamoLaboratorioInput['tipoBeneficiario'],
    documento: readString(data, 'documento'),
    responsableEntrega: readString(data, 'responsableEntrega'),
    fechaPrestamo: new Date(readString(data, 'fechaPrestamo')).toISOString(),
    fechaDevolucion: fechaDevolucion ? new Date(fechaDevolucion).toISOString() : null,
    estado: readString(data, 'estado') as PrestamoLaboratorioInput['estado'],
    observaciones: readString(data, 'observaciones'),
  };
}

export function PaginaLaboratorio() {
  const navigate = useNavigate();
  const { profile } = useAutenticacion();
  const [activeTab, setActiveTab] = useState<LabTab>('inicio');
  const [state, setState] = useState<LaboratorioState>(emptyState);
  const [editingFicha, setEditingFicha] = useState<FichaTecnicaLaboratorio | null>(null);
  const [editingBitacora, setEditingBitacora] = useState<BitacoraLaboratorio | null>(null);
  const [editingEquipo, setEditingEquipo] = useState<EquipoLaboratorio | null>(null);
  const [editingSeccion, setEditingSeccion] = useState<SeccionLaboratorio | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<CatalogoLaboratorio | null>(null);
  const [editingEstadoEquipo, setEditingEstadoEquipo] = useState<CatalogoLaboratorio | null>(null);
  const [editingPrestamo, setEditingPrestamo] = useState<PrestamoLaboratorio | null>(null);
  const [selectedFicha, setSelectedFicha] = useState<FichaTecnicaLaboratorio | null>(null);
  const [selectedEquipoDetalle, setSelectedEquipoDetalle] = useState<EquipoLaboratorio | null>(null);
  const [showEquipoFormModal, setShowEquipoFormModal] = useState(false);
  const [activeCatalogManager, setActiveCatalogManager] = useState<CatalogManagerType | null>(null);
  const [selectedEquipoFichaId, setSelectedEquipoFichaId] = useState('');
  const [selectedDescarteEquipoId, setSelectedDescarteEquipoId] = useState('');
  const [selectedInventoryLocation, setSelectedInventoryLocation] = useState('Todas');
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedReportMonth, setSelectedReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportStartDate, setReportStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedReportLocation, setSelectedReportLocation] = useState('Todas');
  const [selectedReportEquipoId, setSelectedReportEquipoId] = useState('');
  const [componentMoveTargets, setComponentMoveTargets] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileNamesById, setProfileNamesById] = useState<Record<string, string>>({});
  const [showMoreActivity, setShowMoreActivity] = useState(false);
  const [theme, setTheme] = useState<TemaVisual>(getInitialTheme);
  const [confirmacionOperativo, setConfirmacionOperativo] = useState<ConfirmacionOperativoPendiente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const saveContext = useMemo(
    () => ({
      organizationId: profile?.organizationId ?? null,
      userId: profile?.id ?? '',
    }),
    [profile?.id, profile?.organizationId],
  );
  const responsableSesion = profile?.fullName || profile?.email || 'Soporte tecnico';
  const isLightTheme = theme === 'light';

  const selectedEquipoFicha = useMemo(
    () => state.equipos.find((item) => item.id === selectedEquipoFichaId) ?? null,
    [selectedEquipoFichaId, state.equipos],
  );

  const selectedDescarteEquipo = useMemo(
    () => state.equipos.find((item) => item.id === selectedDescarteEquipoId) ?? null,
    [selectedDescarteEquipoId, state.equipos],
  );

  const componentesAsignadosActivosIds = useMemo(
    () => new Set(state.asignacionesComponentes.filter((item) => !item.fechaRetiro).map((item) => item.componenteId)),
    [state.asignacionesComponentes],
  );

  const equiposInventarioVisibles = useMemo(
    () => state.equipos.filter((item) => !componentesAsignadosActivosIds.has(item.id)),
    [componentesAsignadosActivosIds, state.equipos],
  );

  const ubicacionesInventario = useMemo(() => {
    const catalogLocations = state.secciones
      .map((item) => item.nombre.trim())
      .filter((value): value is string => Boolean(value));
    const importedLocations = equiposInventarioVisibles
      .map((item) => item.ubicacion?.trim())
      .filter((value): value is string => Boolean(value));
    return ['Todas', ...Array.from(new Set([...catalogLocations, ...importedLocations]))];
  }, [equiposInventarioVisibles, state.secciones]);

  const estadosAlertaPorUbicacion = useMemo(() => {
    return ubicacionesInventario.reduce<Record<string, string[]>>((acc, ubicacion) => {
      const items =
        ubicacion === 'Todas'
          ? equiposInventarioVisibles
          : equiposInventarioVisibles.filter((equipo) => matchesInventoryLocationFilter(equipo, ubicacion));
      const estados = Array.from(
        new Set(items.map((equipo) => equipo.estado).filter((estado) => estado && estado !== 'operativo')),
      ).sort((first, second) => getInventoryStatusPriorityValue(first) - getInventoryStatusPriorityValue(second));

      acc[ubicacion] = estados;
      return acc;
    }, {});
  }, [equiposInventarioVisibles, ubicacionesInventario]);

  const equiposInventarioFiltrados = useMemo(() => {
    const filteredByLocation =
      selectedInventoryLocation === 'Todas'
        ? equiposInventarioVisibles
        : equiposInventarioVisibles.filter((item) => matchesInventoryLocationFilter(item, selectedInventoryLocation));
    const query = normalizeExcelKey(inventorySearch);
    const filtered = filteredByLocation.filter((item) => {
      if (matchesInventorySearch(item, inventorySearch)) return true;
      if (!query) return true;
      const calculado = getInventarioCalculadoEquipo(item);
      return normalizeExcelKey([calculado.marca, calculado.modelo, calculado.codigo, calculado.serie].join(' ')).includes(query);
    });
    return sortEquiposInventario(filtered, selectedInventoryLocation === 'Todas');
  }, [equiposInventarioVisibles, inventorySearch, selectedInventoryLocation]);

  const categoriasEquipo = useMemo(() => {
    const catalogItems = state.categoriasEquipo
      .map((item) => item.nombre.trim())
      .filter((value): value is string => Boolean(value));
    const importedItems = state.equipos
      .map((item) => item.categoria?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...catalogItems, ...importedItems]));
  }, [state.categoriasEquipo, state.equipos]);

  const estadosEquipo = useMemo(() => {
    const defaultItems = ['operativo', 'mantenimiento', 'en_reparacion', 'prestado', 'pendiente_revision', 'baja'];
    const catalogItems = state.estadosEquipo
      .map((item) => item.nombre.trim())
      .filter((value): value is string => Boolean(value));
    const importedItems = state.equipos
      .map((item) => item.estado?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...defaultItems, ...catalogItems, ...importedItems]));
  }, [state.equipos, state.estadosEquipo]);

  const estadoEquipoNombre = useMemo(
    () =>
      state.estadosEquipo.reduce<Record<string, string>>((acc, item) => {
        acc[item.nombre] = item.descripcion || getEstadoEquipoLabel(item.nombre);
        return acc;
      }, {}),
    [state.estadosEquipo],
  );

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      setState(await listLaboratorioData());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la informacion del laboratorio.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('acad-theme', theme);
    } catch {
      // No se guarda si el navegador bloquea almacenamiento local.
    }
  }, [theme]);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const registeredIds = Array.from(new Set(state.equipos.map((item) => item.registradoPor).filter((value) => value && isUuid(value))));
    const missingIds = registeredIds.filter((id) => !profileNamesById[id]);
    if (profile?.id && profile.fullName) {
      setProfileNamesById((current) => (current[profile.id] ? current : { ...current, [profile.id]: profile.fullName }));
    }
    if (!supabase || missingIds.length === 0) return;

    supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', missingIds)
      .then(({ data }) => {
        if (!data?.length) return;
        setProfileNamesById((current) => ({
          ...current,
          ...Object.fromEntries(data.map((row) => [row.id, row.full_name])),
        }));
      });
  }, [profile?.fullName, profile?.id, profileNamesById, state.equipos]);

  useEffect(() => {
    if (!message && !error) return undefined;

    const timeout = window.setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [message, error]);

  useEffect(() => {
    if (!selectedFicha && !selectedEquipoDetalle && !showEquipoFormModal && !activeCatalogManager && !confirmacionOperativo) return undefined;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setSelectedFicha(null);
      setSelectedEquipoDetalle(null);
      setShowEquipoFormModal(false);
      setConfirmacionOperativo(null);
      setEditingEquipo(null);
      closeCatalogManager();
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeCatalogManager, confirmacionOperativo, selectedEquipoDetalle, selectedFicha, showEquipoFormModal]);

  const indicadores = useMemo(() => {
    const trabajosAbiertos = state.bitacoras.filter((item) => item.estado !== 'cerrado').length;
    const equiposMantenimiento = state.equipos.filter((item) => item.estado === 'mantenimiento').length;
    const equiposPendientes = state.equipos.filter((item) => item.estado !== 'operativo').length;
    const prestamosActivos = state.prestamos.filter((item) => item.estado === 'activo').length;
    const descartesRegistrados = state.descartes.length;
    const evidencias = state.bitacoras.filter((item) => item.evidenciaUrl || item.evidenciaTitulo).length;

    return { trabajosAbiertos, equiposMantenimiento, equiposPendientes, prestamosActivos, descartesRegistrados, evidencias };
  }, [state]);

  const actividadReciente = useMemo(() => {
    const bitacoras = state.bitacoras.map((item) => ({
      id: `bitacora-${item.id}`,
      fecha: item.fecha,
      tipo: 'Bitacora',
      titulo: item.titulo,
      detalle: `${item.responsable || 'Sin responsable'} | ${estadoTrabajoLabels[item.estado]}`,
      tab: 'bitacoras' as LabTab,
    }));
    const fichas = state.fichas.map((item) => ({
      id: `ficha-${item.id}`,
      fecha: item.updatedAt,
      tipo: 'Ficha tecnica',
      titulo: item.pc,
      detalle: `${item.ubicacion || 'Sin ubicacion'} | ${item.responsable || 'Sin responsable'}`,
      tab: 'fichas' as LabTab,
    }));
    const prestamos = state.prestamos.map((item) => ({
      id: `prestamo-${item.id}`,
      fecha: item.fechaPrestamo,
      tipo: 'Prestamo',
      titulo: item.equipo,
      detalle: `${item.entregadoA} | ${item.estado}`,
      tab: 'prestamos' as LabTab,
    }));
    const descartes = state.descartes.map((item) => ({
      id: `descarte-${item.id}`,
      fecha: item.fecha,
      tipo: 'Descarte',
      titulo: item.equipo,
      detalle: `${item.responsable || 'Sin responsable'} | ${item.ubicacion || 'Sin ubicacion'}`,
      tab: 'descartes' as LabTab,
    }));
    const equipos = state.equipos.map((item) => {
      const isCreation = Math.abs(new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime()) < 2000;
      const responsable =
        item.registradoPor && item.registradoPor === profile?.id
          ? profile.fullName
          : item.registradoPor && profileNamesById[item.registradoPor]
            ? profileNamesById[item.registradoPor]
          : item.registradoPor && !isUuid(item.registradoPor)
            ? item.registradoPor
            : 'Usuario del sistema';
      return {
        id: `equipo-${item.id}`,
        fecha: item.updatedAt || item.createdAt,
        tipo: isCreation ? 'Equipo registrado' : 'Equipo actualizado',
        titulo: item.nombre,
        detalle: `${responsable} | ${item.ubicacion || 'Sin ubicacion'} | ${estadoEquipoNombre[item.estado] ?? getEstadoEquipoLabel(item.estado)}`,
        tab: 'inventario' as LabTab,
      };
    });

    return [...bitacoras, ...fichas, ...prestamos, ...descartes, ...equipos]
      .sort((first, second) => second.fecha.localeCompare(first.fecha))
      .slice(0, showMoreActivity ? 20 : 8);
  }, [estadoEquipoNombre, profile?.fullName, profile?.id, profileNamesById, showMoreActivity, state.bitacoras, state.descartes, state.equipos, state.fichas, state.prestamos]);

  async function handleFichaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildFichaTecnicaInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingFicha) {
        const updated = await updateFichaTecnicaLaboratorio(editingFicha.id, input);
        setEditingFicha(null);
        setSelectedFicha(updated);
        setMessage('Ficha tecnica actualizada correctamente.');
      } else {
        const created = await createFichaTecnicaLaboratorio(input, saveContext);
        setSelectedFicha(created);
        setSelectedEquipoFichaId('');
        setMessage('Ficha tecnica guardada correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la ficha tecnica.');
    } finally {
      setIsSaving(false);
    }
  }

  async function guardarBitacoraConInventario(
    input: BitacoraLaboratorioInput,
    equipoAtendido: EquipoLaboratorio | undefined,
    nextEquipoEstado: EstadoEquipoLaboratorio | null,
    shouldSyncEquipoEstado: boolean,
    form: HTMLFormElement,
  ) {
    if (shouldSyncEquipoEstado && equipoAtendido && nextEquipoEstado && equipoAtendido.estado !== nextEquipoEstado) {
      const previousEstadoLabel = estadoEquipoNombre[equipoAtendido.estado] ?? getEstadoEquipoLabel(equipoAtendido.estado);
      const nextEstadoLabel = estadoEquipoNombre[nextEquipoEstado] ?? getEstadoEquipoLabel(nextEquipoEstado);
      input.descripcion = `${input.descripcion.trim()}\n\nAuditoria de inventario: ${previousEstadoLabel} -> ${nextEstadoLabel}.`;
      input.equipoOrigen = input.equipoOrigen || equipoAtendido.estado;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingBitacora) {
        await updateBitacoraLaboratorio(editingBitacora.id, input);
        setEditingBitacora(null);
        setMessage('Bitacora actualizada correctamente.');
      } else {
        await createBitacoraLaboratorio(input, saveContext);
        setMessage('Bitacora registrada correctamente.');
        form.reset();
      }

      if (shouldSyncEquipoEstado && equipoAtendido && nextEquipoEstado && equipoAtendido.estado !== nextEquipoEstado) {
        await updateEquipoLaboratorio(equipoAtendido.id, {
          codigo: equipoAtendido.codigo,
          nombre: equipoAtendido.nombre,
          categoria: equipoAtendido.categoria,
          marcaModelo: equipoAtendido.marcaModelo,
          serie: equipoAtendido.serie,
          ubicacion: equipoAtendido.ubicacion,
          estado: nextEquipoEstado,
          observaciones: equipoAtendido.observaciones,
        });
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la bitacora.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEquipoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildEquipoInput(form);
    const duplicate = findDuplicateEquipoIdentity(input, state.equipos, editingEquipo?.id);

    if (duplicate) {
      setError(buildDuplicateEquipoMessage(duplicate));
      return;
    }

    const hasEstadoChange = Boolean(editingEquipo && editingEquipo.estado !== input.estado);
    const previousEstadoLabel = editingEquipo ? estadoEquipoNombre[editingEquipo.estado] ?? getEstadoEquipoLabel(editingEquipo.estado) : '';
    const nextEstadoLabel = estadoEquipoNombre[input.estado] ?? getEstadoEquipoLabel(input.estado);
    const closingDetail =
      editingEquipo && hasEstadoChange && input.estado === 'operativo' && editingEquipo.estado !== 'operativo'
        ? window.prompt('Detalle del trabajo realizado antes de dejar el equipo operativo:')
        : null;
    const issueDetail =
      editingEquipo && hasEstadoChange && shouldRequestIssueDetailForEstado(input.estado)
        ? window.prompt('Describa la incidencia, falla o motivo de revision del equipo:')
        : null;

    if (editingEquipo && hasEstadoChange && input.estado === 'operativo' && !closingDetail?.trim()) {
      setError('Debe escribir un detalle antes de devolver el equipo a operativo.');
      return;
    }

    if (editingEquipo && hasEstadoChange && shouldRequestIssueDetailForEstado(input.estado) && !issueDetail?.trim()) {
      setError('Debe escribir la incidencia o motivo antes de cambiar el estado del equipo.');
      return;
    }

    if (hasEstadoChange && input.estado === 'baja') {
      input.ubicacion = 'Deposito';
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingEquipo) {
        await updateEquipoLaboratorio(editingEquipo.id, input);
        if (hasEstadoChange) {
          const equipoLabel = `${input.codigo || editingEquipo.codigo} - ${input.nombre || editingEquipo.nombre}`;
          const workType = getEstadoChangeWorkType(input.estado);
          const automaticDescription =
            input.estado === 'operativo'
              ? `Equipo devuelto a operativo. Estado anterior: ${previousEstadoLabel}. Detalle: ${closingDetail?.trim()}`
              : shouldRequestIssueDetailForEstado(input.estado)
                ? `Incidencia registrada desde inventario. Estado anterior: ${previousEstadoLabel}. Estado actual: ${nextEstadoLabel}. Detalle: ${issueDetail?.trim()}`
                : `Cambio de estado tecnico desde edicion de inventario: ${previousEstadoLabel} -> ${nextEstadoLabel}.`;
          await createBitacoraLaboratorio(
            {
              fecha: new Date().toISOString(),
              tipoTrabajo: workType,
              titulo:
                input.estado === 'operativo'
                  ? `Equipo operativo: ${equipoLabel}`
                  : shouldRequestIssueDetailForEstado(input.estado)
                    ? `Incidencia en ${equipoLabel}`
                    : `Equipo en ${nextEstadoLabel}: ${equipoLabel}`,
              descripcion: automaticDescription,
              responsable: profile?.fullName || profile?.email || 'Soporte tecnico',
              prioridad: input.estado === 'baja' ? 'alta' : 'media',
              estado: getEstadoChangeWorkStatus(input.estado),
              clase: input.estado === 'operativo' ? 'mantenimiento' : 'incidencia',
              equipoId: editingEquipo.id,
              equipoOrigen: editingEquipo.estado,
              equipoDestino: equipoLabel,
              ubicacion: input.ubicacion,
              evidenciaTitulo: '',
              evidenciaUrl: '',
            },
            saveContext,
          );
        }
        setEditingEquipo(null);
        setMessage(hasEstadoChange ? 'Equipo actualizado y bitacora automatica registrada.' : 'Equipo actualizado correctamente.');
      } else {
        await createEquipoLaboratorio(input, saveContext);
        setMessage('Equipo agregado al inventario.');
        form.reset();
      }

      setShowEquipoFormModal(false);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el equipo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBitacoraSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildBitacoraInput(form);
    const equipoAtendido = state.equipos.find((item) => item.id === input.equipoId);
    const nextEquipoEstado = equipoAtendido ? resolveInventoryStatusFromBitacora(input) : null;
    const shouldSyncEquipoEstado = Boolean(equipoAtendido && nextEquipoEstado);

    if (equipoAtendido) {
      input.equipoDestino = `${equipoAtendido.codigo} - ${equipoAtendido.nombre}`;
      input.ubicacion = input.ubicacion || equipoAtendido.ubicacion;
    }

    if (equipoAtendido && nextEquipoEstado === 'operativo' && equipoAtendido.estado !== 'operativo') {
      setConfirmacionOperativo({ input, equipoAtendido, nextEquipoEstado, form });
      return;
    }

    await guardarBitacoraConInventario(input, equipoAtendido, nextEquipoEstado, shouldSyncEquipoEstado, form);
  }

  async function handleQuickEstadoEquipo(item: EquipoLaboratorio, estado: EstadoEquipoLaboratorio) {
    if (item.estado === estado) return;
    const previousEstadoLabel = estadoEquipoNombre[item.estado] ?? getEstadoEquipoLabel(item.estado);
    const nextEstadoLabel = estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado);
    const closingDetail =
      estado === 'operativo' && item.estado !== 'operativo'
        ? window.prompt('Detalle del trabajo realizado antes de dejar el equipo operativo:')
        : null;
    const issueDetail =
      shouldRequestIssueDetailForEstado(estado)
        ? window.prompt('Describa la incidencia, falla o motivo de revision del equipo:')
        : null;

    if (estado === 'operativo' && item.estado !== 'operativo' && !closingDetail?.trim()) {
      setError('Debe escribir un detalle antes de devolver el equipo a operativo.');
      return;
    }

    if (shouldRequestIssueDetailForEstado(estado) && !issueDetail?.trim()) {
      setError('Debe escribir la incidencia o motivo antes de cambiar el estado del equipo.');
      return;
    }

    const nextUbicacion = estado === 'baja' ? 'Deposito' : item.ubicacion;
    const equipoLabel = `${item.codigo} - ${item.nombre}`;
    const workType = getEstadoChangeWorkType(estado);
    const automaticDescription =
      estado === 'operativo'
        ? `Equipo devuelto a operativo. Estado anterior: ${previousEstadoLabel}. Detalle: ${closingDetail?.trim()}`
        : shouldRequestIssueDetailForEstado(estado)
          ? `Incidencia registrada desde inventario. Estado anterior: ${previousEstadoLabel}. Estado actual: ${nextEstadoLabel}. Detalle: ${issueDetail?.trim()}`
          : `Cambio de estado tecnico: ${previousEstadoLabel} -> ${nextEstadoLabel}.`;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateEquipoLaboratorio(item.id, {
        codigo: item.codigo,
        nombre: item.nombre,
        categoria: item.categoria,
        marcaModelo: item.marcaModelo,
        serie: item.serie,
        ubicacion: nextUbicacion,
        estado,
        observaciones: item.observaciones,
      });
      try {
        await createBitacoraLaboratorio(
          {
            fecha: new Date().toISOString(),
            tipoTrabajo: workType,
            titulo:
              estado === 'operativo'
                ? `Equipo operativo: ${equipoLabel}`
                : shouldRequestIssueDetailForEstado(estado)
                  ? `Incidencia en ${equipoLabel}`
                  : `Equipo en ${nextEstadoLabel}: ${equipoLabel}`,
            descripcion: automaticDescription,
            responsable: profile?.fullName || profile?.email || 'Soporte tecnico',
            prioridad: estado === 'baja' ? 'alta' : 'media',
            estado: getEstadoChangeWorkStatus(estado),
            clase: estado === 'operativo' ? 'mantenimiento' : 'incidencia',
            equipoId: item.id,
            equipoOrigen: item.estado,
            equipoDestino: equipoLabel,
            ubicacion: nextUbicacion,
            evidenciaTitulo: '',
            evidenciaUrl: '',
          },
          saveContext,
        );
      } catch (historyError) {
        const detail = historyError instanceof Error ? historyError.message : 'Error desconocido';
        setError(`Estado actualizado, pero no se pudo guardar el historial automatico: ${detail}`);
      }
      setMessage(
        estado === 'baja'
          ? 'Equipo marcado como baja y movido a Deposito.'
          : `Estado actualizado a ${estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}.`,
      );
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar el estado del equipo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDescarteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildDescarteInput(form, responsableSesion);
    const equipo = input.equipoId ? state.equipos.find((item) => item.id === input.equipoId) : null;

    if (!input.inventario.trim() || !input.equipo.trim()) {
      setError('Indique el numero de inventario y el equipo a descartar.');
      return;
    }

    if (!input.detalle.trim()) {
      setError('Escriba el detalle o motivo del descarte.');
      return;
    }

    if (equipo && !normalizeExcelKey(equipo.ubicacion).includes('deposito')) {
      setError('Para descartar un equipo registrado, primero debe estar ubicado en Deposito.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createDescarteLaboratorio(input, saveContext);

      if (equipo) {
        await createBitacoraLaboratorio(
          {
            fecha: new Date().toISOString(),
            tipoTrabajo: 'Descarte de equipo',
            titulo: `Equipo descartado: ${input.inventario} - ${input.equipo}`,
            descripcion: input.detalle,
            responsable: input.responsable,
            prioridad: 'alta',
            estado: 'cerrado',
            clase: 'incidencia',
            equipoId: equipo.id,
            equipoOrigen: equipo.estado,
            equipoDestino: `${input.inventario} - ${input.equipo}`,
            ubicacion: input.ubicacion || equipo.ubicacion || 'Deposito',
            evidenciaTitulo: input.evidenciaTitulo,
            evidenciaUrl: input.evidenciaUrl,
          },
          saveContext,
        );
        await deleteEquipoLaboratorio(equipo.id);
      }

      setSelectedDescarteEquipoId('');
      form.reset();
      setMessage(equipo ? 'Descarte registrado y equipo retirado del inventario activo.' : 'Descarte registrado correctamente.');
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el descarte. Ejecuta la migracion de descartes en Supabase si aun no existe la tabla.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSeccionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildSeccionInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingSeccion) {
        await updateSeccionLaboratorio(editingSeccion.id, input);
        setEditingSeccion(null);
        setMessage('Seccion actualizada correctamente.');
      } else {
        await createSeccionLaboratorio(input, saveContext);
        setMessage('Seccion agregada correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la seccion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCatalogoSubmit(
    event: FormEvent<HTMLFormElement>,
    tipo: CatalogoLaboratorio['tipo'],
    editingItem: CatalogoLaboratorio | null,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildSeccionInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingItem) {
        await updateCatalogoLaboratorio(editingItem.id, tipo, input);
        if (tipo === 'categoria_equipo') setEditingCategoria(null);
        else setEditingEstadoEquipo(null);
        setMessage(tipo === 'categoria_equipo' ? 'Categoria actualizada correctamente.' : 'Estado actualizado correctamente.');
      } else {
        await createCatalogoLaboratorio(tipo, input, saveContext);
        setMessage(tipo === 'categoria_equipo' ? 'Categoria agregada correctamente.' : 'Estado agregado correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la opcion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePrestamoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildPrestamoInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingPrestamo) {
        await updatePrestamoLaboratorio(editingPrestamo.id, input);
        setEditingPrestamo(null);
        setMessage('Prestamo actualizado correctamente.');
      } else {
        await createPrestamoLaboratorio(input, saveContext);
        setMessage('Prestamo registrado correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el prestamo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteBitacora(item: BitacoraLaboratorio) {
    if (!window.confirm(`Desea eliminar la bitacora "${item.titulo}"?`)) return;
    await deleteBitacoraLaboratorio(item.id);
    await refresh();
  }

  async function handleDeleteFicha(item: FichaTecnicaLaboratorio) {
    if (!window.confirm(`Desea eliminar la ficha tecnica de "${item.pc}"?`)) return;
    await deleteFichaTecnicaLaboratorio(item.id);
    if (selectedFicha?.id === item.id) setSelectedFicha(null);
    await refresh();
  }

  async function handleDeleteEquipo(item: EquipoLaboratorio) {
    if (!window.confirm(`Desea eliminar el equipo "${item.nombre}"?`)) return;
    await deleteEquipoLaboratorio(item.id);
    await refresh();
  }

  async function handleDeleteSeccion(item: SeccionLaboratorio) {
    if (!window.confirm(`Desea eliminar la seccion "${item.nombre}"?`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteSeccionLaboratorio(item.id);
      if (editingSeccion?.id === item.id) setEditingSeccion(null);
      setMessage('Seccion eliminada correctamente.');
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la seccion.');
    }
  }

  async function handleDeleteCatalogo(item: CatalogoLaboratorio) {
    if (!window.confirm(`Desea eliminar "${item.nombre}"?`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteCatalogoLaboratorio(item.id, item.tipo);
      if (editingCategoria?.id === item.id) setEditingCategoria(null);
      if (editingEstadoEquipo?.id === item.id) setEditingEstadoEquipo(null);
      setMessage('Opcion eliminada correctamente.');
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la opcion.');
    }
  }

  async function handleDeletePrestamo(item: PrestamoLaboratorio) {
    if (!window.confirm(`Desea eliminar el prestamo de "${item.equipo}"?`)) return;
    await deletePrestamoLaboratorio(item.id);
    await refresh();
  }

  async function handleDeleteDescarte(item: DescarteLaboratorio) {
    if (!window.confirm(`Desea eliminar el descarte de "${item.equipo}"?`)) return;
    await deleteDescarteLaboratorio(item.id);
    await refresh();
  }

  async function handleInventarioExcelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { read, utils } = await import('xlsx');
      const workbook = read(await file.arrayBuffer(), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      if (!worksheet) throw new Error('El archivo no tiene hojas disponibles.');

      const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      const inputs = rows.map(parseEquipoExcelRow).filter(shouldImportEquipoRow);
      const { uniqueInputs, ignoredDuplicates } = filterUniqueEquipoInputsForImport(inputs, state.equipos);
      const result = await importEquiposLaboratorio(uniqueInputs, saveContext);

      await refresh();
      setActiveTab('inventario');
      setMessage(
        `Inventario importado: ${result.created} equipos nuevos, ${result.updated} actualizados y ${
          result.ignored + ignoredDuplicates
        } filas ignoradas. ${ignoredDuplicates ? `${ignoredDuplicates} fueron duplicadas por inventario o serie.` : ''}`,
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo importar el inventario.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDescartesExcelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { read, utils } = await import('xlsx');
      const workbook = read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      if (!worksheet) throw new Error('El archivo no tiene hojas disponibles.');

      const rows = utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
      const inputs = parseDescartesExcelRows(rows, file.name, responsableSesion);
      const existingKeys = new Set(
        state.descartes.map((item) => normalizeExcelKey(`${item.inventario}|${item.equipo}|${item.serie}`)),
      );
      const uniqueInputs = inputs.filter((item) => {
        const key = normalizeExcelKey(`${item.inventario}|${item.equipo}|${item.serie}`);
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });

      for (const input of uniqueInputs) {
        await createDescarteLaboratorio(input, saveContext);
      }

      await refresh();
      setActiveTab('descartes');
      setMessage(`Descartes importados: ${uniqueInputs.length} registros nuevos y ${inputs.length - uniqueInputs.length} duplicados ignorados.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo importar el Excel de descartes.');
    } finally {
      setIsSaving(false);
    }
  }

  function exportCsv() {
    downloadTextFile(exportLaboratorioCsv(state), 'informe-laboratorio.csv', 'text/csv;charset=utf-8');
  }

  function exportReport() {
    downloadTextFile(buildLaboratorioReport(state), 'informe-laboratorio.txt');
  }

  function exportInventoryExcel() {
    if (state.equipos.length === 0) {
      setError('No hay equipos registrados para generar el informe de inventario.');
      return;
    }
    exportInventarioLaboratorioExcel(state);
    setMessage('Informe de inventario descargado correctamente.');
  }

  function exportDiscardsExcel() {
    if (state.descartes.length === 0) {
      setError('No hay descartes registrados para generar el informe.');
      return;
    }
    exportDescartesLaboratorioExcel(state);
    setMessage('Informe de descartes descargado correctamente.');
  }

  function exportMonthlyReport() {
    exportInformeMensualMantenimientoExcel(state, selectedReportMonth);
    setMessage('Informe mensual de mantenimiento descargado correctamente.');
  }

  function exportDateRangeReport() {
    if (!reportStartDate || !reportEndDate || reportStartDate > reportEndDate) {
      setError('Seleccione un rango de fechas valido. La fecha inicial no puede ser posterior a la final.');
      return;
    }
    exportInformeMantenimientoPorRangoExcel(state, reportStartDate, reportEndDate);
    setMessage('Informe de mantenimiento por rango descargado correctamente.');
  }

  function exportRangeMaintenanceReport() {
    if (reportStartDate && reportEndDate && reportStartDate > reportEndDate) {
      setError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    exportInformeMantenimientoPorRangoExcel(state, reportStartDate, reportEndDate);
    setMessage('Informe por rango descargado correctamente.');
  }

  function exportLocationReport() {
    exportInformeUbicacionLaboratorioExcel(state, selectedReportLocation);
    setMessage('Informe por ubicacion descargado correctamente.');
  }

  function exportPendingReport() {
    exportInformePendientesLaboratorioExcel(state);
    setMessage('Informe de pendientes descargado correctamente.');
  }

  function exportEquipmentHistoryReport() {
    if (!selectedReportEquipoId) {
      setError('Seleccione un equipo para generar su historial tecnico.');
      return;
    }
    exportHistorialEquipoLaboratorioExcel(state, selectedReportEquipoId);
    setMessage('Historial tecnico del equipo descargado correctamente.');
  }

  function matchesEquipoPorIdentificador(equipo: EquipoLaboratorio, value: string) {
    const equipoIdentifiers = getTechnicalIdentifiers(`${equipo.codigo} ${equipo.serie}`);
    if (equipoIdentifiers.length === 0) return false;
    const valueIdentifiers = new Set(getTechnicalIdentifiers(value));
    return equipoIdentifiers.some((identifier) => valueIdentifiers.has(identifier));
  }

  function matchesEquipoPorNombre(equipo: EquipoLaboratorio, value: string) {
    return containsExactLooseText(value, equipo.nombre);
  }

  function getFichasEquipo(equipo: EquipoLaboratorio) {
    return state.fichas
      .filter(
        (item) =>
          normalizeLooseText(item.pc) === normalizeLooseText(equipo.nombre) ||
          matchesEquipoPorIdentificador(equipo, item.inventario.map((field) => field.numero).join(' ')),
      )
      .sort((first, second) => second.fecha.localeCompare(first.fecha));
  }

  function getBitacorasEquipo(equipo: EquipoLaboratorio) {
    return state.bitacoras
      .filter(
        (item) =>
          item.equipoId === equipo.id ||
          matchesEquipoPorIdentificador(equipo, `${item.equipoOrigen} ${item.equipoDestino} ${item.titulo}`) ||
          matchesEquipoPorNombre(equipo, `${item.equipoDestino} ${item.titulo}`),
      )
      .sort((first, second) => second.fecha.localeCompare(first.fecha));
  }

  function getAsignacionesActivasEquipo(equipo: EquipoLaboratorio) {
    return state.asignacionesComponentes.filter((item) => item.equipoPadreId === equipo.id && !item.fechaRetiro);
  }

  function getEquipoById(id: string) {
    return state.equipos.find((item) => item.id === id) ?? null;
  }

  function getComponentesDisponibles(equipoPadre: EquipoLaboratorio) {
    const assignedComponentIds = new Set(
      state.asignacionesComponentes.filter((item) => !item.fechaRetiro).map((item) => item.componenteId),
    );
    return state.equipos
      .filter((item) => item.id !== equipoPadre.id && !assignedComponentIds.has(item.id))
      .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es', { numeric: true }));
  }

  function getEquiposDestinoComponente(equipoActual: EquipoLaboratorio, componenteId: string) {
    return equiposInventarioVisibles
      .filter((item) => item.id !== equipoActual.id && item.id !== componenteId)
      .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es', { numeric: true }));
  }

  function getInventarioCalculadoEquipo(equipo: EquipoLaboratorio) {
    const componentes = getAsignacionesActivasEquipo(equipo)
      .map((asignacion) => {
        const componente = getEquipoById(asignacion.componenteId);
        return componente ? { asignacion, componente } : null;
      })
      .filter((item): item is { asignacion: AsignacionComponenteLaboratorio; componente: EquipoLaboratorio } =>
        Boolean(item),
      );
    const componentesEquipo = componentes.map((item) => item.componente);
    const baseMarcaModelo = splitMarcaModelo(equipo.marcaModelo);
    const componentesMarcaModelo = componentesEquipo.map((item) => splitMarcaModelo(item.marcaModelo));

    return {
      componentes,
      marca: appendUniqueInventoryValue(
        baseMarcaModelo.marca,
        componentesMarcaModelo.map((item) => item.marca),
      ),
      modelo: appendUniqueInventoryValue(
        baseMarcaModelo.modelo,
        componentesMarcaModelo.map((item) => item.modelo),
      ),
      codigo: appendUniqueInventoryValue(
        equipo.codigo || 'S/N',
        componentesEquipo.map((item) => item.codigo || 'S/N'),
      ),
      serie: appendUniqueInventoryValue(
        equipo.serie || 'S/N',
        componentesEquipo.map((item) => item.serie || 'S/N'),
      ),
    };
  }

  function getUltimoMantenimientoEquipo(fichas: FichaTecnicaLaboratorio[], bitacoras: BitacoraLaboratorio[]) {
    const fechas = [
      ...fichas.map((item) => item.fecha),
      ...bitacoras
        .filter((item) => item.clase === 'mantenimiento' || item.tipoTrabajo.toLowerCase().includes('mantenimiento'))
        .map((item) => item.fecha),
    ].filter(Boolean);
    return fechas.sort((first, second) => second.localeCompare(first))[0] ?? null;
  }

  function openFichaForEquipo(equipo: EquipoLaboratorio) {
    setSelectedEquipoDetalle(null);
    setEditingFicha(null);
    setSelectedEquipoFichaId(equipo.id);
    setActiveTab('fichas');
  }

  async function handleAsignarComponente(event: FormEvent<HTMLFormElement>, equipoPadre: EquipoLaboratorio) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const componenteId = readString(data, 'componenteId');
    const tipo = readString(data, 'tipo') as AsignacionComponenteLaboratorio['tipo'];
    const detalle = readString(data, 'detalle');
    const componente = state.equipos.find((item) => item.id === componenteId);

    if (!componente) {
      setError('Seleccione un componente del inventario.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createAsignacionComponenteLaboratorio(
        {
          equipoPadreId: equipoPadre.id,
          componenteId,
          tipo,
          fechaAsignacion: new Date().toISOString(),
          fechaRetiro: null,
          detalle,
          responsable: responsableSesion,
        },
        saveContext,
      );
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Asignacion de componente',
          titulo: `Componente asignado a ${equipoPadre.nombre}`,
          descripcion: `${componente.codigo || 'S/N'} - ${componente.nombre} fue asignado a ${
            equipoPadre.codigo || 'S/N'
          } - ${equipoPadre.nombre}. ${detalle || 'Sin detalle adicional.'}`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: equipoPadre.id,
          equipoOrigen: componente.ubicacion || 'Sin ubicacion',
          equipoDestino: `${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}`,
          ubicacion: equipoPadre.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      form.reset();
      await refresh();
      setMessage('Componente asignado y registrado en el historial.');
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'No se pudo asignar el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRetirarComponente(asignacion: AsignacionComponenteLaboratorio, equipoPadre: EquipoLaboratorio) {
    const componente = getEquipoById(asignacion.componenteId);
    if (!componente) {
      setError('No se encontro el componente seleccionado.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await retirarAsignacionComponenteLaboratorio(asignacion.id, saveContext);
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Retiro de componente',
          titulo: `Componente retirado de ${equipoPadre.nombre}`,
          descripcion: `${componente.codigo || 'S/N'} - ${componente.nombre} fue retirado de ${
            equipoPadre.codigo || 'S/N'
          } - ${equipoPadre.nombre}.`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: equipoPadre.id,
          equipoOrigen: `${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}`,
          equipoDestino: componente.nombre,
          ubicacion: equipoPadre.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      await refresh();
      setMessage('Componente retirado y registrado en el historial.');
    } catch (retireError) {
      setError(retireError instanceof Error ? retireError.message : 'No se pudo retirar el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMoverComponente(
    asignacion: AsignacionComponenteLaboratorio,
    equipoActual: EquipoLaboratorio,
    nuevoEquipoId: string,
  ) {
    const componente = getEquipoById(asignacion.componenteId);
    const nuevoEquipo = getEquipoById(nuevoEquipoId);
    if (!componente || !nuevoEquipo) {
      setError('Seleccione un equipo destino valido.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await retirarAsignacionComponenteLaboratorio(asignacion.id, saveContext);
      await createAsignacionComponenteLaboratorio(
        {
          equipoPadreId: nuevoEquipo.id,
          componenteId: componente.id,
          tipo: asignacion.tipo,
          fechaAsignacion: new Date().toISOString(),
          fechaRetiro: null,
          detalle: `Movido desde ${equipoActual.codigo || 'S/N'} - ${equipoActual.nombre} hacia ${
            nuevoEquipo.codigo || 'S/N'
          } - ${nuevoEquipo.nombre}.`,
          responsable: responsableSesion,
        },
        saveContext,
      );
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Movimiento de componente',
          titulo: `Componente movido a ${nuevoEquipo.nombre}`,
          descripcion: `${componente.codigo || 'S/N'} - ${componente.nombre} fue movido desde ${
            equipoActual.codigo || 'S/N'
          } - ${equipoActual.nombre} hacia ${nuevoEquipo.codigo || 'S/N'} - ${nuevoEquipo.nombre}.`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: nuevoEquipo.id,
          equipoOrigen: `${equipoActual.codigo || 'S/N'} - ${equipoActual.nombre}`,
          equipoDestino: `${nuevoEquipo.codigo || 'S/N'} - ${nuevoEquipo.nombre}`,
          ubicacion: nuevoEquipo.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      setComponentMoveTargets((current) => {
        const next = { ...current };
        delete next[asignacion.id];
        return next;
      });
      await refresh();
      setMessage('Componente movido y registrado en el historial.');
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'No se pudo mover el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  function closeCatalogManager() {
    setActiveCatalogManager(null);
    setEditingSeccion(null);
    setEditingCategoria(null);
    setEditingEstadoEquipo(null);
  }

  return (
    <div className="lab-workspace">
      <header className="lab-workspace-header">
        <button className="secondary-button" type="button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} />
          Volver al sistema
        </button>
        <div className="lab-workspace-title">
          <span className="eyebrow">Area exclusiva de soporte</span>
          <h1>Mantenimiento tecnico</h1>
          <p>Bitacoras, inventario, evidencias, prestamos e informes del laboratorio de informatica.</p>
        </div>
        <div className="lab-header-side">
          <div className="lab-header-actions">
            <button
              className="icon-button theme-toggle"
              type="button"
              aria-label={isLightTheme ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
              title={isLightTheme ? 'Tema oscuro' : 'Tema claro'}
              onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            >
              {isLightTheme ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="lab-workspace-badge">
              <Wrench size={18} />
              Modo tecnico
            </div>
          </div>
          <div className="lab-quick-stats" aria-label="Resumen rapido de laboratorio">
            <div>
              <Wrench size={16} />
              <span>Trabajos abiertos</span>
              <strong>{indicadores.trabajosAbiertos}</strong>
            </div>
            <div>
              <HardDrive size={16} />
              <span>Equipos no operativos</span>
              <strong>{indicadores.equiposPendientes}</strong>
            </div>
            <div>
              <PackageCheck size={16} />
              <span>Prestamos activos</span>
              <strong>{indicadores.prestamosActivos}</strong>
            </div>
            <div>
              <ClipboardList size={16} />
              <span>Evidencias registradas</span>
              <strong>{indicadores.evidencias}</strong>
            </div>
          </div>
        </div>
      </header>

      <section className="panel lab-shell">
        <div className="lab-tabs" role="tablist" aria-label="Secciones de laboratorio">
          {labTabOrder.map((tab) => (
            <button
              type="button"
              className={`lab-tab-${tab}${activeTab === tab ? ' active' : ''}`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              title={tabLabels[tab]}
            >
              <span className="lab-tab-label-full">{tabLabels[tab]}</span>
              <span className="lab-tab-label-short">{tab === 'bitacoras' ? 'Mant. e incid.' : tabLabels[tab]}</span>
            </button>
          ))}
        </div>

        {message || error ? (
          <div className={`lab-toast ${error ? 'error' : 'success'}`} role="status" aria-live="polite">
            {error ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
            <span>{error ?? message}</span>
          </div>
        ) : null}
        {isLoading ? <p className="form-hint">Cargando informacion del laboratorio...</p> : null}

        {activeTab === 'inicio' ? (
          <div className="lab-home">
            <section className="lab-home-panel lab-home-hero">
              <div>
                <span className="eyebrow">Inicio tecnico</span>
                <h2>Centro de operaciones del laboratorio</h2>
                <p>
                  Revise el movimiento reciente y elija la tarea que desea realizar sin entrar directo a un formulario.
                </p>
              </div>
              <div className="lab-home-actions">
                <button className="primary-button" type="button" onClick={() => setActiveTab('bitacoras')}>
                  <Wrench size={18} />
                  Nueva bitacora
                </button>
                <button className="secondary-button" type="button" onClick={() => setActiveTab('fichas')}>
                  <ClipboardList size={18} />
                  Ficha tecnica
                </button>
                <button className="secondary-button" type="button" onClick={() => setActiveTab('inventario')}>
                  <HardDrive size={18} />
                  Inventario
                </button>
              </div>
            </section>

            <section className="lab-home-metrics">
              <button className={indicadores.equiposMantenimiento > 0 ? 'attention' : ''} type="button" onClick={() => setActiveTab('inventario')}>
                <span>En mantenimiento</span>
                <strong>{indicadores.equiposMantenimiento}</strong>
                <small>Equipos con atencion tecnica activa</small>
              </button>
              <button type="button" onClick={() => setActiveTab('bitacoras')}>
                <span>Trabajos abiertos</span>
                <strong>{indicadores.trabajosAbiertos}</strong>
                <small>Bitacoras pendientes o en proceso</small>
              </button>
              <button type="button" onClick={() => setActiveTab('inventario')}>
                <span>Equipos registrados</span>
                <strong>{state.equipos.length}</strong>
                <small>Inventario total del laboratorio</small>
              </button>
              <button type="button" onClick={() => setActiveTab('prestamos')}>
                <span>Prestamos activos</span>
                <strong>{indicadores.prestamosActivos}</strong>
                <small>Dispositivos por devolver</small>
              </button>
              <button type="button" onClick={() => setActiveTab('descartes')}>
                <span>Descartes registrados</span>
                <strong>{indicadores.descartesRegistrados}</strong>
                <small>Equipos retirados del inventario</small>
              </button>
              <button type="button" onClick={() => setActiveTab('fichas')}>
                <span>Fichas tecnicas</span>
                <strong>{state.fichas.length}</strong>
                <small>Registros de mantenimiento</small>
              </button>
            </section>

            <section className="lab-home-panel lab-recent-activity">
              <div className="lab-home-section-header">
                <div>
                  <span className="eyebrow">Actividad reciente</span>
                  <h2>Ultimas acciones registradas</h2>
                </div>
                <div className="lab-section-actions">
                  <small>{showMoreActivity ? 'Ultimos 20 registros' : 'Maximo 8 registros'}</small>
                  <button className="secondary-button compact-button" type="button" onClick={() => setShowMoreActivity((current) => !current)}>
                    {showMoreActivity ? 'Ver menos' : 'Ver ultimos 20'}
                  </button>
                </div>
              </div>
              {actividadReciente.length === 0 ? (
                <p className="form-hint">Todavia no hay acciones recientes registradas.</p>
              ) : null}
              <div className="lab-activity-list">
                {actividadReciente.map((item) => (
                  <button type="button" key={item.id} onClick={() => setActiveTab(item.tab)}>
                    <span>{item.tipo}</span>
                    <strong>{item.titulo}</strong>
                    <small>{item.detalle}</small>
                    <time>{formatDateTime(item.fecha)}</time>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'fichas' ? (
          <div className="lab-grid lab-grid-wide">
            <form className="stack-form lab-form lab-sheet-form" onSubmit={handleFichaSubmit}>
              <div className="lab-sheet-title">
                <span>Universidad Autonoma de Chiriqui</span>
                <strong>Registro tecnico de equipo y control de mantenimiento</strong>
              </div>
              <label>
                Equipo del inventario
                <select
                  value={selectedEquipoFichaId}
                  onChange={(event) => setSelectedEquipoFichaId(event.target.value)}
                  disabled={Boolean(editingFicha)}
                >
                  <option value="">Seleccionar equipo registrado o llenar manualmente</option>
                  {state.equipos.map((equipo) => (
                    <option value={equipo.id} key={equipo.id}>
                      {equipo.codigo} - {equipo.nombre} - {equipo.ubicacion}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid compact-form-grid">
                <label>
                  Fecha
                  <input
                    name="fecha"
                    type="datetime-local"
                    required
                    defaultValue={editingFicha ? localDateTimeValue(new Date(editingFicha.fecha)) : localDateTimeValue()}
                    key={`ficha-fecha-${editingFicha?.id ?? 'new'}`}
                  />
                </label>
                <label>
                  PC / Equipo
                  <input
                    name="pc"
                    required
                    placeholder="Ej. PC Lab 1-08"
                    defaultValue={editingFicha?.pc ?? selectedEquipoFicha?.nombre}
                    key={`pc-${editingFicha?.id ?? selectedEquipoFicha?.id ?? 'new'}`}
                  />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Direccion IP
                  <input name="direccionIp" placeholder="192.168..." defaultValue={editingFicha?.direccionIp} />
                </label>
                <label>
                  Ubicacion
                  <input
                    name="ubicacion"
                    required
                    placeholder="Laboratorio 1, reparacion..."
                    defaultValue={editingFicha?.ubicacion ?? selectedEquipoFicha?.ubicacion}
                    key={`ubicacion-${editingFicha?.id ?? selectedEquipoFicha?.id ?? 'new'}`}
                  />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Responsable
                  <input name="responsable" required defaultValue={editingFicha?.responsable} />
                </label>
                <label>
                  Usuario asignado
                  <input name="usuarioAsignado" placeholder="Usuario del equipo o area" defaultValue={editingFicha?.usuarioAsignado} />
                </label>
              </div>
              <label>
                Referencia de acceso / observacion
                <input
                  name="referenciaAcceso"
                  placeholder="No guardar contrasenas reales; use una referencia segura si aplica"
                  defaultValue={
                    editingFicha?.referenciaAcceso ??
                    [selectedEquipoFicha?.codigo, selectedEquipoFicha?.marcaModelo, selectedEquipoFicha?.serie]
                      .filter(Boolean)
                      .join(' | ')
                  }
                  key={`referencia-${editingFicha?.id ?? selectedEquipoFicha?.id ?? 'new'}`}
                />
              </label>

              <div className="lab-sheet-sections">
                <fieldset className="lab-sheet-box">
                  <legend>Aplicaciones instaladas</legend>
                  <div className="lab-app-list">
                    {aplicacionesBase.map((app) => {
                      const current = editingFicha?.aplicaciones.find((item) => item.nombre === app);
                      return (
                        <label className="lab-app-row" key={app}>
                          <input name={`app-${app}`} type="checkbox" defaultChecked={current?.instalada ?? false} />
                          <span>{app}</span>
                          <input name={`appObs-${app}`} placeholder="Version / nota" defaultValue={current?.observacion} />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="lab-sheet-box">
                  <legend>Caracteristicas tecnicas</legend>
                  <div className="lab-simple-list">
                    {caracteristicasBase.map((item) => {
                      const current = editingFicha?.caracteristicas.find((field) => field.nombre === item);
                      return (
                        <label key={item}>
                          {item}
                          <input name={`caracteristica-${item}`} defaultValue={current?.valor} />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="lab-sheet-box">
                  <legend>Inventario</legend>
                  <div className="lab-simple-list">
                    {inventarioBase.map((item) => {
                      const current = editingFicha?.inventario.find((field) => field.equipo === item);
                      return (
                        <label key={item}>
                          {item}
                          <input name={`inventario-${item}`} placeholder="N. inventario / serie" defaultValue={current?.numero} />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <fieldset className="lab-sheet-box">
                <legend>Acciones realizadas</legend>
                <div className="lab-actions-table">
                  <div className="lab-actions-head">
                    <span>Fecha</span>
                    <span>Accion realizada</span>
                    <span>Observacion</span>
                    <span>Responsable</span>
                  </div>
                  {Array.from({ length: 6 }, (_, index) => {
                    const current = editingFicha?.acciones[index];
                    return (
                      <div className="lab-actions-row" key={index}>
                        <input name={`accionFecha-${index}`} placeholder="dd/mm/aaaa" defaultValue={current?.fecha} />
                        <input name={`accion-${index}`} placeholder="Diagnostico, cambio, limpieza..." defaultValue={current?.accion} />
                        <input name={`accionObs-${index}`} placeholder="Resultado u observacion" defaultValue={current?.observacion} />
                        <input name={`accionResponsable-${index}`} placeholder="Responsable" defaultValue={current?.responsable} />
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <label>
                Observacion general
                <textarea name="observacionGeneral" rows={3} defaultValue={editingFicha?.observacionGeneral} />
              </label>

              <div className="page-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Save size={18} />
                  {editingFicha ? 'Actualizar ficha' : 'Guardar ficha tecnica'}
                </button>
                {editingFicha ? (
                  <button className="secondary-button" type="button" onClick={() => setEditingFicha(null)}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>

            <div className="lab-list">
              <h2>Fichas guardadas</h2>
              {state.fichas.length === 0 ? <p className="form-hint">Todavia no hay fichas tecnicas registradas.</p> : null}
              {state.fichas.map((item) => (
                <article className="lab-record compact" key={item.id}>
                  <div className="lab-record-header">
                    <div>
                      <span className="status-pill equipment-operativo">Ficha tecnica</span>
                      <h3>{item.pc}</h3>
                      <small>{formatDateTime(item.fecha)} | {item.ubicacion}</small>
                    </div>
                    <div className="row-actions">
                      <button className="icon-button" type="button" title="Ver detalle" onClick={() => setSelectedFicha(item)}>
                        <Eye size={16} />
                      </button>
                      <button className="icon-button" type="button" title="Editar" onClick={() => setEditingFicha(item)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger-button"
                        type="button"
                        title="Eliminar"
                        onClick={() => void handleDeleteFicha(item)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p>
                    Responsable: {item.responsable || 'No indicado'} | Usuario: {item.usuarioAsignado || 'No indicado'} | IP:{' '}
                    {item.direccionIp || 'No indicada'}
                  </p>
                  <small>
                    Acciones registradas: {item.acciones.length} | Aplicaciones marcadas:{' '}
                    {item.aplicaciones.filter((app) => app.instalada).length}
                  </small>
                </article>
              ))}
            </div>

            {selectedFicha ? (
              <div className="modal-backdrop lab-sheet-modal-backdrop" role="presentation" onClick={() => setSelectedFicha(null)}>
                <article
                  className="modal-panel lab-sheet-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-sheet-detail-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="lab-sheet-preview-header">
                    <div>
                      <p>Universidad Autonoma de Chiriqui</p>
                      <p>Facultad de Economia</p>
                      <strong id="lab-sheet-detail-title">Registro tecnico de equipo y control de mantenimiento</strong>
                    </div>
                    <button className="secondary-button" type="button" onClick={() => setSelectedFicha(null)}>
                      Cerrar detalle
                    </button>
                  </div>

                  <div className="lab-sheet-preview-meta">
                    <div><span>Fecha</span><strong>{formatDateTime(selectedFicha.fecha)}</strong></div>
                    <div><span>PC / Equipo</span><strong>{selectedFicha.pc}</strong></div>
                    <div><span>Direccion IP</span><strong>{selectedFicha.direccionIp || 'No indicada'}</strong></div>
                    <div><span>Ubicacion</span><strong>{selectedFicha.ubicacion || 'No indicada'}</strong></div>
                    <div><span>Responsable</span><strong>{selectedFicha.responsable || 'No indicado'}</strong></div>
                    <div><span>Usuario asignado</span><strong>{selectedFicha.usuarioAsignado || 'No indicado'}</strong></div>
                  </div>

                  <div className="lab-sheet-preview-grid">
                    <section>
                      <h3>Aplicaciones instaladas</h3>
                      <div className="lab-sheet-table">
                        <div className="lab-sheet-table-head two-cols">
                          <span>Aplicacion</span>
                          <span>Estado / observacion</span>
                        </div>
                        {selectedFicha.aplicaciones.map((app) => (
                          <div className="lab-sheet-table-row two-cols" key={app.nombre}>
                            <strong>{app.nombre}</strong>
                            <span>{app.instalada ? 'Instalada' : 'No marcada'}{app.observacion ? ` - ${app.observacion}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3>Caracteristicas tecnicas</h3>
                      <div className="lab-sheet-table">
                        <div className="lab-sheet-table-head two-cols">
                          <span>Caracteristica</span>
                          <span>Valor</span>
                        </div>
                        {selectedFicha.caracteristicas.map((item) => (
                          <div className="lab-sheet-table-row two-cols" key={item.nombre}>
                            <strong>{item.nombre}</strong>
                            <span>{item.valor || 'No indicado'}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3>Inventario</h3>
                      <div className="lab-sheet-table">
                        <div className="lab-sheet-table-head two-cols">
                          <span>Equipo</span>
                          <span>Numero / serie</span>
                        </div>
                        {selectedFicha.inventario.map((item) => (
                          <div className="lab-sheet-table-row two-cols" key={item.equipo}>
                            <strong>{item.equipo}</strong>
                            <span>{item.numero || 'No indicado'}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <section>
                    <h3>Acciones realizadas</h3>
                    <div className="lab-sheet-table scrollable">
                      <div className="lab-sheet-table-head four-cols">
                        <span>Fecha</span>
                        <span>Accion realizada</span>
                        <span>Observacion</span>
                        <span>Responsable</span>
                      </div>
                      {selectedFicha.acciones.length === 0 ? (
                        <div className="lab-sheet-table-row four-cols">
                          <span>Sin acciones registradas</span>
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : null}
                      {selectedFicha.acciones.map((accion, index) => (
                        <div className="lab-sheet-table-row four-cols" key={`${accion.fecha}-${index}`}>
                          <span>{accion.fecha || 'No indicada'}</span>
                          <strong>{accion.accion || 'No indicada'}</strong>
                          <span>{accion.observacion || 'Sin observacion'}</span>
                          <span>{accion.responsable || 'No indicado'}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="lab-sheet-notes">
                    <h3>Observacion general</h3>
                    <p>{selectedFicha.observacionGeneral || 'Sin observacion general.'}</p>
                    <small>Referencia de acceso: {selectedFicha.referenciaAcceso || 'No indicada'}</small>
                  </section>
                </article>
              </div>
            ) : null}

          </div>
        ) : null}

        {activeTab === 'bitacoras' ? (
          <div className="lab-grid">
            <form className="stack-form lab-form" onSubmit={handleBitacoraSubmit}>
              <h2>{editingBitacora ? 'Editar registro' : 'Registrar mantenimiento o incidencia'}</h2>
              <p className="form-hint">Los mantenimientos y las incidencias se registran por separado mediante su tipo y quedan asociados al equipo seleccionado.</p>
              <label>
                Fecha y hora
                <input
                  name="fecha"
                  type="datetime-local"
                  required
                  defaultValue={editingBitacora ? localDateTimeValue(new Date(editingBitacora.fecha)) : localDateTimeValue()}
                  key={`fecha-${editingBitacora?.id ?? 'new'}`}
                />
              </label>
              <div className="form-grid compact-form-grid">
                <label>
                  Tipo de trabajo
                  <select name="tipoTrabajo" defaultValue={editingBitacora?.tipoTrabajo ?? 'Reparacion'} required>
                    <option value="Mantenimiento preventivo">Mantenimiento preventivo</option>
                    <option value="Mantenimiento correctivo">Mantenimiento correctivo</option>
                    <option value="Incidencia">Daño o incidencia</option>
                    <option>Reparacion</option>
                    <option>Cambio de pieza</option>
                    <option>Diagnostico</option>
                    <option>Instalacion</option>
                    <option>Soporte a usuario</option>
                  </select>
                </label>
                <label>
                  Prioridad
                  <select name="prioridad" defaultValue={editingBitacora?.prioridad ?? 'media'} required>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Critica</option>
                  </select>
                </label>
              </div>
              <label>
                Titulo
                <input
                  name="titulo"
                  required
                  placeholder="Ej. Reemplazo de pantalla en equipo del Laboratorio 1"
                  defaultValue={editingBitacora?.titulo}
                  key={`titulo-${editingBitacora?.id ?? 'new'}`}
                />
              </label>
              <label>
                Descripcion del trabajo o incidencia
                <textarea
                  name="descripcion"
                  required
                  rows={5}
                  placeholder="Detalle que ocurrio, que equipo se reviso, sintomas detectados, acciones tomadas o pendiente por revisar."
                  defaultValue={editingBitacora?.descripcion}
                  key={`descripcion-${editingBitacora?.id ?? 'new'}`}
                />
              </label>
              <div className="form-grid compact-form-grid">
                <label>
                  Equipo origen / pieza usada opcional
                  <select name="equipoOrigenInventario" defaultValue="">
                    <option value="">Seleccione equipo origen si aplica</option>
                    {state.equipos.map((equipo) => (
                      <option value={`${equipo.codigo || 'S/N'} - ${equipo.nombre} (${equipo.ubicacion})`} key={equipo.id}>
                        {equipo.codigo || 'S/N'} - {equipo.nombre} ({equipo.ubicacion}) - {estadoEquipoNombre[equipo.estado] ?? getEstadoEquipoLabel(equipo.estado)}
                      </option>
                    ))}
                  </select>
                  <small>Use esto cuando una pantalla, memoria, disco u otra pieza sale de un equipo registrado.</small>
                </label>
                <label>
                  Origen manual opcional
                  <input name="equipoOrigen" placeholder="Ej. pantalla de equipo descartado, pieza suelta o referencia fisica" defaultValue={editingBitacora?.equipoOrigen} />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Equipo atendido
                  <select name="equipoId" defaultValue={editingBitacora?.equipoId ?? ''} required>
                    <option value="">Seleccione un equipo</option>
                    {state.equipos.map((equipo) => (
                      <option value={equipo.id} key={equipo.id}>
                        {equipo.codigo} - {equipo.nombre} ({equipo.ubicacion})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Responsable
                  <input name="responsable" required readOnly value={responsableSesion} />
                </label>
                <label>
                  Ubicacion
                  <input name="ubicacion" placeholder="Laboratorio 1, reparacion, deposito..." defaultValue={editingBitacora?.ubicacion} />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Estado
                  <select name="estado" defaultValue={editingBitacora?.estado ?? 'en_proceso'} required>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </label>
                <label>
                  Evidencia
                  <input name="evidenciaTitulo" placeholder="Foto, acta, captura, factura..." defaultValue={editingBitacora?.evidenciaTitulo} />
                </label>
              </div>
              <label>
                Enlace o referencia de evidencia
                <input name="evidenciaUrl" placeholder="URL, carpeta, nombre del archivo o referencia fisica" defaultValue={editingBitacora?.evidenciaUrl} />
              </label>
              <div className="page-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Save size={18} />
                  {editingBitacora ? 'Actualizar bitacora' : 'Guardar bitacora'}
                </button>
                {editingBitacora ? (
                  <button className="secondary-button" type="button" onClick={() => setEditingBitacora(null)}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>

            <div className="lab-list">
              <h2>Mantenimientos registrados</h2>
              {state.bitacoras.filter((item) => item.tipoTrabajo !== 'Incidencia').length === 0 ? <p className="form-hint">Todavía no hay mantenimientos registrados.</p> : null}
              {state.bitacoras.filter((item) => item.tipoTrabajo !== 'Incidencia').map((item) => (
                <article className="lab-record" key={item.id}>
                  <div className="lab-record-header">
                    <div>
                      <span className={`status-pill priority-${item.prioridad}`}>{prioridadLabels[item.prioridad]}</span>
                      <h3>{item.titulo}</h3>
                      <small>{formatDateTime(item.fecha)} | {item.responsable}</small>
                    </div>
                    <div className="row-actions">
                      <button className="icon-button" type="button" title="Editar" onClick={() => setEditingBitacora(item)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger-button"
                        type="button"
                        title="Eliminar"
                        onClick={() => void handleDeleteBitacora(item)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p>{item.descripcion}</p>
                  <dl className="lab-definition-grid">
                    <div><dt>Estado</dt><dd>{estadoTrabajoLabels[item.estado]}</dd></div>
                    <div><dt>Tipo</dt><dd>{item.tipoTrabajo}</dd></div>
                    <div><dt>Origen / pieza usada</dt><dd>{item.equipoOrigen || 'No aplica'}</dd></div>
                    <div><dt>Destino</dt><dd>{item.equipoDestino || 'No indicado'}</dd></div>
                    <div><dt>Ubicacion</dt><dd>{item.ubicacion || 'No indicada'}</dd></div>
                    <div><dt>Evidencia</dt><dd>{item.evidenciaTitulo || item.evidenciaUrl || 'Sin evidencia'}</dd></div>
                  </dl>
                </article>
              ))}
              <h2>Daños e incidencias por equipo</h2>
              {state.bitacoras.filter((item) => item.tipoTrabajo === 'Incidencia').length === 0 ? <p className="form-hint">No hay incidencias registradas.</p> : null}
              {state.bitacoras.filter((item) => item.tipoTrabajo === 'Incidencia').map((item) => (
                <article className="lab-record" key={item.id}>
                  <div className="lab-record-header"><div><span className={`status-pill priority-${item.prioridad}`}>{estadoTrabajoLabels[item.estado]}</span><h3>{item.titulo}</h3><small>{formatDateTime(item.fecha)} | {item.equipoDestino || 'Equipo no indicado'}</small></div><div className="row-actions"><button className="icon-button" type="button" title="Editar" onClick={() => setEditingBitacora(item)}><Pencil size={16} /></button><button className="icon-button danger-button" type="button" title="Eliminar" onClick={() => void handleDeleteBitacora(item)}><Trash2 size={16} /></button></div></div>
                  <p>{item.descripcion}</p><small>Responsable: {item.responsable} · Estado: {estadoTrabajoLabels[item.estado]}</small>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'inventario' ? (
          <div className="lab-inventory-focus">
            <section className="lab-inventory-hero">
              <div>
                <span className="eyebrow">Inventario tecnico</span>
                <h2>Inventario de la facultad</h2>
                <p>
                  Consulte, filtre, edite y registre equipos desde una vista concentrada para trabajar comodo en PC y celular.
                </p>
              </div>
              <div className="lab-inventory-hero-actions">
                <strong>{equiposInventarioVisibles.length}</strong>
                <span>equipos visibles</span>
                {componentesAsignadosActivosIds.size > 0 ? (
                  <small>{componentesAsignadosActivosIds.size} componentes asignados</small>
                ) : null}
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setEditingEquipo(null);
                    setShowEquipoFormModal(true);
                  }}
                >
                  <Save size={18} />
                  Nuevo equipo
                </button>
                <label className="secondary-button lab-file-button">
                  <Upload size={18} />
                  Cargar Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(event) => void handleInventarioExcelUpload(event)}
                    disabled={isSaving}
                  />
                </label>
              </div>
            </section>

            <section className="lab-inventory-workspace">
              <div className="lab-inventory-sheet-title">
                <strong>Universidad Autonoma de Chiriqui</strong>
                <span>Facultad de Economia</span>
                <h2>Inventario de la facultad</h2>
                <small>{new Date().toLocaleDateString('es-PA')}</small>
              </div>
              <div className="lab-inventory-search">
                <Search size={18} />
                <input
                  value={inventorySearch}
                  onChange={(event) => setInventorySearch(event.target.value)}
                  placeholder="Buscar por equipo, inventario, serie, marca o ubicacion"
                  aria-label="Buscar equipo en inventario"
                />
                {inventorySearch ? (
                  <button type="button" onClick={() => setInventorySearch('')}>
                    Limpiar
                  </button>
                ) : null}
              </div>
              <div className="lab-inventory-filter" aria-label="Filtrar inventario por ubicacion">
                {ubicacionesInventario.map((ubicacion) => (
                  <button
                    className={selectedInventoryLocation === ubicacion ? 'active' : ''}
                    key={ubicacion}
                    type="button"
                    onClick={() => setSelectedInventoryLocation(ubicacion)}
                  >
                    {ubicacion}
                    {estadosAlertaPorUbicacion[ubicacion]?.length ? (
                      <span className="inventory-filter-alerts" aria-label="Estados con atencion">
                        {estadosAlertaPorUbicacion[ubicacion].map((estado) => (
                          <i
                            className={`equipment-${getEstadoEquipoClass(estado)}`}
                            key={estado}
                            title={estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}
                          />
                        ))}
                      </span>
                    ) : null}
                    <span>
                      {ubicacion === 'Todas'
                        ? equiposInventarioVisibles.length
                        : equiposInventarioVisibles.filter((item) => matchesInventoryLocationFilter(item, ubicacion)).length}
                    </span>
                  </button>
                ))}
              </div>
              {equiposInventarioVisibles.length === 0 ? <p className="form-hint">Todavia no hay equipos visibles registrados.</p> : null}
              {equiposInventarioVisibles.length > 0 ? (
                <div className="lab-inventory-table-wrap">
                  <div className="lab-inventory-table">
                    <div className="lab-inventory-head">
                      <span>Fila</span>
                      <span>Equipo</span>
                      <span>Marca</span>
                      <span>Modelo</span>
                      <span>Inventario</span>
                      <span>Serie</span>
                      <span>Ubicacion</span>
                      <span>Estado</span>
                      <span>Acciones</span>
                    </div>
                    {equiposInventarioFiltrados.length === 0 ? (
                      <div className="lab-inventory-row lab-inventory-empty-row">
                        <span>No hay equipos que coincidan con este filtro.</span>
                      </div>
                    ) : null}
                    {equiposInventarioFiltrados.map((item, index) => {
                      const inventarioCalculado = getInventarioCalculadoEquipo(item);
                      const componentSummary = inventarioCalculado.componentes
                        .map(
                          ({ asignacion, componente }) =>
                            `${asignacion.tipo}: ${componente.codigo || 'S/N'} - ${componente.nombre} - ${
                              componente.serie || 'S/N'
                            }`,
                        )
                        .join('\n');
                      return (
                        <div
                          className="lab-inventory-row clickable"
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          title="Abrir expediente tecnico del equipo"
                          onClick={() => setSelectedEquipoDetalle(item)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedEquipoDetalle(item);
                            }
                          }}
                        >
                          <span className="inventory-cell-fila">{index + 1}</span>
                          <strong className="inventory-cell-equipo" title={componentSummary || undefined}>
                            <b>{item.nombre || item.categoria}</b>
                            {inventarioCalculado.componentes.length > 0 ? (
                              <small>
                                {inventarioCalculado.componentes.length}{' '}
                                {inventarioCalculado.componentes.length === 1 ? 'componente' : 'componentes'}
                              </small>
                            ) : null}
                            {inventarioCalculado.componentes.length > 0 ? (
                              <em className="inventory-component-list">
                                {inventarioCalculado.componentes.map(({ asignacion, componente }) => (
                                  <i key={asignacion.id}>
                                    {asignacion.tipo}: {componente.codigo || 'S/N'} · {componente.nombre}
                                  </i>
                                ))}
                              </em>
                            ) : null}
                          </strong>
                          <span className="inventory-cell-marca" title={componentSummary || undefined}>{inventarioCalculado.marca}</span>
                          <span className="inventory-cell-modelo" title={componentSummary || undefined}>{inventarioCalculado.modelo}</span>
                          <span className="inventory-cell-codigo" title={componentSummary || undefined}>{inventarioCalculado.codigo}</span>
                          <span className="inventory-cell-serie" title={componentSummary || undefined}>{inventarioCalculado.serie}</span>
                          <span className="inventory-cell-ubicacion">{item.ubicacion || 'Sin ubicacion'}</span>
                          <span className="inventory-cell-estado">
                            <select
                              className={`inventory-status inventory-status-select equipment-${getEstadoEquipoClass(item.estado)}`}
                              value={item.estado}
                              disabled={isSaving}
                              title="Cambiar estado"
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => void handleQuickEstadoEquipo(item, event.target.value)}
                            >
                              {estadosEquipo.map((estado) => (
                                <option value={estado} key={estado}>
                                  {estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}
                                </option>
                              ))}
                            </select>
                          </span>
                          <span className="row-actions inventory-actions">
                            <button
                              className="icon-button"
                              type="button"
                              title="Ver expediente tecnico"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedEquipoDetalle(item);
                              }}
                            >
                              <ClipboardList size={16} />
                            </button>
                            <button
                              className="icon-button danger-button"
                              type="button"
                              title="Eliminar"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteEquipo(item);
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>

            {selectedEquipoDetalle ? (
              <div className="modal-backdrop" role="presentation" onClick={() => setSelectedEquipoDetalle(null)}>
                <article
                  className="modal-panel lab-equipment-modal lab-equipment-detail-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-equipment-detail-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  {(() => {
                    const { marca, modelo } = splitMarcaModelo(selectedEquipoDetalle.marcaModelo);
                    const fichasEquipo = getFichasEquipo(selectedEquipoDetalle);
                    const bitacorasEquipo = getBitacorasEquipo(selectedEquipoDetalle);
                    const componentesActivos = getAsignacionesActivasEquipo(selectedEquipoDetalle);
                    const componentesDisponibles = getComponentesDisponibles(selectedEquipoDetalle);
                    const ultimoMantenimiento = getUltimoMantenimientoEquipo(fichasEquipo, bitacorasEquipo);
                    return (
                      <>
                        <div className="modal-header lab-equipment-detail-header">
                          <div>
                            <span className="eyebrow">Expediente tecnico</span>
                            <h2 id="lab-equipment-detail-title">{selectedEquipoDetalle.nombre}</h2>
                            <p>
                              {selectedEquipoDetalle.codigo || 'Sin inventario'} | {selectedEquipoDetalle.ubicacion || 'Sin ubicacion'} |{' '}
                              {estadoEquipoNombre[selectedEquipoDetalle.estado] ?? getEstadoEquipoLabel(selectedEquipoDetalle.estado)}
                            </p>
                          </div>
                          <button className="icon-button" type="button" aria-label="Cerrar detalle" onClick={() => setSelectedEquipoDetalle(null)}>
                            <XCircle size={18} />
                          </button>
                        </div>

                        <div className="lab-equipment-detail-actions">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              setEditingEquipo(selectedEquipoDetalle);
                              setShowEquipoFormModal(true);
                            }}
                          >
                            <Pencil size={18} />
                            Editar datos
                          </button>
                          <button className="primary-button" type="button" onClick={() => openFichaForEquipo(selectedEquipoDetalle)}>
                            <ClipboardList size={18} />
                            Nueva ficha tecnica
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              exportHistorialEquipoLaboratorioExcel(state, selectedEquipoDetalle.id);
                              setMessage('Historial tecnico del equipo descargado correctamente.');
                            }}
                          >
                            <Download size={18} />
                            Descargar historial
                          </button>
                        </div>

                        <dl className="lab-definition-grid lab-equipment-detail-grid">
                          <div><dt>Numero de inventario</dt><dd>{selectedEquipoDetalle.codigo || 'S/N'}</dd></div>
                          <div><dt>Categoria</dt><dd>{selectedEquipoDetalle.categoria || 'No indicada'}</dd></div>
                          <div><dt>Marca</dt><dd>{marca}</dd></div>
                          <div><dt>Modelo</dt><dd>{modelo}</dd></div>
                          <div><dt>Serie</dt><dd>{selectedEquipoDetalle.serie || 'S/N'}</dd></div>
                          <div><dt>Ubicacion</dt><dd>{selectedEquipoDetalle.ubicacion || 'No indicada'}</dd></div>
                          <div><dt>Estado</dt><dd>{estadoEquipoNombre[selectedEquipoDetalle.estado] ?? getEstadoEquipoLabel(selectedEquipoDetalle.estado)}</dd></div>
                          <div>
                            <dt>Ultimo mantenimiento</dt>
                            <dd>{ultimoMantenimiento ? formatDateTime(ultimoMantenimiento) : 'Sin mantenimiento registrado'}</dd>
                          </div>
                          <div><dt>Actualizado</dt><dd>{formatDateTime(selectedEquipoDetalle.updatedAt)}</dd></div>
                        </dl>

                        <section className="lab-equipment-detail-section">
                          <div className="lab-home-section-header">
                            <div>
                              <span className="eyebrow">Componentes asignados</span>
                              <h3>{componentesActivos.length} componentes</h3>
                            </div>
                          </div>
                          {componentesActivos.length === 0 ? (
                            <p className="form-hint">Este equipo todavia no tiene CPU, monitor u otra pieza relacionada.</p>
                          ) : null}
                          <div className="lab-equipment-detail-list">
                            {componentesActivos.map((asignacion) => {
                              const componente = getEquipoById(asignacion.componenteId);
                              const destinos = getEquiposDestinoComponente(selectedEquipoDetalle, asignacion.componenteId);
                              const selectedTarget = componentMoveTargets[asignacion.id] ?? '';
                              return (
                                <article key={asignacion.id}>
                                  <div>
                                    <strong>
                                      {asignacion.tipo.toUpperCase()} | {componente?.nombre ?? 'Componente no encontrado'}
                                    </strong>
                                    <span>
                                      {componente?.codigo || 'S/N'} | {componente?.serie || 'S/N'} |{' '}
                                      {componente?.ubicacion || selectedEquipoDetalle.ubicacion}
                                    </span>
                                  </div>
                                  <span className="status-pill">Activo</span>
                                  <p>{asignacion.detalle || `Asignado el ${formatDateTime(asignacion.fechaAsignacion)}.`}</p>
                                  <div className="lab-component-actions">
                                    <select
                                      value={selectedTarget}
                                      disabled={isSaving || destinos.length === 0}
                                      onChange={(event) =>
                                        setComponentMoveTargets((current) => ({
                                          ...current,
                                          [asignacion.id]: event.target.value,
                                        }))
                                      }
                                    >
                                      <option value="">Mover a otro equipo...</option>
                                      {destinos.map((destino) => (
                                        <option value={destino.id} key={destino.id}>
                                          {destino.codigo || 'S/N'} - {destino.nombre} ({destino.ubicacion || 'Sin ubicacion'})
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      className="secondary-button"
                                      type="button"
                                      disabled={isSaving || !selectedTarget}
                                      onClick={() => void handleMoverComponente(asignacion, selectedEquipoDetalle, selectedTarget)}
                                    >
                                      Mover
                                    </button>
                                    <button
                                      className="secondary-button danger-soft-button"
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => void handleRetirarComponente(asignacion, selectedEquipoDetalle)}
                                    >
                                      Retirar
                                    </button>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                          <form className="lab-component-form" onSubmit={(event) => void handleAsignarComponente(event, selectedEquipoDetalle)}>
                            <label>
                              Componente del inventario
                              <select name="componenteId" required defaultValue="">
                                <option value="" disabled>
                                  Seleccione monitor, CPU, teclado, mouse o pieza
                                </option>
                                {componentesDisponibles.map((item) => (
                                  <option value={item.id} key={item.id}>
                                    {item.codigo || 'S/N'} - {item.nombre} ({item.ubicacion || 'Sin ubicacion'})
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Tipo
                              <select name="tipo" required defaultValue="monitor">
                                <option value="cpu">CPU</option>
                                <option value="monitor">Monitor</option>
                                <option value="teclado">Teclado</option>
                                <option value="mouse">Mouse</option>
                                <option value="proyector">Proyector</option>
                                <option value="otro">Otro</option>
                              </select>
                            </label>
                            <label>
                              Detalle
                              <input name="detalle" placeholder="Ej. Monitor asignado por reemplazo de pantalla" />
                            </label>
                            <button className="secondary-button" type="submit" disabled={isSaving || componentesDisponibles.length === 0}>
                              <PackageCheck size={16} />
                              Asignar componente
                            </button>
                          </form>
                        </section>

                        <section className="lab-equipment-detail-section">
                          <div className="lab-home-section-header">
                            <div>
                              <span className="eyebrow">Fichas tecnicas</span>
                              <h3>{fichasEquipo.length} registros</h3>
                            </div>
                          </div>
                          {fichasEquipo.length === 0 ? <p className="form-hint">Este equipo todavia no tiene fichas tecnicas relacionadas.</p> : null}
                          <div className="lab-equipment-detail-list">
                            {fichasEquipo.map((ficha) => (
                              <button
                                key={ficha.id}
                                type="button"
                                onClick={() => {
                                  setSelectedEquipoDetalle(null);
                                  setActiveTab('fichas');
                                  setSelectedFicha(ficha);
                                }}
                              >
                                <strong>{ficha.pc}</strong>
                                <span>{formatDateTime(ficha.fecha)} | {ficha.responsable || 'Sin responsable'}</span>
                                <small>{ficha.observacionGeneral || `${ficha.acciones.length} acciones registradas`}</small>
                              </button>
                            ))}
                          </div>
                        </section>

                        <section className="lab-equipment-detail-section">
                          <div className="lab-home-section-header">
                            <div>
                              <span className="eyebrow">Bitacoras e incidencias</span>
                              <h3>{bitacorasEquipo.length} movimientos</h3>
                            </div>
                          </div>
                          {bitacorasEquipo.length === 0 ? <p className="form-hint">No hay bitacoras o incidencias relacionadas con este equipo.</p> : null}
                          <div className="lab-equipment-detail-list">
                            {bitacorasEquipo.map((bitacora) => (
                              <article key={bitacora.id}>
                                <div>
                                  <strong>{bitacora.titulo}</strong>
                                  <span>{formatDateTime(bitacora.fecha)} | {bitacora.responsable || 'Sin responsable'}</span>
                                </div>
                                <span className={`status-pill priority-${bitacora.prioridad}`}>{estadoTrabajoLabels[bitacora.estado]}</span>
                                <p>{bitacora.descripcion}</p>
                              </article>
                            ))}
                          </div>
                        </section>

                        <section className="lab-equipment-detail-section">
                          <span className="eyebrow">Observaciones del inventario</span>
                          <p>{selectedEquipoDetalle.observaciones || 'Sin observaciones registradas en inventario.'}</p>
                        </section>
                      </>
                    );
                  })()}
                </article>
              </div>
            ) : null}

            {showEquipoFormModal ? (
              <div
                className="modal-backdrop"
                role="presentation"
                onClick={() => {
                  setShowEquipoFormModal(false);
                  setEditingEquipo(null);
                }}
              >
                <article
                  className="modal-panel lab-equipment-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-equipment-form-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="lab-catalog-modal-header">
                    <div>
                      <span className="eyebrow">Inventario</span>
                      <h2 id="lab-equipment-form-title">{editingEquipo ? 'Editar equipo' : 'Registrar equipo'}</h2>
                    </div>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setShowEquipoFormModal(false);
                        setEditingEquipo(null);
                      }}
                    >
                      Cerrar
                    </button>
                  </header>
                  <form className="stack-form lab-form lab-modal-form" onSubmit={handleEquipoSubmit}>
                    <div className="form-grid compact-form-grid">
                      <label>
                        Numero de inventario
                        <input name="codigo" required defaultValue={editingEquipo?.codigo} />
                      </label>
                      <label>
                        Nombre del equipo
                        <input
                          name="nombre"
                          required
                          placeholder="PC Lab 1-08, Laptop soporte..."
                          defaultValue={editingEquipo?.nombre}
                        />
                      </label>
                    </div>
                    <div className="form-grid compact-form-grid">
                      <div className="catalog-field">
                        <label>
                          Categoria
                          <select name="categoria" defaultValue={editingEquipo?.categoria ?? 'Computadora'} required>
                            {categoriasEquipo.map((categoria) => (
                              <option key={categoria} value={categoria}>
                                {categoria}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="icon-button catalog-manage-button"
                          type="button"
                          title="Administrar categorias"
                          onClick={() => setActiveCatalogManager('categorias')}
                        >
                          <Settings2 size={16} />
                        </button>
                      </div>
                      <div className="catalog-field">
                        <label>
                          Estado
                          <select name="estado" defaultValue={editingEquipo?.estado ?? 'operativo'} required>
                            {estadosEquipo.map((estado) => (
                              <option key={estado} value={estado}>
                                {estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="icon-button catalog-manage-button"
                          type="button"
                          title="Administrar estados"
                          onClick={() => setActiveCatalogManager('estados')}
                        >
                          <Settings2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="form-grid compact-form-grid">
                      {(() => {
                        const { marca, modelo } = splitMarcaModelo(editingEquipo?.marcaModelo ?? '');
                        return (
                          <>
                            <label>
                              Marca
                              <input name="marca" defaultValue={editingEquipo ? marca : ''} placeholder="Ej. HP, Dell, Lenovo" />
                            </label>
                            <label>
                              Modelo
                              <input name="modelo" defaultValue={editingEquipo ? modelo : ''} placeholder="Ej. EliteDesk 705 G4" />
                            </label>
                          </>
                        );
                      })()}
                      <label>
                        Serie
                        <input name="serie" defaultValue={editingEquipo?.serie} />
                      </label>
                    </div>
                    <div className="catalog-field">
                      <label>
                        Ubicacion
                        <select name="ubicacion" required defaultValue={editingEquipo?.ubicacion ?? 'Laboratorio 1'}>
                          {ubicacionesInventario
                            .filter((ubicacion) => ubicacion !== 'Todas')
                            .map((ubicacion) => (
                              <option key={ubicacion} value={ubicacion}>
                                {ubicacion}
                              </option>
                            ))}
                        </select>
                      </label>
                      <button
                        className="icon-button catalog-manage-button"
                        type="button"
                        title="Administrar ubicaciones"
                        onClick={() => setActiveCatalogManager('secciones')}
                      >
                        <Settings2 size={16} />
                      </button>
                    </div>
                    <label>
                      Observaciones
                      <textarea name="observaciones" rows={4} defaultValue={editingEquipo?.observaciones} />
                    </label>
                    <div className="page-actions">
                      <button className="primary-button" type="submit" disabled={isSaving}>
                        <Save size={18} />
                        {editingEquipo ? 'Actualizar equipo' : 'Guardar equipo'}
                      </button>
                    </div>
                  </form>
                </article>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'descartes' ? (
          <div className="lab-grid">
            <form className="stack-form lab-form" onSubmit={handleDescarteSubmit}>
              <h2>Registrar descarte</h2>
              <p className="form-hint">
                Use esta seccion cuando un equipo en Deposito sale definitivamente de la facultad. Si selecciona un equipo registrado, se guarda la evidencia y se retira del inventario activo.
              </p>
              <div className="form-grid compact-form-grid">
                <label>
                  Fecha
                  <input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                </label>
                <label>
                  Equipo del inventario
                  <select name="equipoId" value={selectedDescarteEquipoId} onChange={(event) => setSelectedDescarteEquipoId(event.target.value)}>
                    <option value="">Registro manual</option>
                    {state.equipos.filter((equipo) => normalizeExcelKey(equipo.ubicacion).includes('deposito')).map((equipo) => (
                      <option value={equipo.id} key={equipo.id}>
                        {equipo.codigo || 'S/N'} - {equipo.nombre} - {equipo.ubicacion}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {(() => {
                const selectedBrandModel = selectedDescarteEquipo ? splitMarcaModelo(selectedDescarteEquipo.marcaModelo) : null;
                return (
                  <>
                    <div className="form-grid compact-form-grid" key={selectedDescarteEquipoId || 'manual'}>
                      <label>
                        Inventario
                        <input name="inventario" required defaultValue={selectedDescarteEquipo?.codigo ?? ''} placeholder="Ej. 16332 o S/N" />
                      </label>
                      <label>
                        Equipo
                        <input name="equipo" required defaultValue={selectedDescarteEquipo?.nombre ?? ''} placeholder="Monitor, PC, impresora..." />
                      </label>
                      <label>
                        Marca
                        <input name="marca" defaultValue={selectedBrandModel?.marca ?? ''} placeholder="HP, Dell..." />
                      </label>
                      <label>
                        Modelo
                        <input name="modelo" defaultValue={selectedBrandModel?.modelo ?? ''} placeholder="L1710, 400 G9..." />
                      </label>
                      <label>
                        Serie
                        <input name="serie" defaultValue={selectedDescarteEquipo?.serie ?? ''} placeholder="S/N" />
                      </label>
                      <label>
                        Ubicacion
                        <input name="ubicacion" defaultValue={selectedDescarteEquipo?.ubicacion ?? 'Deposito'} />
                      </label>
                    </div>
                    <label>
                      Detalle del descarte
                      <textarea name="detalle" rows={4} required placeholder="Motivo, condicion del equipo, daño encontrado o referencia administrativa." />
                    </label>
                    <label>
                      Responsable
                      <input name="responsable" defaultValue={responsableSesion} required />
                    </label>
                    <div className="form-grid compact-form-grid">
                      <label>
                        Evidencia
                        <input name="evidenciaTitulo" placeholder="Acta, foto, memorando, factura..." />
                      </label>
                      <label>
                        Enlace o referencia
                        <input name="evidenciaUrl" placeholder="URL, carpeta, archivo o referencia fisica" />
                      </label>
                    </div>
                  </>
                );
              })()}
              <div className="page-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Save size={18} />
                  Guardar descarte
                </button>
                <label className="secondary-button file-action-button">
                  <Upload size={18} />
                  Cargar Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(event) => void handleDescartesExcelUpload(event)}
                    disabled={isSaving}
                  />
                </label>
                <button className="secondary-button" type="button" onClick={exportDiscardsExcel}>
                  <Download size={18} />
                  Descargar Excel
                </button>
              </div>
            </form>

            <div className="lab-list">
              <h2>Descartes registrados</h2>
              {state.descartes.length === 0 ? <p className="form-hint">Todavia no hay descartes registrados.</p> : null}
              {state.descartes.map((item) => (
                <article className="lab-record compact" key={item.id}>
                  <div className="lab-record-header">
                    <div>
                      <span className="status-pill equipment-baja">Descarte</span>
                      <h3>{item.inventario} - {item.equipo}</h3>
                      <small>{formatDateTime(item.fecha)} | {item.ubicacion || 'Sin ubicacion'}</small>
                    </div>
                    <div className="row-actions">
                      <button
                        className="icon-button danger-button"
                        type="button"
                        title="Eliminar descarte"
                        onClick={() => void handleDeleteDescarte(item)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p>{item.marca || 'S/N'} | {item.modelo || 'S/N'} | Serie: {item.serie || 'S/N'}</p>
                  <small>
                    {item.detalle || 'Sin detalle'} | Responsable: {item.responsable || 'No indicado'}
                    {item.evidenciaTitulo || item.evidenciaUrl ? ` | Evidencia: ${[item.evidenciaTitulo, item.evidenciaUrl].filter(Boolean).join(' - ')}` : ''}
                  </small>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'prestamos' ? (
          <div className="lab-grid">
            <form className="stack-form lab-form" onSubmit={handlePrestamoSubmit}>
              <h2>{editingPrestamo ? 'Editar prestamo' : 'Registrar prestamo'}</h2>
              <label>
                Equipo o dispositivo
                <input name="equipo" required defaultValue={editingPrestamo?.equipo} />
              </label>
              <div className="form-grid compact-form-grid">
                <label>
                  Entregado a
                  <input name="entregadoA" required defaultValue={editingPrestamo?.entregadoA} />
                </label>
                <label>
                  Tipo de persona
                  <select name="tipoBeneficiario" defaultValue={editingPrestamo?.tipoBeneficiario ?? 'estudiante'} required>
                    <option value="estudiante">Estudiante</option>
                    <option value="docente">Docente</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="externo">Externo</option>
                  </select>
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Cedula o identificacion
                  <input name="documento" defaultValue={editingPrestamo?.documento} />
                </label>
                <label>
                  Responsable que entrega
                  <input name="responsableEntrega" required defaultValue={editingPrestamo?.responsableEntrega} />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Fecha de prestamo
                  <input
                    name="fechaPrestamo"
                    type="datetime-local"
                    required
                    defaultValue={editingPrestamo ? localDateTimeValue(new Date(editingPrestamo.fechaPrestamo)) : localDateTimeValue()}
                    key={`prestamo-${editingPrestamo?.id ?? 'new'}`}
                  />
                </label>
                <label>
                  Fecha de devolucion
                  <input
                    name="fechaDevolucion"
                    type="datetime-local"
                    defaultValue={editingPrestamo?.fechaDevolucion ? localDateTimeValue(new Date(editingPrestamo.fechaDevolucion)) : ''}
                    key={`devolucion-${editingPrestamo?.id ?? 'new'}`}
                  />
                </label>
              </div>
              <label>
                Estado
                <select name="estado" defaultValue={editingPrestamo?.estado ?? 'activo'} required>
                  <option value="activo">Activo</option>
                  <option value="devuelto">Devuelto</option>
                  <option value="vencido">Vencido</option>
                </select>
              </label>
              <label>
                Observaciones
                <textarea name="observaciones" rows={4} defaultValue={editingPrestamo?.observaciones} />
              </label>
              <div className="page-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Save size={18} />
                  {editingPrestamo ? 'Actualizar prestamo' : 'Guardar prestamo'}
                </button>
                {editingPrestamo ? (
                  <button className="secondary-button" type="button" onClick={() => setEditingPrestamo(null)}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>

            <div className="lab-list">
              <h2>Prestamos registrados</h2>
              {state.prestamos.length === 0 ? <p className="form-hint">Todavia no hay prestamos registrados.</p> : null}
              {state.prestamos.map((item) => (
                <article className="lab-record compact" key={item.id}>
                  <div className="lab-record-header">
                    <div>
                      <span className={`status-pill loan-${item.estado}`}>{item.estado}</span>
                      <h3>{item.equipo}</h3>
                      <small>{item.entregadoA} | {item.tipoBeneficiario}</small>
                    </div>
                    <div className="row-actions">
                      <button className="icon-button" type="button" title="Editar" onClick={() => setEditingPrestamo(item)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger-button"
                        type="button"
                        title="Eliminar"
                        onClick={() => void handleDeletePrestamo(item)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p>
                    Prestado: {formatDateTime(item.fechaPrestamo)} | Devolucion:{' '}
                    {item.fechaDevolucion ? formatDateTime(item.fechaDevolucion) : 'Pendiente'}
                  </p>
                  <small>{item.observaciones || 'Sin observaciones'}</small>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'informes' ? (
          <div className="lab-report-grid">
            <article className="lab-report-card full">
              <Wrench size={26} />
              <h2>Informe de mantenimiento bajo demanda</h2>
              <p>Elija cualquier rango de fechas. Consolida mantenimientos efectuados, equipos atendidos, incidencias encontradas y reparaciones pendientes o en proceso.</p>
              <div className="form-grid compact-form-grid"><label>Desde<input type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} /></label><label>Hasta<input type="date" value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} /></label></div>
              <button className="primary-button" type="button" onClick={exportRangeMaintenanceReport}><Download size={18} />Descargar Excel por rango</button>
              <pre>{buildInformeMantenimientoPorRango(state, reportStartDate, reportEndDate)}</pre>
            </article>
            <article className="lab-report-card">
              <History size={26} />
              <h2>Informe mensual</h2>
              <p>Resumen ejecutivo del mes con bitacoras, fichas tecnicas, prestamos y pendientes del laboratorio.</p>
              <label>
                Mes del informe
                <input
                  type="month"
                  value={selectedReportMonth}
                  onChange={(event) => setSelectedReportMonth(event.target.value)}
                />
              </label>
              <button className="primary-button" type="button" onClick={exportMonthlyReport}>
                <Download size={18} />
                Descargar Excel
              </button>
            </article>
            <article className="lab-report-card">
              <HardDrive size={26} />
              <h2>Informe por ubicacion</h2>
              <p>Equipos y bitacoras organizadas por area: laboratorio, biblioteca, decanato, ORD u otra seccion.</p>
              <label>
                Ubicacion
                <select value={selectedReportLocation} onChange={(event) => setSelectedReportLocation(event.target.value)}>
                  {ubicacionesInventario.map((ubicacion) => (
                    <option value={ubicacion} key={ubicacion}>
                      {ubicacion}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary-button" type="button" onClick={exportLocationReport}>
                <Download size={18} />
                Descargar Excel
              </button>
            </article>
            <article className="lab-report-card">
              <Wrench size={26} />
              <h2>Pendientes tecnicos</h2>
              <p>Equipos no operativos, trabajos abiertos y prestamos activos o vencidos para seguimiento inmediato.</p>
              <button className="primary-button" type="button" onClick={exportPendingReport}>
                <Download size={18} />
                Descargar Excel
              </button>
            </article>
            <article className="lab-report-card">
              <ClipboardList size={26} />
              <h2>Historial por equipo</h2>
              <p>Ficha de seguimiento con datos del equipo, fichas tecnicas y bitacoras relacionadas.</p>
              <label>
                Equipo
                <select
                  value={selectedReportEquipoId}
                  onChange={(event) => setSelectedReportEquipoId(event.target.value)}
                >
                  <option value="">Seleccione un equipo</option>
                  {state.equipos.map((equipo) => (
                    <option value={equipo.id} key={equipo.id}>
                      {equipo.codigo} - {equipo.nombre} - {equipo.ubicacion}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondary-button" type="button" onClick={exportEquipmentHistoryReport}>
                <Download size={18} />
                Descargar historial
              </button>
            </article>
            <article className="lab-report-card">
              <HardDrive size={26} />
              <h2>Informe de inventario</h2>
              <p>Excel formal con inventario ordenado por ubicacion, categoria y equipo, mas resumen por areas.</p>
              <button className="primary-button" type="button" onClick={exportInventoryExcel}>
                <Download size={18} />
                Descargar Excel
              </button>
            </article>
            <article className="lab-report-card">
              <Trash2 size={26} />
              <h2>Informe de descartes</h2>
              <p>Excel formal con equipos descartados, inventario, serie, detalle y ubicacion, siguiendo el formato institucional.</p>
              <button className="primary-button" type="button" onClick={exportDiscardsExcel}>
                <Download size={18} />
                Descargar Excel
              </button>
            </article>
            <article className="lab-report-card">
              <ClipboardList size={26} />
              <h2>Base completa</h2>
              <p>Archivo CSV general para abrir en Excel con bitacoras, inventario, fichas y prestamos registrados.</p>
              <button className="secondary-button" type="button" onClick={exportCsv}>
                <Download size={18} />
                Descargar CSV
              </button>
            </article>
            <article className="lab-report-card">
              <History size={26} />
              <h2>Resumen TXT</h2>
              <p>Resumen rapido en texto plano para compartir o pegar en una nota administrativa.</p>
              <button className="secondary-button" type="button" onClick={exportReport}>
                <Download size={18} />
                Descargar TXT
              </button>
            </article>
            <article className="lab-report-card full">
              <h2>Vista previa del informe</h2>
              <pre>{buildLaboratorioReport(state)}</pre>
            </article>
          </div>
        ) : null}


            {confirmacionOperativo ? (
              <div className="modal-backdrop" role="presentation" onClick={() => setConfirmacionOperativo(null)}>
                <article
                  className="modal-panel lab-confirm-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-confirm-operativo-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="lab-catalog-modal-header">
                    <div>
                      <span className="eyebrow">Confirmacion de inventario</span>
                      <h2 id="lab-confirm-operativo-title">Devolver equipo a operativo</h2>
                    </div>
                    <button className="icon-button" type="button" onClick={() => setConfirmacionOperativo(null)} title="Cerrar">
                      <XCircle size={18} />
                    </button>
                  </header>
                  <p>
                    Este registro esta resuelto o cerrado. Desea devolver el equipo{' '}
                    <strong>{confirmacionOperativo.equipoAtendido.codigo} - {confirmacionOperativo.equipoAtendido.nombre}</strong> a estado operativo en el inventario?
                  </p>
                  <div className="lab-confirm-actions">
                    <button
                      className="primary-button"
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        const pending = confirmacionOperativo;
                        setConfirmacionOperativo(null);
                        void guardarBitacoraConInventario(pending.input, pending.equipoAtendido, pending.nextEquipoEstado, true, pending.form);
                      }}
                    >
                      Si, devolver a operativo
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        const pending = confirmacionOperativo;
                        setConfirmacionOperativo(null);
                        void guardarBitacoraConInventario(pending.input, pending.equipoAtendido, pending.nextEquipoEstado, false, pending.form);
                      }}
                    >
                      No, solo guardar bitacora
                    </button>
                  </div>
                </article>
              </div>
            ) : null}

            {activeCatalogManager === 'categorias' ? (
              <div className="modal-backdrop" role="presentation" onClick={closeCatalogManager}>
                <article
                  className="modal-panel lab-catalog-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-category-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="lab-catalog-modal-header">
                    <div>
                      <span className="eyebrow">Categorias</span>
                      <h2 id="lab-category-title">{editingCategoria ? 'Editar categoria' : 'Agregar categoria'}</h2>
                    </div>
                    <button className="secondary-button" type="button" onClick={closeCatalogManager}>
                      Cerrar
                    </button>
                  </header>
                  <form
                    className="stack-form"
                    onSubmit={(event) => void handleCatalogoSubmit(event, 'categoria_equipo', editingCategoria)}
                    key={editingCategoria?.id ?? 'new-category-modal'}
                  >
                    <div className="form-grid compact-form-grid">
                      <label>
                        Nombre
                        <input name="nombre" required placeholder="Ej. Tablet" defaultValue={editingCategoria?.nombre} />
                      </label>
                      <label>
                        Descripcion
                        <input name="descripcion" placeholder="Opcional" defaultValue={editingCategoria?.descripcion} />
                      </label>
                    </div>
                    <div className="page-actions">
                      <button className="primary-button" type="submit" disabled={isSaving}>
                        <Save size={18} />
                        {editingCategoria ? 'Actualizar categoria' : 'Guardar categoria'}
                      </button>
                      {editingCategoria ? (
                        <button className="secondary-button" type="button" onClick={() => setEditingCategoria(null)}>
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </form>
                  <div className="lab-section-list">
                    {state.categoriasEquipo.map((categoria) => (
                      <article key={categoria.id}>
                        <div>
                          <strong>{categoria.nombre}</strong>
                          {categoria.descripcion ? <small>{categoria.descripcion}</small> : null}
                        </div>
                        <span>{state.equipos.filter((equipo) => equipo.categoria === categoria.nombre).length}</span>
                        <button className="icon-button" type="button" title="Editar categoria" onClick={() => setEditingCategoria(categoria)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger-button"
                          type="button"
                          title="Eliminar categoria"
                          onClick={() => void handleDeleteCatalogo(categoria)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                </article>
              </div>
            ) : null}

            {activeCatalogManager === 'estados' ? (
              <div className="modal-backdrop" role="presentation" onClick={closeCatalogManager}>
                <article
                  className="modal-panel lab-catalog-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-status-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="lab-catalog-modal-header">
                    <div>
                      <span className="eyebrow">Estados</span>
                      <h2 id="lab-status-title">{editingEstadoEquipo ? 'Editar estado' : 'Agregar estado'}</h2>
                    </div>
                    <button className="secondary-button" type="button" onClick={closeCatalogManager}>
                      Cerrar
                    </button>
                  </header>
                  <form
                    className="stack-form"
                    onSubmit={(event) => void handleCatalogoSubmit(event, 'estado_equipo', editingEstadoEquipo)}
                    key={editingEstadoEquipo?.id ?? 'new-status-modal'}
                  >
                    <div className="form-grid compact-form-grid">
                      <label>
                        Valor interno
                        <input name="nombre" required placeholder="Ej. mantenimiento_preventivo" defaultValue={editingEstadoEquipo?.nombre} />
                      </label>
                      <label>
                        Nombre visible
                        <input name="descripcion" placeholder="Ej. Mantenimiento preventivo" defaultValue={editingEstadoEquipo?.descripcion} />
                      </label>
                    </div>
                    <div className="page-actions">
                      <button className="primary-button" type="submit" disabled={isSaving}>
                        <Save size={18} />
                        {editingEstadoEquipo ? 'Actualizar estado' : 'Guardar estado'}
                      </button>
                      {editingEstadoEquipo ? (
                        <button className="secondary-button" type="button" onClick={() => setEditingEstadoEquipo(null)}>
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </form>
                  <div className="lab-section-list">
                    {state.estadosEquipo.map((estado) => (
                      <article key={estado.id}>
                        <div>
                          <strong>{estado.descripcion || getEstadoEquipoLabel(estado.nombre)}</strong>
                          <small>{estado.nombre}</small>
                        </div>
                        <span>{state.equipos.filter((equipo) => equipo.estado === estado.nombre).length}</span>
                        <button className="icon-button" type="button" title="Editar estado" onClick={() => setEditingEstadoEquipo(estado)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger-button"
                          type="button"
                          title="Eliminar estado"
                          onClick={() => void handleDeleteCatalogo(estado)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                </article>
              </div>
            ) : null}
            {activeCatalogManager === 'secciones' ? (
              <div className="modal-backdrop" role="presentation" onClick={closeCatalogManager}>
                <article
                  className="modal-panel lab-catalog-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-catalog-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="lab-catalog-modal-header">
                    <div>
                      <span className="eyebrow">Ubicaciones</span>
                      <h2 id="lab-catalog-title">{editingSeccion ? 'Editar ubicacion' : 'Agregar ubicacion'}</h2>
                    </div>
                    <button className="secondary-button" type="button" onClick={closeCatalogManager}>
                      Cerrar
                    </button>
                  </header>
                  <form className="stack-form" onSubmit={handleSeccionSubmit} key={editingSeccion?.id ?? 'new-section-modal'}>
                    <div className="form-grid compact-form-grid">
                      <label>
                        Nombre
                        <input name="nombre" required placeholder="Ej. Decanato" defaultValue={editingSeccion?.nombre} />
                      </label>
                      <label>
                        Descripcion
                        <input name="descripcion" placeholder="Opcional" defaultValue={editingSeccion?.descripcion} />
                      </label>
                    </div>
                    <div className="page-actions">
                      <button className="primary-button" type="submit" disabled={isSaving}>
                        <Save size={18} />
                        {editingSeccion ? 'Actualizar ubicacion' : 'Guardar ubicacion'}
                      </button>
                      {editingSeccion ? (
                        <button className="secondary-button" type="button" onClick={() => setEditingSeccion(null)}>
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </form>
                  <div className="lab-section-list">
                    {state.secciones.map((seccion) => (
                      <article key={seccion.id}>
                        <div>
                          <strong>{seccion.nombre}</strong>
                          {seccion.descripcion ? <small>{seccion.descripcion}</small> : null}
                        </div>
                        <span>{state.equipos.filter((equipo) => equipo.ubicacion === seccion.nombre).length}</span>
                        <button className="icon-button" type="button" title="Editar ubicacion" onClick={() => setEditingSeccion(seccion)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger-button"
                          type="button"
                          title="Eliminar ubicacion"
                          onClick={() => void handleDeleteSeccion(seccion)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                </article>
              </div>
            ) : null}
      </section>
    </div>
  );
}
