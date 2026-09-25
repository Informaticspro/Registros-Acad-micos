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
import type { ConfirmarAccion } from '@/hooks/useConfirmacion';
import { buildFichaTecnicaInput } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type SaveContext = {
  organizationId: string | null;
  userId: string;
};

type UseFichasLaboratorioParams = {
  confirmar: ConfirmarAccion;
  equipos: EquipoLaboratorio[];
  refresh: () => Promise<void>;
  saveContext: SaveContext;
  setError: (message: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setMessage: (message: string | null) => void;
};

function useFichasLaboratorio({
  confirmar,
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
    // Historical actions and inventory snapshots are no longer edited in this form.
    input.acciones = editingFicha?.acciones ?? [];
    input.inventario = editingFicha?.inventario ?? (selectedEquipoFicha
      ? [{ equipo: selectedEquipoFicha.nombre, numero: selectedEquipoFicha.codigo || selectedEquipoFicha.serie }]
      : []);
    if (!editingFicha && !selectedEquipoFicha) {
      setError('Seleccione un equipo del inventario.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingFicha) {
        const updated = await updateFichaTecnicaLaboratorio(editingFicha.id, input);
        setEditingFicha(updated);
        setSelectedFicha(updated);
        setMessage('Detalles técnicos actualizados correctamente.');
      } else {
        const created = await createFichaTecnicaLaboratorio(input, saveContext);
        setSelectedFicha(created);
        setEditingFicha(created);
        setMessage('Detalles técnicos guardados correctamente.');
        form.reset();
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudieron guardar los detalles técnicos.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteFicha(item: FichaTecnicaLaboratorio) {
    const confirmed = await confirmar({
      title: 'Eliminar detalles técnicos',
      message: `Desea eliminar los detalles técnicos de "${item.pc}"?`,
      confirmLabel: 'Eliminar registro',
    });
    if (!confirmed) return;

    await deleteFichaTecnicaLaboratorio(item.id);
    if (selectedFicha?.id === item.id) setSelectedFicha(null);
    if (editingFicha?.id === item.id) setEditingFicha(null);
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
