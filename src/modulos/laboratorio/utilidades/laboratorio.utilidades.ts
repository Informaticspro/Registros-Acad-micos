import type {
  BitacoraLaboratorioInput,
  EquipoLaboratorioInput,
} from '@/servicios/laboratorio.servicio';
import type {
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
  EstadoTrabajoLaboratorio,
} from '@/tipos/dominio';
import {
  estadoEquipoLabels,
  filtroComponentesAsignados,
} from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import type { TemaVisual } from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';
export {
  buildBitacoraInput,
  buildComponenteInput,
  buildComponentesInicialesInput,
  buildDescarteInput,
  buildEquipoInput,
  buildFichaTecnicaInput,
  buildPrestamoInput,
  buildSeccionInput,
  getCategoriaComponenteDesdeTipo,
} from '@/modulos/laboratorio/utilidades/formularios-laboratorio.utilidades';
export type { ComponenteNuevoDraft } from '@/modulos/laboratorio/utilidades/formularios-laboratorio.utilidades';

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

function isAssignedComponentsInventoryFilter(value: string) {
  return value === filtroComponentesAsignados;
}

function matchesInventoryLocationFilter(item: EquipoLaboratorio, ubicacion: string) {
  if (ubicacion === 'Todas') return true;
  if (isAssignedComponentsInventoryFilter(ubicacion)) return true;
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
  const existingBySerie = new Map(
    equipos
      .map((equipo) => [normalizeUniqueEquipoValue(equipo.serie, 'serie'), equipo] as const)
      .filter(([key]) => Boolean(key)),
  );
  const seenSerie = new Set<string>();
  let ignoredDuplicates = 0;

  const uniqueInputs = inputs.filter((input) => {
    const serieKey = normalizeUniqueEquipoValue(input.serie, 'serie');
    const existingBySameSerie = serieKey ? existingBySerie.get(serieKey) : undefined;

    if ((serieKey && seenSerie.has(serieKey)) || existingBySameSerie) {
      ignoredDuplicates += 1;
      return false;
    }

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
      ubicacion: readColumn(row, ['ubicacion', 'ubicaciÃ³n', 'lugar']) || 'Deposito',
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

export {
  appendUniqueInventoryValue,
  buildDuplicateEquipoMessage,
  containsExactLooseText,
  downloadTextFile,
  filterUniqueEquipoInputsForImport,
  findDuplicateEquipoIdentity,
  formatImportedExcelDate,
  getEstadoChangeWorkStatus,
  getEstadoChangeWorkType,
  getEstadoEquipoClass,
  getEstadoEquipoLabel,
  getInitialTheme,
  getInventoryStatusPriority,
  getInventoryStatusPriorityValue,
  getNaturalInventorySortKey,
  getTechnicalIdentifiers,
  isAssignedComponentsInventoryFilter,
  isRepairInventoryFilter,
  isUuid,
  localDateTimeValue,
  matchesInventoryLocationFilter,
  matchesInventorySearch,
  normalizeEstadoEquipo,
  normalizeExcelKey,
  normalizeLooseText,
  normalizeUniqueEquipoValue,
  parseDescartesExcelRows,
  parseEquipoExcelRow,
  readString,
  resolveInventoryStatusFromBitacora,
  shouldImportEquipoRow,
  shouldRequestIssueDetailForEstado,
  sortEquiposInventario,
  splitMarcaModelo,
  stringifyExcelValue,
};

export type { CampoUnicoEquipo };
