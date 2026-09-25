// @vitest-environment jsdom
import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { FormEvent } from 'react';
import type { FichaTecnicaLaboratorio } from '../src/tipos/dominio';
import { useFichasLaboratorio } from '../src/modulos/laboratorio/hooks/useFichasLaboratorio';
import { updateFichaTecnicaLaboratorio } from '../src/servicios/laboratorio.servicio';

vi.mock('../src/servicios/laboratorio.servicio', () => ({
  createFichaTecnicaLaboratorio: vi.fn(),
  updateFichaTecnicaLaboratorio: vi.fn(async (_id, input) => ({ ...input, id: 'legacy' })),
  deleteFichaTecnicaLaboratorio: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

test('editing technical details preserves legacy actions and inventory absent from the new form', async () => {
  const ficha = {
    id: 'legacy', acciones: [{ fecha: '01/01/2026', accion: 'Cambio HDMI', observacion: 'Probado', responsable: 'Técnico' }],
    inventario: [{ equipo: 'Monitor', numero: 'MON-100' }],
  } as FichaTecnicaLaboratorio;
  const { result } = renderHook(() => useFichasLaboratorio({
    confirmar: vi.fn(), equipos: [], refresh: vi.fn(), saveContext: { organizationId: 'org', userId: 'user' },
    setError: vi.fn(), setIsSaving: vi.fn(), setMessage: vi.fn(),
  }));
  act(() => result.current.setEditingFicha(ficha));
  const form = document.createElement('form');
  form.innerHTML = '<input name="fecha" value="2026-09-25T10:00"><input name="pc" value="PC 1"><input name="caracteristica-Memoria" value="16 GB">';
  await act(async () => result.current.handleFichaSubmit({ preventDefault() {}, currentTarget: form } as FormEvent<HTMLFormElement>));
  expect(updateFichaTecnicaLaboratorio).toHaveBeenCalledWith('legacy', expect.objectContaining({
    acciones: ficha.acciones, inventario: ficha.inventario,
    caracteristicas: expect.arrayContaining([{ nombre: 'Memoria', valor: '16 GB' }]),
  }));
});
