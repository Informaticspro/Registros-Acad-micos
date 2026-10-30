import { utils, writeFile } from 'xlsx-js-style';
import type { LaboratorioState } from './laboratorio.servicio';
import type { BitacoraLaboratorio, EquipoLaboratorio } from '@/tipos/dominio';
import { estadoEquipoLabels, estadoTrabajoLabels, prioridadLabels } from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import { code39Patterns, normalizeBarcodeValue, hasUsefulIdentifier } from '@/utilidades/identificadores-inventario';

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
  const auditMatch = item.descripcion.match(/Auditoria de inventario:\s*([^-\n]+?)\s*->\s*([^.\n]+)/i);
  const automaticMatch = item.descripcion.match(/Cambio de estado tecnico:\s*([^-\n]+?)\s*->\s*([^.\n]+)/i);
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

function buildBarcodeRects(value: string, moduleWidth = 0.42) {
  const fullValue = `*${normalizeBarcodeValue(value)}*`;
  let x = 0;
  const rects: Array<{ x: number; width: number }> = [];

  fullValue.split('').forEach((char) => {
    const pattern = code39Patterns[char] ?? code39Patterns[' '];
    pattern.split('').forEach((bit) => {
      const width = bit === '1' ? moduleWidth * 2 : moduleWidth;
      if (bit === '1') rects.push({ x, width });
      x += width;
    });
    x += moduleWidth;
  });

  return { rects, width: x };
}

function getInventoryLabelIdentifier(item: EquipoLaboratorio) {
  if (hasUsefulIdentifier(item.codigo)) return item.codigo;
  if (hasUsefulIdentifier(item.serie)) return item.serie;
  return item.nombre || 'Sin identificador';
}

export async function exportEtiquetasInventarioLaboratorioPdf(state: LaboratorioState) {
  const [{ default: QRCode }, { default: jsPDF }] = await Promise.all([import('qrcode'), import('jspdf')]);
  const sortedEquipos = state.equipos.filter((item) => !isInventoryNoteRow(item)).sort((first, second) => {
    const byLocation = first.ubicacion.localeCompare(second.ubicacion, 'es');
    if (byLocation !== 0) return byLocation;
    return first.nombre.localeCompare(second.nombre, 'es', { numeric: true });
  });

  const baseUrl = window.location.origin;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const margin = 8;
  const gap = 4;
  const labelWidth = (pageWidth - margin * 2 - gap) / 2;
  const labelHeight = (pageHeight - margin * 2 - gap * 3) / 4;
  const generatedDate = new Date().toLocaleDateString('es-PA');

  for (let index = 0; index < sortedEquipos.length; index += 1) {
    if (index > 0 && index % 8 === 0) doc.addPage();

    const item = sortedEquipos[index];
    const position = index % 8;
    const col = position % 2;
    const row = Math.floor(position / 2);
    const x = margin + col * (labelWidth + gap);
    const y = margin + row * (labelHeight + gap);
    const inventoryDisplay = hasUsefulIdentifier(item.codigo) ? item.codigo : 'Sin inventario';
    const serialDisplay = hasUsefulIdentifier(item.serie) ? item.serie : 'Sin serie';
    const barcodeValue = normalizeBarcodeValue(getInventoryLabelIdentifier(item));
    const expedienteUrl = `${baseUrl}/laboratorio/equipos/${item.id}`;
    const qrDataUrl = await QRCode.toDataURL(expedienteUrl, { margin: 1, width: 180 });
    const { marca, modelo } = splitMarcaModeloReporte(item.marcaModelo);
    const barcode = buildBarcodeRects(barcodeValue, 0.25);
    const barcodeMaxWidth = labelWidth - 14;
    const barcodeScale = Math.min(1, barcodeMaxWidth / barcode.width);
    const barcodeWidth = barcode.width * barcodeScale;
    const barcodeX = x + (labelWidth - barcodeWidth) / 2;
    const barcodeY = y + 33;
    const barcodeHeight = 11;

    doc.setDrawColor(22, 61, 45);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, labelWidth, labelHeight, 3, 3);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(8, 32, 22);
    doc.setFontSize(7.5);
    doc.text('FACULTAD DE ECONOMIA', x + labelWidth / 2, y + 6, { align: 'center' });
    doc.setFontSize(6);
    doc.text('INVENTARIO TECNICO', x + labelWidth / 2, y + 10, { align: 'center' });

    doc.setFontSize(13);
    const titleLines = doc.splitTextToSize(item.nombre || 'Equipo', labelWidth - 33).slice(0, 2);
    doc.text(titleLines, x + 3, y + 20);

    doc.setFontSize(5.8);
    doc.setTextColor(22, 61, 45);
    doc.text(`${item.categoria || 'Sin categoria'} | ${item.ubicacion || 'Sin ubicacion'}`, x + 3, y + 27);
    const brandLine = `${marca || 'S/N'}${modelo ? ` - ${modelo}` : ''}`;
    doc.text(doc.splitTextToSize(brandLine, labelWidth - 33).slice(0, 2), x + 3, y + 31);

    doc.setFontSize(4.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(49, 85, 67);
    doc.text('EXPEDIENTE COMPLETO', x + labelWidth - 13, y + 13, { align: 'center' });
    doc.addImage(qrDataUrl, 'PNG', x + labelWidth - 22, y + 14, 18, 18);

    doc.setFontSize(4.8);
    doc.text('FICHA TECNICA', x + labelWidth / 2, y + 31.2, { align: 'center' });
    doc.setDrawColor(211, 223, 200);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x + 3, y + 32, labelWidth - 6, 17, 2, 2, 'FD');
    doc.setFillColor(17, 17, 17);
    barcode.rects.forEach((rect) => {
      doc.rect(barcodeX + rect.x * barcodeScale, barcodeY, rect.width * barcodeScale, barcodeHeight, 'F');
    });
    doc.setFontSize(5.5);
    doc.setTextColor(17, 17, 17);
    doc.text(barcodeValue, x + labelWidth / 2, y + 47.5, { align: 'center' });

    const infoY = y + 51;
    const infoWidth = (labelWidth - 10) / 3;
    const infoBlocks = [
      ['INVENTARIO', inventoryDisplay],
      ['SERIE', serialDisplay],
      ['UBICACION', item.ubicacion || 'Sin ubicacion'],
    ];
    infoBlocks.forEach(([label, value], blockIndex) => {
      const blockX = x + 3 + blockIndex * (infoWidth + 2);
      doc.setDrawColor(211, 223, 200);
      doc.setFillColor(248, 251, 243);
      doc.roundedRect(blockX, infoY, infoWidth, 9, 1.6, 1.6, 'FD');
      doc.setFontSize(4.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(49, 85, 67);
      doc.text(label, blockX + 1.4, infoY + 3);
      doc.setFontSize(5.5);
      doc.setTextColor(8, 32, 22);
      doc.text(doc.splitTextToSize(value, infoWidth - 2).slice(0, 1), blockX + 1.4, infoY + 7);
    });

    doc.setFontSize(4.2);
    doc.setTextColor(80, 97, 87);
    doc.text(generatedDate, x + labelWidth / 2, y + labelHeight - 2, { align: 'center' });
  }

  doc.save(`etiquetas-inventario-${slugifyFileName(new Date().toISOString().slice(0, 10))}.pdf`);
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
  const headers = ['Fila', 'Inventario', 'Equipo', 'Marca', 'Modelo', 'Serie', 'Detalle', 'Ubicacion', 'Evidencia', 'Referencia'];
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
      item.evidenciaTitulo || '',
      item.evidenciaUrl || '',
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
    { wch: 24 },
    { wch: 36 },
  ];
  worksheet['!rows'] = [{ hpt: 22 }, { hpt: 20 }, { hpt: 8 }, { hpt: 26 }, { hpt: 18 }, { hpt: 8 }];
  worksheet['!autofilter'] = { ref: `A7:J${Math.max(7, rows.length + 7)}` };
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
      ['Fecha', 'Inventario', 'Equipo', 'Marca', 'Modelo', 'Serie', 'Ubicacion', 'Responsable', 'Detalle', 'Evidencia', 'Referencia'],
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
        item.evidenciaTitulo,
        item.evidenciaUrl,
      ]),
      [20, 18, 24, 18, 24, 24, 24, 22, 52, 24, 36],
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
      ['Fecha', 'Inventario', 'Equipo', 'Marca', 'Modelo', 'Serie', 'Ubicacion', 'Responsable', 'Detalle', 'Evidencia', 'Referencia'],
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
        item.evidenciaTitulo,
        item.evidenciaUrl,
      ]),
      [20, 18, 24, 18, 24, 24, 24, 22, 52, 24, 36],
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
      ['Fecha', 'Inventario', 'Equipo', 'Serie', 'Ubicacion', 'Responsable', 'Detalle', 'Evidencia', 'Referencia'],
      descartes.map((item) => [
        formatExcelDate(item.fecha),
        item.inventario,
        item.equipo,
        item.serie,
        item.ubicacion,
        item.responsable,
        item.detalle,
        item.evidenciaTitulo,
        item.evidenciaUrl,
      ]),
      [20, 18, 24, 22, 22, 22, 48, 24, 36],
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
      ['DESCARTE', item.fecha, `${item.inventario} - ${item.equipo}`, item.responsable, 'fuera de inventario', `${item.detalle} ${item.evidenciaTitulo || item.evidenciaUrl ? `| Evidencia: ${[item.evidenciaTitulo, item.evidenciaUrl].filter(Boolean).join(' - ')}` : ''}`.trim()]
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
