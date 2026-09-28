// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MenuNotificaciones } from '../src/componentes/estructura/MenuNotificaciones';
import { listLaboratorioAlerts } from '../src/servicios/notificaciones.servicio';

const profile = { id: 'support', role: 'soporte' };
vi.mock('../src/modulos/autenticacion/hooks/useAutenticacion', () => ({ useAutenticacion: () => ({ profile }) }));
vi.mock('../src/servicios/eventos.servicio', () => ({ listEvents: vi.fn() }));
vi.mock('../src/servicios/notificaciones.servicio', () => ({ listLaboratorioAlerts: vi.fn() }));
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });

test('closed work is notified, opening does not mark it read, and a later update becomes unread', async () => {
  const work = { id: 'hdmi', estado: 'cerrado', titulo: 'Reemplazo HDMI', tipoTrabajo: 'Instalacion', ubicacion: 'Salón 3', createdAt: '2026-09-28T18:00:00Z' };
  vi.mocked(listLaboratorioAlerts).mockResolvedValue({ bitacoras: [work], prestamos: [] });
  render(<MemoryRouter><MenuNotificaciones /></MemoryRouter>);
  await waitFor(() => expect(listLaboratorioAlerts).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));
  const notification = await screen.findByRole('button', { name: /Trabajo finalizado Reemplazo HDMI/ });
  expect(screen.getByText('1 avisos nuevos')).toBeTruthy();
  expect(localStorage.getItem('acad-read-notifications-support')).toBeNull();
  fireEvent.click(notification);
  expect(JSON.parse(localStorage.getItem('acad-read-notifications-support')!)).toHaveLength(1);
  vi.mocked(listLaboratorioAlerts).mockResolvedValue({ bitacoras: [{ ...work, estado: 'resuelto' }], prestamos: [] });
  fireEvent(window, new Event('laboratorio-actualizado'));
  fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));
  await waitFor(() => expect(screen.getByText('1 avisos nuevos')).toBeTruthy());
});
