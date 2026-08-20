import { FormEvent, ReactNode } from 'react';
import { Pencil, Save, Trash2 } from 'lucide-react';

import type { LaboratorioState } from '@/servicios/laboratorio.servicio';
import type { CatalogoLaboratorio, SeccionLaboratorio } from '@/tipos/dominio';
import type { CatalogManagerType } from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';
import { getEstadoEquipoLabel } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type GestorCatalogosModalProps = {
  activeCatalogManager: CatalogManagerType | null;
  editingCategoria: CatalogoLaboratorio | null;
  editingEstadoEquipo: CatalogoLaboratorio | null;
  editingSeccion: SeccionLaboratorio | null;
  isSaving: boolean;
  state: LaboratorioState;
  closeCatalogManager: () => void;
  handleCatalogoSubmit: (
    event: FormEvent<HTMLFormElement>,
    tipo: CatalogoLaboratorio['tipo'],
    editingItem: CatalogoLaboratorio | null,
  ) => void;
  handleDeleteCatalogo: (item: CatalogoLaboratorio) => void;
  handleDeleteSeccion: (item: SeccionLaboratorio) => void;
  handleSeccionSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setEditingCategoria: (value: CatalogoLaboratorio | null) => void;
  setEditingEstadoEquipo: (value: CatalogoLaboratorio | null) => void;
  setEditingSeccion: (value: SeccionLaboratorio | null) => void;
};

export function GestorCatalogosModal({
  activeCatalogManager,
  editingCategoria,
  editingEstadoEquipo,
  editingSeccion,
  isSaving,
  state,
  closeCatalogManager,
  handleCatalogoSubmit,
  handleDeleteCatalogo,
  handleDeleteSeccion,
  handleSeccionSubmit,
  setEditingCategoria,
  setEditingEstadoEquipo,
  setEditingSeccion,
}: GestorCatalogosModalProps) {
  if (!activeCatalogManager) return null;

  if (activeCatalogManager === 'categorias') {
    return (
      <CatalogModalShell
        eyebrow="Categorias"
        title={editingCategoria ? 'Editar categoria' : 'Agregar categoria'}
        titleId="lab-category-title"
        onClose={closeCatalogManager}
      >
        <form
          className="stack-form"
          onSubmit={(event) => handleCatalogoSubmit(event, 'categoria_equipo', editingCategoria)}
          key={editingCategoria?.id ?? 'new-category-modal'}
        >
          <CatalogFormFields
            descripcion={editingCategoria?.descripcion}
            nombre={editingCategoria?.nombre}
            nombrePlaceholder="Ej. Tablet"
          />
          <CatalogFormActions
            isEditing={Boolean(editingCategoria)}
            isSaving={isSaving}
            saveLabel={editingCategoria ? 'Actualizar categoria' : 'Guardar categoria'}
            onCancel={() => setEditingCategoria(null)}
          />
        </form>

        <div className="lab-section-list">
          {state.categoriasEquipo.map((categoria) => (
            <article key={categoria.id}>
              <div>
                <strong>{categoria.nombre}</strong>
                {categoria.descripcion ? <small>{categoria.descripcion}</small> : null}
              </div>
              <span>{state.equipos.filter((equipo) => equipo.categoria === categoria.nombre).length}</span>
              <button className="icon-button" type="button" title="Editar categoria" onClick={() => setEditingCategoria(categoria)}>
                <Pencil size={16} />
              </button>
              <button
                className="icon-button danger-button"
                type="button"
                title="Eliminar categoria"
                onClick={() => handleDeleteCatalogo(categoria)}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      </CatalogModalShell>
    );
  }

  if (activeCatalogManager === 'estados') {
    return (
      <CatalogModalShell
        eyebrow="Estados"
        title={editingEstadoEquipo ? 'Editar estado' : 'Agregar estado'}
        titleId="lab-status-title"
        onClose={closeCatalogManager}
      >
        <form
          className="stack-form"
          onSubmit={(event) => handleCatalogoSubmit(event, 'estado_equipo', editingEstadoEquipo)}
          key={editingEstadoEquipo?.id ?? 'new-status-modal'}
        >
          <CatalogFormFields
            descripcion={editingEstadoEquipo?.descripcion}
            descripcionPlaceholder="Ej. Mantenimiento preventivo"
            nombre={editingEstadoEquipo?.nombre}
            nombreLabel="Valor interno"
            nombrePlaceholder="Ej. mantenimiento_preventivo"
            descripcionLabel="Nombre visible"
          />
          <CatalogFormActions
            isEditing={Boolean(editingEstadoEquipo)}
            isSaving={isSaving}
            saveLabel={editingEstadoEquipo ? 'Actualizar estado' : 'Guardar estado'}
            onCancel={() => setEditingEstadoEquipo(null)}
          />
        </form>

        <div className="lab-section-list">
          {state.estadosEquipo.map((estado) => (
            <article key={estado.id}>
              <div>
                <strong>{estado.descripcion || getEstadoEquipoLabel(estado.nombre)}</strong>
                <small>{estado.nombre}</small>
              </div>
              <span>{state.equipos.filter((equipo) => equipo.estado === estado.nombre).length}</span>
              <button className="icon-button" type="button" title="Editar estado" onClick={() => setEditingEstadoEquipo(estado)}>
                <Pencil size={16} />
              </button>
              <button
                className="icon-button danger-button"
                type="button"
                title="Eliminar estado"
                onClick={() => handleDeleteCatalogo(estado)}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      </CatalogModalShell>
    );
  }

  return (
    <CatalogModalShell
      eyebrow="Ubicaciones"
      title={editingSeccion ? 'Editar ubicacion' : 'Agregar ubicacion'}
      titleId="lab-catalog-title"
      onClose={closeCatalogManager}
    >
      <form className="stack-form" onSubmit={handleSeccionSubmit} key={editingSeccion?.id ?? 'new-section-modal'}>
        <CatalogFormFields descripcion={editingSeccion?.descripcion} nombre={editingSeccion?.nombre} nombrePlaceholder="Ej. Decanato" />
        <CatalogFormActions
          isEditing={Boolean(editingSeccion)}
          isSaving={isSaving}
          saveLabel={editingSeccion ? 'Actualizar ubicacion' : 'Guardar ubicacion'}
          onCancel={() => setEditingSeccion(null)}
        />
      </form>

      <div className="lab-section-list">
        {state.secciones.map((seccion) => (
          <article key={seccion.id}>
            <div>
              <strong>{seccion.nombre}</strong>
              {seccion.descripcion ? <small>{seccion.descripcion}</small> : null}
            </div>
            <span>{state.equipos.filter((equipo) => equipo.ubicacion === seccion.nombre).length}</span>
            <button className="icon-button" type="button" title="Editar ubicacion" onClick={() => setEditingSeccion(seccion)}>
              <Pencil size={16} />
            </button>
            <button
              className="icon-button danger-button"
              type="button"
              title="Eliminar ubicacion"
              onClick={() => handleDeleteSeccion(seccion)}
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </CatalogModalShell>
  );
}

function CatalogModalShell({
  children,
  eyebrow,
  title,
  titleId,
  onClose,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  titleId: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="modal-panel lab-catalog-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="lab-catalog-modal-header">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Cerrar
          </button>
        </header>
        {children}
      </article>
    </div>
  );
}

function CatalogFormFields({
  descripcion,
  descripcionLabel = 'Descripcion',
  descripcionPlaceholder = 'Opcional',
  nombre,
  nombreLabel = 'Nombre',
  nombrePlaceholder,
}: {
  descripcion?: string | null;
  descripcionLabel?: string;
  descripcionPlaceholder?: string;
  nombre?: string | null;
  nombreLabel?: string;
  nombrePlaceholder: string;
}) {
  return (
    <div className="form-grid compact-form-grid">
      <label>
        {nombreLabel}
        <input name="nombre" required placeholder={nombrePlaceholder} defaultValue={nombre ?? ''} />
      </label>
      <label>
        {descripcionLabel}
        <input name="descripcion" placeholder={descripcionPlaceholder} defaultValue={descripcion ?? ''} />
      </label>
    </div>
  );
}

function CatalogFormActions({
  isEditing,
  isSaving,
  saveLabel,
  onCancel,
}: {
  isEditing: boolean;
  isSaving: boolean;
  saveLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="page-actions">
      <button className="primary-button" type="submit" disabled={isSaving}>
        <Save size={18} />
        {saveLabel}
      </button>
      {isEditing ? (
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
      ) : null}
    </div>
  );
}
