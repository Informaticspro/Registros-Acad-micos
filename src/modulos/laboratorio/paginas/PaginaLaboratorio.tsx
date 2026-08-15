import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  HardDrive,
  History,
  PackageCheck,
  Pencil,
  Save,
  Settings2,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BitacoraLaboratorioInput,
  EquipoLaboratorioInput,
  FichaTecnicaLaboratorioInput,
  LaboratorioState,
  PrestamoLaboratorioInput,
  buildLaboratorioReport,
  buildInformeMantenimientoPorRango,
  createAsignacionComponenteLaboratorio,
  createBitacoraLaboratorio,
  createCatalogoLaboratorio,
  createDescarteLaboratorio,
  createEquipoLaboratorio,
  createFichaTecnicaLaboratorio,
  createPrestamoLaboratorio,
  createSeccionLaboratorio,
  deleteBitacoraLaboratorio,
  deleteCatalogoLaboratorio,
  deleteDescarteLaboratorio,
  deleteEquipoLaboratorio,
  deleteFichaTecnicaLaboratorio,
  deletePrestamoLaboratorio,
  deleteSeccionLaboratorio,
  exportHistorialEquipoLaboratorioExcel,
  exportDescartesLaboratorioExcel,
  exportInformeMensualMantenimientoExcel,
  exportInformeMantenimientoPorRangoExcel,
  exportInformePendientesLaboratorioExcel,
  exportInformeUbicacionLaboratorioExcel,
  exportInventarioLaboratorioExcel,
  exportLaboratorioCsv,
  importEquiposLaboratorio,
  listLaboratorioData,
  retirarAsignacionComponenteLaboratorio,
  updateBitacoraLaboratorio,
  updateCatalogoLaboratorio,
  updateEquipoLaboratorio,
  updateFichaTecnicaLaboratorio,
  updatePrestamoLaboratorio,
  updateSeccionLaboratorio,
} from '@/servicios/laboratorio.servicio';
import {
  AsignacionComponenteLaboratorio,
  BitacoraLaboratorio,
  CatalogoLaboratorio,
  DescarteLaboratorio,
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
  EstadoTrabajoLaboratorio,
  ClaseRegistroLaboratorio,
  FichaTecnicaLaboratorio,
  PrestamoLaboratorio,
  PrioridadLaboratorio,
  SeccionLaboratorio,
} from '@/tipos/dominio';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { supabase } from '@/infraestructura/supabase';
import { formatDateTime } from '@/utilidades/formato';
import { EncabezadoLaboratorio } from '@/modulos/laboratorio/componentes/EncabezadoLaboratorio';
import { InicioLaboratorio } from '@/modulos/laboratorio/componentes/InicioLaboratorio';
import { PestanasLaboratorio } from '@/modulos/laboratorio/componentes/PestanasLaboratorio';
import { VistaBitacoras } from '@/modulos/laboratorio/componentes/bitacoras/VistaBitacoras';
import { VistaDescartes } from '@/modulos/laboratorio/componentes/descartes/VistaDescartes';
import { VistaFichasTecnicas } from '@/modulos/laboratorio/componentes/fichas/VistaFichasTecnicas';
import { FormularioEquipoModal } from '@/modulos/laboratorio/componentes/inventario/FormularioEquipoModal';
import { VistaInventario } from '@/modulos/laboratorio/componentes/inventario/VistaInventario';
import { PrestamosLaboratorio } from '@/modulos/laboratorio/componentes/prestamos/VistaPrestamos';
import {
  emptyState,
  estadoEquipoLabels,
  estadoTrabajoLabels,
  filtroComponentesAsignados,
} from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import {
  appendUniqueInventoryValue,
  buildBitacoraInput,
  buildComponentesInicialesInput,
  buildDescarteInput,
  buildDuplicateEquipoMessage,
  buildEquipoInput,
  buildFichaTecnicaInput,
  buildPrestamoInput,
  buildSeccionInput,
  containsExactLooseText,
  downloadTextFile,
  filterUniqueEquipoInputsForImport,
  findDuplicateEquipoIdentity,
  getCategoriaComponenteDesdeTipo,
  getEstadoChangeWorkStatus,
  getEstadoChangeWorkType,
  getEstadoEquipoClass,
  getEstadoEquipoLabel,
  getInitialTheme,
  getInventoryStatusPriorityValue,
  getTechnicalIdentifiers,
  isAssignedComponentsInventoryFilter,
  isRepairInventoryFilter,
  isUuid,
  matchesInventoryLocationFilter,
  matchesInventorySearch,
  normalizeExcelKey,
  normalizeLooseText,
  normalizeUniqueEquipoValue,
  parseDescartesExcelRows,
  parseEquipoExcelRow,
  readString,
  resolveInventoryStatusFromBitacora,
  shouldImportEquipoRow,
  shouldRequestIssueDetailForEstado,
  sortEquiposInventario,
  splitMarcaModelo,
  type ComponenteNuevoDraft,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';
import {
  type CatalogManagerType,
  type ConfirmacionOperativoPendiente,
  type LabTab,
  type TemaVisual,
} from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';

export function PaginaLaboratorio() {
  const navigate = useNavigate();
  const { profile } = useAutenticacion();
  const [activeTab, setActiveTab] = useState<LabTab>('inicio');
  const [state, setState] = useState<LaboratorioState>(emptyState);
  const [editingFicha, setEditingFicha] = useState<FichaTecnicaLaboratorio | null>(null);
  const [editingBitacora, setEditingBitacora] = useState<BitacoraLaboratorio | null>(null);
  const [editingEquipo, setEditingEquipo] = useState<EquipoLaboratorio | null>(null);
  const [editingSeccion, setEditingSeccion] = useState<SeccionLaboratorio | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<CatalogoLaboratorio | null>(null);
  const [editingEstadoEquipo, setEditingEstadoEquipo] = useState<CatalogoLaboratorio | null>(null);
  const [editingPrestamo, setEditingPrestamo] = useState<PrestamoLaboratorio | null>(null);
  const [selectedFicha, setSelectedFicha] = useState<FichaTecnicaLaboratorio | null>(null);
  const [selectedEquipoDetalle, setSelectedEquipoDetalle] = useState<EquipoLaboratorio | null>(null);
  const [equipoDetalleHistory, setEquipoDetalleHistory] = useState<EquipoLaboratorio[]>([]);
  const [showEquipoFormModal, setShowEquipoFormModal] = useState(false);
  const [activeCatalogManager, setActiveCatalogManager] = useState<CatalogManagerType | null>(null);
  const [selectedEquipoFichaId, setSelectedEquipoFichaId] = useState('');
  const [selectedDescarteEquipoId, setSelectedDescarteEquipoId] = useState('');
  const [selectedInventoryLocation, setSelectedInventoryLocation] = useState('Todas');
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedReportMonth, setSelectedReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportStartDate, setReportStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedReportLocation, setSelectedReportLocation] = useState('Todas');
  const [selectedReportEquipoId, setSelectedReportEquipoId] = useState('');
  const [componentMoveTargets, setComponentMoveTargets] = useState<Record<string, string>>({});
  const [componentesNuevoEquipo, setComponentesNuevoEquipo] = useState<ComponenteNuevoDraft[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileNamesById, setProfileNamesById] = useState<Record<string, string>>({});
  const [showMoreActivity, setShowMoreActivity] = useState(false);
  const [theme, setTheme] = useState<TemaVisual>(getInitialTheme);
  const [confirmacionOperativo, setConfirmacionOperativo] = useState<ConfirmacionOperativoPendiente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const inventoryResultsRef = useRef<HTMLDivElement | null>(null);

  const saveContext = useMemo(
    () => ({
      organizationId: profile?.organizationId ?? null,
      userId: profile?.id ?? '',
    }),
    [profile?.id, profile?.organizationId],
  );
  const responsableSesion = profile?.fullName || profile?.email || 'Soporte tecnico';
  const isLightTheme = theme === 'light';

  const selectedEquipoFicha = useMemo(
    () => state.equipos.find((item) => item.id === selectedEquipoFichaId) ?? null,
    [selectedEquipoFichaId, state.equipos],
  );

  const selectedDescarteEquipo = useMemo(
    () => state.equipos.find((item) => item.id === selectedDescarteEquipoId) ?? null,
    [selectedDescarteEquipoId, state.equipos],
  );

  function createComponenteNuevoDraft(tipo: AsignacionComponenteLaboratorio['tipo'] = 'monitor'): ComponenteNuevoDraft {
    return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tipo };
  }

  function openNuevoEquipoModal() {
    setEditingEquipo(null);
    setComponentesNuevoEquipo([]);
    setShowEquipoFormModal(true);
  }

  function openEditarEquipoModal(equipo: EquipoLaboratorio) {
    setEditingEquipo(equipo);
    setComponentesNuevoEquipo([]);
    setShowEquipoFormModal(true);
  }

  function closeEquipoFormModal() {
    setShowEquipoFormModal(false);
    setEditingEquipo(null);
    setComponentesNuevoEquipo([]);
  }

  function addComponenteNuevo(tipo: AsignacionComponenteLaboratorio['tipo'] = 'monitor') {
    setComponentesNuevoEquipo((current) => [...current, createComponenteNuevoDraft(tipo)]);
  }

  function removeComponenteNuevo(id: string) {
    setComponentesNuevoEquipo((current) => current.filter((item) => item.id !== id));
  }

  function updateComponenteNuevoTipo(id: string, tipo: AsignacionComponenteLaboratorio['tipo']) {
    setComponentesNuevoEquipo((current) => current.map((item) => (item.id === id ? { ...item, tipo } : item)));
  }

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

  const categoriasEquipo = useMemo(() => {
    const catalogItems = state.categoriasEquipo
      .map((item) => item.nombre.trim())
      .filter((value): value is string => Boolean(value));
    const importedItems = state.equipos
      .map((item) => item.categoria?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...catalogItems, ...importedItems]));
  }, [state.categoriasEquipo, state.equipos]);

  const estadosEquipo = useMemo(() => {
    const defaultItems = ['operativo', 'mantenimiento', 'en_reparacion', 'prestado', 'pendiente_revision', 'baja'];
    const catalogItems = state.estadosEquipo
      .map((item) => item.nombre.trim())
      .filter((value): value is string => Boolean(value));
    const importedItems = state.equipos
      .map((item) => item.estado?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...defaultItems, ...catalogItems, ...importedItems]));
  }, [state.equipos, state.estadosEquipo]);

  const estadoEquipoNombre = useMemo(
    () =>
      state.estadosEquipo.reduce<Record<string, string>>((acc, item) => {
        acc[item.nombre] = item.descripcion || getEstadoEquipoLabel(item.nombre);
        return acc;
      }, {}),
    [state.estadosEquipo],
  );

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      setState(await listLaboratorioData());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la informacion del laboratorio.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('acad-theme', theme);
    } catch {
      // No se guarda si el navegador bloquea almacenamiento local.
    }
  }, [theme]);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const registeredIds = Array.from(new Set(state.equipos.map((item) => item.registradoPor).filter((value) => value && isUuid(value))));
    const missingIds = registeredIds.filter((id) => !profileNamesById[id]);
    if (profile?.id && profile.fullName) {
      setProfileNamesById((current) => (current[profile.id] ? current : { ...current, [profile.id]: profile.fullName }));
    }
    if (!supabase || missingIds.length === 0) return;

    supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', missingIds)
      .then(({ data }) => {
        if (!data?.length) return;
        setProfileNamesById((current) => ({
          ...current,
          ...Object.fromEntries(data.map((row) => [row.id, row.full_name])),
        }));
      });
  }, [profile?.fullName, profile?.id, profileNamesById, state.equipos]);

  useEffect(() => {
    if (!message && !error) return undefined;

    const timeout = window.setTimeout(() => {
      setMessage(null);
      setError(null);
    }, error ? 12000 : 6500);

    return () => window.clearTimeout(timeout);
  }, [message, error]);

  useEffect(() => {
    if (!selectedFicha && !selectedEquipoDetalle && !showEquipoFormModal && !activeCatalogManager && !confirmacionOperativo) return undefined;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setSelectedFicha(null);
      closeEquipoDetalle();
      closeEquipoFormModal();
      setConfirmacionOperativo(null);
      closeCatalogManager();
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeCatalogManager, confirmacionOperativo, selectedEquipoDetalle, selectedFicha, showEquipoFormModal]);

  const indicadores = useMemo(() => {
    const trabajosAbiertos = state.bitacoras.filter((item) => item.estado !== 'cerrado').length;
    const equiposMantenimiento = state.equipos.filter((item) => item.estado === 'mantenimiento').length;
    const equiposPendientes = state.equipos.filter((item) => item.estado !== 'operativo').length;
    const prestamosActivos = state.prestamos.filter((item) => item.estado === 'activo').length;
    const descartesRegistrados = state.descartes.length;
    const evidencias = state.bitacoras.filter((item) => item.evidenciaUrl || item.evidenciaTitulo).length;

    return { trabajosAbiertos, equiposMantenimiento, equiposPendientes, prestamosActivos, descartesRegistrados, evidencias };
  }, [state]);

  const actividadReciente = useMemo(() => {
    const bitacoras = state.bitacoras.map((item) => ({
      id: `bitacora-${item.id}`,
      fecha: item.fecha,
      tipo: 'Bitacora',
      titulo: item.titulo,
      detalle: `${item.responsable || 'Sin responsable'} | ${estadoTrabajoLabels[item.estado]}`,
      tab: 'bitacoras' as LabTab,
    }));
    const fichas = state.fichas.map((item) => ({
      id: `ficha-${item.id}`,
      fecha: item.updatedAt,
      tipo: 'Ficha tecnica',
      titulo: item.pc,
      detalle: `${item.ubicacion || 'Sin ubicacion'} | ${item.responsable || 'Sin responsable'}`,
      tab: 'fichas' as LabTab,
    }));
    const prestamos = state.prestamos.map((item) => ({
      id: `prestamo-${item.id}`,
      fecha: item.fechaPrestamo,
      tipo: 'Prestamo',
      titulo: item.equipo,
      detalle: `${item.entregadoA} | ${item.estado}`,
      tab: 'prestamos' as LabTab,
    }));
    const descartes = state.descartes.map((item) => ({
      id: `descarte-${item.id}`,
      fecha: item.fecha,
      tipo: 'Descarte',
      titulo: item.equipo,
      detalle: `${item.responsable || 'Sin responsable'} | ${item.ubicacion || 'Sin ubicacion'}`,
      tab: 'descartes' as LabTab,
    }));
    const equipos = state.equipos.map((item) => {
      const isCreation = Math.abs(new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime()) < 2000;
      const responsable =
        item.registradoPor && item.registradoPor === profile?.id
          ? profile.fullName
          : item.registradoPor && profileNamesById[item.registradoPor]
            ? profileNamesById[item.registradoPor]
          : item.registradoPor && !isUuid(item.registradoPor)
            ? item.registradoPor
            : 'Usuario del sistema';
      return {
        id: `equipo-${item.id}`,
        fecha: item.updatedAt || item.createdAt,
        tipo: isCreation ? 'Equipo registrado' : 'Equipo actualizado',
        titulo: item.nombre,
        detalle: `${responsable} | ${item.ubicacion || 'Sin ubicacion'} | ${estadoEquipoNombre[item.estado] ?? getEstadoEquipoLabel(item.estado)}`,
        tab: 'inventario' as LabTab,
      };
    });

    return [...bitacoras, ...fichas, ...prestamos, ...descartes, ...equipos]
      .sort((first, second) => second.fecha.localeCompare(first.fecha))
      .slice(0, showMoreActivity ? 20 : 8);
  }, [estadoEquipoNombre, profile?.fullName, profile?.id, profileNamesById, showMoreActivity, state.bitacoras, state.descartes, state.equipos, state.fichas, state.prestamos]);

  async function handleFichaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildFichaTecnicaInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingFicha) {
        const updated = await updateFichaTecnicaLaboratorio(editingFicha.id, input);
        setEditingFicha(null);
        setSelectedFicha(updated);
        setMessage('Ficha tecnica actualizada correctamente.');
      } else {
        const created = await createFichaTecnicaLaboratorio(input, saveContext);
        setSelectedFicha(created);
        setSelectedEquipoFichaId('');
        setMessage('Ficha tecnica guardada correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la ficha tecnica.');
    } finally {
      setIsSaving(false);
    }
  }

  async function guardarBitacoraConInventario(
    input: BitacoraLaboratorioInput,
    equipoAtendido: EquipoLaboratorio | undefined,
    nextEquipoEstado: EstadoEquipoLaboratorio | null,
    shouldSyncEquipoEstado: boolean,
    form: HTMLFormElement,
  ) {
    if (shouldSyncEquipoEstado && equipoAtendido && nextEquipoEstado && equipoAtendido.estado !== nextEquipoEstado) {
      const previousEstadoLabel = estadoEquipoNombre[equipoAtendido.estado] ?? getEstadoEquipoLabel(equipoAtendido.estado);
      const nextEstadoLabel = estadoEquipoNombre[nextEquipoEstado] ?? getEstadoEquipoLabel(nextEquipoEstado);
      input.descripcion = `${input.descripcion.trim()}\n\nAuditoria de inventario: ${previousEstadoLabel} -> ${nextEstadoLabel}.`;
      input.equipoOrigen = input.equipoOrigen || equipoAtendido.estado;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingBitacora) {
        await updateBitacoraLaboratorio(editingBitacora.id, input);
        setEditingBitacora(null);
        setMessage('Bitacora actualizada correctamente.');
      } else {
        await createBitacoraLaboratorio(input, saveContext);
        setMessage('Bitacora registrada correctamente.');
        form.reset();
      }

      if (shouldSyncEquipoEstado && equipoAtendido && nextEquipoEstado && equipoAtendido.estado !== nextEquipoEstado) {
        await updateEquipoLaboratorio(equipoAtendido.id, {
          codigo: equipoAtendido.codigo,
          nombre: equipoAtendido.nombre,
          categoria: equipoAtendido.categoria,
          marcaModelo: equipoAtendido.marcaModelo,
          serie: equipoAtendido.serie,
          ubicacion: equipoAtendido.ubicacion,
          estado: nextEquipoEstado,
          observaciones: equipoAtendido.observaciones,
        });
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la bitacora.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEquipoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildEquipoInput(form);
    let componentesIniciales: ReturnType<typeof buildComponentesInicialesInput> = [];
    if (!editingEquipo) {
      try {
        componentesIniciales = buildComponentesInicialesInput(form, input, componentesNuevoEquipo);
      } catch (componentError) {
        setError(componentError instanceof Error ? componentError.message : 'Revise los datos de los componentes.');
        return;
      }
    }
    const duplicate = findDuplicateEquipoIdentity(input, state.equipos, editingEquipo?.id);

    if (duplicate) {
      setError(buildDuplicateEquipoMessage(duplicate));
      return;
    }

    for (const componenteInicial of componentesIniciales) {
      const duplicateComponent = findDuplicateEquipoIdentity(componenteInicial.equipo, state.equipos);
      if (duplicateComponent) {
        setError(buildDuplicateEquipoMessage(duplicateComponent));
        return;
      }
    }

    const seenComponentSerie = new Set<string>();
    for (const componenteInicial of componentesIniciales) {
      const serieKey = normalizeUniqueEquipoValue(componenteInicial.equipo.serie, 'serie');
      if (serieKey && seenComponentSerie.has(serieKey)) {
        setError(`Hay mas de un componente con el mismo numero de serie: ${componenteInicial.equipo.serie}.`);
        return;
      }
      if (serieKey) seenComponentSerie.add(serieKey);
    }

    const hasEstadoChange = Boolean(editingEquipo && editingEquipo.estado !== input.estado);
    const previousEstadoLabel = editingEquipo ? estadoEquipoNombre[editingEquipo.estado] ?? getEstadoEquipoLabel(editingEquipo.estado) : '';
    const nextEstadoLabel = estadoEquipoNombre[input.estado] ?? getEstadoEquipoLabel(input.estado);
    const closingDetail =
      editingEquipo && hasEstadoChange && input.estado === 'operativo' && editingEquipo.estado !== 'operativo'
        ? window.prompt('Detalle del trabajo realizado antes de dejar el equipo operativo:')
        : null;
    const issueDetail =
      editingEquipo && hasEstadoChange && shouldRequestIssueDetailForEstado(input.estado)
        ? window.prompt('Describa la incidencia, falla o motivo de revision del equipo:')
        : null;

    if (editingEquipo && hasEstadoChange && input.estado === 'operativo' && !closingDetail?.trim()) {
      setError('Debe escribir un detalle antes de devolver el equipo a operativo.');
      return;
    }

    if (editingEquipo && hasEstadoChange && shouldRequestIssueDetailForEstado(input.estado) && !issueDetail?.trim()) {
      setError('Debe escribir la incidencia o motivo antes de cambiar el estado del equipo.');
      return;
    }

    if (hasEstadoChange && input.estado === 'baja') {
      input.ubicacion = 'Deposito';
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingEquipo) {
        await updateEquipoLaboratorio(editingEquipo.id, input);
        if (hasEstadoChange) {
          const equipoLabel = `${input.codigo || editingEquipo.codigo} - ${input.nombre || editingEquipo.nombre}`;
          const workType = getEstadoChangeWorkType(input.estado);
          const automaticDescription =
            input.estado === 'operativo'
              ? `Equipo devuelto a operativo. Estado anterior: ${previousEstadoLabel}. Detalle: ${closingDetail?.trim()}`
              : shouldRequestIssueDetailForEstado(input.estado)
                ? `Incidencia registrada desde inventario. Estado anterior: ${previousEstadoLabel}. Estado actual: ${nextEstadoLabel}. Detalle: ${issueDetail?.trim()}`
                : `Cambio de estado tecnico desde edicion de inventario: ${previousEstadoLabel} -> ${nextEstadoLabel}.`;
          await createBitacoraLaboratorio(
            {
              fecha: new Date().toISOString(),
              tipoTrabajo: workType,
              titulo:
                input.estado === 'operativo'
                  ? `Equipo operativo: ${equipoLabel}`
                  : shouldRequestIssueDetailForEstado(input.estado)
                    ? `Incidencia en ${equipoLabel}`
                    : `Equipo en ${nextEstadoLabel}: ${equipoLabel}`,
              descripcion: automaticDescription,
              responsable: profile?.fullName || profile?.email || 'Soporte tecnico',
              prioridad: input.estado === 'baja' ? 'alta' : 'media',
              estado: getEstadoChangeWorkStatus(input.estado),
              clase: input.estado === 'operativo' ? 'mantenimiento' : 'incidencia',
              equipoId: editingEquipo.id,
              equipoOrigen: editingEquipo.estado,
              equipoDestino: equipoLabel,
              ubicacion: input.ubicacion,
              evidenciaTitulo: '',
              evidenciaUrl: '',
            },
            saveContext,
          );
        }
        setEditingEquipo(null);
        setMessage(hasEstadoChange ? 'Equipo actualizado y bitacora automatica registrada.' : 'Equipo actualizado correctamente.');
      } else {
        const createdEquipo = await createEquipoLaboratorio(input, saveContext);
        if (componentesIniciales.length > 0) {
          try {
            const createdComponentes: EquipoLaboratorio[] = [];
            for (const componenteInicial of componentesIniciales) {
              const createdComponente = await createEquipoLaboratorio(componenteInicial.equipo, saveContext);
              createdComponentes.push(createdComponente);
              await createAsignacionComponenteLaboratorio(
                {
                  equipoPadreId: createdEquipo.id,
                  componenteId: createdComponente.id,
                  tipo: componenteInicial.asignacionTipo,
                  fechaAsignacion: new Date().toISOString(),
                  fechaRetiro: null,
                  detalle: componenteInicial.detalle,
                  responsable: responsableSesion,
                },
                saveContext,
              );
            }
            await createBitacoraLaboratorio(
              {
                fecha: new Date().toISOString(),
                tipoTrabajo: 'Registro de equipo con componentes',
                titulo: `PC registrada: ${createdEquipo.nombre}`,
                descripcion: `${createdEquipo.codigo || 'S/N'} - ${createdEquipo.nombre} fue registrada como PC/CPU. Componentes enlazados: ${createdComponentes
                  .map((item) => `${item.codigo || 'S/N'} - ${item.nombre}`)
                  .join('; ')}.`,
                responsable: responsableSesion,
                prioridad: 'media',
                estado: 'cerrado',
                clase: 'mantenimiento',
                equipoId: createdEquipo.id,
                equipoOrigen: 'Registro inicial',
                equipoDestino: `${createdEquipo.codigo || 'S/N'} - ${createdEquipo.nombre}`,
                ubicacion: createdEquipo.ubicacion,
                evidenciaTitulo: '',
                evidenciaUrl: '',
              },
              saveContext,
            );
          } catch (componentSaveError) {
            const detail = componentSaveError instanceof Error ? componentSaveError.message : 'Error desconocido.';
            setError(
              `La PC se guardo, pero uno o mas componentes no se pudieron registrar o enlazar. Detalle: ${detail}`,
            );
            closeEquipoFormModal();
            form.reset();
            await refresh();
            return;
          }
        }
        setMessage(
          componentesIniciales.length > 0
            ? `PC/CPU y ${componentesIniciales.length} componente${componentesIniciales.length === 1 ? '' : 's'} registrados.`
            : 'Equipo agregado al inventario.',
        );
        form.reset();
      }

      closeEquipoFormModal();
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el equipo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBitacoraSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildBitacoraInput(form);
    const equipoAtendido = state.equipos.find((item) => item.id === input.equipoId);
    const nextEquipoEstado = equipoAtendido ? resolveInventoryStatusFromBitacora(input) : null;
    const shouldSyncEquipoEstado = Boolean(equipoAtendido && nextEquipoEstado);

    if (equipoAtendido) {
      input.equipoDestino = `${equipoAtendido.codigo} - ${equipoAtendido.nombre}`;
      input.ubicacion = input.ubicacion || equipoAtendido.ubicacion;
    }

    if (equipoAtendido && nextEquipoEstado === 'operativo' && equipoAtendido.estado !== 'operativo') {
      setConfirmacionOperativo({ input, equipoAtendido, nextEquipoEstado, form });
      return;
    }

    await guardarBitacoraConInventario(input, equipoAtendido, nextEquipoEstado, shouldSyncEquipoEstado, form);
  }

  async function handleQuickEstadoEquipo(item: EquipoLaboratorio, estado: EstadoEquipoLaboratorio) {
    if (item.estado === estado) return;
    const previousEstadoLabel = estadoEquipoNombre[item.estado] ?? getEstadoEquipoLabel(item.estado);
    const nextEstadoLabel = estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado);
    const closingDetail =
      estado === 'operativo' && item.estado !== 'operativo'
        ? window.prompt('Detalle del trabajo realizado antes de dejar el equipo operativo:')
        : null;
    const issueDetail =
      shouldRequestIssueDetailForEstado(estado)
        ? window.prompt('Describa la incidencia, falla o motivo de revision del equipo:')
        : null;

    if (estado === 'operativo' && item.estado !== 'operativo' && !closingDetail?.trim()) {
      setError('Debe escribir un detalle antes de devolver el equipo a operativo.');
      return;
    }

    if (shouldRequestIssueDetailForEstado(estado) && !issueDetail?.trim()) {
      setError('Debe escribir la incidencia o motivo antes de cambiar el estado del equipo.');
      return;
    }

    const nextUbicacion = estado === 'baja' ? 'Deposito' : item.ubicacion;
    const equipoLabel = `${item.codigo} - ${item.nombre}`;
    const workType = getEstadoChangeWorkType(estado);
    const automaticDescription =
      estado === 'operativo'
        ? `Equipo devuelto a operativo. Estado anterior: ${previousEstadoLabel}. Detalle: ${closingDetail?.trim()}`
        : shouldRequestIssueDetailForEstado(estado)
          ? `Incidencia registrada desde inventario. Estado anterior: ${previousEstadoLabel}. Estado actual: ${nextEstadoLabel}. Detalle: ${issueDetail?.trim()}`
          : `Cambio de estado tecnico: ${previousEstadoLabel} -> ${nextEstadoLabel}.`;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateEquipoLaboratorio(item.id, {
        codigo: item.codigo,
        nombre: item.nombre,
        categoria: item.categoria,
        marcaModelo: item.marcaModelo,
        serie: item.serie,
        ubicacion: nextUbicacion,
        estado,
        observaciones: item.observaciones,
      });
      try {
        await createBitacoraLaboratorio(
          {
            fecha: new Date().toISOString(),
            tipoTrabajo: workType,
            titulo:
              estado === 'operativo'
                ? `Equipo operativo: ${equipoLabel}`
                : shouldRequestIssueDetailForEstado(estado)
                  ? `Incidencia en ${equipoLabel}`
                  : `Equipo en ${nextEstadoLabel}: ${equipoLabel}`,
            descripcion: automaticDescription,
            responsable: profile?.fullName || profile?.email || 'Soporte tecnico',
            prioridad: estado === 'baja' ? 'alta' : 'media',
            estado: getEstadoChangeWorkStatus(estado),
            clase: estado === 'operativo' ? 'mantenimiento' : 'incidencia',
            equipoId: item.id,
            equipoOrigen: item.estado,
            equipoDestino: equipoLabel,
            ubicacion: nextUbicacion,
            evidenciaTitulo: '',
            evidenciaUrl: '',
          },
          saveContext,
        );
      } catch (historyError) {
        const detail = historyError instanceof Error ? historyError.message : 'Error desconocido';
        setError(`Estado actualizado, pero no se pudo guardar el historial automatico: ${detail}`);
      }
      setMessage(
        estado === 'baja'
          ? 'Equipo marcado como baja y movido a Deposito.'
          : `Estado actualizado a ${estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}.`,
      );
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar el estado del equipo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDescarteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildDescarteInput(form, responsableSesion);
    const equipo = input.equipoId ? state.equipos.find((item) => item.id === input.equipoId) : null;

    if (!input.inventario.trim() || !input.equipo.trim()) {
      setError('Indique el numero de inventario y el equipo a descartar.');
      return;
    }

    if (!input.detalle.trim()) {
      setError('Escriba el detalle o motivo del descarte.');
      return;
    }

    if (equipo && !normalizeExcelKey(equipo.ubicacion).includes('deposito')) {
      setError('Para descartar un equipo registrado, primero debe estar ubicado en Deposito.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createDescarteLaboratorio(input, saveContext);

      if (equipo) {
        await createBitacoraLaboratorio(
          {
            fecha: new Date().toISOString(),
            tipoTrabajo: 'Descarte de equipo',
            titulo: `Equipo descartado: ${input.inventario} - ${input.equipo}`,
            descripcion: input.detalle,
            responsable: input.responsable,
            prioridad: 'alta',
            estado: 'cerrado',
            clase: 'incidencia',
            equipoId: equipo.id,
            equipoOrigen: equipo.estado,
            equipoDestino: `${input.inventario} - ${input.equipo}`,
            ubicacion: input.ubicacion || equipo.ubicacion || 'Deposito',
            evidenciaTitulo: input.evidenciaTitulo,
            evidenciaUrl: input.evidenciaUrl,
          },
          saveContext,
        );
        await deleteEquipoLaboratorio(equipo.id);
      }

      setSelectedDescarteEquipoId('');
      form.reset();
      setMessage(equipo ? 'Descarte registrado y equipo retirado del inventario activo.' : 'Descarte registrado correctamente.');
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el descarte. Ejecuta la migracion de descartes en Supabase si aun no existe la tabla.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSeccionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildSeccionInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingSeccion) {
        await updateSeccionLaboratorio(editingSeccion.id, input);
        setEditingSeccion(null);
        setMessage('Seccion actualizada correctamente.');
      } else {
        await createSeccionLaboratorio(input, saveContext);
        setMessage('Seccion agregada correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la seccion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCatalogoSubmit(
    event: FormEvent<HTMLFormElement>,
    tipo: CatalogoLaboratorio['tipo'],
    editingItem: CatalogoLaboratorio | null,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildSeccionInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingItem) {
        await updateCatalogoLaboratorio(editingItem.id, tipo, input);
        if (tipo === 'categoria_equipo') setEditingCategoria(null);
        else setEditingEstadoEquipo(null);
        setMessage(tipo === 'categoria_equipo' ? 'Categoria actualizada correctamente.' : 'Estado actualizado correctamente.');
      } else {
        await createCatalogoLaboratorio(tipo, input, saveContext);
        setMessage(tipo === 'categoria_equipo' ? 'Categoria agregada correctamente.' : 'Estado agregado correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la opcion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePrestamoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildPrestamoInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingPrestamo) {
        await updatePrestamoLaboratorio(editingPrestamo.id, input);
        setEditingPrestamo(null);
        setMessage('Prestamo actualizado correctamente.');
      } else {
        await createPrestamoLaboratorio(input, saveContext);
        setMessage('Prestamo registrado correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el prestamo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteBitacora(item: BitacoraLaboratorio) {
    if (!window.confirm(`Desea eliminar la bitacora "${item.titulo}"?`)) return;
    await deleteBitacoraLaboratorio(item.id);
    await refresh();
  }

  async function handleDeleteFicha(item: FichaTecnicaLaboratorio) {
    if (!window.confirm(`Desea eliminar la ficha tecnica de "${item.pc}"?`)) return;
    await deleteFichaTecnicaLaboratorio(item.id);
    if (selectedFicha?.id === item.id) setSelectedFicha(null);
    await refresh();
  }

  async function handleDeleteEquipo(item: EquipoLaboratorio) {
    if (!window.confirm(`Desea eliminar el equipo "${item.nombre}"?`)) return;
    await deleteEquipoLaboratorio(item.id);
    await refresh();
  }

  async function handleDeleteSeccion(item: SeccionLaboratorio) {
    if (!window.confirm(`Desea eliminar la seccion "${item.nombre}"?`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteSeccionLaboratorio(item.id);
      if (editingSeccion?.id === item.id) setEditingSeccion(null);
      setMessage('Seccion eliminada correctamente.');
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la seccion.');
    }
  }

  async function handleDeleteCatalogo(item: CatalogoLaboratorio) {
    if (!window.confirm(`Desea eliminar "${item.nombre}"?`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteCatalogoLaboratorio(item.id, item.tipo);
      if (editingCategoria?.id === item.id) setEditingCategoria(null);
      if (editingEstadoEquipo?.id === item.id) setEditingEstadoEquipo(null);
      setMessage('Opcion eliminada correctamente.');
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la opcion.');
    }
  }

  async function handleDeletePrestamo(item: PrestamoLaboratorio) {
    if (!window.confirm(`Desea eliminar el prestamo de "${item.equipo}"?`)) return;
    await deletePrestamoLaboratorio(item.id);
    await refresh();
  }

  async function handleDeleteDescarte(item: DescarteLaboratorio) {
    if (!window.confirm(`Desea eliminar el descarte de "${item.equipo}"?`)) return;
    await deleteDescarteLaboratorio(item.id);
    await refresh();
  }

  async function handleInventarioExcelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { read, utils } = await import('xlsx');
      const workbook = read(await file.arrayBuffer(), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      if (!worksheet) throw new Error('El archivo no tiene hojas disponibles.');

      const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      const inputs = rows.map(parseEquipoExcelRow).filter(shouldImportEquipoRow);
      const { uniqueInputs, ignoredDuplicates } = filterUniqueEquipoInputsForImport(inputs, state.equipos);
      const result = await importEquiposLaboratorio(uniqueInputs, saveContext);

      await refresh();
      setActiveTab('inventario');
      setMessage(
        `Inventario importado: ${result.created} equipos nuevos, ${result.updated} actualizados y ${
          result.ignored + ignoredDuplicates
        } filas ignoradas. ${ignoredDuplicates ? `${ignoredDuplicates} fueron duplicadas por numero de serie.` : ''}`,
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo importar el inventario.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDescartesExcelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { read, utils } = await import('xlsx');
      const workbook = read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      if (!worksheet) throw new Error('El archivo no tiene hojas disponibles.');

      const rows = utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
      const inputs = parseDescartesExcelRows(rows, file.name, responsableSesion);
      const existingKeys = new Set(
        state.descartes.map((item) => normalizeExcelKey(`${item.inventario}|${item.equipo}|${item.serie}`)),
      );
      const uniqueInputs = inputs.filter((item) => {
        const key = normalizeExcelKey(`${item.inventario}|${item.equipo}|${item.serie}`);
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });

      for (const input of uniqueInputs) {
        await createDescarteLaboratorio(input, saveContext);
      }

      await refresh();
      setActiveTab('descartes');
      setMessage(`Descartes importados: ${uniqueInputs.length} registros nuevos y ${inputs.length - uniqueInputs.length} duplicados ignorados.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo importar el Excel de descartes.');
    } finally {
      setIsSaving(false);
    }
  }

  function exportCsv() {
    downloadTextFile(exportLaboratorioCsv(state), 'informe-laboratorio.csv', 'text/csv;charset=utf-8');
  }

  function exportReport() {
    downloadTextFile(buildLaboratorioReport(state), 'informe-laboratorio.txt');
  }

  function exportInventoryExcel() {
    if (state.equipos.length === 0) {
      setError('No hay equipos registrados para generar el informe de inventario.');
      return;
    }
    exportInventarioLaboratorioExcel(state);
    setMessage('Informe de inventario descargado correctamente.');
  }

  function exportDiscardsExcel() {
    if (state.descartes.length === 0) {
      setError('No hay descartes registrados para generar el informe.');
      return;
    }
    exportDescartesLaboratorioExcel(state);
    setMessage('Informe de descartes descargado correctamente.');
  }

  function exportMonthlyReport() {
    exportInformeMensualMantenimientoExcel(state, selectedReportMonth);
    setMessage('Informe mensual de mantenimiento descargado correctamente.');
  }

  function exportDateRangeReport() {
    if (!reportStartDate || !reportEndDate || reportStartDate > reportEndDate) {
      setError('Seleccione un rango de fechas valido. La fecha inicial no puede ser posterior a la final.');
      return;
    }
    exportInformeMantenimientoPorRangoExcel(state, reportStartDate, reportEndDate);
    setMessage('Informe de mantenimiento por rango descargado correctamente.');
  }

  function exportRangeMaintenanceReport() {
    if (reportStartDate && reportEndDate && reportStartDate > reportEndDate) {
      setError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    exportInformeMantenimientoPorRangoExcel(state, reportStartDate, reportEndDate);
    setMessage('Informe por rango descargado correctamente.');
  }

  function exportLocationReport() {
    exportInformeUbicacionLaboratorioExcel(state, selectedReportLocation);
    setMessage('Informe por ubicacion descargado correctamente.');
  }

  function exportPendingReport() {
    exportInformePendientesLaboratorioExcel(state);
    setMessage('Informe de pendientes descargado correctamente.');
  }

  function exportEquipmentHistoryReport() {
    if (!selectedReportEquipoId) {
      setError('Seleccione un equipo para generar su historial tecnico.');
      return;
    }
    exportHistorialEquipoLaboratorioExcel(state, selectedReportEquipoId);
    setMessage('Historial tecnico del equipo descargado correctamente.');
  }

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

  function openFichaForEquipo(equipo: EquipoLaboratorio) {
    closeEquipoDetalle();
    setEditingFicha(null);
    setSelectedEquipoFichaId(equipo.id);
    setActiveTab('fichas');
  }

  async function handleAsignarComponente(event: FormEvent<HTMLFormElement>, equipoPadre: EquipoLaboratorio) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const componenteId = readString(data, 'componenteId');
    const tipo = readString(data, 'tipo') as AsignacionComponenteLaboratorio['tipo'];
    const detalle = readString(data, 'detalle');
    const componente = state.equipos.find((item) => item.id === componenteId);

    if (!componente) {
      setError('Seleccione un componente del inventario.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createAsignacionComponenteLaboratorio(
        {
          equipoPadreId: equipoPadre.id,
          componenteId,
          tipo,
          fechaAsignacion: new Date().toISOString(),
          fechaRetiro: null,
          detalle,
          responsable: responsableSesion,
        },
        saveContext,
      );
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Asignacion de componente',
          titulo: `Componente asignado a ${equipoPadre.nombre}`,
          descripcion: `${componente.codigo || 'S/N'} - ${componente.nombre} fue asignado a ${
            equipoPadre.codigo || 'S/N'
          } - ${equipoPadre.nombre}. ${detalle || 'Sin detalle adicional.'}`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: equipoPadre.id,
          equipoOrigen: componente.ubicacion || 'Sin ubicacion',
          equipoDestino: `${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}`,
          ubicacion: equipoPadre.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      form.reset();
      await refresh();
      setMessage('Componente asignado y registrado en el historial.');
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'No se pudo asignar el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCrearYAsignarComponente(event: FormEvent<HTMLFormElement>, equipoPadre: EquipoLaboratorio) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const tipo = (readString(data, 'nuevoComponenteTipo') || 'monitor') as AsignacionComponenteLaboratorio['tipo'];
    const codigo = readString(data, 'nuevoComponenteCodigo');
    const nombre = readString(data, 'nuevoComponenteNombre') || `${getCategoriaComponenteDesdeTipo(tipo)} de ${equipoPadre.nombre}`;
    const marca = readString(data, 'nuevoComponenteMarca');
    const modelo = readString(data, 'nuevoComponenteModelo');
    const serie = readString(data, 'nuevoComponenteSerie');
    const detalle = readString(data, 'nuevoComponenteDetalle');
    const input: EquipoLaboratorioInput = {
      codigo,
      nombre,
      categoria: getCategoriaComponenteDesdeTipo(tipo),
      marcaModelo: [marca, modelo].filter(Boolean).join(' '),
      serie,
      ubicacion: equipoPadre.ubicacion,
      estado: equipoPadre.estado || 'operativo',
      observaciones: `Componente creado y asignado desde el expediente de ${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}.`,
    };

    if (!codigo && !serie) {
      setError('Para crear el componente indique numero de inventario o serie.');
      return;
    }

    const duplicate = findDuplicateEquipoIdentity(input, state.equipos);
    if (duplicate) {
      setError(buildDuplicateEquipoMessage(duplicate));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const createdComponente = await createEquipoLaboratorio(input, saveContext);
      await createAsignacionComponenteLaboratorio(
        {
          equipoPadreId: equipoPadre.id,
          componenteId: createdComponente.id,
          tipo,
          fechaAsignacion: new Date().toISOString(),
          fechaRetiro: null,
          detalle,
          responsable: responsableSesion,
        },
        saveContext,
      );
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Registro y asignacion de componente',
          titulo: `Componente nuevo asignado a ${equipoPadre.nombre}`,
          descripcion: `${createdComponente.codigo || 'S/N'} - ${createdComponente.nombre} fue creado y asignado a ${
            equipoPadre.codigo || 'S/N'
          } - ${equipoPadre.nombre}. ${detalle || 'Sin detalle adicional.'}`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: equipoPadre.id,
          equipoOrigen: 'Registro desde expediente',
          equipoDestino: `${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}`,
          ubicacion: equipoPadre.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      form.reset();
      await refresh();
      setMessage('Componente creado, asignado y registrado en el historial.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear y asignar el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRetirarComponente(asignacion: AsignacionComponenteLaboratorio, equipoPadre: EquipoLaboratorio) {
    const componente = getEquipoById(asignacion.componenteId);
    if (!componente) {
      setError('No se encontro el componente seleccionado.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await retirarAsignacionComponenteLaboratorio(asignacion.id, saveContext);
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Retiro de componente',
          titulo: `Componente retirado de ${equipoPadre.nombre}`,
          descripcion: `${componente.codigo || 'S/N'} - ${componente.nombre} fue retirado de ${
            equipoPadre.codigo || 'S/N'
          } - ${equipoPadre.nombre}.`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: equipoPadre.id,
          equipoOrigen: `${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}`,
          equipoDestino: componente.nombre,
          ubicacion: equipoPadre.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      await refresh();
      setMessage('Componente retirado y registrado en el historial.');
    } catch (retireError) {
      setError(retireError instanceof Error ? retireError.message : 'No se pudo retirar el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMoverComponente(
    asignacion: AsignacionComponenteLaboratorio,
    equipoActual: EquipoLaboratorio,
    nuevoEquipoId: string,
  ) {
    const componente = getEquipoById(asignacion.componenteId);
    const nuevoEquipo = getEquipoById(nuevoEquipoId);
    if (!componente || !nuevoEquipo) {
      setError('Seleccione un equipo destino valido.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await retirarAsignacionComponenteLaboratorio(asignacion.id, saveContext);
      await createAsignacionComponenteLaboratorio(
        {
          equipoPadreId: nuevoEquipo.id,
          componenteId: componente.id,
          tipo: asignacion.tipo,
          fechaAsignacion: new Date().toISOString(),
          fechaRetiro: null,
          detalle: `Movido desde ${equipoActual.codigo || 'S/N'} - ${equipoActual.nombre} hacia ${
            nuevoEquipo.codigo || 'S/N'
          } - ${nuevoEquipo.nombre}.`,
          responsable: responsableSesion,
        },
        saveContext,
      );
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Movimiento de componente',
          titulo: `Componente movido a ${nuevoEquipo.nombre}`,
          descripcion: `${componente.codigo || 'S/N'} - ${componente.nombre} fue movido desde ${
            equipoActual.codigo || 'S/N'
          } - ${equipoActual.nombre} hacia ${nuevoEquipo.codigo || 'S/N'} - ${nuevoEquipo.nombre}.`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: nuevoEquipo.id,
          equipoOrigen: `${equipoActual.codigo || 'S/N'} - ${equipoActual.nombre}`,
          equipoDestino: `${nuevoEquipo.codigo || 'S/N'} - ${nuevoEquipo.nombre}`,
          ubicacion: nuevoEquipo.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      setComponentMoveTargets((current) => {
        const next = { ...current };
        delete next[asignacion.id];
        return next;
      });
      await refresh();
      setMessage('Componente movido y registrado en el historial.');
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'No se pudo mover el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  function closeCatalogManager() {
    setActiveCatalogManager(null);
    setEditingSeccion(null);
    setEditingCategoria(null);
    setEditingEstadoEquipo(null);
  }

  return (
    <div className="lab-workspace">
      <EncabezadoLaboratorio
        indicadores={indicadores}
        isLightTheme={isLightTheme}
        onBack={() => navigate('/dashboard')}
        onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      />

      <section className="panel lab-shell">
        <PestanasLaboratorio activeTab={activeTab} onChange={setActiveTab} />

        {message || error ? (
          <div className={`lab-toast ${error ? 'error' : 'success'}`} role="status" aria-live="polite">
            {error ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
            <span>{error ?? message}</span>
          </div>
        ) : null}
        {isLoading ? <p className="form-hint">Cargando informacion del laboratorio...</p> : null}

        {activeTab === 'inicio' ? (
          <InicioLaboratorio
            actividadReciente={actividadReciente}
            cantidadEquipos={state.equipos.length}
            cantidadFichas={state.fichas.length}
            indicadores={indicadores}
            showMoreActivity={showMoreActivity}
            onChangeTab={setActiveTab}
            onToggleActivityLimit={() => setShowMoreActivity((current) => !current)}
          />
        ) : null}

        {activeTab === 'fichas' ? (
          <VistaFichasTecnicas
            editingFicha={editingFicha}
            equipos={state.equipos}
            fichas={state.fichas}
            isSaving={isSaving}
            selectedEquipoFicha={selectedEquipoFicha}
            selectedEquipoFichaId={selectedEquipoFichaId}
            selectedFicha={selectedFicha}
            onCancelEdit={() => setEditingFicha(null)}
            onDeleteFicha={(item) => void handleDeleteFicha(item)}
            onSelectedEquipoFichaChange={setSelectedEquipoFichaId}
            onSelectedFichaChange={setSelectedFicha}
            onSetEditingFicha={setEditingFicha}
            onSubmit={handleFichaSubmit}
          />
        ) : null}

        {activeTab === 'bitacoras' ? (
          <VistaBitacoras
            bitacoras={state.bitacoras}
            editingBitacora={editingBitacora}
            equipos={state.equipos}
            estadoEquipoNombre={estadoEquipoNombre}
            isSaving={isSaving}
            responsableSesion={responsableSesion}
            onCancelEdit={() => setEditingBitacora(null)}
            onDeleteBitacora={(item) => void handleDeleteBitacora(item)}
            onSetEditingBitacora={setEditingBitacora}
            onSubmit={handleBitacoraSubmit}
          />
        ) : null}

        {activeTab === 'inventario' ? (
          <div className="lab-inventory-focus">
            <VistaInventario
              equipos={state.equipos}
              equiposFiltrados={equiposInventarioFiltrados}
              estadosEquipo={estadosEquipo}
              estadoEquipoNombre={estadoEquipoNombre}
              estadosAlertaPorUbicacion={estadosAlertaPorUbicacion}
              inventoryResultsRef={inventoryResultsRef}
              inventorySearch={inventorySearch}
              isSaving={isSaving}
              selectedInventoryLocation={selectedInventoryLocation}
              totalComponentesAsignados={componentesAsignadosActivosIds.size}
              totalPrincipales={equiposInventarioPrincipales.length}
              ubicacionesInventario={ubicacionesInventario}
              getEquipoById={getEquipoById}
              getFilterCount={(ubicacion) =>
                ubicacion === 'Todas'
                  ? equiposInventarioPrincipales.length
                  : isAssignedComponentsInventoryFilter(ubicacion)
                    ? equiposComponentesAsignados.length
                    : equiposInventarioPrincipales.filter((item) => matchesInventoryLocationFilter(item, ubicacion)).length
              }
              getInventarioCalculadoEquipo={getInventarioCalculadoEquipo}
              getAsignacionActivaComoComponente={getAsignacionActivaComoComponente}
              onDeleteEquipo={(item) => void handleDeleteEquipo(item)}
              onFilterLocation={handleInventoryLocationFilter}
              onInventarioExcelUpload={(event) => void handleInventarioExcelUpload(event)}
              onNewEquipo={openNuevoEquipoModal}
              onOpenEquipo={openEquipoDetalle}
              onQuickEstadoEquipo={(item, estado) => void handleQuickEstadoEquipo(item, estado)}
              onSearchChange={setInventorySearch}
            />

            {selectedEquipoDetalle ? (
              <div className="modal-backdrop" role="presentation" onClick={closeEquipoDetalle}>
                <article
                  className="modal-panel lab-equipment-modal lab-equipment-detail-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-equipment-detail-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  {(() => {
                    const { marca, modelo } = splitMarcaModelo(selectedEquipoDetalle.marcaModelo);
                    const fichasEquipo = getFichasEquipo(selectedEquipoDetalle);
                    const bitacorasEquipo = getBitacorasEquipo(selectedEquipoDetalle);
                    const componentesActivos = getAsignacionesActivasEquipo(selectedEquipoDetalle);
                    const componentesDisponibles = getComponentesDisponibles(selectedEquipoDetalle);
                    const ultimoMantenimiento = getUltimoMantenimientoEquipo(fichasEquipo, bitacorasEquipo);
                    return (
                      <>
                        <div className="modal-header lab-equipment-detail-header">
                          <div>
                            <span className="eyebrow">Expediente tecnico</span>
                            <h2 id="lab-equipment-detail-title">{selectedEquipoDetalle.nombre}</h2>
                            <p>
                              {selectedEquipoDetalle.codigo || 'Sin inventario'} | {selectedEquipoDetalle.ubicacion || 'Sin ubicacion'} |{' '}
                              {estadoEquipoNombre[selectedEquipoDetalle.estado] ?? getEstadoEquipoLabel(selectedEquipoDetalle.estado)}
                            </p>
                          </div>
                          <button className="icon-button" type="button" aria-label="Cerrar detalle" onClick={closeEquipoDetalle}>
                            <XCircle size={18} />
                          </button>
                        </div>

                        {message || error ? (
                          <div className={`lab-modal-feedback ${error ? 'error' : 'success'}`} role="status" aria-live="polite">
                            {error ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                            <span>{error ?? message}</span>
                          </div>
                        ) : null}

                        <div className="lab-equipment-detail-actions">
                          {equipoDetalleHistory.length > 0 ? (
                            <button className="secondary-button" type="button" onClick={backEquipoDetalle}>
                              <ArrowLeft size={18} />
                              Volver al equipo anterior
                            </button>
                          ) : null}
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => openEditarEquipoModal(selectedEquipoDetalle)}
                          >
                            <Pencil size={18} />
                            Editar datos
                          </button>
                          <button className="primary-button" type="button" onClick={() => openFichaForEquipo(selectedEquipoDetalle)}>
                            <ClipboardList size={18} />
                            Nueva ficha tecnica
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              exportHistorialEquipoLaboratorioExcel(state, selectedEquipoDetalle.id);
                              setMessage('Historial tecnico del equipo descargado correctamente.');
                            }}
                          >
                            <Download size={18} />
                            Descargar historial
                          </button>
                        </div>

                        <dl className="lab-definition-grid lab-equipment-detail-grid">
                          <div><dt>Numero de inventario</dt><dd>{selectedEquipoDetalle.codigo || 'S/N'}</dd></div>
                          <div><dt>Categoria</dt><dd>{selectedEquipoDetalle.categoria || 'No indicada'}</dd></div>
                          <div><dt>Marca</dt><dd>{marca}</dd></div>
                          <div><dt>Modelo</dt><dd>{modelo}</dd></div>
                          <div><dt>Serie</dt><dd>{selectedEquipoDetalle.serie || 'S/N'}</dd></div>
                          <div><dt>Ubicacion</dt><dd>{selectedEquipoDetalle.ubicacion || 'No indicada'}</dd></div>
                          <div><dt>Estado</dt><dd>{estadoEquipoNombre[selectedEquipoDetalle.estado] ?? getEstadoEquipoLabel(selectedEquipoDetalle.estado)}</dd></div>
                          <div>
                            <dt>Ultimo mantenimiento</dt>
                            <dd>{ultimoMantenimiento ? formatDateTime(ultimoMantenimiento) : 'Sin mantenimiento registrado'}</dd>
                          </div>
                          <div><dt>Actualizado</dt><dd>{formatDateTime(selectedEquipoDetalle.updatedAt)}</dd></div>
                        </dl>

                        <section className="lab-equipment-detail-section">
                          <div className="lab-home-section-header">
                            <div>
                              <span className="eyebrow">Componentes asignados</span>
                              <h3>{componentesActivos.length} componentes</h3>
                            </div>
                          </div>
                          {componentesActivos.length === 0 ? (
                            <p className="form-hint">Este equipo todavia no tiene CPU, monitor u otra pieza relacionada.</p>
                          ) : null}
                          <div className="lab-equipment-detail-list">
                            {componentesActivos.map((asignacion) => {
                              const componente = getEquipoById(asignacion.componenteId);
                              const destinos = getEquiposDestinoComponente(selectedEquipoDetalle, asignacion.componenteId);
                              const selectedTarget = componentMoveTargets[asignacion.id] ?? '';
                              return (
                                <article
                                  className={componente ? 'lab-component-card clickable' : 'lab-component-card'}
                                  key={asignacion.id}
                                  role={componente ? 'button' : undefined}
                                  tabIndex={componente ? 0 : undefined}
                                  title={componente ? 'Abrir expediente del componente' : undefined}
                                  onClick={() => {
                                    if (componente) openEquipoDetalle(componente, true);
                                  }}
                                  onKeyDown={(event) => {
                                    if (!componente) return;
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      openEquipoDetalle(componente, true);
                                    }
                                  }}
                                >
                                  <div>
                                    <strong className="lab-component-title">
                                      <span>{asignacion.tipo.toUpperCase()}</span>
                                      <b>{componente?.nombre ?? 'Componente no encontrado'}</b>
                                    </strong>
                                    <span className="lab-component-meta">
                                      <i>Inventario: {componente?.codigo || 'S/N'}</i>
                                      <i>Serie: {componente?.serie || 'S/N'}</i>
                                      <i>{componente?.ubicacion || selectedEquipoDetalle.ubicacion}</i>
                                    </span>
                                  </div>
                                  <span className="status-pill">Activo</span>
                                  <p>{asignacion.detalle || `Asignado el ${formatDateTime(asignacion.fechaAsignacion)}.`}</p>
                                  {componente ? (
                                    <div className="lab-component-shortcuts" onClick={(event) => event.stopPropagation()}>
                                      <button
                                        className="secondary-button"
                                        type="button"
                                        onClick={() => openEquipoDetalle(componente, true)}
                                      >
                                        <Eye size={16} />
                                        Ver componente
                                      </button>
                                      <button
                                        className="secondary-button"
                                        type="button"
                                        onClick={() => openFichaForEquipo(componente)}
                                      >
                                        <ClipboardList size={16} />
                                        Ficha tecnica
                                      </button>
                                    </div>
                                  ) : null}
                                  <div className="lab-component-actions">
                                    <select
                                      value={selectedTarget}
                                      disabled={isSaving || destinos.length === 0}
                                      onClick={(event) => event.stopPropagation()}
                                      onChange={(event) =>
                                        setComponentMoveTargets((current) => ({
                                          ...current,
                                          [asignacion.id]: event.target.value,
                                        }))
                                      }
                                    >
                                      <option value="">Mover a otro equipo...</option>
                                      {destinos.map((destino) => (
                                        <option value={destino.id} key={destino.id}>
                                          {destino.codigo || 'S/N'} - {destino.nombre} ({destino.ubicacion || 'Sin ubicacion'})
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      className="secondary-button"
                                      type="button"
                                      disabled={isSaving || !selectedTarget}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void handleMoverComponente(asignacion, selectedEquipoDetalle, selectedTarget);
                                      }}
                                    >
                                      Mover
                                    </button>
                                    <button
                                      className="secondary-button danger-soft-button"
                                      type="button"
                                      disabled={isSaving}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void handleRetirarComponente(asignacion, selectedEquipoDetalle);
                                      }}
                                    >
                                      Retirar
                                    </button>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                          <form className="lab-component-form" onSubmit={(event) => void handleAsignarComponente(event, selectedEquipoDetalle)}>
                            <label>
                              Componente del inventario
                              <select name="componenteId" required defaultValue="">
                                <option value="" disabled>
                                  Seleccione monitor, CPU, teclado, mouse o pieza
                                </option>
                                {componentesDisponibles.map((item) => (
                                  <option value={item.id} key={item.id}>
                                    {item.codigo || 'S/N'} - {item.nombre} ({item.ubicacion || 'Sin ubicacion'})
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Tipo
                              <select name="tipo" required defaultValue="monitor">
                                <option value="cpu">CPU</option>
                                <option value="monitor">Monitor</option>
                                <option value="teclado">Teclado</option>
                                <option value="mouse">Mouse</option>
                                <option value="proyector">Proyector</option>
                                <option value="otro">Otro</option>
                              </select>
                            </label>
                            <label>
                              Detalle
                              <input name="detalle" placeholder="Ej. Monitor asignado por reemplazo de pantalla" />
                            </label>
                            <button className="secondary-button assign-component-button" type="submit" disabled={isSaving || componentesDisponibles.length === 0}>
                              <PackageCheck size={16} />
                              Asignar componente
                            </button>
                          </form>
                          <form
                            className="lab-component-create-form"
                            onSubmit={(event) => void handleCrearYAsignarComponente(event, selectedEquipoDetalle)}
                          >
                            <div className="lab-component-create-heading">
                              <span className="eyebrow">Nuevo componente</span>
                              <strong>Crear y asignar aqui mismo</strong>
                            </div>
                            <div className="form-grid compact-form-grid">
                              <label>
                                Tipo
                                <select name="nuevoComponenteTipo" required defaultValue="monitor">
                                  <option value="monitor">Monitor</option>
                                  <option value="teclado">Teclado</option>
                                  <option value="mouse">Mouse</option>
                                  <option value="proyector">Proyector</option>
                                  <option value="otro">Otro</option>
                                </select>
                              </label>
                              <label>
                                Nombre
                                <input name="nuevoComponenteNombre" placeholder={`Ej. Monitor de ${selectedEquipoDetalle.nombre}`} />
                              </label>
                            </div>
                            <div className="form-grid compact-form-grid">
                              <label>
                                Numero de inventario
                                <input name="nuevoComponenteCodigo" placeholder="Ej. 51250" />
                              </label>
                              <label>
                                Serie
                                <input name="nuevoComponenteSerie" placeholder="Ej. 3CQ329097K" />
                              </label>
                            </div>
                            <div className="form-grid compact-form-grid">
                              <label>
                                Marca
                                <input name="nuevoComponenteMarca" placeholder="Ej. HP, Dell, Logitech" />
                              </label>
                              <label>
                                Modelo
                                <input name="nuevoComponenteModelo" placeholder="Ej. P204v, K120, M90" />
                              </label>
                            </div>
                            <label>
                              Detalle
                              <input name="nuevoComponenteDetalle" placeholder="Ej. Registrado y asignado durante inventario del laboratorio" />
                            </label>
                            <button className="primary-button" type="submit" disabled={isSaving}>
                              <PackageCheck size={16} />
                              Crear y asignar componente
                            </button>
                          </form>
                        </section>

                        <section className="lab-equipment-detail-section">
                          <div className="lab-home-section-header">
                            <div>
                              <span className="eyebrow">Fichas tecnicas</span>
                              <h3>{fichasEquipo.length} registros</h3>
                            </div>
                          </div>
                          {fichasEquipo.length === 0 ? <p className="form-hint">Este equipo todavia no tiene fichas tecnicas relacionadas.</p> : null}
                          <div className="lab-equipment-detail-list">
                            {fichasEquipo.map((ficha) => (
                              <button
                                key={ficha.id}
                                type="button"
                                onClick={() => {
                                  closeEquipoDetalle();
                                  setActiveTab('fichas');
                                  setSelectedFicha(ficha);
                                }}
                              >
                                <strong>{ficha.pc}</strong>
                                <span>{formatDateTime(ficha.fecha)} | {ficha.responsable || 'Sin responsable'}</span>
                                <small>{ficha.observacionGeneral || `${ficha.acciones.length} acciones registradas`}</small>
                              </button>
                            ))}
                          </div>
                        </section>

                        <section className="lab-equipment-detail-section">
                          <div className="lab-home-section-header">
                            <div>
                              <span className="eyebrow">Bitacoras e incidencias</span>
                              <h3>{bitacorasEquipo.length} movimientos</h3>
                            </div>
                          </div>
                          {bitacorasEquipo.length === 0 ? <p className="form-hint">No hay bitacoras o incidencias relacionadas con este equipo.</p> : null}
                          <div className="lab-equipment-detail-list">
                            {bitacorasEquipo.map((bitacora) => (
                              <article key={bitacora.id}>
                                <div>
                                  <strong>{bitacora.titulo}</strong>
                                  <span>{formatDateTime(bitacora.fecha)} | {bitacora.responsable || 'Sin responsable'}</span>
                                </div>
                                <span className={`status-pill priority-${bitacora.prioridad}`}>{estadoTrabajoLabels[bitacora.estado]}</span>
                                <p>{bitacora.descripcion}</p>
                              </article>
                            ))}
                          </div>
                        </section>

                        <section className="lab-equipment-detail-section">
                          <span className="eyebrow">Observaciones del inventario</span>
                          <p>{selectedEquipoDetalle.observaciones || 'Sin observaciones registradas en inventario.'}</p>
                        </section>
                      </>
                    );
                  })()}
                </article>
              </div>
            ) : null}

            {showEquipoFormModal ? (
              <FormularioEquipoModal
                categoriasEquipo={categoriasEquipo}
                closeEquipoFormModal={closeEquipoFormModal}
                componentesNuevoEquipo={componentesNuevoEquipo}
                editingEquipo={editingEquipo}
                error={error}
                estadoEquipoNombre={estadoEquipoNombre}
                estadosEquipo={estadosEquipo}
                handleEquipoSubmit={handleEquipoSubmit}
                isSaving={isSaving}
                message={message}
                setActiveCatalogManager={setActiveCatalogManager}
                ubicacionesInventario={ubicacionesInventario}
                addComponenteNuevo={addComponenteNuevo}
                removeComponenteNuevo={removeComponenteNuevo}
                updateComponenteNuevoTipo={updateComponenteNuevoTipo}
              />
            ) : null}
          </div>
        ) : null}

        {activeTab === 'descartes' ? (
          <VistaDescartes
            descartes={state.descartes}
            equipos={state.equipos}
            isSaving={isSaving}
            responsableSesion={responsableSesion}
            selectedEquipoId={selectedDescarteEquipoId}
            selectedEquipo={selectedDescarteEquipo}
            onSelectedEquipoChange={setSelectedDescarteEquipoId}
            onSubmit={handleDescarteSubmit}
            onExcelUpload={(event) => void handleDescartesExcelUpload(event)}
            onExportExcel={exportDiscardsExcel}
            onDelete={(item) => void handleDeleteDescarte(item)}
          />
        ) : null}

        {activeTab === 'prestamos' ? (
          <PrestamosLaboratorio
            prestamos={state.prestamos}
            editingPrestamo={editingPrestamo}
            isSaving={isSaving}
            onSubmit={handlePrestamoSubmit}
            onCancelEdit={() => setEditingPrestamo(null)}
            onEdit={setEditingPrestamo}
            onDelete={(item) => void handleDeletePrestamo(item)}
          />
        ) : null}

        {activeTab === 'informes' ? (
          <div className="lab-report-grid">
            <article className="lab-report-card full">
              <Wrench size={26} />
              <h2>Informe de mantenimiento bajo demanda</h2>
              <p>Elija cualquier rango de fechas. Consolida mantenimientos efectuados, equipos atendidos, incidencias encontradas y reparaciones pendientes o en proceso.</p>
              <div className="form-grid compact-form-grid"><label>Desde<input type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} /></label><label>Hasta<input type="date" value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} /></label></div>
              <button className="primary-button" type="button" onClick={exportRangeMaintenanceReport}><Download size={18} />Descargar Excel por rango</button>
              <pre>{buildInformeMantenimientoPorRango(state, reportStartDate, reportEndDate)}</pre>
            </article>
            <article className="lab-report-card">
              <History size={26} />
              <h2>Informe mensual</h2>
              <p>Resumen ejecutivo del mes con bitacoras, fichas tecnicas, prestamos y pendientes del laboratorio.</p>
              <label>
                Mes del informe
                <input
                  type="month"
                  value={selectedReportMonth}
                  onChange={(event) => setSelectedReportMonth(event.target.value)}
                />
              </label>
              <button className="primary-button" type="button" onClick={exportMonthlyReport}>
                <Download size={18} />
                Descargar Excel
              </button>
            </article>
            <article className="lab-report-card">
              <HardDrive size={26} />
              <h2>Informe por ubicacion</h2>
              <p>Equipos y bitacoras organizadas por area: laboratorio, biblioteca, decanato, ORD u otra seccion.</p>
              <label>
                Ubicacion
                <select value={selectedReportLocation} onChange={(event) => setSelectedReportLocation(event.target.value)}>
                  {ubicacionesInventario.map((ubicacion) => (
                    <option value={ubicacion} key={ubicacion}>
                      {ubicacion}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary-button" type="button" onClick={exportLocationReport}>
                <Download size={18} />
                Descargar Excel
              </button>
            </article>
            <article className="lab-report-card">
              <Wrench size={26} />
              <h2>Pendientes tecnicos</h2>
              <p>Equipos no operativos, trabajos abiertos y prestamos activos o vencidos para seguimiento inmediato.</p>
              <button className="primary-button" type="button" onClick={exportPendingReport}>
                <Download size={18} />
                Descargar Excel
              </button>
            </article>
            <article className="lab-report-card">
              <ClipboardList size={26} />
              <h2>Historial por equipo</h2>
              <p>Ficha de seguimiento con datos del equipo, fichas tecnicas y bitacoras relacionadas.</p>
              <label>
                Equipo
                <select
                  value={selectedReportEquipoId}
                  onChange={(event) => setSelectedReportEquipoId(event.target.value)}
                >
                  <option value="">Seleccione un equipo</option>
                  {state.equipos.map((equipo) => (
                    <option value={equipo.id} key={equipo.id}>
                      {equipo.codigo} - {equipo.nombre} - {equipo.ubicacion}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondary-button" type="button" onClick={exportEquipmentHistoryReport}>
                <Download size={18} />
                Descargar historial
              </button>
            </article>
            <article className="lab-report-card">
              <HardDrive size={26} />
              <h2>Informe de inventario</h2>
              <p>Excel formal con inventario ordenado por ubicacion, categoria y equipo, mas resumen por areas.</p>
              <button className="primary-button" type="button" onClick={exportInventoryExcel}>
                <Download size={18} />
                Descargar Excel
              </button>
            </article>
            <article className="lab-report-card">
              <Trash2 size={26} />
              <h2>Informe de descartes</h2>
              <p>Excel formal con equipos descartados, inventario, serie, detalle y ubicacion, siguiendo el formato institucional.</p>
              <button className="primary-button" type="button" onClick={exportDiscardsExcel}>
                <Download size={18} />
                Descargar Excel
              </button>
            </article>
            <article className="lab-report-card">
              <ClipboardList size={26} />
              <h2>Base completa</h2>
              <p>Archivo CSV general para abrir en Excel con bitacoras, inventario, fichas y prestamos registrados.</p>
              <button className="secondary-button" type="button" onClick={exportCsv}>
                <Download size={18} />
                Descargar CSV
              </button>
            </article>
            <article className="lab-report-card">
              <History size={26} />
              <h2>Resumen TXT</h2>
              <p>Resumen rapido en texto plano para compartir o pegar en una nota administrativa.</p>
              <button className="secondary-button" type="button" onClick={exportReport}>
                <Download size={18} />
                Descargar TXT
              </button>
            </article>
            <article className="lab-report-card full">
              <h2>Vista previa del informe</h2>
              <pre>{buildLaboratorioReport(state)}</pre>
            </article>
          </div>
        ) : null}


            {confirmacionOperativo ? (
              <div className="modal-backdrop" role="presentation" onClick={() => setConfirmacionOperativo(null)}>
                <article
                  className="modal-panel lab-confirm-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-confirm-operativo-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="lab-catalog-modal-header">
                    <div>
                      <span className="eyebrow">Confirmacion de inventario</span>
                      <h2 id="lab-confirm-operativo-title">Devolver equipo a operativo</h2>
                    </div>
                    <button className="icon-button" type="button" onClick={() => setConfirmacionOperativo(null)} title="Cerrar">
                      <XCircle size={18} />
                    </button>
                  </header>
                  <p>
                    Este registro esta resuelto o cerrado. Desea devolver el equipo{' '}
                    <strong>{confirmacionOperativo.equipoAtendido.codigo} - {confirmacionOperativo.equipoAtendido.nombre}</strong> a estado operativo en el inventario?
                  </p>
                  <div className="lab-confirm-actions">
                    <button
                      className="primary-button"
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        const pending = confirmacionOperativo;
                        setConfirmacionOperativo(null);
                        void guardarBitacoraConInventario(pending.input, pending.equipoAtendido, pending.nextEquipoEstado, true, pending.form);
                      }}
                    >
                      Si, devolver a operativo
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        const pending = confirmacionOperativo;
                        setConfirmacionOperativo(null);
                        void guardarBitacoraConInventario(pending.input, pending.equipoAtendido, pending.nextEquipoEstado, false, pending.form);
                      }}
                    >
                      No, solo guardar bitacora
                    </button>
                  </div>
                </article>
              </div>
            ) : null}

            {activeCatalogManager === 'categorias' ? (
              <div className="modal-backdrop" role="presentation" onClick={closeCatalogManager}>
                <article
                  className="modal-panel lab-catalog-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-category-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="lab-catalog-modal-header">
                    <div>
                      <span className="eyebrow">Categorias</span>
                      <h2 id="lab-category-title">{editingCategoria ? 'Editar categoria' : 'Agregar categoria'}</h2>
                    </div>
                    <button className="secondary-button" type="button" onClick={closeCatalogManager}>
                      Cerrar
                    </button>
                  </header>
                  <form
                    className="stack-form"
                    onSubmit={(event) => void handleCatalogoSubmit(event, 'categoria_equipo', editingCategoria)}
                    key={editingCategoria?.id ?? 'new-category-modal'}
                  >
                    <div className="form-grid compact-form-grid">
                      <label>
                        Nombre
                        <input name="nombre" required placeholder="Ej. Tablet" defaultValue={editingCategoria?.nombre} />
                      </label>
                      <label>
                        Descripcion
                        <input name="descripcion" placeholder="Opcional" defaultValue={editingCategoria?.descripcion} />
                      </label>
                    </div>
                    <div className="page-actions">
                      <button className="primary-button" type="submit" disabled={isSaving}>
                        <Save size={18} />
                        {editingCategoria ? 'Actualizar categoria' : 'Guardar categoria'}
                      </button>
                      {editingCategoria ? (
                        <button className="secondary-button" type="button" onClick={() => setEditingCategoria(null)}>
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </form>
                  <div className="lab-section-list">
                    {state.categoriasEquipo.map((categoria) => (
                      <article key={categoria.id}>
                        <div>
                          <strong>{categoria.nombre}</strong>
                          {categoria.descripcion ? <small>{categoria.descripcion}</small> : null}
                        </div>
                        <span>{state.equipos.filter((equipo) => equipo.categoria === categoria.nombre).length}</span>
                        <button className="icon-button" type="button" title="Editar categoria" onClick={() => setEditingCategoria(categoria)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger-button"
                          type="button"
                          title="Eliminar categoria"
                          onClick={() => void handleDeleteCatalogo(categoria)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                </article>
              </div>
            ) : null}

            {activeCatalogManager === 'estados' ? (
              <div className="modal-backdrop" role="presentation" onClick={closeCatalogManager}>
                <article
                  className="modal-panel lab-catalog-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-status-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="lab-catalog-modal-header">
                    <div>
                      <span className="eyebrow">Estados</span>
                      <h2 id="lab-status-title">{editingEstadoEquipo ? 'Editar estado' : 'Agregar estado'}</h2>
                    </div>
                    <button className="secondary-button" type="button" onClick={closeCatalogManager}>
                      Cerrar
                    </button>
                  </header>
                  <form
                    className="stack-form"
                    onSubmit={(event) => void handleCatalogoSubmit(event, 'estado_equipo', editingEstadoEquipo)}
                    key={editingEstadoEquipo?.id ?? 'new-status-modal'}
                  >
                    <div className="form-grid compact-form-grid">
                      <label>
                        Valor interno
                        <input name="nombre" required placeholder="Ej. mantenimiento_preventivo" defaultValue={editingEstadoEquipo?.nombre} />
                      </label>
                      <label>
                        Nombre visible
                        <input name="descripcion" placeholder="Ej. Mantenimiento preventivo" defaultValue={editingEstadoEquipo?.descripcion} />
                      </label>
                    </div>
                    <div className="page-actions">
                      <button className="primary-button" type="submit" disabled={isSaving}>
                        <Save size={18} />
                        {editingEstadoEquipo ? 'Actualizar estado' : 'Guardar estado'}
                      </button>
                      {editingEstadoEquipo ? (
                        <button className="secondary-button" type="button" onClick={() => setEditingEstadoEquipo(null)}>
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </form>
                  <div className="lab-section-list">
                    {state.estadosEquipo.map((estado) => (
                      <article key={estado.id}>
                        <div>
                          <strong>{estado.descripcion || getEstadoEquipoLabel(estado.nombre)}</strong>
                          <small>{estado.nombre}</small>
                        </div>
                        <span>{state.equipos.filter((equipo) => equipo.estado === estado.nombre).length}</span>
                        <button className="icon-button" type="button" title="Editar estado" onClick={() => setEditingEstadoEquipo(estado)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger-button"
                          type="button"
                          title="Eliminar estado"
                          onClick={() => void handleDeleteCatalogo(estado)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                </article>
              </div>
            ) : null}
            {activeCatalogManager === 'secciones' ? (
              <div className="modal-backdrop" role="presentation" onClick={closeCatalogManager}>
                <article
                  className="modal-panel lab-catalog-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-catalog-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="lab-catalog-modal-header">
                    <div>
                      <span className="eyebrow">Ubicaciones</span>
                      <h2 id="lab-catalog-title">{editingSeccion ? 'Editar ubicacion' : 'Agregar ubicacion'}</h2>
                    </div>
                    <button className="secondary-button" type="button" onClick={closeCatalogManager}>
                      Cerrar
                    </button>
                  </header>
                  <form className="stack-form" onSubmit={handleSeccionSubmit} key={editingSeccion?.id ?? 'new-section-modal'}>
                    <div className="form-grid compact-form-grid">
                      <label>
                        Nombre
                        <input name="nombre" required placeholder="Ej. Decanato" defaultValue={editingSeccion?.nombre} />
                      </label>
                      <label>
                        Descripcion
                        <input name="descripcion" placeholder="Opcional" defaultValue={editingSeccion?.descripcion} />
                      </label>
                    </div>
                    <div className="page-actions">
                      <button className="primary-button" type="submit" disabled={isSaving}>
                        <Save size={18} />
                        {editingSeccion ? 'Actualizar ubicacion' : 'Guardar ubicacion'}
                      </button>
                      {editingSeccion ? (
                        <button className="secondary-button" type="button" onClick={() => setEditingSeccion(null)}>
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </form>
                  <div className="lab-section-list">
                    {state.secciones.map((seccion) => (
                      <article key={seccion.id}>
                        <div>
                          <strong>{seccion.nombre}</strong>
                          {seccion.descripcion ? <small>{seccion.descripcion}</small> : null}
                        </div>
                        <span>{state.equipos.filter((equipo) => equipo.ubicacion === seccion.nombre).length}</span>
                        <button className="icon-button" type="button" title="Editar ubicacion" onClick={() => setEditingSeccion(seccion)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger-button"
                          type="button"
                          title="Eliminar ubicacion"
                          onClick={() => void handleDeleteSeccion(seccion)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                </article>
              </div>
            ) : null}
      </section>
    </div>
  );
}

