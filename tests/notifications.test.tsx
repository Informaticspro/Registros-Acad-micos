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
test('read status synchronizes between mounted menus and keeps older read IDs', async () => {
  localStorage.setItem('acad-read-notifications-support', JSON.stringify(Array.from({ length: 90 }, (_, i) => `old-${i}`)));
  vi.mocked(listLaboratorioAlerts).mockResolvedValue({ bitacoras: [{ id: 'new', estado: 'cerrado', titulo: 'Nuevo', tipoTrabajo: '', ubicacion: '', createdAt: '2026-10-07' }], prestamos: [] });
  render(<MemoryRouter><MenuNotificaciones /><MenuNotificaciones /></MemoryRouter>);
  await waitFor(() => expect(document.querySelectorAll('.notification-badge')).toHaveLength(2));
  fireEvent.click(screen.getAllByRole('button', { name: 'Notificaciones' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }));
  await waitFor(() => expect(document.querySelectorAll('.notification-badge')).toHaveLength(0));
  expect(JSON.parse(localStorage.getItem('acad-read-notifications-support')!)).toHaveLength(91);
});

test('revoking support access immediately hides loaded laboratory alerts and stops querying them', async () => {
  vi.mocked(listLaboratorioAlerts).mockResolvedValue({ bitacoras: [{ id: 'secret', estado: 'pendiente', titulo: 'Equipo privado', tipoTrabajo: '', ubicacion: '', createdAt: '2026-10-07' }], prestamos: [] });
  const { rerender } = render(<MemoryRouter><MenuNotificaciones /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));
  await screen.findByText(/Equipo privado/);
  const calls = vi.mocked(listLaboratorioAlerts).mock.calls.length;
  profile.role = 'asistente';
  try {
    rerender(<MemoryRouter><MenuNotificaciones /></MemoryRouter>);
    expect(screen.queryByText(/Equipo privado/)).toBeNull();
    fireEvent(window, new Event('focus'));
    expect(listLaboratorioAlerts).toHaveBeenCalledTimes(calls);
  } finally { profile.role = 'soporte'; }
});
