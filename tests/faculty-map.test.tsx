// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MapaFacultad } from '../src/modulos/laboratorio/componentes/mapa/MapaFacultad';
import type { BitacoraLaboratorio } from '../src/tipos/dominio';
afterEach(cleanup);
test('recent work panel starts closed, includes completed work and filters by location', () => {
  const base = { descripcion: 'Cable instalado y probado', responsable: 'Alex', estado: 'cerrado', createdAt: '2026-09-28T18:00:00Z' };
  const trabajos = [
    { ...base, id: 'old', titulo: 'Revisión biblioteca', ubicacion: 'Biblioteca', fecha: '2026-09-27T18:00:00Z' },
    { ...base, id: 'hdmi', titulo: 'Cambio de cable HDMI', ubicacion: 'Laboratorio 1', fecha: '2026-09-28T18:00:00Z' },
  ] as BitacoraLaboratorio[];
  const onSelectLocation = vi.fn();
  render(<MapaFacultad trabajos={trabajos} onOpenWorks={vi.fn()} estadoEquipoNombre={{}} estadosAlertaPorUbicacion={{}} getFilterCount={() => 0} onSelectLocation={onSelectLocation} />);
  expect(screen.queryByRole('complementary', { name: 'Trabajos recientes' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Trabajos recientes' }));
  expect(screen.getAllByRole('heading', { level: 4 })[0].textContent).toBe('Cambio de cable HDMI');
  fireEvent.change(screen.getByLabelText('Filtrar trabajos por área'), { target: { value: 'Laboratorio 1' } });
  expect(screen.queryByText('Revisión biblioteca')).toBeNull();
  expect(screen.getByText('Cambio de cable HDMI')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Laboratorio 1 · Ver equipos/ }));
  expect(onSelectLocation).toHaveBeenCalledWith('Laboratorio 1');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  expect(screen.queryByText('Cambio de cable HDMI')).toBeNull();
});
test('selecting a room shows only its work and leaves inventory navigation explicit', () => {
  const onSelectLocation = vi.fn();
  const trabajos = [
    { id: 'h', titulo: 'HDMI del salón H', ubicacion: 'Salón 3H', fecha: '2026-09-28T18:00:00Z', createdAt: '2026-09-28T18:00:00Z', estado: 'cerrado' },
    { id: 'a', titulo: 'Trabajo del salón A', ubicacion: '3A', fecha: '2026-09-28T18:00:00Z', createdAt: '2026-09-28T18:00:00Z', estado: 'cerrado' },
  ] as BitacoraLaboratorio[];
  render(<MapaFacultad trabajos={trabajos} onOpenWorks={vi.fn()} estadoEquipoNombre={{}} estadosAlertaPorUbicacion={{}} getFilterCount={() => 1} onSelectLocation={onSelectLocation} />);
  fireEvent.click(screen.getByRole('button', { name: 'Salón 3H 1 equipo' }));
  expect(screen.getByText('HDMI del salón H')).toBeTruthy();
  expect(screen.queryByText('Trabajo del salón A')).toBeNull();
  expect(onSelectLocation).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Ver equipos de Salón 3H' }));
  expect(onSelectLocation).toHaveBeenCalledWith('3H');
  fireEvent.click(screen.getByRole('button', { name: 'Salón 3B 1 equipo' }));
  expect(screen.getByText('No hay trabajos registrados en esta área.')).toBeTruthy();
  expect(screen.queryByText('HDMI del salón H')).toBeNull();
});
