import { expect, test, vi } from 'vitest';
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../src/infraestructura/supabase', () => ({ supabase: { from } }));
import { listLaboratorioAlerts } from '../src/servicios/notificaciones.servicio';

test('recent query includes closed work and merges pending work without duplicates', async () => {
  const closed = { id: 'closed', status: 'cerrado', title: 'HDMI', work_type: 'Instalacion', location: 'Salón', created_at: '2026-09-28' };
  const pending = { ...closed, id: 'pending', status: 'pendiente' };
  function query(data: unknown[]) {
    const chain = { select: vi.fn(), in: vi.fn(), order: vi.fn(), limit: vi.fn() };
    chain.select.mockReturnValue(chain); chain.in.mockReturnValue(chain); chain.order.mockReturnValue(chain);
    chain.limit.mockResolvedValue({ data, error: null });
    return chain;
  }
  const recentQuery = query([closed, pending]);
  from.mockReturnValueOnce(recentQuery).mockReturnValueOnce(query([pending])).mockReturnValueOnce(query([]));
  const result = await listLaboratorioAlerts();
  expect(recentQuery.in).not.toHaveBeenCalled();
  expect(recentQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
  expect(recentQuery.limit).toHaveBeenCalledWith(6);
  expect(result.bitacoras.map(item => item.id)).toEqual(['closed', 'pending']);
  expect(result.bitacoras[0].estado).toBe('cerrado');
});
