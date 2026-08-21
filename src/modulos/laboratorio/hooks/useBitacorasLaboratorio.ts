import { FormEvent, useState } from 'react';
import {
  createBitacoraLaboratorio,
  deleteBitacoraLaboratorio,
  updateBitacoraLaboratorio,
  updateEquipoLaboratorio,
} from '@/servicios/laboratorio.servicio';
import type { BitacoraLaboratorioInput } from '@/servicios/laboratorio.servicio';
import type {
  BitacoraLaboratorio,
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
} from '@/tipos/dominio';
import type { ConfirmacionOperativoPendiente } from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';
import {
  buildBitacoraInput,
  getEstadoEquipoLabel,
  resolveInventoryStatusFromBitacora,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type SaveContext = {
  organizationId: string | null;
  userId: string;
};

type UseBitacorasLaboratorioParams = {
  equipos: EquipoLaboratorio[];
  estadoEquipoNombre: Record<string, string>;
  refresh: () => Promise<void>;
  saveContext: SaveContext;
  setError: (message: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setMessage: (message: string | null) => void;
};

function useBitacorasLaboratorio({
  equipos,
  estadoEquipoNombre,
  refresh,
  saveContext,
  setError,
  setIsSaving,
  setMessage,
}: UseBitacorasLaboratorioParams) {
  const [editingBitacora, setEditingBitacora] = useState<BitacoraLaboratorio | null>(null);
  const [confirmacionOperativo, setConfirmacionOperativo] = useState<ConfirmacionOperativoPendiente | null>(null);

  async function guardarBitacoraConInventario(
    input: BitacoraLaboratorioInput,
    equipoAtendido: EquipoLaboratorio | undefined,
    nextEquipoEstado: EstadoEquipoLaboratorio | null,
    shouldSyncEquipoEstado: boolean,
    form: HTMLFormElement,
  ) {
    if (shouldSyncEquipoEstado && equipoAtendido && nextEquipoEstado && equipoAtendido.estado !== nextEquipoEstado) {
      const previousEstadoLabel = estadoEquipoNombre[equipoAtendido.estado] ?? getEstadoEquipoLabel(equipoAtendido.estado);
      const nextEstadoLabel = estadoEquipoNombre[nextEquipoEstado] ?? getEstadoEquipoLabel(nextEquipoEstado);
      input.descripcion = `${input.descripcion.trim()}\n\nAuditoria de inventario: ${previousEstadoLabel} -> ${nextEstadoLabel}.`;
      input.equipoOrigen = input.equipoOrigen || equipoAtendido.estado;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingBitacora) {
        await updateBitacoraLaboratorio(editingBitacora.id, input);
        setEditingBitacora(null);
        setMessage('Bitacora actualizada correctamente.');
      } else {
        await createBitacoraLaboratorio(input, saveContext);
        setMessage('Bitacora registrada correctamente.');
        form.reset();
      }

      if (shouldSyncEquipoEstado && equipoAtendido && nextEquipoEstado && equipoAtendido.estado !== nextEquipoEstado) {
        await updateEquipoLaboratorio(equipoAtendido.id, {
          codigo: equipoAtendido.codigo,
          nombre: equipoAtendido.nombre,
          categoria: equipoAtendido.categoria,
          marcaModelo: equipoAtendido.marcaModelo,
          serie: equipoAtendido.serie,
          ubicacion: equipoAtendido.ubicacion,
          estado: nextEquipoEstado,
          observaciones: equipoAtendido.observaciones,
        });
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la bitacora.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBitacoraSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildBitacoraInput(form);
    const equipoAtendido = equipos.find((item) => item.id === input.equipoId);
    const nextEquipoEstado = equipoAtendido ? resolveInventoryStatusFromBitacora(input) : null;
    const shouldSyncEquipoEstado = Boolean(equipoAtendido && nextEquipoEstado);

    if (equipoAtendido) {
      input.equipoDestino = `${equipoAtendido.codigo} - ${equipoAtendido.nombre}`;
      input.ubicacion = input.ubicacion || equipoAtendido.ubicacion;
    }

    if (equipoAtendido && nextEquipoEstado === 'operativo' && equipoAtendido.estado !== 'operativo') {
      setConfirmacionOperativo({ input, equipoAtendido, nextEquipoEstado, form });
      return;
    }

    await guardarBitacoraConInventario(input, equipoAtendido, nextEquipoEstado, shouldSyncEquipoEstado, form);
  }

  async function handleDeleteBitacora(item: BitacoraLaboratorio) {
    if (!window.confirm(`Desea eliminar la bitacora "${item.titulo}"?`)) return;
    await deleteBitacoraLaboratorio(item.id);
    await refresh();
  }

  return {
    confirmacionOperativo,
    editingBitacora,
    guardarBitacoraConInventario,
    handleBitacoraSubmit,
    handleDeleteBitacora,
    setConfirmacionOperativo,
    setEditingBitacora,
  };
}

export { useBitacorasLaboratorio };
