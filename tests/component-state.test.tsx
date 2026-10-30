// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { FormEvent } from 'react';
import type { EquipoLaboratorio } from '../src/tipos/dominio';
import { buildComponenteInput } from '../src/modulos/laboratorio/utilidades/formularios-laboratorio.utilidades';
import { useComponentesLaboratorio } from '../src/modulos/laboratorio/hooks/useComponentesLaboratorio';
import { createEquipoLaboratorio } from '../src/servicios/laboratorio.servicio';

vi.mock('../src/servicios/laboratorio.servicio', () => ({
  createEquipoLaboratorio: vi.fn(async () => ({ id: 'new', codigo: 'NEW', nombre: 'Cable' })),
  createAsignacionComponenteLaboratorio: vi.fn(), createBitacoraLaboratorio: vi.fn(),
  retirarAsignacionComponenteLaboratorio: vi.fn(),
}));
const parent = { id: 'parent', codigo: 'PC', nombre: 'PC', categoria: 'Computadora', marcaModelo: '', serie: '', ubicacion: '3A', estado: 'en_reparacion', observaciones: '' };

test.each(['', 'pendiente_revision'])('initial component has independent state: %s', state => {
  const data = new FormData();
  data.set('component-a-codigo', 'NEW');
  data.set('component-a-estado', state);
  expect(buildComponenteInput(data, parent, 'a', 'otro').equipo.estado).toBe(state || 'operativo');
});

test.each(['', 'en_reparacion'])('component created from dossier has independent state: %s', async state => {
  vi.mocked(createEquipoLaboratorio).mockClear();
  const form = document.createElement('form');
  for (const [name, value] of Object.entries({ nuevoComponenteCodigo: 'NEW', nuevoComponenteEstado: state })) {
    const input = document.createElement('input'); input.name = name; input.value = value; form.append(input);
  }
  const { result, unmount } = renderHook(() => useComponentesLaboratorio({
    equipos: [], getEquipoById: () => null, refresh: vi.fn(async () => {}), responsableSesion: 'José',
    saveContext: { organizationId: 'org', userId: 'user' }, setComponentMoveTargets: vi.fn(),
    setError: vi.fn(), setIsSaving: vi.fn(), setMessage: vi.fn(),
  }));
  await act(async () => result.current.handleCrearYAsignarComponente({ preventDefault() {}, currentTarget: form } as FormEvent<HTMLFormElement>, parent as EquipoLaboratorio));
  expect(createEquipoLaboratorio).toHaveBeenCalledWith(expect.objectContaining({ estado: state || 'operativo', ubicacion: '3A' }), expect.anything());
  unmount();
});
