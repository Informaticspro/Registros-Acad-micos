import { FormEvent, useRef, useState } from 'react';
import { TIPOS_TRABAJO_RAPIDO, type TipoTrabajoRapido } from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import { registrarCambioPrograma, type CambioPrograma } from '@/modulos/laboratorio/programas.servicio';
import {
  createBitacoraLaboratorio,
  deleteBitacoraLaboratorio,
  updateBitacoraLaboratorio,
  updateEstadoEquipoLaboratorio,
} from '@/servicios/laboratorio.servicio';
import type { BitacoraLaboratorioInput } from '@/servicios/laboratorio.servicio';
import type {
  BitacoraLaboratorio,
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
} from '@/tipos/dominio';
import type { ConfirmarAccion } from '@/hooks/useConfirmacion';
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
  confirmar: ConfirmarAccion;
  equipos: EquipoLaboratorio[];
  estadoEquipoNombre: Record<string, string>;
  refresh: () => Promise<void>;
  saveContext: SaveContext;
  setError: (message: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setMessage: (message: string | null) => void;
};

function useBitacorasLaboratorio({
  confirmar,
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
  const savingQuickWork = useRef(false);

  async function registrarProgramaEquipo(equipo: EquipoLaboratorio, cambio: CambioPrograma) {
    if (savingQuickWork.current) return false;
    savingQuickWork.current = true;
    setIsSaving(true); setError(null); setMessage(null);
    try {
      await registrarCambioPrograma(equipo.id, cambio);
      window.dispatchEvent(new Event('laboratorio-actualizado'));
      setMessage('Programa e historial del equipo actualizados correctamente.');
      await refresh();
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el programa.'); return false; }
    finally { savingQuickWork.current = false; setIsSaving(false); }
  }

  async function registrarTrabajoRapido(equipo: EquipoLaboratorio, tipo: TipoTrabajoRapido, descripcion: string, responsable: string) {
    if (savingQuickWork.current || !descripcion.trim()) return false;
    savingQuickWork.current = true;
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const tipoTrabajo = TIPOS_TRABAJO_RAPIDO[tipo];
      await createBitacoraLaboratorio({
        fecha: new Date().toISOString(), tipoTrabajo, titulo: `${tipoTrabajo} · ${equipo.nombre}`,
        descripcion: descripcion.trim(), responsable, prioridad: 'media', estado: 'cerrado', clase: 'mantenimiento',
        equipoId: equipo.id, equipoDestino: `${equipo.codigo || 'S/N'} - ${equipo.nombre}`,
        ubicacion: equipo.ubicacion, equipoOrigen: '', evidenciaTitulo: '', evidenciaUrl: '',
      }, saveContext);
      window.dispatchEvent(new Event('laboratorio-actualizado'));
      setMessage('Trabajo registrado en el historial del equipo.');
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el registro.');
      return false;
    } finally { savingQuickWork.current = false; setIsSaving(false); }
  }

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
        setMessage('Trabajo actualizado correctamente.');
      } else {
        await createBitacoraLaboratorio(input, saveContext);
        setMessage('Trabajo registrado correctamente.');
        form.reset();
      }

      window.dispatchEvent(new Event('laboratorio-actualizado'));

      if (shouldSyncEquipoEstado && equipoAtendido && nextEquipoEstado && equipoAtendido.estado !== nextEquipoEstado) {
        await updateEstadoEquipoLaboratorio(equipoAtendido.id, nextEquipoEstado);
      }

      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el trabajo.');
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
    const confirmed = await confirmar({
      title: 'Eliminar trabajo',
      message: `Desea eliminar el trabajo "${item.titulo}"?`,
      confirmLabel: 'Eliminar trabajo',
    });
    if (!confirmed) return;

    await deleteBitacoraLaboratorio(item.id);
    await refresh();
  }

  return {
    registrarProgramaEquipo,
    registrarTrabajoRapido,
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
