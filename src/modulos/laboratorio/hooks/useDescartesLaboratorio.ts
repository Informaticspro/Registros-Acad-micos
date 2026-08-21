import { ChangeEvent, FormEvent, useMemo, useState } from 'react';

import {
  createBitacoraLaboratorio,
  createDescarteLaboratorio,
  deleteDescarteLaboratorio,
  deleteEquipoLaboratorio,
} from '@/servicios/laboratorio.servicio';
import type {
  DescarteLaboratorio,
  EquipoLaboratorio,
} from '@/tipos/dominio';
import {
  buildDescarteInput,
  normalizeExcelKey,
  parseDescartesExcelRows,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type SaveContext = {
  organizationId: string | null;
  userId: string;
};

type UseDescartesLaboratorioParams = {
  descartes: DescarteLaboratorio[];
  equipos: EquipoLaboratorio[];
  refresh: () => Promise<void>;
  responsableSesion: string;
  saveContext: SaveContext;
  setActiveTab: (tab: 'descartes') => void;
  setError: (message: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setMessage: (message: string | null) => void;
};

function useDescartesLaboratorio({
  descartes,
  equipos,
  refresh,
  responsableSesion,
  saveContext,
  setActiveTab,
  setError,
  setIsSaving,
  setMessage,
}: UseDescartesLaboratorioParams) {
  const [selectedDescarteEquipoId, setSelectedDescarteEquipoId] = useState('');

  const selectedDescarteEquipo = useMemo(
    () => equipos.find((item) => item.id === selectedDescarteEquipoId) ?? null,
    [equipos, selectedDescarteEquipoId],
  );

  async function handleDescarteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildDescarteInput(form, responsableSesion);
    const equipo = input.equipoId ? equipos.find((item) => item.id === input.equipoId) : null;

    if (!input.inventario.trim() || !input.equipo.trim()) {
      setError('Indique el numero de inventario y el equipo a descartar.');
      return;
    }

    if (!input.detalle.trim()) {
      setError('Escriba el detalle o motivo del descarte.');
      return;
    }

    if (equipo && !normalizeExcelKey(equipo.ubicacion).includes('deposito')) {
      setError('Para descartar un equipo registrado, primero debe estar ubicado en Deposito.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createDescarteLaboratorio(input, saveContext);

      if (equipo) {
        await createBitacoraLaboratorio(
          {
            fecha: new Date().toISOString(),
            tipoTrabajo: 'Descarte de equipo',
            titulo: `Equipo descartado: ${input.inventario} - ${input.equipo}`,
            descripcion: input.detalle,
            responsable: input.responsable,
            prioridad: 'alta',
            estado: 'cerrado',
            clase: 'incidencia',
            equipoId: equipo.id,
            equipoOrigen: equipo.estado,
            equipoDestino: `${input.inventario} - ${input.equipo}`,
            ubicacion: input.ubicacion || equipo.ubicacion || 'Deposito',
            evidenciaTitulo: input.evidenciaTitulo,
            evidenciaUrl: input.evidenciaUrl,
          },
          saveContext,
        );
        await deleteEquipoLaboratorio(equipo.id);
      }

      setSelectedDescarteEquipoId('');
      form.reset();
      setMessage(equipo ? 'Descarte registrado y equipo retirado del inventario activo.' : 'Descarte registrado correctamente.');
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el descarte. Ejecuta la migracion de descartes en Supabase si aun no existe la tabla.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDescarte(item: DescarteLaboratorio) {
    if (!window.confirm(`Desea eliminar el descarte de "${item.equipo}"?`)) return;
    await deleteDescarteLaboratorio(item.id);
    await refresh();
  }

  async function handleDescartesExcelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { read, utils } = await import('xlsx');
      const workbook = read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      if (!worksheet) throw new Error('El archivo no tiene hojas disponibles.');

      const rows = utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
      const inputs = parseDescartesExcelRows(rows, file.name, responsableSesion);
      const existingKeys = new Set(
        descartes.map((item) => normalizeExcelKey(`${item.inventario}|${item.equipo}|${item.serie}`)),
      );
      const uniqueInputs = inputs.filter((item) => {
        const key = normalizeExcelKey(`${item.inventario}|${item.equipo}|${item.serie}`);
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });

      for (const input of uniqueInputs) {
        await createDescarteLaboratorio(input, saveContext);
      }

      await refresh();
      setActiveTab('descartes');
      setMessage(`Descartes importados: ${uniqueInputs.length} registros nuevos y ${inputs.length - uniqueInputs.length} duplicados ignorados.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo importar el Excel de descartes.');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    handleDeleteDescarte,
    handleDescarteSubmit,
    handleDescartesExcelUpload,
    selectedDescarteEquipo,
    selectedDescarteEquipoId,
    setSelectedDescarteEquipoId,
  };
}

export { useDescartesLaboratorio };
