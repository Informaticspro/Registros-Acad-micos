import { FormEvent } from 'react';
import { CheckCircle2, Save, Settings2, Trash2, XCircle } from 'lucide-react';
import { AsignacionComponenteLaboratorio, EquipoLaboratorio, EstadoEquipoLaboratorio } from '@/tipos/dominio';
import { type CatalogManagerType } from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';
import {
  getCategoriaComponenteDesdeTipo,
  getEstadoEquipoLabel,
  splitMarcaModelo,
  type ComponenteNuevoDraft,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type FormularioEquipoModalProps = {
  categoriasEquipo: string[];
  closeEquipoFormModal: () => void;
  componentesNuevoEquipo: ComponenteNuevoDraft[];
  editingEquipo: EquipoLaboratorio | null;
  error: string | null;
  estadoEquipoNombre: Record<string, string>;
  estadosEquipo: EstadoEquipoLaboratorio[];
  handleEquipoSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  message: string | null;
  setActiveCatalogManager: (manager: CatalogManagerType) => void;
  ubicacionesInventario: string[];
  addComponenteNuevo: (tipo: AsignacionComponenteLaboratorio['tipo']) => void;
  removeComponenteNuevo: (id: string) => void;
  updateComponenteNuevoTipo: (id: string, tipo: AsignacionComponenteLaboratorio['tipo']) => void;
};

export function FormularioEquipoModal({
  categoriasEquipo,
  closeEquipoFormModal,
  componentesNuevoEquipo,
  editingEquipo,
  error,
  estadoEquipoNombre,
  estadosEquipo,
  handleEquipoSubmit,
  isSaving,
  message,
  setActiveCatalogManager,
  ubicacionesInventario,
  addComponenteNuevo,
  removeComponenteNuevo,
  updateComponenteNuevoTipo,
}: FormularioEquipoModalProps) {
  const { marca, modelo } = splitMarcaModelo(editingEquipo?.marcaModelo ?? '');

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={() => {
        closeEquipoFormModal();
      }}
    >
      <article
        className="modal-panel lab-equipment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-equipment-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="lab-catalog-modal-header">
          <div>
            <span className="eyebrow">Inventario</span>
            <h2 id="lab-equipment-form-title">{editingEquipo ? 'Editar equipo' : 'Registrar equipo'}</h2>
          </div>
          <button className="secondary-button" type="button" onClick={closeEquipoFormModal}>
            Cerrar
          </button>
        </header>
        {message || error ? (
          <div className={`lab-modal-feedback ${error ? 'error' : 'success'}`} role="status" aria-live="polite">
            {error ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{error ?? message}</span>
          </div>
        ) : null}
        <form className="stack-form lab-form lab-modal-form" onSubmit={handleEquipoSubmit}>
          <div className="form-grid compact-form-grid">
            <label>
              Numero de inventario
              <input name="codigo" required defaultValue={editingEquipo?.codigo} />
            </label>
            <label>
              Nombre del equipo
              <input
                name="nombre"
                required
                placeholder="PC Lab 1-08, Laptop soporte..."
                defaultValue={editingEquipo?.nombre}
              />
            </label>
          </div>
          <div className="form-grid compact-form-grid">
            <div className="catalog-field">
              <label>
                Categoria
                <select name="categoria" defaultValue={editingEquipo?.categoria ?? 'Computadora'} required>
                  {categoriasEquipo.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="icon-button catalog-manage-button"
                type="button"
                title="Administrar categorias"
                onClick={() => setActiveCatalogManager('categorias')}
              >
                <Settings2 size={16} />
              </button>
            </div>
            <div className="catalog-field">
              <label>
                Estado
                <select name="estado" defaultValue={editingEquipo?.estado ?? 'operativo'} required>
                  {estadosEquipo.map((estado) => (
                    <option key={estado} value={estado}>
                      {estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="icon-button catalog-manage-button"
                type="button"
                title="Administrar estados"
                onClick={() => setActiveCatalogManager('estados')}
              >
                <Settings2 size={16} />
              </button>
            </div>
          </div>
          <div className="form-grid compact-form-grid">
            <label>
              Marca
              <input name="marca" defaultValue={editingEquipo ? marca : ''} placeholder="Ej. HP, Dell, Lenovo" />
            </label>
            <label>
              Modelo
              <input name="modelo" defaultValue={editingEquipo ? modelo : ''} placeholder="Ej. EliteDesk 705 G4" />
            </label>
            <label>
              Serie
              <input name="serie" defaultValue={editingEquipo?.serie} />
            </label>
          </div>
          <div className="catalog-field">
            <label>
              Ubicacion
              <select name="ubicacion" required defaultValue={editingEquipo?.ubicacion ?? 'Laboratorio 1'}>
                {ubicacionesInventario
                  .filter((ubicacion) => ubicacion !== 'Todas')
                  .map((ubicacion) => (
                    <option key={ubicacion} value={ubicacion}>
                      {ubicacion}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className="icon-button catalog-manage-button"
              type="button"
              title="Administrar ubicaciones"
              onClick={() => setActiveCatalogManager('secciones')}
            >
              <Settings2 size={16} />
            </button>
          </div>
          <label>
            Observaciones
            <textarea name="observaciones" rows={4} defaultValue={editingEquipo?.observaciones} />
          </label>
          {!editingEquipo ? (
            <section className="lab-inline-component-panel">
              <div className="lab-inline-component-header">
                <div>
                  <span className="eyebrow">Componentes opcionales</span>
                  <h3>Registrar accesorios junto con la PC</h3>
                  <p>
                    Agregue monitor, teclado, mouse u otro componente con inventario o serie propia. Todo queda enlazado
                    a esta PC al guardar.
                  </p>
                </div>
                <div className="lab-inline-component-actions">
                  <button className="secondary-button" type="button" onClick={() => addComponenteNuevo('monitor')}>
                    + Monitor
                  </button>
                  <button className="secondary-button" type="button" onClick={() => addComponenteNuevo('teclado')}>
                    + Teclado
                  </button>
                  <button className="secondary-button" type="button" onClick={() => addComponenteNuevo('mouse')}>
                    + Mouse
                  </button>
                  <button className="secondary-button" type="button" onClick={() => addComponenteNuevo('otro')}>
                    + Otro
                  </button>
                </div>
              </div>
              {componentesNuevoEquipo.length === 0 ? (
                <p className="form-hint">
                  No hay componentes agregados. Use el boton + si esta PC tiene accesorios registrados.
                </p>
              ) : null}
              {componentesNuevoEquipo.map((componente, index) => {
                const prefix = `component-${componente.id}`;
                return (
                  <article className="lab-new-component-card" key={componente.id}>
                    <header>
                      <strong>Componente {index + 1}</strong>
                      <button
                        className="icon-button danger"
                        type="button"
                        title="Quitar componente"
                        onClick={() => removeComponenteNuevo(componente.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </header>
                    <div className="form-grid compact-form-grid">
                      <label>
                        Tipo de componente
                        <select
                          name={`${prefix}-tipo`}
                          value={componente.tipo}
                          onChange={(event) =>
                            updateComponenteNuevoTipo(
                              componente.id,
                              event.target.value as AsignacionComponenteLaboratorio['tipo'],
                            )
                          }
                        >
                          <option value="monitor">Monitor</option>
                          <option value="teclado">Teclado</option>
                          <option value="mouse">Mouse</option>
                          <option value="proyector">Proyector</option>
                          <option value="otro">Otro</option>
                        </select>
                      </label>
                      <label>
                        Nombre
                        <input
                          name={`${prefix}-nombre`}
                          placeholder={`Ej. ${getCategoriaComponenteDesdeTipo(componente.tipo)} de PC`}
                        />
                      </label>
                    </div>
                    <div className="form-grid compact-form-grid">
                      <label>
                        Numero de inventario
                        <input name={`${prefix}-codigo`} placeholder="Ej. 51250" />
                      </label>
                      <label>
                        Serie
                        <input name={`${prefix}-serie`} placeholder="Ej. 3CQ329097K" />
                      </label>
                    </div>
                    <div className="form-grid compact-form-grid">
                      <label>
                        Marca
                        <input name={`${prefix}-marca`} placeholder="Ej. HP, Dell, Logitech" />
                      </label>
                      <label>
                        Modelo
                        <input name={`${prefix}-modelo`} placeholder="Ej. P204v, K120, M90" />
                      </label>
                    </div>
                    <label>
                      Detalle del enlace
                      <input
                        name={`${prefix}-detalle`}
                        placeholder="Ej. Componente asignado desde registro inicial del laboratorio"
                      />
                    </label>
                  </article>
                );
              })}
            </section>
          ) : null}
          <div className="page-actions">
            <button className="primary-button" type="submit" disabled={isSaving}>
              <Save size={18} />
              {editingEquipo ? 'Actualizar equipo' : 'Guardar equipo'}
            </button>
          </div>
        </form>
      </article>
    </div>
  );
}
