import type { FormEvent } from 'react';
import type { BitacoraLaboratorio } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';
import { localDateTimeValue } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';
import { estadoTrabajoLabels, TIPO_INSTALACION_PANTALLA } from '@/modulos/laboratorio/constantes/laboratorio.constantes';

type Props = {
  trabajos: BitacoraLaboratorio[];
  responsable: string;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onEdit: (trabajo: BitacoraLaboratorio) => void;
};

export function InstalacionesPantalla({ trabajos, responsable, isSaving, onSubmit, onBack, onEdit }: Props) {
  const instalaciones = trabajos.filter(item => item.tipoTrabajo === TIPO_INSTALACION_PANTALLA)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return <section>
    <div className="page-actions"><button type="button" className="secondary-button" onClick={onBack}>← Volver a préstamos</button></div>
    <h2>Instalación de pantalla de proyección</h2>
    <p className="form-hint">Registre cada salida de la pantalla que instala el personal de soporte. Puede dejarla pendiente y actualizarla cuando termine la instalación o retire la pantalla.</p>
    <div className="lab-grid">
      <form className="stack-form lab-form" onSubmit={onSubmit}>
        <h3>Registrar instalación</h3>
        <input type="hidden" name="tipoTrabajo" value={TIPO_INSTALACION_PANTALLA} />
        <input type="hidden" name="equipoDestino" value="Pantalla de proyección" />
        <input type="hidden" name="prioridad" value="media" />
        <label>Fecha y hora de instalación *<input type="datetime-local" name="fecha" required defaultValue={localDateTimeValue()} /></label>
        <label>Solicitante *<input name="solicitante" required maxLength={200} placeholder="Nombre de quien solicita la pantalla" /></label>
        <label>Aula, departamento o lugar de instalación *<input name="ubicacion" required maxLength={200} placeholder="Ej. Salón 3H o auditorio de otra facultad" /></label>
        <label>Actividad o motivo *<input name="titulo" required maxLength={250} placeholder="Ej. Instalación de pantalla para seminario" /></label>
        <label>Responsable de soporte *<input name="responsable" required readOnly value={responsable} /></label>
        <label>Estado *<select name="estado" defaultValue="cerrado" required>
          <option value="pendiente">Pendiente de instalación</option>
          <option value="en_proceso">En proceso / pendiente de retirar</option>
          <option value="cerrado">Instalación realizada</option>
        </select></label>
        <label>Detalle del trabajo *<textarea name="descripcion" required rows={4} placeholder="Indique dónde se instaló, las comprobaciones realizadas y si queda pendiente retirarla." /></label>
        <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar instalación'}</button>
      </form>
      <div className="lab-list">
        <h3>Historial de instalaciones · {instalaciones.length}</h3>
        {!instalaciones.length ? <p className="form-hint">Todavía no hay instalaciones registradas en esta sección.</p> : null}
        {instalaciones.map(item => <article className="lab-record" key={item.id}>
          <span className="status-pill">{estadoTrabajoLabels[item.estado]}</span>
          <h3>{item.titulo}</h3>
          <p><strong>{item.ubicacion}</strong></p>
          <small>{formatDateTime(item.fecha)} · {item.responsable}</small>
          <p style={{ whiteSpace: 'pre-line' }}>{item.descripcion}</p>
          <button type="button" className="secondary-button" onClick={() => onEdit(item)}>Ver / actualizar trabajo</button>
        </article>)}
      </div>
    </div>
  </section>;
}
