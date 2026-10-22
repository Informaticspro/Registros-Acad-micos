// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useBitacorasLaboratorio } from '../src/modulos/laboratorio/hooks/useBitacorasLaboratorio';
import { RegistroRapidoEquipo } from '../src/modulos/laboratorio/componentes/inventario/RegistroRapidoEquipo';
import { createBitacoraLaboratorio, updateBitacoraLaboratorio, updateEstadoEquipoLaboratorio } from '../src/servicios/laboratorio.servicio';
import type { EquipoLaboratorio, BitacoraLaboratorio } from '../src/tipos/dominio';

vi.mock('../src/servicios/laboratorio.servicio', () => ({
  createBitacoraLaboratorio: vi.fn(async () => ({})), updateBitacoraLaboratorio: vi.fn(),
  deleteBitacoraLaboratorio: vi.fn(), updateEstadoEquipoLaboratorio: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

test.each(['fisico'] as const)('quick %s work creates one completed record with automatic context without changing equipment state', async tipo => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-22T16:30:00Z'));
  const equipo = { id: 'pc-1', codigo: '51251', nombre: 'EST 01', ubicacion: 'Laboratorio 2', estado: 'en_reparacion' } as EquipoLaboratorio;
  const refresh = vi.fn(async () => {});
  const { result } = renderHook(() => useBitacorasLaboratorio({
    confirmar: vi.fn(), equipos: [equipo], estadoEquipoNombre: {}, refresh,
    saveContext: { organizationId: 'org', userId: 'tech' }, setError: vi.fn(), setMessage: vi.fn(), setIsSaving: vi.fn(),
  }));
  act(() => result.current.setEditingBitacora({ id: 'another-work' } as BitacoraLaboratorio));
  await act(async () => {
    await Promise.all([
      result.current.registrarTrabajoRapido(equipo, tipo, ' Se instaló VS Code. ', 'José'),
      result.current.registrarTrabajoRapido(equipo, tipo, ' Se instaló VS Code. ', 'José'),
    ]);
  });
  expect(createBitacoraLaboratorio).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    equipoId: 'pc-1', equipoDestino: '51251 - EST 01', ubicacion: 'Laboratorio 2', responsable: 'José',
    descripcion: 'Se instaló VS Code.', estado: 'cerrado', fecha: '2026-10-22T16:30:00.000Z',
    tipoTrabajo: 'Trabajo físico',
  }), { organizationId: 'org', userId: 'tech' });
  expect(updateBitacoraLaboratorio).not.toHaveBeenCalled();
  expect(updateEstadoEquipoLaboratorio).not.toHaveBeenCalled();
  expect(refresh).toHaveBeenCalledOnce();
});

test('the quick form needs only a description and preserves it if saving fails', async () => {
  const save = vi.fn(async () => false);
  render(<RegistroRapidoEquipo isSaving={false} onSave={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar trabajo físico' }));
  const description = screen.getByLabelText('¿Qué se hizo? *') as HTMLTextAreaElement;
  fireEvent.change(description, { target: { value: 'Se instaló VS Code.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('fisico', 'Se instaló VS Code.'));
  expect(description.value).toBe('Se instaló VS Code.');
});
