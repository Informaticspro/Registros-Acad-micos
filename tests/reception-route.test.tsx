// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RutaProtegida } from '../src/rutas/RutaProtegida';

vi.mock('../src/modulos/autenticacion/hooks/useAutenticacion', () => ({
  useAutenticacion: () => ({ isAuthenticated: true, isLoading: false, profile: { role: 'recepcion' } }),
}));
afterEach(cleanup);
test('reception visiting an internal URL is redirected before the internal layout renders', async () => {
  render(<MemoryRouter initialEntries={['/usuarios']}><Routes>
    <Route path="/usuarios" element={<RutaProtegida><div>Datos de usuarios</div></RutaProtegida>} />
    <Route path="/recepcion-prestamos" element={<RutaProtegida><div>Formulario de recepción</div></RutaProtegida>} />
  </Routes></MemoryRouter>);
  expect(await screen.findByText('Formulario de recepción')).toBeTruthy();
  expect(screen.queryByText('Datos de usuarios')).toBeNull();
});
