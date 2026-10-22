// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { GaleriaImagenes } from '../src/modulos/laboratorio/componentes/GaleriaImagenes';
import { eliminarImagenes, listarImagenes } from '../src/modulos/laboratorio/galeria.servicio';

vi.mock('../src/modulos/laboratorio/galeria.servicio', () => ({
  GALERIA_PAGE_SIZE: 24, listarImagenes: vi.fn(), subirImagen: vi.fn(), eliminarImagenes: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const images = [
  { name: 'id--uno.png', title: 'uno.png', url: '/uno.png', createdAt: '2026-10-21T10:00:00Z' },
  { name: 'id--dos.png', title: 'dos.png', url: '/dos.png', createdAt: '2026-10-21T10:00:00Z' },
];

test('only deletes selected images after confirmation, and cancellation keeps them', async () => {
  vi.mocked(listarImagenes).mockResolvedValue(images);
  vi.mocked(eliminarImagenes).mockResolvedValue(undefined);
  render(<GaleriaImagenes organizationId="org" onBack={vi.fn()} />);
  fireEvent.click(await screen.findByLabelText('Seleccionar uno.png'));
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar seleccionadas' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(eliminarImagenes).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar seleccionadas' }));
  vi.mocked(listarImagenes).mockResolvedValue([images[1]]);
  fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
  await waitFor(() => expect(eliminarImagenes).toHaveBeenCalledWith('org', ['id--uno.png']));
  await waitFor(() => expect(screen.queryByLabelText('Seleccionar uno.png')).toBeNull());
  expect(screen.getByLabelText('Seleccionar dos.png')).toBeTruthy();
});
