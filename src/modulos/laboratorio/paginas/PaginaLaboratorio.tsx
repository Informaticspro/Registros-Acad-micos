import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Settings2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BitacoraLaboratorioInput,
  EquipoLaboratorioInput,
  FichaTecnicaLaboratorioInput,
  LaboratorioState,
  PrestamoLaboratorioInput,
  createAsignacionComponenteLaboratorio,
  createBitacoraLaboratorio,
  createDescarteLaboratorio,
  createEquipoLaboratorio,
  createFichaTecnicaLaboratorio,
  deleteBitacoraLaboratorio,
  deleteDescarteLaboratorio,
  deleteEquipoLaboratorio,
  deleteFichaTecnicaLaboratorio,
  importEquiposLaboratorio,
  listLaboratorioData,
  retirarAsignacionComponenteLaboratorio,
  updateBitacoraLaboratorio,
  updateEquipoLaboratorio,
  updateFichaTecnicaLaboratorio,
} from '@/servicios/laboratorio.servicio';
import {
  AsignacionComponenteLaboratorio,
  BitacoraLaboratorio,
  DescarteLaboratorio,
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
  EstadoTrabajoLaboratorio,
  ClaseRegistroLaboratorio,
  FichaTecnicaLaboratorio,
  PrioridadLaboratorio,
} from '@/tipos/dominio';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { formatDateTime } from '@/utilidades/formato';
import { EncabezadoLaboratorio } from '@/modulos/laboratorio/componentes/EncabezadoLaboratorio';
import { InicioLaboratorio } from '@/modulos/laboratorio/componentes/InicioLaboratorio';
import { PestanasLaboratorio } from '@/modulos/laboratorio/componentes/PestanasLaboratorio';
import { ConfirmacionOperativoModal } from '@/modulos/laboratorio/componentes/bitacoras/ConfirmacionOperativoModal';
import { VistaBitacoras } from '@/modulos/laboratorio/componentes/bitacoras/VistaBitacoras';
import { GestorCatalogosModal } from '@/modulos/laboratorio/componentes/catalogos/GestorCatalogosModal';
import { VistaDescartes } from '@/modulos/laboratorio/componentes/descartes/VistaDescartes';
import { VistaFichasTecnicas } from '@/modulos/laboratorio/componentes/fichas/VistaFichasTecnicas';
import { FormularioEquipoModal } from '@/modulos/laboratorio/componentes/inventario/FormularioEquipoModal';
import { VistaInventario } from '@/modulos/laboratorio/componentes/inventario/VistaInventario';
import { ExpedienteEquipoModal } from '@/modulos/laboratorio/componentes/inventario/ExpedienteEquipoModal';
import { VistaInformes } from '@/modulos/laboratorio/componentes/informes/VistaInformes';
import { PrestamosLaboratorio } from '@/modulos/laboratorio/componentes/prestamos/VistaPrestamos';
import { useActividadLaboratorio } from '@/modulos/laboratorio/hooks/useActividadLaboratorio';
import { useCatalogosLaboratorio } from '@/modulos/laboratorio/hooks/useCatalogosLaboratorio';
import { useEquipoFormModal } from '@/modulos/laboratorio/hooks/useEquipoFormModal';
import { useInventarioLaboratorio } from '@/modulos/laboratorio/hooks/useInventarioLaboratorio';
import { usePrestamosLaboratorio } from '@/modulos/laboratorio/hooks/usePrestamosLaboratorio';
import { useReportesLaboratorio } from '@/modulos/laboratorio/hooks/useReportesLaboratorio';
import {
  emptyState,
  estadoEquipoLabels,
} from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import {
  buildBitacoraInput,
  buildComponentesInicialesInput,
  buildDescarteInput,
  buildDuplicateEquipoMessage,
  buildEquipoInput,
  buildFichaTecnicaInput,
  filterUniqueEquipoInputsForImport,
  findDuplicateEquipoIdentity,
  getCategoriaComponenteDesdeTipo,
  getEstadoChangeWorkStatus,
  getEstadoChangeWorkType,
  getEstadoEquipoLabel,
  getInitialTheme,
  normalizeExcelKey,
  normalizeUniqueEquipoValue,
  parseDescartesExcelRows,
  parseEquipoExcelRow,
  readString,
  resolveInventoryStatusFromBitacora,
  shouldImportEquipoRow,
  shouldRequestIssueDetailForEstado,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';
import {
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
  const [selectedFicha, setSelectedFicha] = useState<FichaTecnicaLaboratorio | null>(null);
  const [selectedEquipoFichaId, setSelectedEquipoFichaId] = useState('');
  const [selectedDescarteEquipoId, setSelectedDescarteEquipoId] = useState('');
  const [selectedReportMonth, setSelectedReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportStartDate, setReportStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedReportLocation, setSelectedReportLocation] = useState('Todas');
  const [selectedReportEquipoId, setSelectedReportEquipoId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<TemaVisual>(getInitialTheme);
  const [confirmacionOperativo, setConfirmacionOperativo] = useState<ConfirmacionOperativoPendiente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const saveContext = useMemo(
    () => ({
      organizationId: profile?.organizationId ?? null,
      userId: profile?.id ?? '',
    }),
    [profile?.id, profile?.organizationId],
  );
  const responsableSesion = profile?.fullName || profile?.email || 'Soporte tecnico';
  const isLightTheme = theme === 'light';

  const {
    addComponenteNuevo,
    closeEquipoFormModal,
    componentesNuevoEquipo,
    editingEquipo,
    openEditarEquipoModal,
    openNuevoEquipoModal,
    removeComponenteNuevo,
    showEquipoFormModal,
    updateComponenteNuevoTipo,
  } = useEquipoFormModal();

  const {
    activeCatalogManager,
    closeCatalogManager,
    editingCategoria,
    editingEstadoEquipo,
    editingSeccion,
    handleCatalogoSubmit,
    handleDeleteCatalogo,
    handleDeleteSeccion,
    handleSeccionSubmit,
    setActiveCatalogManager,
    setEditingCategoria,
    setEditingEstadoEquipo,
    setEditingSeccion,
  } = useCatalogosLaboratorio({
    refresh,
    saveContext,
    setError,
    setIsSaving,
    setMessage,
  });

  const { editingPrestamo, handleDeletePrestamo, handlePrestamoSubmit, setEditingPrestamo } = usePrestamosLaboratorio({
    refresh,
    saveContext,
    setError,
    setIsSaving,
    setMessage,
  });

  const selectedEquipoFicha = useMemo(
    () => state.equipos.find((item) => item.id === selectedEquipoFichaId) ?? null,
    [selectedEquipoFichaId, state.equipos],
  );

  const selectedDescarteEquipo = useMemo(
    () => state.equipos.find((item) => item.id === selectedDescarteEquipoId) ?? null,
    [selectedDescarteEquipoId, state.equipos],
  );

  const {
    componentMoveTargets,
    componentesAsignadosActivosIds,
    equipoDetalleHistory,
    equiposComponentesAsignados,
    equiposInventarioFiltrados,
    equiposInventarioPrincipales,
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
  } = useInventarioLaboratorio(state);

  const {
    exportCsv,
    exportDiscardsExcel,
    exportEquipmentHistoryById,
    exportEquipmentHistoryReport,
    exportInventoryExcel,
    exportLocationReport,
    exportMonthlyReport,
    exportPendingReport,
    exportRangeMaintenanceReport,
    exportReport,
  } = useReportesLaboratorio({
    reportEndDate,
    reportStartDate,
    selectedReportEquipoId,
    selectedReportLocation,
    selectedReportMonth,
    setError,
    setMessage,
    state,
  });

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

  const {
    actividadReciente,
    indicadores,
    setShowMoreActivity,
    showMoreActivity,
  } = useActividadLaboratorio({
    estadoEquipoNombre,
    profile,
    state,
  });

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
              getFilterCount={getInventoryFilterCount}
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
              <ExpedienteEquipoModal
                backEquipoDetalle={backEquipoDetalle}
                closeEquipoDetalle={closeEquipoDetalle}
                componentMoveTargets={componentMoveTargets}
                equipoDetalleHistory={equipoDetalleHistory}
                error={error}
                estadoEquipoNombre={estadoEquipoNombre}
                getAsignacionesActivasEquipo={getAsignacionesActivasEquipo}
                getBitacorasEquipo={getBitacorasEquipo}
                getComponentesDisponibles={getComponentesDisponibles}
                getEquipoById={getEquipoById}
                getEquiposDestinoComponente={getEquiposDestinoComponente}
                getFichasEquipo={getFichasEquipo}
                getUltimoMantenimientoEquipo={getUltimoMantenimientoEquipo}
                handleAsignarComponente={(event, equipo) => void handleAsignarComponente(event, equipo)}
                handleCrearYAsignarComponente={(event, equipo) => void handleCrearYAsignarComponente(event, equipo)}
                handleMoverComponente={(asignacion, equipo, nuevoEquipoId) =>
                  void handleMoverComponente(asignacion, equipo, nuevoEquipoId)
                }
                handleRetirarComponente={(asignacion, equipo) => void handleRetirarComponente(asignacion, equipo)}
                isSaving={isSaving}
                message={message}
                selectedEquipoDetalle={selectedEquipoDetalle}
                setComponentMoveTargets={setComponentMoveTargets}
                onDownloadHistorial={(equipo) => exportEquipmentHistoryById(equipo.id)}
                onEditEquipo={openEditarEquipoModal}
                onOpenEquipoDetalle={openEquipoDetalle}
                onOpenFichaForEquipo={openFichaForEquipo}
                onOpenFichaRecord={(ficha) => {
                  closeEquipoDetalle();
                  setActiveTab("fichas");
                  setSelectedFicha(ficha);
                }}
              />
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
          <VistaInformes
            reportEndDate={reportEndDate}
            reportStartDate={reportStartDate}
            selectedReportEquipoId={selectedReportEquipoId}
            selectedReportLocation={selectedReportLocation}
            selectedReportMonth={selectedReportMonth}
            state={state}
            ubicacionesInventario={ubicacionesInventario}
            exportCsv={exportCsv}
            exportDiscardsExcel={exportDiscardsExcel}
            exportEquipmentHistoryReport={exportEquipmentHistoryReport}
            exportInventoryExcel={exportInventoryExcel}
            exportLocationReport={exportLocationReport}
            exportMonthlyReport={exportMonthlyReport}
            exportPendingReport={exportPendingReport}
            exportRangeMaintenanceReport={exportRangeMaintenanceReport}
            exportReport={exportReport}
            setReportEndDate={setReportEndDate}
            setReportStartDate={setReportStartDate}
            setSelectedReportEquipoId={setSelectedReportEquipoId}
            setSelectedReportLocation={setSelectedReportLocation}
            setSelectedReportMonth={setSelectedReportMonth}
          />
        ) : null}


            <ConfirmacionOperativoModal
              confirmacion={confirmacionOperativo}
              isSaving={isSaving}
              onClose={() => setConfirmacionOperativo(null)}
              onConfirm={(shouldSyncEquipoEstado) => {
                if (!confirmacionOperativo) return;
                const pending = confirmacionOperativo;
                setConfirmacionOperativo(null);
                void guardarBitacoraConInventario(
                  pending.input,
                  pending.equipoAtendido,
                  pending.nextEquipoEstado,
                  shouldSyncEquipoEstado,
                  pending.form,
                );
              }}
            />

            <GestorCatalogosModal
              activeCatalogManager={activeCatalogManager}
              closeCatalogManager={closeCatalogManager}
              editingCategoria={editingCategoria}
              editingEstadoEquipo={editingEstadoEquipo}
              editingSeccion={editingSeccion}
              handleCatalogoSubmit={(event, tipo, item) => void handleCatalogoSubmit(event, tipo, item)}
              handleDeleteCatalogo={(item) => void handleDeleteCatalogo(item)}
              handleDeleteSeccion={(item) => void handleDeleteSeccion(item)}
              handleSeccionSubmit={(event) => void handleSeccionSubmit(event)}
              isSaving={isSaving}
              setEditingCategoria={setEditingCategoria}
              setEditingEstadoEquipo={setEditingEstadoEquipo}
              setEditingSeccion={setEditingSeccion}
              state={state}
            />
      </section>
    </div>
  );
}

