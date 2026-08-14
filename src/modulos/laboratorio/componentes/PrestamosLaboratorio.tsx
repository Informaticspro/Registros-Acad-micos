import { FormEvent } from 'react';
import { Pencil, Save, Trash2 } from 'lucide-react';

import { PrestamoLaboratorio } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';
import { localDateTimeValue } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type PrestamosLaboratorioProps = {
  prestamos: PrestamoLaboratorio[];
  editingPrestamo: PrestamoLaboratorio | null;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  onEdit: (prestamo: PrestamoLaboratorio) => void;
  onDelete: (prestamo: PrestamoLaboratorio) => void;
};

export function PrestamosLaboratorio({
  prestamos,
  editingPrestamo,
  isSaving,
  onSubmit,
  onCancelEdit,
  onEdit,
  onDelete,
}: PrestamosLaboratorioProps) {
  return (
    <div className="lab-grid">
      <form className="stack-form lab-form" onSubmit={onSubmit}>
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
            <button className="secondary-button" type="button" onClick={onCancelEdit}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <div className="lab-list">
        <h2>Prestamos registrados</h2>
        {prestamos.length === 0 ? <p className="form-hint">Todavia no hay prestamos registrados.</p> : null}
        {prestamos.map((item) => (
          <article className="lab-record compact" key={item.id}>
            <div className="lab-record-header">
              <div>
                <span className={`status-pill loan-${item.estado}`}>{item.estado}</span>
                <h3>{item.equipo}</h3>
                <small>{item.entregadoA} | {item.tipoBeneficiario}</small>
              </div>
              <div className="row-actions">
                <button className="icon-button" type="button" title="Editar" onClick={() => onEdit(item)}>
                  <Pencil size={16} />
                </button>
                <button className="icon-button danger-button" type="button" title="Eliminar" onClick={() => onDelete(item)}>
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
  );
}
