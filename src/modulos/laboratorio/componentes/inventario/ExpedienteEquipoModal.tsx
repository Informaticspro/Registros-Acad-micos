import { Dispatch, FormEvent, SetStateAction } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, Download, Eye, PackageCheck, Pencil, XCircle } from 'lucide-react';

import {
  AsignacionComponenteLaboratorio,
  BitacoraLaboratorio,
  EquipoLaboratorio,
  FichaTecnicaLaboratorio,
} from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';
import { estadoTrabajoLabels } from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import {
  getEstadoEquipoLabel,
  splitMarcaModelo,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type ExpedienteEquipoModalProps = {
  componentMoveTargets: Record<string, string>;
  equipoDetalleHistory: EquipoLaboratorio[];
  error: string | null;
  estadoEquipoNombre: Record<string, string>;
  isSaving: boolean;
  message: string | null;
  selectedEquipoDetalle: EquipoLaboratorio;
  backEquipoDetalle: () => void;
  closeEquipoDetalle: () => void;
  getAsignacionesActivasEquipo: (equipo: EquipoLaboratorio) => AsignacionComponenteLaboratorio[];
  getBitacorasEquipo: (equipo: EquipoLaboratorio) => BitacoraLaboratorio[];
  getComponentesDisponibles: (equipo: EquipoLaboratorio) => EquipoLaboratorio[];
  getEquipoById: (id: string) => EquipoLaboratorio | null;
  getEquiposDestinoComponente: (equipo: EquipoLaboratorio, componenteId: string) => EquipoLaboratorio[];
  getFichasEquipo: (equipo: EquipoLaboratorio) => FichaTecnicaLaboratorio[];
  getUltimoMantenimientoEquipo: (
    fichas: FichaTecnicaLaboratorio[],
    bitacoras: BitacoraLaboratorio[],
  ) => string | null;
  handleAsignarComponente: (event: FormEvent<HTMLFormElement>, equipoPadre: EquipoLaboratorio) => void;
  handleCrearYAsignarComponente: (event: FormEvent<HTMLFormElement>, equipoPadre: EquipoLaboratorio) => void;
  handleMoverComponente: (
    asignacion: AsignacionComponenteLaboratorio,
    equipoActual: EquipoLaboratorio,
    nuevoEquipoId: string,
  ) => void;
  handleRetirarComponente: (asignacion: AsignacionComponenteLaboratorio, equipoPadre: EquipoLaboratorio) => void;
  onDownloadHistorial: (equipo: EquipoLaboratorio) => void;
  onEditEquipo: (equipo: EquipoLaboratorio) => void;
  onOpenEquipoDetalle: (equipo: EquipoLaboratorio, keepCurrentInHistory?: boolean) => void;
  onOpenFichaForEquipo: (equipo: EquipoLaboratorio) => void;
  onOpenFichaRecord: (ficha: FichaTecnicaLaboratorio) => void;
  setComponentMoveTargets: Dispatch<SetStateAction<Record<string, string>>>;
};

export function ExpedienteEquipoModal({
  componentMoveTargets,
  equipoDetalleHistory,
  error,
  estadoEquipoNombre,
  isSaving,
  message,
  selectedEquipoDetalle,
  backEquipoDetalle,
  closeEquipoDetalle,
  getAsignacionesActivasEquipo,
  getBitacorasEquipo,
  getComponentesDisponibles,
  getEquipoById,
  getEquiposDestinoComponente,
  getFichasEquipo,
  getUltimoMantenimientoEquipo,
  handleAsignarComponente,
  handleCrearYAsignarComponente,
  handleMoverComponente,
  handleRetirarComponente,
  onDownloadHistorial,
  onEditEquipo,
  onOpenEquipoDetalle,
  onOpenFichaForEquipo,
  onOpenFichaRecord,
  setComponentMoveTargets,
}: ExpedienteEquipoModalProps) {
  const { marca, modelo } = splitMarcaModelo(selectedEquipoDetalle.marcaModelo);
  const fichasEquipo = getFichasEquipo(selectedEquipoDetalle);
  const bitacorasEquipo = getBitacorasEquipo(selectedEquipoDetalle);
  const componentesActivos = getAsignacionesActivasEquipo(selectedEquipoDetalle);
  const componentesDisponibles = getComponentesDisponibles(selectedEquipoDetalle);
  const ultimoMantenimiento = getUltimoMantenimientoEquipo(fichasEquipo, bitacorasEquipo);

  return (
    <div className="modal-backdrop" role="presentation" onClick={closeEquipoDetalle}>
      <article
        className="modal-panel lab-equipment-modal lab-equipment-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-equipment-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
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
          <button className="secondary-button" type="button" onClick={() => onEditEquipo(selectedEquipoDetalle)}>
            <Pencil size={18} />
            Editar datos
          </button>
          <button className="primary-button" type="button" onClick={() => onOpenFichaForEquipo(selectedEquipoDetalle)}>
            <ClipboardList size={18} />
            Nueva ficha tecnica
          </button>
          <button className="secondary-button" type="button" onClick={() => onDownloadHistorial(selectedEquipoDetalle)}>
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
                    if (componente) onOpenEquipoDetalle(componente, true);
                  }}
                  onKeyDown={(event) => {
                    if (!componente) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenEquipoDetalle(componente, true);
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
                      <button className="secondary-button" type="button" onClick={() => onOpenEquipoDetalle(componente, true)}>
                        <Eye size={16} />
                        Ver componente
                      </button>
                      <button className="secondary-button" type="button" onClick={() => onOpenFichaForEquipo(componente)}>
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
                        handleMoverComponente(asignacion, selectedEquipoDetalle, selectedTarget);
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
                        handleRetirarComponente(asignacion, selectedEquipoDetalle);
                      }}
                    >
                      Retirar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <form className="lab-component-form" onSubmit={(event) => handleAsignarComponente(event, selectedEquipoDetalle)}>
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
          <form className="lab-component-create-form" onSubmit={(event) => handleCrearYAsignarComponente(event, selectedEquipoDetalle)}>
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
              <button key={ficha.id} type="button" onClick={() => onOpenFichaRecord(ficha)}>
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
      </article>
    </div>
  );
}
