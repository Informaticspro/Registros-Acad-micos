// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useReportesLaboratorio } from '../src/modulos/laboratorio/hooks/useReportesLaboratorio';
import { emptyState } from '../src/modulos/laboratorio/constantes/laboratorio.constantes';
const { load, excel, pdf } = vi.hoisted(() => ({ load: vi.fn(), excel: vi.fn(), pdf: vi.fn() }));
vi.mock('../src/servicios/laboratorio-exportaciones.servicio', () => {
  load();
  return { exportInventarioLaboratorioExcel: excel, exportEtiquetasInventarioLaboratorioPdf: pdf };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function setup() {
  const setError=vi.fn(), setMessage=vi.fn();
  const hook=renderHook(() => useReportesLaboratorio({
    reportEndDate: '', reportStartDate: '', selectedReportEquipoId: '', selectedReportLocation: 'Todas', selectedReportMonth: '2026-10',
    state: { ...emptyState, equipos: [{ id: 'pc' }] as typeof emptyState.equipos }, setError,setMessage,
  }));
  return { ...hook, setError,setMessage };
}

test('export dependencies are loaded only when a download is requested', async () => {
  const { result,setMessage }=setup();
  expect(load).not.toHaveBeenCalled();
  await act(async () => { await result.current.exportInventoryExcel(); });
  expect(load).toHaveBeenCalledOnce();
  expect(excel).toHaveBeenCalledOnce();
  expect(setMessage).toHaveBeenCalledWith('Informe de inventario descargado correctamente.');
});

test('a failed lazy export reports the failure without announcing a successful download', async () => {
  pdf.mockRejectedValueOnce(new Error('network'));
  const { result,setError,setMessage }=setup();
  await act(async () => { await result.current.exportInventoryLabels(); });
  expect(setError).toHaveBeenLastCalledWith('No se pudo generar el archivo. Intente nuevamente.');
  expect(setMessage).not.toHaveBeenCalled();
});
