import { useMemo, useRef, useState } from 'react';

import type { LaboratorioState } from '@/servicios/laboratorio.servicio';
import type {
  AsignacionComponenteLaboratorio,
  BitacoraLaboratorio,
  EquipoLaboratorio,
  FichaTecnicaLaboratorio,
} from '@/tipos/dominio';
import { filtroComponentesAsignados } from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import {
  appendUniqueInventoryValue,
  containsExactLooseText,
  getInventoryStatusPriorityValue,
  getTechnicalIdentifiers,
  isAssignedComponentsInventoryFilter,
  matchesInventoryLocationFilter,
  matchesInventorySearch,
  normalizeExcelKey,
  normalizeLooseText,
  sortEquiposInventario,
  splitMarcaModelo,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

export function useInventarioLaboratorio(state: LaboratorioState) {
  const [selectedEquipoDetalle, setSelectedEquipoDetalle] = useState<EquipoLaboratorio | null>(null);
  const [equipoDetalleHistory, setEquipoDetalleHistory] = useState<EquipoLaboratorio[]>([]);
  const [selectedInventoryLocation, setSelectedInventoryLocation] = useState('Todas');
  const [inventorySearch, setInventorySearch] = useState('');
  const [componentMoveTargets, setComponentMoveTargets] = useState<Record<string, string>>({});
  const inventoryResultsRef = useRef<HTMLDivElement | null>(null);

  const componentesAsignadosActivosIds = useMemo(
    () => new Set(state.asignacionesComponentes.filter((item) => !item.fechaRetiro).map((item) => item.componenteId)),
    [state.asignacionesComponentes],
  );

  const equiposInventarioPrincipales = useMemo(
    () => state.equipos.filter((item) => !componentesAsignadosActivosIds.has(item.id)),
    [componentesAsignadosActivosIds, state.equipos],
  );

  const equiposComponentesAsignados = useMemo(
    () => state.equipos.filter((item) => componentesAsignadosActivosIds.has(item.id)),
    [componentesAsignadosActivosIds, state.equipos],
  );

  const equiposInventarioVisibles = equiposInventarioPrincipales;

  const ubicacionesInventario = useMemo(() => {
    const catalogLocations = state.secciones
      .map((item) => item.nombre.trim())
      .filter((value): value is string => Boolean(value));
    const importedLocations = equiposInventarioPrincipales
      .map((item) => item.ubicacion?.trim())
      .filter((value): value is string => Boolean(value));
    return ['Todas', ...Array.from(new Set([...catalogLocations, ...importedLocations])), filtroComponentesAsignados];
  }, [equiposInventarioPrincipales, state.secciones]);

  const estadosAlertaPorUbicacion = useMemo(() => {
    return ubicacionesInventario.reduce<Record<string, string[]>>((acc, ubicacion) => {
      const items =
        ubicacion === 'Todas'
          ? equiposInventarioPrincipales
          : isAssignedComponentsInventoryFilter(ubicacion)
            ? equiposComponentesAsignados
            : equiposInventarioPrincipales.filter((equipo) => matchesInventoryLocationFilter(equipo, ubicacion));
      const estados = Array.from(
        new Set(items.map((equipo) => equipo.estado).filter((estado) => estado && estado !== 'operativo')),
      ).sort((first, second) => getInventoryStatusPriorityValue(first) - getInventoryStatusPriorityValue(second));

      acc[ubicacion] = estados;
      return acc;
    }, {});
  }, [equiposComponentesAsignados, equiposInventarioPrincipales, ubicacionesInventario]);

  const equiposInventarioFiltrados = useMemo(() => {
    const filteredByLocation =
      selectedInventoryLocation === 'Todas'
        ? equiposInventarioPrincipales
        : isAssignedComponentsInventoryFilter(selectedInventoryLocation)
          ? equiposComponentesAsignados
          : equiposInventarioPrincipales.filter((item) => matchesInventoryLocationFilter(item, selectedInventoryLocation));
    const query = normalizeExcelKey(inventorySearch);
    const filtered = filteredByLocation.filter((item) => {
      if (matchesInventorySearch(item, inventorySearch)) return true;
      if (!query) return true;
      const calculado = getInventarioCalculadoEquipo(item);
      return normalizeExcelKey([calculado.marca, calculado.modelo, calculado.codigo, calculado.serie].join(' ')).includes(query);
    });
    return sortEquiposInventario(filtered, selectedInventoryLocation === 'Todas');
  }, [equiposComponentesAsignados, equiposInventarioPrincipales, inventorySearch, selectedInventoryLocation]);

  function matchesEquipoPorIdentificador(equipo: EquipoLaboratorio, value: string) {
    const equipoIdentifiers = getTechnicalIdentifiers(`${equipo.codigo} ${equipo.serie}`);
    if (equipoIdentifiers.length === 0) return false;
    const valueIdentifiers = new Set(getTechnicalIdentifiers(value));
    return equipoIdentifiers.some((identifier) => valueIdentifiers.has(identifier));
  }

  function matchesEquipoPorNombre(equipo: EquipoLaboratorio, value: string) {
    return containsExactLooseText(value, equipo.nombre);
  }

  function getFichasEquipo(equipo: EquipoLaboratorio) {
    return state.fichas
      .filter(
        (item) =>
          normalizeLooseText(item.pc) === normalizeLooseText(equipo.nombre) ||
          matchesEquipoPorIdentificador(equipo, item.inventario.map((field) => field.numero).join(' ')),
      )
      .sort((first, second) => second.fecha.localeCompare(first.fecha));
  }

  function getBitacorasEquipo(equipo: EquipoLaboratorio) {
    return state.bitacoras
      .filter(
        (item) =>
          item.equipoId === equipo.id ||
          matchesEquipoPorIdentificador(equipo, `${item.equipoOrigen} ${item.equipoDestino} ${item.titulo}`) ||
          matchesEquipoPorNombre(equipo, `${item.equipoDestino} ${item.titulo}`),
      )
      .sort((first, second) => second.fecha.localeCompare(first.fecha));
  }

  function getAsignacionesActivasEquipo(equipo: EquipoLaboratorio) {
    return state.asignacionesComponentes.filter((item) => item.equipoPadreId === equipo.id && !item.fechaRetiro);
  }

  function getAsignacionActivaComoComponente(equipo: EquipoLaboratorio) {
    return state.asignacionesComponentes.find((item) => item.componenteId === equipo.id && !item.fechaRetiro) ?? null;
  }

  function getEquipoById(id: string) {
    return state.equipos.find((item) => item.id === id) ?? null;
  }

  function getComponentesDisponibles(equipoPadre: EquipoLaboratorio) {
    const assignedComponentIds = new Set(
      state.asignacionesComponentes.filter((item) => !item.fechaRetiro).map((item) => item.componenteId),
    );
    return state.equipos
      .filter((item) => item.id !== equipoPadre.id && !assignedComponentIds.has(item.id))
      .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es', { numeric: true }));
  }

  function getEquiposDestinoComponente(equipoActual: EquipoLaboratorio, componenteId: string) {
    return equiposInventarioVisibles
      .filter((item) => item.id !== equipoActual.id && item.id !== componenteId)
      .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es', { numeric: true }));
  }

  function getInventarioCalculadoEquipo(equipo: EquipoLaboratorio) {
    const componentes = getAsignacionesActivasEquipo(equipo)
      .map((asignacion) => {
        const componente = getEquipoById(asignacion.componenteId);
        return componente ? { asignacion, componente } : null;
      })
      .filter((item): item is { asignacion: AsignacionComponenteLaboratorio; componente: EquipoLaboratorio } =>
        Boolean(item),
      );
    const componentesEquipo = componentes.map((item) => item.componente);
    const baseMarcaModelo = splitMarcaModelo(equipo.marcaModelo);
    const componentesMarcaModelo = componentesEquipo.map((item) => splitMarcaModelo(item.marcaModelo));

    return {
      componentes,
      marca: appendUniqueInventoryValue(
        baseMarcaModelo.marca,
        componentesMarcaModelo.map((item) => item.marca),
      ),
      modelo: appendUniqueInventoryValue(
        baseMarcaModelo.modelo,
        componentesMarcaModelo.map((item) => item.modelo),
      ),
      codigo: appendUniqueInventoryValue(
        equipo.codigo || 'S/N',
        componentesEquipo.map((item) => item.codigo || 'S/N'),
      ),
      serie: appendUniqueInventoryValue(
        equipo.serie || 'S/N',
        componentesEquipo.map((item) => item.serie || 'S/N'),
      ),
    };
  }

  function getUltimoMantenimientoEquipo(fichas: FichaTecnicaLaboratorio[], bitacoras: BitacoraLaboratorio[]) {
    const fechas = [
      ...fichas.map((item) => item.fecha),
      ...bitacoras
        .filter((item) => item.clase === 'mantenimiento' || item.tipoTrabajo.toLowerCase().includes('mantenimiento'))
        .map((item) => item.fecha),
    ].filter(Boolean);
    return fechas.sort((first, second) => second.localeCompare(first))[0] ?? null;
  }

  function openEquipoDetalle(equipo: EquipoLaboratorio, keepCurrentInHistory = false) {
    if (keepCurrentInHistory && selectedEquipoDetalle) {
      setEquipoDetalleHistory((current) => [...current, selectedEquipoDetalle]);
    } else {
      setEquipoDetalleHistory([]);
    }
    setSelectedEquipoDetalle(equipo);
  }

  function closeEquipoDetalle() {
    setSelectedEquipoDetalle(null);
    setEquipoDetalleHistory([]);
  }

  function backEquipoDetalle() {
    const previous = equipoDetalleHistory[equipoDetalleHistory.length - 1];
    if (!previous) return;
    setSelectedEquipoDetalle(previous);
    setEquipoDetalleHistory((current) => current.slice(0, -1));
  }

  function handleInventoryLocationFilter(ubicacion: string) {
    setSelectedInventoryLocation(ubicacion);
    window.requestAnimationFrame(() => {
      inventoryResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function getInventoryFilterCount(ubicacion: string) {
    if (ubicacion === 'Todas') return equiposInventarioPrincipales.length;
    if (isAssignedComponentsInventoryFilter(ubicacion)) return equiposComponentesAsignados.length;
    return equiposInventarioPrincipales.filter((item) => matchesInventoryLocationFilter(item, ubicacion)).length;
  }

  return {
    componentMoveTargets,
    componentesAsignadosActivosIds,
    equipoDetalleHistory,
    equiposComponentesAsignados,
    equiposInventarioFiltrados,
    equiposInventarioPrincipales,
    equiposInventarioVisibles,
    estadosAlertaPorUbicacion,
    inventoryResultsRef,
    inventorySearch,
    selectedEquipoDetalle,
    selectedInventoryLocation,
    ubicacionesInventario,
    backEquipoDetalle,
    closeEquipoDetalle,
    getAsignacionActivaComoComponente,
    getAsignacionesActivasEquipo,
    getBitacorasEquipo,
    getComponentesDisponibles,
    getEquipoById,
    getEquiposDestinoComponente,
    getFichasEquipo,
    getInventoryFilterCount,
    getInventarioCalculadoEquipo,
    getUltimoMantenimientoEquipo,
    handleInventoryLocationFilter,
    openEquipoDetalle,
    setComponentMoveTargets,
    setInventorySearch,
  };
}
