import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Settings2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LaboratorioState,
  PrestamoLaboratorioInput,
  createBitacoraLaboratorio,
  createDescarteLaboratorio,
  deleteDescarteLaboratorio,
  deleteEquipoLaboratorio,
  importEquiposLaboratorio,
  listLaboratorioData,
} from '@/servicios/laboratorio.servicio';
import {
  DescarteLaboratorio,
  EquipoLaboratorio,
  EstadoTrabajoLaboratorio,
  ClaseRegistroLaboratorio,
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
import { useBitacorasLaboratorio } from '@/modulos/laboratorio/hooks/useBitacorasLaboratorio';
import { useCatalogosLaboratorio } from '@/modulos/laboratorio/hooks/useCatalogosLaboratorio';
import { useComponentesLaboratorio } from '@/modulos/laboratorio/hooks/useComponentesLaboratorio';
import { useEquipoFormModal } from '@/modulos/laboratorio/hooks/useEquipoFormModal';
import { useEquiposLaboratorioCrud } from '@/modulos/laboratorio/hooks/useEquiposLaboratorioCrud';
import { useFichasLaboratorio } from '@/modulos/laboratorio/hooks/useFichasLaboratorio';
import { useInventarioLaboratorio } from '@/modulos/laboratorio/hooks/useInventarioLaboratorio';
import { usePrestamosLaboratorio } from '@/modulos/laboratorio/hooks/usePrestamosLaboratorio';
import { useReportesLaboratorio } from '@/modulos/laboratorio/hooks/useReportesLaboratorio';
import {
  emptyState,
  estadoEquipoLabels,
} from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import {
  buildDescarteInput,
  filterUniqueEquipoInputsForImport,
  getEstadoEquipoLabel,
  getInitialTheme,
  normalizeExcelKey,
  parseDescartesExcelRows,
  parseEquipoExcelRow,
  readString,
  shouldImportEquipoRow,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';
import {
  type LabTab,
  type TemaVisual,
} from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';

export function PaginaLaboratorio() {
  const navigate = useNavigate();
  const { profile } = useAutenticacion();
  const [activeTab, setActiveTab] = useState<LabTab>('inicio');
  const [state, setState] = useState<LaboratorioState>(emptyState);
  const [selectedDescarteEquipoId, setSelectedDescarteEquipoId] = useState('');
  const [selectedReportMonth, setSelectedReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportStartDate, setReportStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedReportLocation, setSelectedReportLocation] = useState('Todas');
  const [selectedReportEquipoId, setSelectedReportEquipoId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<TemaVisual>(getInitialTheme);
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

  const {
    editingFicha,
    handleDeleteFicha,
    handleFichaSubmit,
    openFichaForEquipo: openFichaForEquipoBase,
    selectedEquipoFicha,
    selectedEquipoFichaId,
    selectedFicha,
    setEditingFicha,
    setSelectedEquipoFichaId,
    setSelectedFicha,
  } = useFichasLaboratorio({
    equipos: state.equipos,
    refresh,
    saveContext,
    setError,
    setIsSaving,
    setMessage,
  });

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
    handleAsignarComponente,
    handleCrearYAsignarComponente,
    handleMoverComponente,
    handleRetirarComponente,
  } = useComponentesLaboratorio({
    equipos: state.equipos,
    getEquipoById,
    refresh,
    responsableSesion,
    saveContext,
    setComponentMoveTargets,
    setError,
    setIsSaving,
    setMessage,
  });

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
    handleEquipoSubmit,
    handleQuickEstadoEquipo,
  } = useEquiposLaboratorioCrud({
    closeEquipoFormModal,
    componentesNuevoEquipo,
    editingEquipo,
    equipos: state.equipos,
    estadoEquipoNombre,
    refresh,
    responsableSesion,
    saveContext,
    setError,
    setIsSaving,
    setMessage,
  });

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

  const {
    confirmacionOperativo,
    editingBitacora,
    guardarBitacoraConInventario,
    handleBitacoraSubmit,
    handleDeleteBitacora,
    setConfirmacionOperativo,
    setEditingBitacora,
  } = useBitacorasLaboratorio({
    equipos: state.equipos,
    estadoEquipoNombre,
    refresh,
    saveContext,
    setError,
    setIsSaving,
    setMessage,
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
    openFichaForEquipoBase(equipo);
    setActiveTab('fichas');
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

