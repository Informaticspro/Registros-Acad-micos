// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { BuscadorLaboratorio } from '../src/modulos/laboratorio/componentes/busqueda/BuscadorLaboratorio';
import { buscarEnLaboratorio, crearIndiceLaboratorio } from '../src/modulos/laboratorio/componentes/busqueda/busqueda-laboratorio';
import type { LaboratorioState } from '../src/servicios/laboratorio.servicio';

const datos: LaboratorioState = {
  equipos: [{
    id: 'pc-1', codigo: '51251', nombre: 'Estación 01', categoria: 'Computadora', marcaModelo: 'HP ProDesk',
    serie: 'ABC987', ubicacion: 'Laboratorio 2', estado: 'operativo', observaciones: '', registradoPor: '', createdAt: '', updatedAt: '',
  }],
  bitacoras: [{
    id: 'trabajo-1', fecha: '2026-11-27', tipoTrabajo: 'Reparación', titulo: 'Instalación de cable',
    descripcion: 'Cable HDMI nuevo', responsable: 'José', prioridad: 'media', estado: 'cerrado', clase: 'mantenimiento',
    equipoId: 'pc-1', equipoOrigen: '', equipoDestino: '', ubicacion: 'Laboratorio 2', evidenciaTitulo: '', evidenciaUrl: '', createdAt: '',
  }],
  fichas: [], prestamos: [], descartes: [], secciones: [], categoriasEquipo: [], estadosEquipo: [], asignacionesComponentes: [],
};
const ubicaciones = ['Todas', 'Laboratorio 2'];
afterEach(cleanup);

test('matches inventory codes, serials and words across fields without accents', () => {
  const indice = crearIndiceLaboratorio(datos, ubicaciones);
  expect(buscarEnLaboratorio(indice, '51251')[0]?.id).toBe('pc-1');
  expect(buscarEnLaboratorio(indice, 'abc987')[0]?.id).toBe('pc-1');
  expect(buscarEnLaboratorio(indice, 'instalacion jose')[0]?.id).toBe('trabajo-1');
  expect(buscarEnLaboratorio(indice, 'hp laboratorio 2')[0]?.id).toBe('pc-1');
  expect(buscarEnLaboratorio(indice, 'laboratorio 2')[0]?.tipo).toBe('ubicacion');
  expect(buscarEnLaboratorio(indice, 'laboratorio 9')).toEqual([]);
});

test('shows a typed result and clears the search when a result is opened', () => {
  const onSeleccionar = vi.fn();
  render(<BuscadorLaboratorio datos={datos} ubicaciones={ubicaciones} onSeleccionar={onSeleccionar} />);
  const input = screen.getByRole('searchbox', { name: 'Buscar en soporte técnico' });
  fireEvent.change(input, { target: { value: '51251' } });
  fireEvent.click(screen.getByRole('button', { name: /Estación 01.*Inventario/ }));
  expect(onSeleccionar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'equipo', id: 'pc-1' }));
  expect(input).toHaveProperty('value', '');
  fireEvent.change(input, { target: { value: 'sin coincidencias' } });
  expect(screen.getByRole('status').textContent).toBe('No se encontraron coincidencias.');
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('status')).toBeNull();
});
