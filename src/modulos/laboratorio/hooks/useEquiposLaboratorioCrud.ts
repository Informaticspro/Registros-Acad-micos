import { FormEvent } from 'react';

import {
  EquipoLaboratorioInput,
  createAsignacionComponenteLaboratorio,
  createBitacoraLaboratorio,
  createEquipoLaboratorio,
  updateEquipoLaboratorio,
} from '@/servicios/laboratorio.servicio';
import type {
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
} from '@/tipos/dominio';
import {
  ComponenteNuevoDraft,
  buildComponentesInicialesInput,
  buildDuplicateEquipoMessage,
  buildEquipoInput,
  findDuplicateEquipoIdentity,
  getEstadoChangeWorkStatus,
  getEstadoChangeWorkType,
  getEstadoEquipoLabel,
  normalizeUniqueEquipoValue,
  shouldRequestIssueDetailForEstado,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type SaveContext = {
  organizationId: string | null;
  userId: string;
};

type UseEquiposLaboratorioCrudParams = {
  closeEquipoFormModal: () => void;
  componentesNuevoEquipo: ComponenteNuevoDraft[];
  editingEquipo: EquipoLaboratorio | null;
  equipos: EquipoLaboratorio[];
  estadoEquipoNombre: Record<string, string>;
  refresh: () => Promise<void>;
  responsableSesion: string;
  saveContext: SaveContext;
  setError: (message: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setMessage: (message: string | null) => void;
};

function useEquiposLaboratorioCrud({
  closeEquipoFormModal,
  componentesNuevoEquipo,
  editingEquipo,
  equipos,
  estadoEquipoNombre,
  refresh,
  responsableSesion,
  saveContext,
  setError,
  setIsSaving,
  setMessage,
}: UseEquiposLaboratorioCrudParams) {
  async function handleEquipoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = buildEquipoInput(form);
    let componentesIniciales: ReturnType<typeof buildComponentesInicialesInput> = [];
    if (!editingEquipo) {
      try {
        componentesIniciales = buildComponentesInicialesInput(form, input, componentesNuevoEquipo);
      } catch (componentError) {
        setError(componentError instanceof Error ? componentError.message : 'Revise los datos de los componentes.');
        return;
      }
    }
    const duplicate = findDuplicateEquipoIdentity(input, equipos, editingEquipo?.id);

    if (duplicate) {
      setError(buildDuplicateEquipoMessage(duplicate));
      return;
    }

    for (const componenteInicial of componentesIniciales) {
      const duplicateComponent = findDuplicateEquipoIdentity(componenteInicial.equipo, equipos);
      if (duplicateComponent) {
        setError(buildDuplicateEquipoMessage(duplicateComponent));
        return;
      }
    }

    const seenComponentSerie = new Set<string>();
    for (const componenteInicial of componentesIniciales) {
      const serieKey = normalizeUniqueEquipoValue(componenteInicial.equipo.serie, 'serie');
      if (serieKey && seenComponentSerie.has(serieKey)) {
        setError(`Hay mas de un componente con el mismo numero de serie: ${componenteInicial.equipo.serie}.`);
        return;
      }
      if (serieKey) seenComponentSerie.add(serieKey);
    }

    const hasEstadoChange = Boolean(editingEquipo && editingEquipo.estado !== input.estado);
    const previousEstadoLabel = editingEquipo ? estadoEquipoNombre[editingEquipo.estado] ?? getEstadoEquipoLabel(editingEquipo.estado) : '';
    const nextEstadoLabel = estadoEquipoNombre[input.estado] ?? getEstadoEquipoLabel(input.estado);
    const closingDetail =
      editingEquipo && hasEstadoChange && input.estado === 'operativo' && editingEquipo.estado !== 'operativo'
        ? window.prompt('Detalle del trabajo realizado antes de dejar el equipo operativo:')
        : null;
    const issueDetail =
      editingEquipo && hasEstadoChange && shouldRequestIssueDetailForEstado(input.estado)
        ? window.prompt('Describa la incidencia, falla o motivo de revision del equipo:')
        : null;

    if (editingEquipo && hasEstadoChange && input.estado === 'operativo' && !closingDetail?.trim()) {
      setError('Debe escribir un detalle antes de devolver el equipo a operativo.');
      return;
    }

    if (editingEquipo && hasEstadoChange && shouldRequestIssueDetailForEstado(input.estado) && !issueDetail?.trim()) {
      setError('Debe escribir la incidencia o motivo antes de cambiar el estado del equipo.');
      return;
    }

    if (hasEstadoChange && input.estado === 'baja') {
      input.ubicacion = 'Deposito';
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingEquipo) {
        await updateEquipoLaboratorio(editingEquipo.id, input);
        if (hasEstadoChange) {
          await crearBitacoraCambioEstado({
            equipoId: editingEquipo.id,
            input,
            previousEstado: editingEquipo.estado,
            previousEstadoLabel,
            nextEstadoLabel,
            closingDetail: closingDetail?.trim() ?? '',
            issueDetail: issueDetail?.trim() ?? '',
            equipoLabel: `${input.codigo || editingEquipo.codigo} - ${input.nombre || editingEquipo.nombre}`,
            modoEdicion: true,
          });
        }
        setMessage(hasEstadoChange ? 'Equipo actualizado y bitacora automatica registrada.' : 'Equipo actualizado correctamente.');
      } else {
        const createdEquipo = await createEquipoLaboratorio(input, saveContext);
        if (componentesIniciales.length > 0) {
          try {
            const createdComponentes: EquipoLaboratorio[] = [];
            for (const componenteInicial of componentesIniciales) {
              const createdComponente = await createEquipoLaboratorio(componenteInicial.equipo, saveContext);
              createdComponentes.push(createdComponente);
              await createAsignacionComponenteLaboratorio(
                {
                  equipoPadreId: createdEquipo.id,
                  componenteId: createdComponente.id,
                  tipo: componenteInicial.asignacionTipo,
                  fechaAsignacion: new Date().toISOString(),
                  fechaRetiro: null,
                  detalle: componenteInicial.detalle,
                  responsable: responsableSesion,
                },
                saveContext,
              );
            }
            await createBitacoraLaboratorio(
              {
                fecha: new Date().toISOString(),
                tipoTrabajo: 'Registro de equipo con componentes',
                titulo: `PC registrada: ${createdEquipo.nombre}`,
                descripcion: `${createdEquipo.codigo || 'S/N'} - ${createdEquipo.nombre} fue registrada como PC/CPU. Componentes enlazados: ${createdComponentes
                  .map((item) => `${item.codigo || 'S/N'} - ${item.nombre}`)
                  .join('; ')}.`,
                responsable: responsableSesion,
                prioridad: 'media',
                estado: 'cerrado',
                clase: 'mantenimiento',
                equipoId: createdEquipo.id,
                equipoOrigen: 'Registro inicial',
                equipoDestino: `${createdEquipo.codigo || 'S/N'} - ${createdEquipo.nombre}`,
                ubicacion: createdEquipo.ubicacion,
                evidenciaTitulo: '',
                evidenciaUrl: '',
              },
              saveContext,
            );
          } catch (componentSaveError) {
            const detail = componentSaveError instanceof Error ? componentSaveError.message : 'Error desconocido.';
            setError(
              `La PC se guardo, pero uno o mas componentes no se pudieron registrar o enlazar. Detalle: ${detail}`,
            );
            closeEquipoFormModal();
            form.reset();
            await refresh();
            return;
          }
        }
        setMessage(
          componentesIniciales.length > 0
            ? `PC/CPU y ${componentesIniciales.length} componente${componentesIniciales.length === 1 ? '' : 's'} registrados.`
            : 'Equipo agregado al inventario.',
        );
        form.reset();
      }

      closeEquipoFormModal();
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el equipo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQuickEstadoEquipo(item: EquipoLaboratorio, estado: EstadoEquipoLaboratorio) {
    if (item.estado === estado) return;
    const previousEstadoLabel = estadoEquipoNombre[item.estado] ?? getEstadoEquipoLabel(item.estado);
    const nextEstadoLabel = estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado);
    const closingDetail =
      estado === 'operativo' && item.estado !== 'operativo'
        ? window.prompt('Detalle del trabajo realizado antes de dejar el equipo operativo:')
        : null;
    const issueDetail =
      shouldRequestIssueDetailForEstado(estado)
        ? window.prompt('Describa la incidencia, falla o motivo de revision del equipo:')
        : null;

    if (estado === 'operativo' && item.estado !== 'operativo' && !closingDetail?.trim()) {
      setError('Debe escribir un detalle antes de devolver el equipo a operativo.');
      return;
    }

    if (shouldRequestIssueDetailForEstado(estado) && !issueDetail?.trim()) {
      setError('Debe escribir la incidencia o motivo antes de cambiar el estado del equipo.');
      return;
    }

    const nextUbicacion = estado === 'baja' ? 'Deposito' : item.ubicacion;
    const equipoLabel = `${item.codigo} - ${item.nombre}`;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateEquipoLaboratorio(item.id, {
        codigo: item.codigo,
        nombre: item.nombre,
        categoria: item.categoria,
        marcaModelo: item.marcaModelo,
        serie: item.serie,
        ubicacion: nextUbicacion,
        estado,
        observaciones: item.observaciones,
      });
      try {
        await crearBitacoraCambioEstado({
          equipoId: item.id,
          input: {
            codigo: item.codigo,
            nombre: item.nombre,
            categoria: item.categoria,
            marcaModelo: item.marcaModelo,
            serie: item.serie,
            ubicacion: nextUbicacion,
            estado,
            observaciones: item.observaciones,
          },
          previousEstado: item.estado,
          previousEstadoLabel,
          nextEstadoLabel,
          closingDetail: closingDetail?.trim() ?? '',
          issueDetail: issueDetail?.trim() ?? '',
          equipoLabel,
          modoEdicion: false,
        });
      } catch (historyError) {
        const detail = historyError instanceof Error ? historyError.message : 'Error desconocido';
        setError(`Estado actualizado, pero no se pudo guardar el historial automatico: ${detail}`);
      }
      setMessage(
        estado === 'baja'
          ? 'Equipo marcado como baja y movido a Deposito.'
          : `Estado actualizado a ${estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}.`,
      );
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar el estado del equipo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function crearBitacoraCambioEstado({
    equipoId,
    input,
    previousEstado,
    previousEstadoLabel,
    nextEstadoLabel,
    closingDetail,
    issueDetail,
    equipoLabel,
    modoEdicion,
  }: {
    equipoId: string;
    input: EquipoLaboratorioInput;
    previousEstado: EstadoEquipoLaboratorio;
    previousEstadoLabel: string;
    nextEstadoLabel: string;
    closingDetail: string;
    issueDetail: string;
    equipoLabel: string;
    modoEdicion: boolean;
  }) {
    const workType = getEstadoChangeWorkType(input.estado);
    const automaticDescription =
      input.estado === 'operativo'
        ? `Equipo devuelto a operativo. Estado anterior: ${previousEstadoLabel}. Detalle: ${closingDetail}`
        : shouldRequestIssueDetailForEstado(input.estado)
          ? `Incidencia registrada desde inventario. Estado anterior: ${previousEstadoLabel}. Estado actual: ${nextEstadoLabel}. Detalle: ${issueDetail}`
          : modoEdicion
            ? `Cambio de estado tecnico desde edicion de inventario: ${previousEstadoLabel} -> ${nextEstadoLabel}.`
            : `Cambio de estado tecnico: ${previousEstadoLabel} -> ${nextEstadoLabel}.`;

    await createBitacoraLaboratorio(
      {
        fecha: new Date().toISOString(),
        tipoTrabajo: workType,
        titulo:
          input.estado === 'operativo'
            ? `Equipo operativo: ${equipoLabel}`
            : shouldRequestIssueDetailForEstado(input.estado)
              ? `Incidencia en ${equipoLabel}`
              : `Equipo en ${nextEstadoLabel}: ${equipoLabel}`,
        descripcion: automaticDescription,
        responsable: responsableSesion,
        prioridad: input.estado === 'baja' ? 'alta' : 'media',
        estado: getEstadoChangeWorkStatus(input.estado),
        clase: input.estado === 'operativo' ? 'mantenimiento' : 'incidencia',
        equipoId,
        equipoOrigen: previousEstado,
        equipoDestino: equipoLabel,
        ubicacion: input.ubicacion,
        evidenciaTitulo: '',
        evidenciaUrl: '',
      },
      saveContext,
    );
  }

  return {
    handleEquipoSubmit,
    handleQuickEstadoEquipo,
  };
}

export { useEquiposLaboratorioCrud };
