import fs from 'node:fs/promises';
import path from 'node:path';
import xlsx from 'xlsx';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const sourcePath = 'C:/Users/jose_/Downloads/Bitacoras 2026.xlsx';
const outputDir = 'C:/Users/jose_/Documents/registro-eventos-academicos/outputs/inventario_app';
const outputPath = path.join(outputDir, 'Inventario_para_subir_app.xlsx');

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function compact(value) {
  return String(value ?? '').trim();
}

function readCell(row, aliases) {
  const normalizedAliases = aliases.map(normalizeKey);
  const entry = Object.entries(row).find(([key]) => normalizedAliases.includes(normalizeKey(key)));
  return compact(entry?.[1]);
}

function normalizeEstado(value) {
  const normalized = normalizeKey(value);
  if (normalized.includes('repar')) return 'en_reparacion';
  if (normalized.includes('prest')) return 'prestado';
  if (normalized.includes('baja') || normalized.includes('descart')) return 'baja';
  if (normalized.includes('pend') || normalized.includes('revision')) return 'pendiente_revision';
  return 'operativo';
}

function splitMarcaModelo(value) {
  const text = compact(value);
  if (!text) return { marca: 'S/N', modelo: 'S/N' };
  const parts = text
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) return { marca: parts[0], modelo: parts.slice(1).join(' / ') };

  const firstWords = text.split(/\s+/);
  if (firstWords.length === 1) return { marca: firstWords[0], modelo: 'S/N' };
  return { marca: firstWords[0], modelo: firstWords.slice(1).join(' ') };
}

function normalizeEquipmentName(pcValue, marcaModelo, tipoEquipo) {
  const pc = compact(pcValue);
  const type = compact(tipoEquipo);
  const brand = compact(marcaModelo);

  if (/^\d+$/.test(pc)) return `PC ${pc}`;
  if (pc) return pc;
  if (type && !['existente', 'nuevo incorporado', 'nuevoincorporado', 'reparado'].includes(normalizeKey(type))) return type;
  if (brand) return brand.split('/')[0].trim();
  return 'Equipo';
}

function buildEquipo(row, index, sheetName) {
  const pcValue = readCell(row, ['pc #', 'pc', 'fila', 'n', 'no', 'numero']);
  const fila = /^\d+$/.test(compact(pcValue)) ? Number(pcValue) : index + 1;
  const marcaModeloOriginal = readCell(row, ['marca modelo', 'marca/modelo', 'marca', 'modelo']);
  const tipoEquipo = readCell(row, ['tipo de equipo', 'tipo', 'equipo', 'dispositivo']);
  const equipo = normalizeEquipmentName(pcValue, marcaModeloOriginal, tipoEquipo);
  const { marca, modelo } = splitMarcaModelo(marcaModeloOriginal);
  const inventario =
    readCell(row, ['inventario', 'n inventario', 'nro inventario', 'no inventario', 'numero inventario', 'codigo', 'codigo interno', 'placa']) ||
    `SIN-${index + 1}`;
  const serie = readCell(row, ['serie', 'serial', 's/n', 'sn', 'numero serie']) || 'S/N';
  const ubicacion = readCell(row, ['ubicacion', 'lugar', 'area', 'laboratorio', 'seccion']) || sheetName;
  const estado = normalizeEstado(readCell(row, ['estado', 'status', 'condicion']));
  const sistemaOperativo = readCell(row, ['sistema operativo', 'so']);
  const observaciones = [
    readCell(row, ['observaciones', 'observacion', 'notas', 'detalle']),
    sistemaOperativo ? `Sistema operativo: ${sistemaOperativo}` : '',
    tipoEquipo ? `Tipo/condicion: ${tipoEquipo}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  if (!equipo && !marca && !modelo && !inventario && !serie) return null;

  return {
    fila: fila || index + 1,
    equipo,
    marca,
    modelo,
    inventario,
    serie,
    ubicacion,
    estado,
    observaciones,
  };
}

function uniqueByInventory(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = normalizeKey(`${item.inventario}-${item.serie}-${item.equipo}`);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...item, fila: result.length + 1 });
  }

  return result;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const sourceWorkbook = xlsx.readFile(sourcePath, { cellDates: true });
  const rawRows = sourceWorkbook.SheetNames.flatMap((sheetName) =>
    xlsx.utils
      .sheet_to_json(sourceWorkbook.Sheets[sheetName], { defval: '', raw: false })
      .map((row, index) => buildEquipo(row, index, sheetName)),
  );
  const rows = uniqueByInventory(rawRows.filter(Boolean));

  if (rows.length === 0) {
    throw new Error('No se encontraron filas de inventario en el archivo original.');
  }

  const workbook = Workbook.create();
  const uploadSheet = workbook.worksheets.add('Subir App');
  uploadSheet.showGridLines = false;

  const uploadHeaders = [['Fila', 'Equipo', 'Marca', 'Modelo', 'Inventario', 'Serie', 'Ubicacion', 'Estado', 'Observaciones']];
  const uploadValues = rows.map((row) => [
    row.fila,
    row.equipo,
    row.marca,
    row.modelo,
    row.inventario,
    row.serie,
    row.ubicacion,
    row.estado,
    row.observaciones,
  ]);
  uploadSheet.getRange('A1:I1').values = uploadHeaders;
  uploadSheet.getRangeByIndexes(1, 0, uploadValues.length, 9).values = uploadValues;
  uploadSheet.getRange('A1:I1').format = {
    fill: '#D9EAD3',
    font: { bold: true, color: '#111827' },
    alignmentHorizontal: 'center',
    borders: { preset: 'all', style: 'medium', color: '#111827' },
  };
  uploadSheet.getRange(`A2:I${rows.length + 1}`).format = {
    borders: { preset: 'all', style: 'thin', color: '#111827' },
    alignmentVertical: 'center',
  };
  uploadSheet.getRange(`A1:I${rows.length + 1}`).format.wrapText = true;
  uploadSheet.getRange('A:A').format.columnWidth = 7;
  uploadSheet.getRange('B:B').format.columnWidth = 16;
  uploadSheet.getRange('C:C').format.columnWidth = 14;
  uploadSheet.getRange('D:D').format.columnWidth = 16;
  uploadSheet.getRange('E:E').format.columnWidth = 16;
  uploadSheet.getRange('F:F').format.columnWidth = 28;
  uploadSheet.getRange('G:G').format.columnWidth = 28;
  uploadSheet.getRange('H:H').format.columnWidth = 18;
  uploadSheet.getRange('I:I').format.columnWidth = 30;
  uploadSheet.freezePanes.freezeRows(1);
  const uploadTable = uploadSheet.tables.add(`A1:I${rows.length + 1}`, true, 'InventarioSubirApp');
  uploadTable.showFilterButton = true;
  uploadTable.showBandedRows = true;
  uploadSheet.getRange(`H2:H${rows.length + 1}`).dataValidation = {
    rule: { type: 'list', values: ['operativo', 'en_reparacion', 'prestado', 'pendiente_revision', 'baja'] },
  };

  const sheet = workbook.worksheets.add('Inventario Facultad');
  sheet.showGridLines = false;

  sheet.getRange('A1:I1').merge();
  sheet.getRange('A2:I2').merge();
  sheet.getRange('A3:I3').merge();
  sheet.getRange('A4:I4').merge();
  sheet.getRange('A1:A4').values = [
    ['UNIVERSIDAD AUTONOMA DE CHIRIQUI'],
    ['FACULTAD DE ECONOMIA'],
    ['INVENTARIO DE LA FACULTAD'],
    [`Generado: ${new Date().toLocaleDateString('es-PA')}`],
  ];

  sheet.getRange('A6:I6').values = uploadHeaders;
  sheet.getRangeByIndexes(6, 0, rows.length, 9).values = uploadValues;

  const lastRow = rows.length + 6;
  sheet.getRange('A1:I4').format = {
    font: { bold: true, color: '#111827' },
    alignmentHorizontal: 'center',
    alignmentVertical: 'center',
  };
  sheet.getRange('A1:I1').format.font.size = 14;
  sheet.getRange('A3:I3').format.font.size = 13;
  sheet.getRange('A6:I6').format = {
    fill: '#D9EAD3',
    font: { bold: true, color: '#111827' },
    alignmentHorizontal: 'center',
    alignmentVertical: 'center',
    borders: { preset: 'all', style: 'medium', color: '#111827' },
  };
  sheet.getRange(`A7:I${lastRow}`).format = {
    alignmentHorizontal: 'center',
    alignmentVertical: 'center',
    borders: { preset: 'all', style: 'thin', color: '#111827' },
  };
  sheet.getRange(`B7:D${lastRow}`).format.alignmentHorizontal = 'center';
  sheet.getRange(`F7:G${lastRow}`).format.alignmentHorizontal = 'left';
  sheet.getRange(`I7:I${lastRow}`).format.alignmentHorizontal = 'left';
  sheet.getRange(`A1:I${lastRow}`).format.font.name = 'Arial';
  sheet.getRange(`A1:I${lastRow}`).format.wrapText = true;

  sheet.getRange('A:A').format.columnWidth = 7;
  sheet.getRange('B:B').format.columnWidth = 16;
  sheet.getRange('C:C').format.columnWidth = 14;
  sheet.getRange('D:D').format.columnWidth = 16;
  sheet.getRange('E:E').format.columnWidth = 16;
  sheet.getRange('F:F').format.columnWidth = 28;
  sheet.getRange('G:G').format.columnWidth = 28;
  sheet.getRange('H:H').format.columnWidth = 18;
  sheet.getRange('I:I').format.columnWidth = 30;

  sheet.freezePanes.freezeRows(6);

  const table = sheet.tables.add(`A6:I${lastRow}`, true, 'InventarioFacultadApp');
  table.showFilterButton = true;
  table.showBandedRows = true;

  sheet.getRange(`H7:H${lastRow}`).dataValidation = {
    rule: { type: 'list', values: ['operativo', 'en_reparacion', 'prestado', 'pendiente_revision', 'baja'] },
  };

  const inspect = await workbook.inspect({
    kind: 'table',
    range: `Subir App!A1:I${Math.min(rows.length + 1, 16)}`,
    tableMaxRows: 16,
    tableMaxCols: 9,
    maxChars: 6000,
  });
  console.log(inspect.ndjson);

  const errors = await workbook.inspect({
    kind: 'match',
    searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
    options: { useRegex: true, maxResults: 50 },
    summary: 'formula error scan',
  });
  console.log(errors.ndjson);

  const preview = await workbook.render({
    sheetName: 'Inventario Facultad',
    range: `A1:I${Math.min(lastRow, 28)}`,
    scale: 1,
    format: 'png',
  });
  await fs.writeFile(path.join(outputDir, 'Inventario_para_subir_app_preview.png'), new Uint8Array(await preview.arrayBuffer()));

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  console.log(JSON.stringify({ outputPath, rows: rows.length, sourceSheets: sourceWorkbook.SheetNames }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
