import { FormEvent, useMemo, useState } from 'react';
import {
  createFichaTecnicaLaboratorio,
  deleteFichaTecnicaLaboratorio,
  updateFichaTecnicaLaboratorio,
} from '@/servicios/laboratorio.servicio';
import type {
  FichaTecnicaLaboratorio,
  EquipoLaboratorio,
} from '@/tipos/dominio';
import { buildFichaTecnicaInput } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type SaveContext = {
  organizationId: string | null;
  userId: string;
};

type UseFichasLaboratorioParams = {
  equipos: EquipoLaboratorio[];
  refresh: () => Promise<void>;
  saveContext: SaveContext;
  setError: (message: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setMessage: (message: string | null) => void;
};

function useFichasLaboratorio({
  equipos,
  refresh,
  saveContext,
  setError,
  setIsSaving,
  setMessage,
}: UseFichasLaboratorioParams) {
  const [editingFicha, setEditingFicha] = useState<FichaTecnicaLaboratorio | null>(null);
  const [selectedFicha, setSelectedFicha] = useState<FichaTecnicaLaboratorio | null>(null);
  const [selectedEquipoFichaId, setSelectedEquipoFichaId] = useState('');

  const selectedEquipoFicha = useMemo(
    () => equipos.find((item) => item.id === selectedEquipoFichaId) ?? null,
    [selectedEquipoFichaId, equipos],
  );

  async function handleFichaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildFichaTecnicaInput(form);

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingFicha) {
        const updated = await updateFichaTecnicaLaboratorio(editingFicha.id, input);
        setEditingFicha(null);
        setSelectedFicha(updated);
        setMessage('Ficha tecnica actualizada correctamente.');
      } else {
        const created = await createFichaTecnicaLaboratorio(input, saveContext);
        setSelectedFicha(created);
        setSelectedEquipoFichaId('');
        setMessage('Ficha tecnica guardada correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la ficha tecnica.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteFicha(item: FichaTecnicaLaboratorio) {
    if (!window.confirm(`Desea eliminar la ficha tecnica de "${item.pc}"?`)) return;
    await deleteFichaTecnicaLaboratorio(item.id);
    if (selectedFicha?.id === item.id) setSelectedFicha(null);
    await refresh();
  }

  function openFichaForEquipo(equipo: EquipoLaboratorio) {
    setEditingFicha(null);
    setSelectedEquipoFichaId(equipo.id);
  }

  return {
    editingFicha,
    handleDeleteFicha,
    handleFichaSubmit,
    openFichaForEquipo,
    selectedEquipoFicha,
    selectedEquipoFichaId,
    selectedFicha,
    setEditingFicha,
    setSelectedEquipoFichaId,
    setSelectedFicha,
  };
}

export { useFichasLaboratorio };
