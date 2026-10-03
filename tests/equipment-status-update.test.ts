import { expect, test, vi } from 'vitest';
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../src/infraestructura/supabase', () => ({ supabase: { from } }));
import { updateEstadoEquipoLaboratorio } from '../src/servicios/laboratorio.servicio';

test('status update preserves equipment fields changed by another user', async () => {
  const current = { id: 'pc', name: 'Nombre actualizado', location: 'Biblioteca', notes: 'Nota del compañero', code: 'NEW', serial_number: 'SERIE NUEVA', category: 'PC', brand_model: 'HP', status: 'pendiente_revision', created_at: '2026-10-02', updated_at: '2026-10-02' };
  let payload: Record<string, unknown> = {};
  const chain = {
    update: vi.fn((patch) => { payload = patch; return chain; }),
    eq: vi.fn(() => chain), select: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: { ...current, ...payload }, error: null })),
  };
  from.mockReturnValue(chain);
  const result = await updateEstadoEquipoLaboratorio('pc', 'en_reparacion');
  expect(Object.keys(payload).sort()).toEqual(['status', 'updated_at']);
  expect(chain.eq).toHaveBeenCalledWith('id', 'pc');
  expect(result).toMatchObject({ estado: 'en_reparacion', nombre: current.name, ubicacion: current.location, observaciones: current.notes, codigo: current.code, serie: current.serial_number });
});
