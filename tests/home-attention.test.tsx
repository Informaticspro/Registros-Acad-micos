// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InicioLaboratorio } from '../src/modulos/laboratorio/componentes/InicioLaboratorio';
import { esTrabajoAbierto } from '../src/modulos/laboratorio/utilidades/atencion';
import type { BitacoraLaboratorio, EquipoLaboratorio } from '../src/tipos/dominio';
afterEach(cleanup);
test('only pending and in-progress work is open', () => {
  expect(['pendiente', 'en_proceso', 'resuelto', 'cerrado'].map((estado) => esTrabajoAbierto({ estado } as BitacoraLaboratorio))).toEqual([true, true, false, false]);
});
test('home exposes review equipment and open work without entering registration', () => {
  Element.prototype.scrollIntoView = vi.fn();
  const onOpenEquipo = vi.fn();
  const onChangeTab = vi.fn();
  const base = { fecha: '2026-10-02T20:00:00Z', createdAt: '2026-10-02T20:00:00Z', prioridad: 'media', responsable: 'José', ubicacion: 'Laboratorio 1' };
  const trabajos = [{ ...base, id: '1', titulo: 'PC con error', estado: 'pendiente' }, { ...base, id: '2', titulo: 'Ya resuelto', estado: 'resuelto' }] as BitacoraLaboratorio[];
  const equipos = [{ id: 'pc', nombre: 'PC 15', codigo: '49072', estado: 'pendiente_revision', ubicacion: 'Laboratorio 1', updatedAt: base.fecha }] as EquipoLaboratorio[];
  render(<InicioLaboratorio equipos={equipos} trabajos={trabajos} estadoEquipoNombre={{}} onOpenEquipo={onOpenEquipo} onOpenTrabajo={vi.fn()} actividadReciente={[]} cantidadEquipos={1} cantidadFichas={0} indicadores={{ trabajosAbiertos: 1, equiposMantenimiento: 0, prestamosActivos: 0, descartesRegistrados: 0 }} showMoreActivity={false} onChangeTab={onChangeTab} onToggleActivityLimit={vi.fn()} />);
  expect(screen.getByText('Requieren atención: 1 equipos')).toBeTruthy();
  expect(screen.getByText('PC con error')).toBeTruthy();
  expect(screen.queryByText('Ya resuelto')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Trabajos abiertos 1/ }));
  expect(onChangeTab).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Pendiente de revision PC 15/ }));
  expect(onOpenEquipo).toHaveBeenCalledWith(equipos[0]);
});
