import { FormEvent } from 'react';
import { Pencil, Save, Trash2 } from 'lucide-react';
import { BitacoraLaboratorio, EquipoLaboratorio } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';
import {
  estadoTrabajoLabels,
  prioridadLabels,
} from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import {
  getEstadoEquipoLabel,
  localDateTimeValue,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type VistaBitacorasProps = {
  bitacoras: BitacoraLaboratorio[];
  editingBitacora: BitacoraLaboratorio | null;
  equipos: EquipoLaboratorio[];
  estadoEquipoNombre: Record<string, string>;
  isSaving: boolean;
  responsableSesion: string;
  onCancelEdit: () => void;
  onDeleteBitacora: (bitacora: BitacoraLaboratorio) => void;
  onSetEditingBitacora: (bitacora: BitacoraLaboratorio) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function VistaBitacoras({
  bitacoras,
  editingBitacora,
  equipos,
  estadoEquipoNombre,
  isSaving,
  responsableSesion,
  onCancelEdit,
  onDeleteBitacora,
  onSetEditingBitacora,
  onSubmit,
}: VistaBitacorasProps) {
  const mantenimientos = bitacoras.filter((item) => item.tipoTrabajo !== 'Incidencia');
  const incidencias = bitacoras.filter((item) => item.tipoTrabajo === 'Incidencia');

  return (
    <div className="lab-grid">
      <form className="stack-form lab-form" onSubmit={onSubmit}>
        <h2>{editingBitacora ? 'Editar registro' : 'Registrar mantenimiento o incidencia'}</h2>
        <p className="form-hint">
          Los mantenimientos y las incidencias se registran por separado mediante su tipo y quedan asociados al equipo seleccionado.
        </p>
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
              <option value="Mantenimiento preventivo">Mantenimiento preventivo</option>
              <option value="Mantenimiento correctivo">Mantenimiento correctivo</option>
              <option value="Incidencia">Dano o incidencia</option>
              <option>Reparacion</option>
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
          Descripcion del trabajo o incidencia
          <textarea
            name="descripcion"
            required
            rows={5}
            placeholder="Detalle que ocurrio, que equipo se reviso, sintomas detectados, acciones tomadas o pendiente por revisar."
            defaultValue={editingBitacora?.descripcion}
            key={`descripcion-${editingBitacora?.id ?? 'new'}`}
          />
        </label>
        <div className="form-grid compact-form-grid">
          <label>
            Equipo origen / pieza usada opcional
            <select name="equipoOrigenInventario" defaultValue="">
              <option value="">Seleccione equipo origen si aplica</option>
              {equipos.map((equipo) => (
                <option value={`${equipo.codigo || 'S/N'} - ${equipo.nombre} (${equipo.ubicacion})`} key={equipo.id}>
                  {equipo.codigo || 'S/N'} - {equipo.nombre} ({equipo.ubicacion}) -{' '}
                  {estadoEquipoNombre[equipo.estado] ?? getEstadoEquipoLabel(equipo.estado)}
                </option>
              ))}
            </select>
            <small>Use esto cuando una pantalla, memoria, disco u otra pieza sale de un equipo registrado.</small>
          </label>
          <label>
            Origen manual opcional
            <input
              name="equipoOrigen"
              placeholder="Ej. pantalla de equipo descartado, pieza suelta o referencia fisica"
              defaultValue={editingBitacora?.equipoOrigen}
            />
          </label>
        </div>
        <div className="form-grid compact-form-grid">
          <label>
            Equipo atendido
            <select name="equipoId" defaultValue={editingBitacora?.equipoId ?? ''} required>
              <option value="">Seleccione un equipo</option>
              {equipos.map((equipo) => (
                <option value={equipo.id} key={equipo.id}>
                  {equipo.codigo} - {equipo.nombre} ({equipo.ubicacion})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid compact-form-grid">
          <label>
            Responsable
            <input name="responsable" required readOnly value={responsableSesion} />
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
            <button className="secondary-button" type="button" onClick={onCancelEdit}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <div className="lab-list">
        <h2>Mantenimientos registrados</h2>
        {mantenimientos.length === 0 ? <p className="form-hint">Todavia no hay mantenimientos registrados.</p> : null}
        {mantenimientos.map((item) => (
          <article className="lab-record" key={item.id}>
            <div className="lab-record-header">
              <div>
                <span className={`status-pill priority-${item.prioridad}`}>{prioridadLabels[item.prioridad]}</span>
                <h3>{item.titulo}</h3>
                <small>{formatDateTime(item.fecha)} | {item.responsable}</small>
              </div>
              <div className="row-actions">
                <button className="icon-button" type="button" title="Editar" onClick={() => onSetEditingBitacora(item)}>
                  <Pencil size={16} />
                </button>
                <button className="icon-button danger-button" type="button" title="Eliminar" onClick={() => onDeleteBitacora(item)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p>{item.descripcion}</p>
            <dl className="lab-definition-grid">
              <div><dt>Estado</dt><dd>{estadoTrabajoLabels[item.estado]}</dd></div>
              <div><dt>Tipo</dt><dd>{item.tipoTrabajo}</dd></div>
              <div><dt>Origen / pieza usada</dt><dd>{item.equipoOrigen || 'No aplica'}</dd></div>
              <div><dt>Destino</dt><dd>{item.equipoDestino || 'No indicado'}</dd></div>
              <div><dt>Ubicacion</dt><dd>{item.ubicacion || 'No indicada'}</dd></div>
              <div><dt>Evidencia</dt><dd>{item.evidenciaTitulo || item.evidenciaUrl || 'Sin evidencia'}</dd></div>
            </dl>
          </article>
        ))}

        <h2>Danos e incidencias por equipo</h2>
        {incidencias.length === 0 ? <p className="form-hint">No hay incidencias registradas.</p> : null}
        {incidencias.map((item) => (
          <article className="lab-record" key={item.id}>
            <div className="lab-record-header">
              <div>
                <span className={`status-pill priority-${item.prioridad}`}>{estadoTrabajoLabels[item.estado]}</span>
                <h3>{item.titulo}</h3>
                <small>{formatDateTime(item.fecha)} | {item.equipoDestino || 'Equipo no indicado'}</small>
              </div>
              <div className="row-actions">
                <button className="icon-button" type="button" title="Editar" onClick={() => onSetEditingBitacora(item)}>
                  <Pencil size={16} />
                </button>
                <button className="icon-button danger-button" type="button" title="Eliminar" onClick={() => onDeleteBitacora(item)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p>{item.descripcion}</p>
            <small>Responsable: {item.responsable} - Estado: {estadoTrabajoLabels[item.estado]}</small>
          </article>
        ))}
      </div>
    </div>
  );
}
