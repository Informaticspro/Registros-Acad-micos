import { FormEvent, useState } from 'react';

import {
  LaboratorioSaveContext,
  createPrestamoLaboratorio,
  deletePrestamoLaboratorio,
  updatePrestamoLaboratorio,
} from '@/servicios/laboratorio.servicio';
import type { PrestamoLaboratorio } from '@/tipos/dominio';
import { buildPrestamoInput } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type UsePrestamosLaboratorioOptions = {
  refresh: () => Promise<void>;
  saveContext: LaboratorioSaveContext;
  setError: (message: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setMessage: (message: string | null) => void;
};

export function usePrestamosLaboratorio({
  refresh,
  saveContext,
  setError,
  setIsSaving,
  setMessage,
}: UsePrestamosLaboratorioOptions) {
  const [editingPrestamo, setEditingPrestamo] = useState<PrestamoLaboratorio | null>(null);

  async function handlePrestamoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildPrestamoInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
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

  async function handleDeletePrestamo(item: PrestamoLaboratorio) {
    if (!window.confirm(`Desea eliminar el prestamo de "${item.equipo}"?`)) return;
    await deletePrestamoLaboratorio(item.id);
    await refresh();
  }

  return {
    editingPrestamo,
    handleDeletePrestamo,
    handlePrestamoSubmit,
    setEditingPrestamo,
  };
}
