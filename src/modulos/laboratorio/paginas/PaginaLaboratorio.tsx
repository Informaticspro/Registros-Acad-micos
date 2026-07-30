import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  Download,
  HardDrive,
  History,
  PackageCheck,
  Pencil,
  Save,
  Trash2,
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
  const [activeTab, setActiveTab] = useState<LabTab>('fichas');
  const [state, setState] = useState<LaboratorioState>(emptyState);
  const [editingFicha, setEditingFicha] = useState<FichaTecnicaLaboratorio | null>(null);
  const [editingBitacora, setEditingBitacora] = useState<BitacoraLaboratorio | null>(null);
  const [editingEquipo, setEditingEquipo] = useState<EquipoLaboratorio | null>(null);
  const [editingPrestamo, setEditingPrestamo] = useState<PrestamoLaboratorio | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function refresh() {
    setState(listLaboratorioData());
  }

  useEffect(() => {
    refresh();
  }, []);

  const indicadores = useMemo(() => {
    const trabajosAbiertos = state.bitacoras.filter((item) => item.estado !== 'cerrado').length;
    const equiposPendientes = state.equipos.filter((item) => item.estado !== 'operativo').length;
    const prestamosActivos = state.prestamos.filter((item) => item.estado === 'activo').length;
    const evidencias = state.bitacoras.filter((item) => item.evidenciaUrl || item.evidenciaTitulo).length;

    return { trabajosAbiertos, equiposPendientes, prestamosActivos, evidencias };
  }, [state]);

  function handleFichaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = buildFichaTecnicaInput(event.currentTarget);

    if (editingFicha) {
      updateFichaTecnicaLaboratorio(editingFicha.id, input);
      setEditingFicha(null);
      setMessage('Ficha tecnica actualizada correctamente.');
    } else {
      createFichaTecnicaLaboratorio(input);
      setMessage('Ficha tecnica guardada correctamente.');
      event.currentTarget.reset();
    }

    refresh();
  }

  function handleBitacoraSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = buildBitacoraInput(event.currentTarget);

    if (editingBitacora) {
      updateBitacoraLaboratorio(editingBitacora.id, input);
      setEditingBitacora(null);
      setMessage('Bitacora actualizada correctamente.');
    } else {
      createBitacoraLaboratorio(input);
      setMessage('Bitacora registrada correctamente.');
      event.currentTarget.reset();
    }

    refresh();
  }

  function handleEquipoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = buildEquipoInput(event.currentTarget);

    if (editingEquipo) {
      updateEquipoLaboratorio(editingEquipo.id, input);
      setEditingEquipo(null);
      setMessage('Equipo actualizado correctamente.');
    } else {
      createEquipoLaboratorio(input);
      setMessage('Equipo agregado al inventario.');
      event.currentTarget.reset();
    }

    refresh();
  }

  function handlePrestamoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = buildPrestamoInput(event.currentTarget);

    if (editingPrestamo) {
      updatePrestamoLaboratorio(editingPrestamo.id, input);
      setEditingPrestamo(null);
      setMessage('Prestamo actualizado correctamente.');
    } else {
      createPrestamoLaboratorio(input);
      setMessage('Prestamo registrado correctamente.');
      event.currentTarget.reset();
    }

    refresh();
  }

  function handleDeleteBitacora(item: BitacoraLaboratorio) {
    if (!window.confirm(`Desea eliminar la bitacora "${item.titulo}"?`)) return;
    deleteBitacoraLaboratorio(item.id);
    refresh();
  }

  function handleDeleteFicha(item: FichaTecnicaLaboratorio) {
    if (!window.confirm(`Desea eliminar la ficha tecnica de "${item.pc}"?`)) return;
    deleteFichaTecnicaLaboratorio(item.id);
    refresh();
  }

  function handleDeleteEquipo(item: EquipoLaboratorio) {
    if (!window.confirm(`Desea eliminar el equipo "${item.nombre}"?`)) return;
    deleteEquipoLaboratorio(item.id);
    refresh();
  }

  function handleDeletePrestamo(item: PrestamoLaboratorio) {
    if (!window.confirm(`Desea eliminar el prestamo de "${item.equipo}"?`)) return;
    deletePrestamoLaboratorio(item.id);
    refresh();
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

        {activeTab === 'fichas' ? (
          <div className="lab-grid lab-grid-wide">
            <form className="stack-form lab-form lab-sheet-form" onSubmit={handleFichaSubmit}>
              <div className="lab-sheet-title">
                <span>Universidad Autonoma de Chiriqui</span>
                <strong>Registro tecnico de equipo y control de mantenimiento</strong>
              </div>
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
                  <input name="pc" required placeholder="Ej. PC Lab 1-08" defaultValue={editingFicha?.pc} />
                </label>
              </div>
              <div className="form-grid compact-form-grid">
                <label>
                  Direccion IP
                  <input name="direccionIp" placeholder="192.168..." defaultValue={editingFicha?.direccionIp} />
                </label>
                <label>
                  Ubicacion
                  <input name="ubicacion" required placeholder="Laboratorio 1, reparacion..." defaultValue={editingFicha?.ubicacion} />
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
                  defaultValue={editingFicha?.referenciaAcceso}
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
                <button className="primary-button" type="submit">
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
                      <button className="icon-button" type="button" title="Editar" onClick={() => setEditingFicha(item)}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button danger-button" type="button" title="Eliminar" onClick={() => handleDeleteFicha(item)}>
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
                <button className="primary-button" type="submit">
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
                      <button className="icon-button danger-button" type="button" title="Eliminar" onClick={() => handleDeleteBitacora(item)}>
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
                <button className="primary-button" type="submit">
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
              <h2>Inventario de equipos</h2>
              {state.equipos.length === 0 ? <p className="form-hint">Todavia no hay equipos registrados.</p> : null}
              {state.equipos.map((item) => (
                <article className="lab-record compact" key={item.id}>
                  <div className="lab-record-header">
                    <div>
                      <span className={`status-pill equipment-${item.estado}`}>{estadoEquipoLabels[item.estado]}</span>
                      <h3>{item.nombre}</h3>
                      <small>{item.codigo} | {item.ubicacion}</small>
                    </div>
                    <div className="row-actions">
                      <button className="icon-button" type="button" title="Editar" onClick={() => setEditingEquipo(item)}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button danger-button" type="button" title="Eliminar" onClick={() => handleDeleteEquipo(item)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p>{item.marcaModelo || 'Sin marca/modelo'} | Serie: {item.serie || 'No indicada'}</p>
                  <small>{item.observaciones || 'Sin observaciones'}</small>
                </article>
              ))}
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
                <button className="primary-button" type="submit">
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
                      <button className="icon-button danger-button" type="button" title="Eliminar" onClick={() => handleDeletePrestamo(item)}>
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
