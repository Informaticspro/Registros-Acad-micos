import { expect, test } from 'vitest';
import type { LaboratorioState } from '../src/servicios/laboratorio.servicio';
import { obtenerFilasInforme, type FiltrosInforme } from '../src/modulos/laboratorio/componentes/informes/informes.modelo';

const state = {
  equipos: [{ id: 'pc', nombre: 'PC 1', codigo: '123', ubicacion: 'Lab 1', estado: 'operativo', updatedAt: '2026-10-30' }],
  bitacoras: [
    { fecha: '2026-10-30T23:00:00Z', equipoId: 'pc', titulo: 'Reparacion', estado: 'resuelto', responsable: 'Jose', evidenciaUrl: 'foto' },
    { fecha: '2026-09-01', equipoId: 'pc', titulo: 'Anterior', estado: 'pendiente', responsable: 'Ana', evidenciaUrl: '' },
  ],
  prestamos: [{ fechaPrestamo: '2026-10-30', equipo: 'PC 1', entregadoA: 'Maria', responsableEntrega: 'Jose', estado: 'activo' }],
  descartes: [],
} as unknown as LaboratorioState;
const filtro: FiltrosInforme = {
  tipo: 'persona', desde: '2026-10-01', hasta: '2026-10-30', mes: '2026-10',
  ubicacion: 'Todas', equipoId: '', persona: 'Jose', rol: 'tecnico', trabajos: true, prestamos: true, evidencias: false,
};
test('persona y fechas incluyen todo el ultimo dia y excluyen otros responsables', () => {
  expect(obtenerFilasInforme(state, filtro).map(f => f.detalle)).toEqual(['Reparacion', 'Prestamo a Maria']);
});
test('beneficiario muestra sus prestamos y no los trabajos del tecnico', () => {
  expect(obtenerFilasInforme(state, { ...filtro, rol: 'beneficiario', persona: 'Maria' })).toHaveLength(1);
});
test('no se muestran trabajos de todos al dejar persona sin seleccionar', () => {
  expect(obtenerFilasInforme(state, { ...filtro, persona: '' })).toEqual([]);
});
test('ubicacion y equipo limitan resultados', () => {
  expect(obtenerFilasInforme(state, { ...filtro, tipo: 'ubicacion', ubicacion: 'Lab 2' })).toEqual([]);
  expect(obtenerFilasInforme(state, { ...filtro, tipo: 'historial', equipoId: '' })).toEqual([]);
});
