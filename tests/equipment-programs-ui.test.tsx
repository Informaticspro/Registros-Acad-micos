// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ProgramasEquipo } from '../src/modulos/laboratorio/componentes/inventario/ProgramasEquipo';
import { buildFichaTecnicaInput } from '../src/modulos/laboratorio/utilidades/formularios-laboratorio.utilidades';
afterEach(cleanup);

test('install accepts an arbitrary program and retries an unsuccessful save with the same operation id', async () => {
  const save = vi.fn(async () => false);
  render(<ProgramasEquipo programas={[]} isSaving={false} onSave={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar instalación' }));
  fireEvent.change(screen.getByLabelText('Programa *'), { target: { value: 'Visual Studio Code' } });
  fireEvent.change(screen.getByLabelText('Versión (opcional)'), { target: { value: '1.105' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[0][0]).toEqual(expect.objectContaining({ accion: 'instalar', nombre: 'Visual Studio Code', version: '1.105' }));
  expect(save.mock.calls[0][0].requestId).toBe(save.mock.calls[1][0].requestId);
});

test('removing software records a withdrawal and retains a confirmation step', async () => {
  const save = vi.fn(async () => true);
  render(<ProgramasEquipo programas={[{ nombre: 'Visual Studio Code', instalada: true, observacion: '1.105' }]} isSaving={false} onSave={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar retiro' }));
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ accion: 'retirar', nombre: 'Visual Studio Code' })));
});

test('the technical form preserves programs beyond its original predefined list', () => {
  const form = document.createElement('form');
  form.innerHTML='<input name="fecha" value="2026-10-22T10:00"><input name="appNombre" value="Visual Studio Code"><input name="app-Visual Studio Code" type="checkbox" checked><input name="appObs-Visual Studio Code" value="1.105">';
  expect(buildFichaTecnicaInput(form).aplicaciones).toContainEqual({ nombre: 'Visual Studio Code', instalada: true, observacion: '1.105' });
});
