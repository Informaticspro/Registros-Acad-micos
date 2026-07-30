import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  Download,
  Eye,
  HardDrive,
  History,
  PackageCheck,
  Pencil,
  Save,
  Trash2,
  Upload,
  Wrench,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BitacoraLaboratorioInput,
  EquipoLaboratorioInput,
  FichaTecnicaLaboratorioInput,
  LaboratorioState,
  PrestamoLaboratorioInput,
  buildLaboratorioReport,
  createBitacoraLaboratorio,
  createEquipoLaboratorio,
  createFichaTecnicaLaboratorio,
  createPrestamoLaboratorio,
  deleteBitacoraLaboratorio,
  deleteEquipoLaboratorio,
  deleteFichaTecnicaLaboratorio,
  deletePrestamoLaboratorio,
  exportLaboratorioCsv,
  importEquiposLaboratorio,
  listLaboratorioData,
  updateBitacoraLaboratorio,
  updateEquipoLaboratorio,
  updateFichaTecnicaLaboratorio,
  updatePrestamoLaboratorio,
} from '@/servicios/laboratorio.servicio';
import {
  BitacoraLaboratorio,
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
  EstadoTrabajoLaboratorio,
  FichaTecnicaLaboratorio,
  PrestamoLaboratorio,
  PrioridadLaboratorio,
} from '@/tipos/dominio';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { formatDateTime } from '@/utilidades/formato';

type LabTab = 'fichas' | 'bitacoras' | 'inventario' | 'prestamos' | 'informes';

const emptyState: LaboratorioState = {
  fichas: [],
  equipos: [],
  bitacoras: [],
  prestamos: [],
};

const tabLabels: Record<LabTab, string> = {
  fichas: 'Ficha tecnica',
  bitacoras: 'Bitacoras',
  inventario: 'Inventario',
  prestamos: 'Prestamos',
  informes: 'Informes',
};

const aplicacionesBase = [
  'Windows',
  'Linux',
  'Office',
  'LibreOffice',
  'Visual Basic',
  'Navegador',
  'Antivirus',
  'WinRAR',
  'Adobe Reader',
  'SPSS',
] as const;

const caracteristicasBase = ['Tarjeta madre', 'Memoria', 'Procesador', 'Disco duro', 'Sistema operativo'] as const;

const inventarioBase = ['Torre', 'Monitor', 'Teclado', 'Mouse', 'UPS', 'Impresora'] as const;

const estadoEquipoLabels: Record<EstadoEquipoLaboratorio, string> = {
  operativo: 'Operativo',
  en_reparacion: 'En reparacion',
  prestado: 'Prestado',
  baja: 'Baja',
  pendiente_revision: 'Pendiente de revision',
};

const estadoTrabajoLabels: Record<EstadoTrabajoLaboratorio, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

const prioridadLabels: Record<PrioridadLaboratorio, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Critica',
};

function localDateTimeValue(value = new Date()) {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function readString(data: FormData, key: string) {
  return String(data.get(key) ?? '').trim();
}

function normalizeExcelKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function readExcelCell(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeExcelKey);
  const entry = Object.entries(row).find(([key]) => normalizedAliases.includes(normalizeExcelKey(key)));
  return String(entry?.[1] ?? '').trim();
}

function normalizeEstadoEquipo(value: string): EstadoEquipoLaboratorio {
  const normalized = normalizeExcelKey(value);

  if (normalized.includes('repar')) return 'en_reparacion';
  if (normalized.includes('prest')) return 'prestado';
  if (normalized.includes('baja') || normalized.includes('descart')) return 'baja';
  if (normalized.includes('pend') || normalized.includes('revision')) return 'pendiente_revision';
  return 'operativo';
}

function splitMarcaModelo(value: string) {
  const normalized = value.trim();
  if (!normalized) return { marca: 'S/N', modelo: 'S/N' };

  const separatorMatch = normalized.match(/^(.+?)(?:\s+[-/|]\s+|\s{2,})(.+)$/);
  if (separatorMatch) {
    return { marca: separatorMatch[1].trim() || 'S/N', modelo: separatorMatch[2].trim() || 'S/N' };
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) return { marca: parts[0], modelo: 'S/N' };

  return { marca: parts[0], modelo: parts.slice(1).join(' ') };
}

function parseEquipoExcelRow(row: Record<string, unknown>, index: number): EquipoLaboratorioInput {
  const codigo =
    readExcelCell(row, ['codigo', 'codigo interno', 'inventario', 'n inventario', 'numero inventario', 'placa', 'asset', 'id']) ||
    `IMPORT-${index + 1}`;
  const nombre =
    readExcelCell(row, ['nombre', 'equipo', 'dispositivo', 'descripcion', 'pc', 'computadora']) || `Equipo ${codigo}`;
  const marca = readExcelCell(row, ['marca modelo', 'marca/modelo', 'marca', 'brand model']);
  const modelo = readExcelCell(row, ['modelo']);
  const marcaModelo = marca && modelo && !marca.toLowerCase().includes(modelo.toLowerCase()) ? `${marca} ${modelo}` : marca;

  return {
    codigo,
    nombre,
    categoria: readExcelCell(row, ['categoria', 'tipo', 'clase']) || 'Computadora',
    marcaModelo,
    serie: readExcelCell(row, ['serie', 'serial', 'numero serie', 's/n', 'sn']),
    ubicacion: readExcelCell(row, ['ubicacion', 'lugar', 'area', 'laboratorio', 'salon']) || 'Sin ubicacion',
    estado: normalizeEstadoEquipo(readExcelCell(row, ['estado', 'status', 'condicion'])),
    observaciones: readExcelCell(row, ['observaciones', 'observacion', 'notas', 'nota', 'detalle']),
  };
}

function downloadTextFile(content: string, fileName: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function buildBitacoraInput(form: HTMLFormElement): BitacoraLaboratorioInput {
  const data = new FormData(form);
  return {
    fecha: new Date(readString(data, 'fecha')).toISOString(),
    tipoTrabajo: readString(data, 'tipoTrabajo'),
    titulo: readString(data, 'titulo'),
    descripcion: readString(data, 'descripcion'),
    responsable: readString(data, 'responsable'),
    prioridad: readString(data, 'prioridad') as PrioridadLaboratorio,
    estado: readString(data, 'estado') as EstadoTrabajoLaboratorio,
    equipoOrigen: readString(data, 'equipoOrigen'),
    equipoDestino: readString(data, 'equipoDestino'),
    ubicacion: readString(data, 'ubicacion'),
    evidenciaTitulo: readString(data, 'evidenciaTitulo'),
    evidenciaUrl: readString(data, 'evidenciaUrl'),
  };
}

function buildFichaTecnicaInput(form: HTMLFormElement): FichaTecnicaLaboratorioInput {
  const data = new FormData(form);

  return {
    fecha: new Date(readString(data, 'fecha')).toISOString(),
    pc: readString(data, 'pc'),
    direccionIp: readString(data, 'direccionIp'),
    ubicacion: readString(data, 'ubicacion'),
    responsable: readString(data, 'responsable'),
    usuarioAsignado: readString(data, 'usuarioAsignado'),
    referenciaAcceso: readString(data, 'referenciaAcceso'),
    aplicaciones: aplicacionesBase.map((nombre) => ({
      nombre,
      instalada: data.get(`app-${nombre}`) === 'on',
      observacion: readString(data, `appObs-${nombre}`),
    })),
    caracteristicas: caracteristicasBase.map((nombre) => ({
      nombre,
      valor: readString(data, `caracteristica-${nombre}`),
    })),
    inventario: inventarioBase.map((equipo) => ({
      equipo,
      numero: readString(data, `inventario-${equipo}`),
    })),
    acciones: Array.from({ length: 6 }, (_, index) => ({
      fecha: readString(data, `accionFecha-${index}`),
      accion: readString(data, `accion-${index}`),
      observacion: readString(data, `accionObs-${index}`),
      responsable: readString(data, `accionResponsable-${index}`),
    })).filter((accion) => accion.fecha || accion.accion || accion.observacion || accion.responsable),
    observacionGeneral: readString(data, 'observacionGeneral'),
  };
}

function buildEquipoInput(form: HTMLFormElement): EquipoLaboratorioInput {
  const data = new FormData(form);
  return {
    codigo: readString(data, 'codigo'),
    nombre: readString(data, 'nombre'),
    categoria: readString(data, 'categoria'),
    marcaModelo: readString(data, 'marcaModelo'),
    serie: readString(data, 'serie'),
    ubicacion: readString(data, 'ubicacion'),
    estado: readString(data, 'estado') as EstadoEquipoLaboratorio,
    observaciones: readString(data, 'observaciones'),
  };
}

function buildPrestamoInput(form: HTMLFormElement): PrestamoLaboratorioInput {
  const data = new FormData(form);
  const fechaDevolucion = readString(data, 'fechaDevolucion');

  return {
    equipo: readString(data, 'equipo'),
    entregadoA: readString(data, 'entregadoA'),
    tipoBeneficiario: readString(data, 'tipoBeneficiario') as PrestamoLaboratorioInput['tipoBeneficiario'],
    documento: readString(data, 'documento'),
    responsableEntrega: readString(data, 'responsableEntrega'),
    fechaPrestamo: new Date(readString(data, 'fechaPrestamo')).toISOString(),
    fechaDevolucion: fechaDevolucion ? new Date(fechaDevolucion).toISOString() : null,
    estado: readString(data, 'estado') as PrestamoLaboratorioInput['estado'],
    observaciones: readString(data, 'observaciones'),
  };
}

export function PaginaLaboratorio() {
  const navigate = useNavigate();
  const { profile } = useAutenticacion();
  const [activeTab, setActiveTab] = useState<LabTab>('fichas');
  const [state, setState] = useState<LaboratorioState>(emptyState);
  const [editingFicha, setEditingFicha] = useState<FichaTecnicaLaboratorio | null>(null);
  const [editingBitacora, setEditingBitacora] = useState<BitacoraLaboratorio | null>(null);
  const [editingEquipo, setEditingEquipo] = useState<EquipoLaboratorio | null>(null);
  const [editingPrestamo, setEditingPrestamo] = useState<PrestamoLaboratorio | null>(null);
  const [selectedFicha, setSelectedFicha] = useState<FichaTecnicaLaboratorio | null>(null);
  const [selectedEquipoFichaId, setSelectedEquipoFichaId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const saveContext = useMemo(
    () => ({
      organizationId: profile?.organizationId ?? null,
      userId: profile?.id ?? '',
    }),
    [profile?.id, profile?.organizationId],
  );

  const selectedEquipoFicha = useMemo(
    () => state.equipos.find((item) => item.id === selectedEquipoFichaId) ?? null,
    [selectedEquipoFichaId, state.equipos],
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
    void refresh();
  }, []);

  useEffect(() => {
    if (!selectedFicha) return undefined;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedFicha(null);
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedFicha]);

  const indicadores = useMemo(() => {
    const trabajosAbiertos = state.bitacoras.filter((item) => item.estado !== 'cerrado').length;
    const equiposPendientes = state.equipos.filter((item) => item.estado !== 'operativo').length;
    const prestamosActivos = state.prestamos.filter((item) => item.estado === 'activo').length;
    const evidencias = state.bitacoras.filter((item) => item.evidenciaUrl || item.evidenciaTitulo).length;

    return { trabajosAbiertos, equiposPendientes, prestamosActivos, evidencias };
  }, [state]);

  async function handleFichaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildFichaTecnicaInput(form);

    setIsSaving(true);
    setError(null);
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

  async function handleBitacoraSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildBitacoraInput(form);

    setIsSaving(true);
    setError(null);
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

    setIsSaving(true);
    setError(null);
    try {
      if (editingEquipo) {
        await updateEquipoLaboratorio(editingEquipo.id, input);
        setEditingEquipo(null);
        setMessage('Equipo actualizado correctamente.');
      } else {
        await createEquipoLaboratorio(input, saveContext);
        setMessage('Equipo agregado al inventario.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el equipo.');
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

  async function handleDeletePrestamo(item: PrestamoLaboratorio) {
    if (!window.confirm(`Desea eliminar el prestamo de "${item.equipo}"?`)) return;
    await deletePrestamoLaboratorio(item.id);
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
      const inputs = rows.map(parseEquipoExcelRow).filter((item) => item.codigo && item.nombre);
      const result = await importEquiposLaboratorio(inputs, saveContext);

      await refresh();
      setActiveTab('inventario');
      setMessage(
        `Inventario importado: ${result.created} equipos nuevos, ${result.updated} actualizados y ${result.ignored} filas ignoradas.`,
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo importar el inventario.');
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

  return (
    <div className="lab-workspace">
      <header className="lab-workspace-header">
        <button className="secondary-button" type="button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} />
          Volver al sistema
        </button>
        <div className="lab-workspace-title">
          <span className="eyebrow">Area exclusiva de soporte</span>
          <h1>Mantenimiento tecnico</h1>
          <p>Bitacoras, inventario, evidencias, prestamos e informes del laboratorio de informatica.</p>
        </div>
        <div className="lab-header-side">
          <div className="lab-workspace-badge">
            <Wrench size={18} />
            Modo tecnico
          </div>
          <div className="lab-quick-stats" aria-label="Resumen rapido de laboratorio">
            <div>
              <Wrench size={16} />
              <span>Trabajos</span>
              <strong>{indicadores.trabajosAbiertos}</strong>
            </div>
            <div>
              <HardDrive size={16} />
              <span>Equipos</span>
              <strong>{indicadores.equiposPendientes}</strong>
            </div>
            <div>
              <PackageCheck size={16} />
              <span>Prestamos</span>
              <strong>{indicadores.prestamosActivos}</strong>
            </div>
            <div>
              <ClipboardList size={16} />
              <span>Evidencias</span>
              <strong>{indicadores.evidencias}</strong>
            </div>
          </div>
        </div>
      </header>

      <section className="panel lab-shell">
        <div className="lab-tabs" role="tablist" aria-label="Secciones de laboratorio">
          {(Object.keys(tabLabels) as LabTab[]).map((tab) => (
            <button
              type="button"
              className={activeTab === tab ? 'active' : ''}
              key={tab}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {message ? <p className="form-hint">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {isLoading ? <p className="form-hint">Cargando informacion del laboratorio...</p> : null}

        {activeTab === 'fichas' ? (
          <div className="lab-grid lab-grid-wide">
            <form className="stack-form lab-form lab-sheet-form" onSubmit={handleFichaSubmit}>
              <div className="lab-sheet-title">
                <span>Universidad Autonoma de Chiriqui</span>
                <strong>Registro tecnico de equipo y control de mantenimiento</strong>
              </div>
              <label>
                Equipo del inventario
                <select
                  value={selectedEquipoFichaId}
                  onChange={(event) => setSelectedEquipoFichaId(event.target.value)}
                  disabled={Boolean(editingFicha)}
                >
                  <option value="">Seleccionar equipo registrado o llenar manualmente</option>
                  {state.equipos.map((equipo) => (
                    <option value={equipo.id} key={equipo.id}>
                      {equipo.codigo} - {equipo.nombre} - {equipo.ubicacion}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid compact-form-grid">
                <label>
                  Fecha
                  <input
                    name="fecha"
                    type="datetime-local"
                    required
                    defaultValue={editingFicha ? localDateTimeValue(new Date(editingFicha.fecha)) : localDateTimeValue()}
                    key={`ficha-fecha-${editingFicha?.id ?? 'new'}`}
                  />
                </label>
                <label>
                  PC / Equipo
                  <input
                    name="pc"
                    required
                    placeholder="Ej. PC Lab 1-08"
                    defaultValue={editingFicha?.pc ?? selectedEquipoFicha?.nombre}
                    key={`pc-${editingFicha?.id ?? selectedEquipoFicha?.id ?? 'new'}`}
                  />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Direccion IP
                  <input name="direccionIp" placeholder="192.168..." defaultValue={editingFicha?.direccionIp} />
                </label>
                <label>
                  Ubicacion
                  <input
                    name="ubicacion"
                    required
                    placeholder="Laboratorio 1, reparacion..."
                    defaultValue={editingFicha?.ubicacion ?? selectedEquipoFicha?.ubicacion}
                    key={`ubicacion-${editingFicha?.id ?? selectedEquipoFicha?.id ?? 'new'}`}
                  />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Responsable
                  <input name="responsable" required defaultValue={editingFicha?.responsable} />
                </label>
                <label>
                  Usuario asignado
                  <input name="usuarioAsignado" placeholder="Usuario del equipo o area" defaultValue={editingFicha?.usuarioAsignado} />
                </label>
              </div>
              <label>
                Referencia de acceso / observacion
                <input
                  name="referenciaAcceso"
                  placeholder="No guardar contrasenas reales; use una referencia segura si aplica"
                  defaultValue={
                    editingFicha?.referenciaAcceso ??
                    [selectedEquipoFicha?.codigo, selectedEquipoFicha?.marcaModelo, selectedEquipoFicha?.serie]
                      .filter(Boolean)
                      .join(' | ')
                  }
                  key={`referencia-${editingFicha?.id ?? selectedEquipoFicha?.id ?? 'new'}`}
                />
              </label>

              <div className="lab-sheet-sections">
                <fieldset className="lab-sheet-box">
                  <legend>Aplicaciones instaladas</legend>
                  <div className="lab-app-list">
                    {aplicacionesBase.map((app) => {
                      const current = editingFicha?.aplicaciones.find((item) => item.nombre === app);
                      return (
                        <label className="lab-app-row" key={app}>
                          <input name={`app-${app}`} type="checkbox" defaultChecked={current?.instalada ?? false} />
                          <span>{app}</span>
                          <input name={`appObs-${app}`} placeholder="Version / nota" defaultValue={current?.observacion} />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="lab-sheet-box">
                  <legend>Caracteristicas tecnicas</legend>
                  <div className="lab-simple-list">
                    {caracteristicasBase.map((item) => {
                      const current = editingFicha?.caracteristicas.find((field) => field.nombre === item);
                      return (
                        <label key={item}>
                          {item}
                          <input name={`caracteristica-${item}`} defaultValue={current?.valor} />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="lab-sheet-box">
                  <legend>Inventario</legend>
                  <div className="lab-simple-list">
                    {inventarioBase.map((item) => {
                      const current = editingFicha?.inventario.find((field) => field.equipo === item);
                      return (
                        <label key={item}>
                          {item}
                          <input name={`inventario-${item}`} placeholder="N. inventario / serie" defaultValue={current?.numero} />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <fieldset className="lab-sheet-box">
                <legend>Acciones realizadas</legend>
                <div className="lab-actions-table">
                  <div className="lab-actions-head">
                    <span>Fecha</span>
                    <span>Accion realizada</span>
                    <span>Observacion</span>
                    <span>Responsable</span>
                  </div>
                  {Array.from({ length: 6 }, (_, index) => {
                    const current = editingFicha?.acciones[index];
                    return (
                      <div className="lab-actions-row" key={index}>
                        <input name={`accionFecha-${index}`} placeholder="dd/mm/aaaa" defaultValue={current?.fecha} />
                        <input name={`accion-${index}`} placeholder="Diagnostico, cambio, limpieza..." defaultValue={current?.accion} />
                        <input name={`accionObs-${index}`} placeholder="Resultado u observacion" defaultValue={current?.observacion} />
                        <input name={`accionResponsable-${index}`} placeholder="Responsable" defaultValue={current?.responsable} />
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <label>
                Observacion general
                <textarea name="observacionGeneral" rows={3} defaultValue={editingFicha?.observacionGeneral} />
              </label>

              <div className="page-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Save size={18} />
                  {editingFicha ? 'Actualizar ficha' : 'Guardar ficha tecnica'}
                </button>
                {editingFicha ? (
                  <button className="secondary-button" type="button" onClick={() => setEditingFicha(null)}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>

            <div className="lab-list">
              <h2>Fichas guardadas</h2>
              {state.fichas.length === 0 ? <p className="form-hint">Todavia no hay fichas tecnicas registradas.</p> : null}
              {state.fichas.map((item) => (
                <article className="lab-record compact" key={item.id}>
                  <div className="lab-record-header">
                    <div>
                      <span className="status-pill equipment-operativo">Ficha tecnica</span>
                      <h3>{item.pc}</h3>
                      <small>{formatDateTime(item.fecha)} | {item.ubicacion}</small>
                    </div>
                    <div className="row-actions">
                      <button className="icon-button" type="button" title="Ver detalle" onClick={() => setSelectedFicha(item)}>
                        <Eye size={16} />
                      </button>
                      <button className="icon-button" type="button" title="Editar" onClick={() => setEditingFicha(item)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger-button"
                        type="button"
                        title="Eliminar"
                        onClick={() => void handleDeleteFicha(item)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p>
                    Responsable: {item.responsable || 'No indicado'} | Usuario: {item.usuarioAsignado || 'No indicado'} | IP:{' '}
                    {item.direccionIp || 'No indicada'}
                  </p>
                  <small>
                    Acciones registradas: {item.acciones.length} | Aplicaciones marcadas:{' '}
                    {item.aplicaciones.filter((app) => app.instalada).length}
                  </small>
                </article>
              ))}
            </div>

            {selectedFicha ? (
              <div className="modal-backdrop lab-sheet-modal-backdrop" role="presentation" onClick={() => setSelectedFicha(null)}>
                <article
                  className="modal-panel lab-sheet-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="lab-sheet-detail-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="lab-sheet-preview-header">
                    <div>
                      <p>Universidad Autonoma de Chiriqui</p>
                      <p>Facultad de Economia</p>
                      <strong id="lab-sheet-detail-title">Registro tecnico de equipo y control de mantenimiento</strong>
                    </div>
                    <button className="secondary-button" type="button" onClick={() => setSelectedFicha(null)}>
                      Cerrar detalle
                    </button>
                  </div>

                  <div className="lab-sheet-preview-meta">
                    <div><span>Fecha</span><strong>{formatDateTime(selectedFicha.fecha)}</strong></div>
                    <div><span>PC / Equipo</span><strong>{selectedFicha.pc}</strong></div>
                    <div><span>Direccion IP</span><strong>{selectedFicha.direccionIp || 'No indicada'}</strong></div>
                    <div><span>Ubicacion</span><strong>{selectedFicha.ubicacion || 'No indicada'}</strong></div>
                    <div><span>Responsable</span><strong>{selectedFicha.responsable || 'No indicado'}</strong></div>
                    <div><span>Usuario asignado</span><strong>{selectedFicha.usuarioAsignado || 'No indicado'}</strong></div>
                  </div>

                  <div className="lab-sheet-preview-grid">
                    <section>
                      <h3>Aplicaciones instaladas</h3>
                      <div className="lab-sheet-table">
                        <div className="lab-sheet-table-head two-cols">
                          <span>Aplicacion</span>
                          <span>Estado / observacion</span>
                        </div>
                        {selectedFicha.aplicaciones.map((app) => (
                          <div className="lab-sheet-table-row two-cols" key={app.nombre}>
                            <strong>{app.nombre}</strong>
                            <span>{app.instalada ? 'Instalada' : 'No marcada'}{app.observacion ? ` - ${app.observacion}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3>Caracteristicas tecnicas</h3>
                      <div className="lab-sheet-table">
                        <div className="lab-sheet-table-head two-cols">
                          <span>Caracteristica</span>
                          <span>Valor</span>
                        </div>
                        {selectedFicha.caracteristicas.map((item) => (
                          <div className="lab-sheet-table-row two-cols" key={item.nombre}>
                            <strong>{item.nombre}</strong>
                            <span>{item.valor || 'No indicado'}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3>Inventario</h3>
                      <div className="lab-sheet-table">
                        <div className="lab-sheet-table-head two-cols">
                          <span>Equipo</span>
                          <span>Numero / serie</span>
                        </div>
                        {selectedFicha.inventario.map((item) => (
                          <div className="lab-sheet-table-row two-cols" key={item.equipo}>
                            <strong>{item.equipo}</strong>
                            <span>{item.numero || 'No indicado'}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <section>
                    <h3>Acciones realizadas</h3>
                    <div className="lab-sheet-table scrollable">
                      <div className="lab-sheet-table-head four-cols">
                        <span>Fecha</span>
                        <span>Accion realizada</span>
                        <span>Observacion</span>
                        <span>Responsable</span>
                      </div>
                      {selectedFicha.acciones.length === 0 ? (
                        <div className="lab-sheet-table-row four-cols">
                          <span>Sin acciones registradas</span>
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : null}
                      {selectedFicha.acciones.map((accion, index) => (
                        <div className="lab-sheet-table-row four-cols" key={`${accion.fecha}-${index}`}>
                          <span>{accion.fecha || 'No indicada'}</span>
                          <strong>{accion.accion || 'No indicada'}</strong>
                          <span>{accion.observacion || 'Sin observacion'}</span>
                          <span>{accion.responsable || 'No indicado'}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="lab-sheet-notes">
                    <h3>Observacion general</h3>
                    <p>{selectedFicha.observacionGeneral || 'Sin observacion general.'}</p>
                    <small>Referencia de acceso: {selectedFicha.referenciaAcceso || 'No indicada'}</small>
                  </section>
                </article>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'bitacoras' ? (
          <div className="lab-grid">
            <form className="stack-form lab-form" onSubmit={handleBitacoraSubmit}>
              <h2>{editingBitacora ? 'Editar bitacora' : 'Nueva bitacora tecnica'}</h2>
              <label>
                Fecha y hora
                <input
                  name="fecha"
                  type="datetime-local"
                  required
                  defaultValue={editingBitacora ? localDateTimeValue(new Date(editingBitacora.fecha)) : localDateTimeValue()}
                  key={`fecha-${editingBitacora?.id ?? 'new'}`}
                />
              </label>
              <div className="form-grid compact-form-grid">
                <label>
                  Tipo de trabajo
                  <select name="tipoTrabajo" defaultValue={editingBitacora?.tipoTrabajo ?? 'Reparacion'} required>
                    <option>Reparacion</option>
                    <option>Mantenimiento preventivo</option>
                    <option>Cambio de pieza</option>
                    <option>Diagnostico</option>
                    <option>Instalacion</option>
                    <option>Soporte a usuario</option>
                  </select>
                </label>
                <label>
                  Prioridad
                  <select name="prioridad" defaultValue={editingBitacora?.prioridad ?? 'media'} required>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Critica</option>
                  </select>
                </label>
              </div>
              <label>
                Titulo
                <input
                  name="titulo"
                  required
                  placeholder="Ej. Reemplazo de pantalla en equipo del Laboratorio 1"
                  defaultValue={editingBitacora?.titulo}
                  key={`titulo-${editingBitacora?.id ?? 'new'}`}
                />
              </label>
              <label>
                Descripcion del trabajo
                <textarea
                  name="descripcion"
                  required
                  rows={5}
                  placeholder="Detalle que ocurrio, que equipo se reviso, que pieza se reemplazo y resultado final."
                  defaultValue={editingBitacora?.descripcion}
                  key={`descripcion-${editingBitacora?.id ?? 'new'}`}
                />
              </label>
              <div className="form-grid compact-form-grid">
                <label>
                  Equipo origen
                  <input name="equipoOrigen" defaultValue={editingBitacora?.equipoOrigen} />
                </label>
                <label>
                  Equipo destino
                  <input name="equipoDestino" defaultValue={editingBitacora?.equipoDestino} />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Responsable
                  <input name="responsable" required defaultValue={editingBitacora?.responsable} />
                </label>
                <label>
                  Ubicacion
                  <input name="ubicacion" placeholder="Laboratorio 1, reparacion, deposito..." defaultValue={editingBitacora?.ubicacion} />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Estado
                  <select name="estado" defaultValue={editingBitacora?.estado ?? 'en_proceso'} required>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </label>
                <label>
                  Evidencia
                  <input name="evidenciaTitulo" placeholder="Foto, acta, captura, factura..." defaultValue={editingBitacora?.evidenciaTitulo} />
                </label>
              </div>
              <label>
                Enlace o referencia de evidencia
                <input name="evidenciaUrl" placeholder="URL, carpeta, nombre del archivo o referencia fisica" defaultValue={editingBitacora?.evidenciaUrl} />
              </label>
              <div className="page-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Save size={18} />
                  {editingBitacora ? 'Actualizar bitacora' : 'Guardar bitacora'}
                </button>
                {editingBitacora ? (
                  <button className="secondary-button" type="button" onClick={() => setEditingBitacora(null)}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>

            <div className="lab-list">
              <h2>Historial tecnico</h2>
              {state.bitacoras.length === 0 ? <p className="form-hint">Todavia no hay bitacoras registradas.</p> : null}
              {state.bitacoras.map((item) => (
                <article className="lab-record" key={item.id}>
                  <div className="lab-record-header">
                    <div>
                      <span className={`status-pill priority-${item.prioridad}`}>{prioridadLabels[item.prioridad]}</span>
                      <h3>{item.titulo}</h3>
                      <small>{formatDateTime(item.fecha)} | {item.responsable}</small>
                    </div>
                    <div className="row-actions">
                      <button className="icon-button" type="button" title="Editar" onClick={() => setEditingBitacora(item)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger-button"
                        type="button"
                        title="Eliminar"
                        onClick={() => void handleDeleteBitacora(item)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p>{item.descripcion}</p>
                  <dl className="lab-definition-grid">
                    <div><dt>Estado</dt><dd>{estadoTrabajoLabels[item.estado]}</dd></div>
                    <div><dt>Tipo</dt><dd>{item.tipoTrabajo}</dd></div>
                    <div><dt>Origen</dt><dd>{item.equipoOrigen || 'No indicado'}</dd></div>
                    <div><dt>Destino</dt><dd>{item.equipoDestino || 'No indicado'}</dd></div>
                    <div><dt>Ubicacion</dt><dd>{item.ubicacion || 'No indicada'}</dd></div>
                    <div><dt>Evidencia</dt><dd>{item.evidenciaTitulo || item.evidenciaUrl || 'Sin evidencia'}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'inventario' ? (
          <div className="lab-grid">
            <section className="lab-import-panel">
              <div>
                <span className="eyebrow">Carga masiva</span>
                <h2>Importar inventario desde Excel</h2>
                <p>
                  Acepta columnas como codigo, inventario, equipo, categoria, marca, modelo, serie, ubicacion,
                  estado y observaciones. Si el codigo ya existe, el equipo se actualiza.
                </p>
              </div>
              <label className="secondary-button lab-file-button">
                <Upload size={18} />
                Cargar Excel
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => void handleInventarioExcelUpload(event)}
                  disabled={isSaving}
                />
              </label>
            </section>

            <form className="stack-form lab-form" onSubmit={handleEquipoSubmit}>
              <h2>{editingEquipo ? 'Editar equipo' : 'Registrar equipo'}</h2>
              <div className="form-grid compact-form-grid">
                <label>
                  Codigo interno
                  <input name="codigo" required defaultValue={editingEquipo?.codigo} />
                </label>
                <label>
                  Nombre del equipo
                  <input name="nombre" required placeholder="PC Lab 1-08, Laptop soporte..." defaultValue={editingEquipo?.nombre} />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Categoria
                  <select name="categoria" defaultValue={editingEquipo?.categoria ?? 'Computadora'} required>
                    <option>Computadora</option>
                    <option>Laptop</option>
                    <option>Monitor</option>
                    <option>Proyector</option>
                    <option>Impresora</option>
                    <option>Redes</option>
                    <option>Accesorio</option>
                  </select>
                </label>
                <label>
                  Estado
                  <select name="estado" defaultValue={editingEquipo?.estado ?? 'operativo'} required>
                    <option value="operativo">Operativo</option>
                    <option value="en_reparacion">En reparacion</option>
                    <option value="prestado">Prestado</option>
                    <option value="pendiente_revision">Pendiente de revision</option>
                    <option value="baja">Baja</option>
                  </select>
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Marca / modelo
                  <input name="marcaModelo" defaultValue={editingEquipo?.marcaModelo} />
                </label>
                <label>
                  Serie
                  <input name="serie" defaultValue={editingEquipo?.serie} />
                </label>
              </div>
              <label>
                Ubicacion
                <input name="ubicacion" required placeholder="Laboratorio 1, reparacion, deposito..." defaultValue={editingEquipo?.ubicacion} />
              </label>
              <label>
                Observaciones
                <textarea name="observaciones" rows={4} defaultValue={editingEquipo?.observaciones} />
              </label>
              <div className="page-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Save size={18} />
                  {editingEquipo ? 'Actualizar equipo' : 'Guardar equipo'}
                </button>
                {editingEquipo ? (
                  <button className="secondary-button" type="button" onClick={() => setEditingEquipo(null)}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>

            <div className="lab-list">
              <div className="lab-inventory-sheet-title">
                <strong>Universidad Autonoma de Chiriqui</strong>
                <span>Facultad de Economia</span>
                <h2>Inventario de la facultad</h2>
                <small>{new Date().toLocaleDateString('es-PA')}</small>
              </div>
              {state.equipos.length === 0 ? <p className="form-hint">Todavia no hay equipos registrados.</p> : null}
              {state.equipos.length > 0 ? (
                <div className="lab-inventory-table-wrap">
                  <div className="lab-inventory-table">
                    <div className="lab-inventory-head">
                      <span>Fila</span>
                      <span>Equipo</span>
                      <span>Marca</span>
                      <span>Modelo</span>
                      <span>Inventario</span>
                      <span>Serie</span>
                      <span>Ubicacion</span>
                      <span>Estado</span>
                      <span>Acciones</span>
                    </div>
                    {state.equipos.map((item, index) => {
                      const { marca, modelo } = splitMarcaModelo(item.marcaModelo);
                      return (
                        <div className="lab-inventory-row" key={item.id}>
                          <span>{index + 1}</span>
                          <strong>{item.categoria || item.nombre}</strong>
                          <span>{marca}</span>
                          <span>{modelo}</span>
                          <span>{item.codigo || 'S/N'}</span>
                          <span>{item.serie || 'S/N'}</span>
                          <span>{item.ubicacion || 'Sin ubicacion'}</span>
                          <span>
                            <em className={`inventory-status equipment-${item.estado}`}>{estadoEquipoLabels[item.estado]}</em>
                          </span>
                          <span className="row-actions inventory-actions">
                            <button className="icon-button" type="button" title="Editar" onClick={() => setEditingEquipo(item)}>
                              <Pencil size={16} />
                            </button>
                            <button
                              className="icon-button danger-button"
                              type="button"
                              title="Eliminar"
                              onClick={() => void handleDeleteEquipo(item)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'prestamos' ? (
          <div className="lab-grid">
            <form className="stack-form lab-form" onSubmit={handlePrestamoSubmit}>
              <h2>{editingPrestamo ? 'Editar prestamo' : 'Registrar prestamo'}</h2>
              <label>
                Equipo o dispositivo
                <input name="equipo" required defaultValue={editingPrestamo?.equipo} />
              </label>
              <div className="form-grid compact-form-grid">
                <label>
                  Entregado a
                  <input name="entregadoA" required defaultValue={editingPrestamo?.entregadoA} />
                </label>
                <label>
                  Tipo de persona
                  <select name="tipoBeneficiario" defaultValue={editingPrestamo?.tipoBeneficiario ?? 'estudiante'} required>
                    <option value="estudiante">Estudiante</option>
                    <option value="docente">Docente</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="externo">Externo</option>
                  </select>
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Cedula o identificacion
                  <input name="documento" defaultValue={editingPrestamo?.documento} />
                </label>
                <label>
                  Responsable que entrega
                  <input name="responsableEntrega" required defaultValue={editingPrestamo?.responsableEntrega} />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Fecha de prestamo
                  <input
                    name="fechaPrestamo"
                    type="datetime-local"
                    required
                    defaultValue={editingPrestamo ? localDateTimeValue(new Date(editingPrestamo.fechaPrestamo)) : localDateTimeValue()}
                    key={`prestamo-${editingPrestamo?.id ?? 'new'}`}
                  />
                </label>
                <label>
                  Fecha de devolucion
                  <input
                    name="fechaDevolucion"
                    type="datetime-local"
                    defaultValue={editingPrestamo?.fechaDevolucion ? localDateTimeValue(new Date(editingPrestamo.fechaDevolucion)) : ''}
                    key={`devolucion-${editingPrestamo?.id ?? 'new'}`}
                  />
                </label>
              </div>
              <label>
                Estado
                <select name="estado" defaultValue={editingPrestamo?.estado ?? 'activo'} required>
                  <option value="activo">Activo</option>
                  <option value="devuelto">Devuelto</option>
                  <option value="vencido">Vencido</option>
                </select>
              </label>
              <label>
                Observaciones
                <textarea name="observaciones" rows={4} defaultValue={editingPrestamo?.observaciones} />
              </label>
              <div className="page-actions">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Save size={18} />
                  {editingPrestamo ? 'Actualizar prestamo' : 'Guardar prestamo'}
                </button>
                {editingPrestamo ? (
                  <button className="secondary-button" type="button" onClick={() => setEditingPrestamo(null)}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>

            <div className="lab-list">
              <h2>Prestamos registrados</h2>
              {state.prestamos.length === 0 ? <p className="form-hint">Todavia no hay prestamos registrados.</p> : null}
              {state.prestamos.map((item) => (
                <article className="lab-record compact" key={item.id}>
                  <div className="lab-record-header">
                    <div>
                      <span className={`status-pill loan-${item.estado}`}>{item.estado}</span>
                      <h3>{item.equipo}</h3>
                      <small>{item.entregadoA} | {item.tipoBeneficiario}</small>
                    </div>
                    <div className="row-actions">
                      <button className="icon-button" type="button" title="Editar" onClick={() => setEditingPrestamo(item)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger-button"
                        type="button"
                        title="Eliminar"
                        onClick={() => void handleDeletePrestamo(item)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p>
                    Prestado: {formatDateTime(item.fechaPrestamo)} | Devolucion:{' '}
                    {item.fechaDevolucion ? formatDateTime(item.fechaDevolucion) : 'Pendiente'}
                  </p>
                  <small>{item.observaciones || 'Sin observaciones'}</small>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'informes' ? (
          <div className="lab-report-grid">
            <article className="lab-report-card">
              <History size={26} />
              <h2>Informe general</h2>
              <p>Resumen ejecutivo del laboratorio con trabajos abiertos, equipos pendientes y ultimas bitacoras.</p>
              <button className="primary-button" type="button" onClick={exportReport}>
                <Download size={18} />
                Descargar TXT
              </button>
            </article>
            <article className="lab-report-card">
              <ClipboardList size={26} />
              <h2>Base exportable</h2>
              <p>Archivo CSV para abrir en Excel con bitacoras, inventario y prestamos registrados.</p>
              <button className="secondary-button" type="button" onClick={exportCsv}>
                <Download size={18} />
                Descargar CSV
              </button>
            </article>
            <article className="lab-report-card full">
              <h2>Vista previa del informe</h2>
              <pre>{buildLaboratorioReport(state)}</pre>
            </article>
          </div>
        ) : null}
      </section>
    </div>
  );
}
