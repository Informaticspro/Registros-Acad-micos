// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { utils, writeFile } from 'xlsx-js-style';
import { exportInventarioLaboratorioExcel, exportLaboratorioCsv } from '../src/servicios/laboratorio-exportaciones.servicio';
import { emptyState } from '../src/modulos/laboratorio/constantes/laboratorio.constantes';
import type { EquipoLaboratorio } from '../src/tipos/dominio';
import { hasUsefulIdentifier, normalizeBarcodeValue } from '../src/utilidades/identificadores-inventario';

vi.mock('xlsx-js-style', async importOriginal => {
  const actual = await importOriginal<typeof import('xlsx-js-style') & { default: typeof import('xlsx-js-style') }>();
  return { utils: actual.utils ?? actual.default.utils, writeFile: vi.fn() };
});
afterEach(() => vi.clearAllMocks());
const equipo = { id: 'pc', codigo: '12345', nombre: 'PC 1', categoria: 'Computadora', marcaModelo: 'HP - ProDesk', serie: 'ABC123', ubicacion: 'Laboratorio 1', estado: 'operativo', observaciones: 'Texto con "comillas", y coma', createdAt: '2026-10-30', updatedAt: '2026-10-30' } as EquipoLaboratorio;

test('the extracted inventory exporter retains the institutional inventory and summary sheets', () => {
  exportInventarioLaboratorioExcel({ ...emptyState, equipos: [equipo] });
  expect(writeFile).toHaveBeenCalledOnce();
  const workbook = vi.mocked(writeFile).mock.calls[0][0];
  expect(workbook.SheetNames).toEqual(['Inventario', 'Resumen']);
  const cells = utils.sheet_to_json(workbook.Sheets.Inventario, { header: 1 }).flat();
  expect(cells).toContain('PC 1'); expect(cells).toContain('12345');
});

test('CSV escaping and the shared label identifiers retain their original behavior', () => {
  expect(exportLaboratorioCsv({ ...emptyState, equipos: [equipo] })).toContain('"Texto con ""comillas"", y coma"');
  expect(normalizeBarcodeValue('  ábc-123  ')).toBe('ABC-123');
  expect(hasUsefulIdentifier('S/N')).toBe(false);
  expect(hasUsefulIdentifier('12345')).toBe(true);
});
