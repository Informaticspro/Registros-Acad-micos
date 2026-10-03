// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useActualizacionInicio } from '../src/modulos/laboratorio/hooks/useActualizacionInicio';
import { listLaboratorioData, type LaboratorioState } from '../src/servicios/laboratorio.servicio';
vi.mock('../src/servicios/laboratorio.servicio', () => ({ listLaboratorioData: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks(); });
const data = { equipos: [] } as unknown as LaboratorioState;
test('home polls, refreshes on focus, preserves data on error and stops outside home', async () => {
  vi.useFakeTimers();
  vi.mocked(listLaboratorioData).mockResolvedValue(data);
  const onData = vi.fn();
  const { result, rerender } = renderHook(({ enabled }) => useActualizacionInicio(enabled, onData), { initialProps: { enabled: true } });
  await act(async () => {});
  expect(onData).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(onData).toHaveBeenCalledTimes(2);
  vi.mocked(listLaboratorioData).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  expect(result.current).toBe(true);
  expect(onData).toHaveBeenCalledTimes(2);
  await act(async () => { window.dispatchEvent(new Event('online')); });
  expect(result.current).toBe(false);
  rerender({ enabled: false });
  const calls = onData.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); window.dispatchEvent(new Event('focus')); });
  expect(onData).toHaveBeenCalledTimes(calls);
});
test('ignores an in-flight response after leaving home and prevents overlapping requests', async () => {
  let resolve!: (value: LaboratorioState) => void;
  vi.mocked(listLaboratorioData).mockReturnValue(new Promise(r => { resolve = r; }));
  const onData = vi.fn();
  const { rerender } = renderHook(({ enabled }) => useActualizacionInicio(enabled, onData), { initialProps: { enabled: true } });
  window.dispatchEvent(new Event('focus'));
  expect(listLaboratorioData).toHaveBeenCalledTimes(1);
  rerender({ enabled: false });
  await act(async () => { resolve(data); });
  expect(onData).not.toHaveBeenCalled();
});
