import { FormEvent } from 'react';
import { Eye, Pencil, Save, Trash2 } from 'lucide-react';
import { EquipoLaboratorio, FichaTecnicaLaboratorio } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';
import {
  aplicacionesBase,
  caracteristicasBase,
  inventarioBase,
} from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import { localDateTimeValue } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type VistaFichasTecnicasProps = {
  editingFicha: FichaTecnicaLaboratorio | null;
  equipos: EquipoLaboratorio[];
  fichas: FichaTecnicaLaboratorio[];
  isSaving: boolean;
  selectedEquipoFicha: EquipoLaboratorio | null | undefined;
  selectedEquipoFichaId: string;
  selectedFicha: FichaTecnicaLaboratorio | null;
  onCancelEdit: () => void;
  onDeleteFicha: (ficha: FichaTecnicaLaboratorio) => void;
  onSelectedEquipoFichaChange: (id: string) => void;
  onSelectedFichaChange: (ficha: FichaTecnicaLaboratorio | null) => void;
  onSetEditingFicha: (ficha: FichaTecnicaLaboratorio | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function VistaFichasTecnicas({
  editingFicha,
  equipos,
  fichas,
  isSaving,
  selectedEquipoFicha,
  selectedEquipoFichaId,
  selectedFicha,
  onCancelEdit,
  onDeleteFicha,
  onSelectedEquipoFichaChange,
  onSelectedFichaChange,
  onSetEditingFicha,
  onSubmit,
}: VistaFichasTecnicasProps) {
  return (
    <div className="lab-grid lab-grid-wide">
      <form className="stack-form lab-form lab-sheet-form" onSubmit={onSubmit}>
        <div className="lab-sheet-title">
          <span>Universidad Autonoma de Chiriqui</span>
          <strong>Registro tecnico de equipo y control de mantenimiento</strong>
        </div>
        <label>
          Equipo del inventario
          <select
            value={selectedEquipoFichaId}
            onChange={(event) => onSelectedEquipoFichaChange(event.target.value)}
            disabled={Boolean(editingFicha)}
          >
            <option value="">Seleccionar equipo registrado o llenar manualmente</option>
            {equipos.map((equipo) => (
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
            <button className="secondary-button" type="button" onClick={onCancelEdit}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <div className="lab-list">
        <h2>Fichas guardadas</h2>
        {fichas.length === 0 ? <p className="form-hint">Todavia no hay fichas tecnicas registradas.</p> : null}
        {fichas.map((item) => (
          <article className="lab-record compact" key={item.id}>
            <div className="lab-record-header">
              <div>
                <span className="status-pill equipment-operativo">Ficha tecnica</span>
                <h3>{item.pc}</h3>
                <small>{formatDateTime(item.fecha)} | {item.ubicacion}</small>
              </div>
              <div className="row-actions">
                <button className="icon-button" type="button" title="Ver detalle" onClick={() => onSelectedFichaChange(item)}>
                  <Eye size={16} />
                </button>
                <button className="icon-button" type="button" title="Editar" onClick={() => onSetEditingFicha(item)}>
                  <Pencil size={16} />
                </button>
                <button className="icon-button danger-button" type="button" title="Eliminar" onClick={() => onDeleteFicha(item)}>
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
        <div className="modal-backdrop lab-sheet-modal-backdrop" role="presentation" onClick={() => onSelectedFichaChange(null)}>
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
              <button className="secondary-button" type="button" onClick={() => onSelectedFichaChange(null)}>
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
  );
}
