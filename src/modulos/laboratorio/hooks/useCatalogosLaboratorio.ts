import { FormEvent, useState } from 'react';

import {
  LaboratorioSaveContext,
  createCatalogoLaboratorio,
  createSeccionLaboratorio,
  deleteCatalogoLaboratorio,
  deleteSeccionLaboratorio,
  updateCatalogoLaboratorio,
  updateSeccionLaboratorio,
} from '@/servicios/laboratorio.servicio';
import type { CatalogoLaboratorio, SeccionLaboratorio } from '@/tipos/dominio';
import { buildSeccionInput } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';
import type { CatalogManagerType } from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';

type UseCatalogosLaboratorioOptions = {
  refresh: () => Promise<void>;
  saveContext: LaboratorioSaveContext;
  setError: (message: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setMessage: (message: string | null) => void;
};

export function useCatalogosLaboratorio({
  refresh,
  saveContext,
  setError,
  setIsSaving,
  setMessage,
}: UseCatalogosLaboratorioOptions) {
  const [activeCatalogManager, setActiveCatalogManager] = useState<CatalogManagerType | null>(null);
  const [editingSeccion, setEditingSeccion] = useState<SeccionLaboratorio | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<CatalogoLaboratorio | null>(null);
  const [editingEstadoEquipo, setEditingEstadoEquipo] = useState<CatalogoLaboratorio | null>(null);

  function closeCatalogManager() {
    setActiveCatalogManager(null);
    setEditingSeccion(null);
    setEditingCategoria(null);
    setEditingEstadoEquipo(null);
  }

  async function handleSeccionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildSeccionInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingSeccion) {
        await updateSeccionLaboratorio(editingSeccion.id, input);
        setEditingSeccion(null);
        setMessage('Seccion actualizada correctamente.');
      } else {
        await createSeccionLaboratorio(input, saveContext);
        setMessage('Seccion agregada correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la seccion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCatalogoSubmit(
    event: FormEvent<HTMLFormElement>,
    tipo: CatalogoLaboratorio['tipo'],
    editingItem: CatalogoLaboratorio | null,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildSeccionInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingItem) {
        await updateCatalogoLaboratorio(editingItem.id, tipo, input);
        if (tipo === 'categoria_equipo') setEditingCategoria(null);
        else setEditingEstadoEquipo(null);
        setMessage(tipo === 'categoria_equipo' ? 'Categoria actualizada correctamente.' : 'Estado actualizado correctamente.');
      } else {
        await createCatalogoLaboratorio(tipo, input, saveContext);
        setMessage(tipo === 'categoria_equipo' ? 'Categoria agregada correctamente.' : 'Estado agregado correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la opcion.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSeccion(item: SeccionLaboratorio) {
    if (!window.confirm(`Desea eliminar la seccion "${item.nombre}"?`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteSeccionLaboratorio(item.id);
      if (editingSeccion?.id === item.id) setEditingSeccion(null);
      setMessage('Seccion eliminada correctamente.');
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la seccion.');
    }
  }

  async function handleDeleteCatalogo(item: CatalogoLaboratorio) {
    if (!window.confirm(`Desea eliminar "${item.nombre}"?`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteCatalogoLaboratorio(item.id, item.tipo);
      if (editingCategoria?.id === item.id) setEditingCategoria(null);
      if (editingEstadoEquipo?.id === item.id) setEditingEstadoEquipo(null);
      setMessage('Opcion eliminada correctamente.');
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la opcion.');
    }
  }

  return {
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
  };
}
