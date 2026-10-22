import { afterEach, expect, test, vi } from 'vitest';
const { remove } = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock('../src/infraestructura/supabase', () => ({ supabase: { storage: { from: () => ({ remove }) } } }));
import { eliminarImagenes } from '../src/modulos/laboratorio/galeria.servicio';
afterEach(() => vi.clearAllMocks());

test('delete uses only selected filenames in the organization folder and deduplicates', async () => {
  remove.mockResolvedValue({ data: [{ name: 'org/one.png' }], error: null });
  await eliminarImagenes('org', ['one.png', 'one.png']);
  expect(remove).toHaveBeenCalledWith(['org/one.png']);
  await expect(eliminarImagenes('org', ['../other/image.png'])).rejects.toThrow('válidas');
  expect(remove).toHaveBeenCalledOnce();
});

test('delete cannot report success when storage permissions silently remove nothing', async () => {
  remove.mockResolvedValue({ data: [], error: null });
  await expect(eliminarImagenes('org', ['one.png'])).rejects.toThrow('No se pudieron eliminar');
});
