import { Dispatch, FormEvent, SetStateAction } from 'react';

import {
  EquipoLaboratorioInput,
  createAsignacionComponenteLaboratorio,
  createBitacoraLaboratorio,
  createEquipoLaboratorio,
  retirarAsignacionComponenteLaboratorio,
} from '@/servicios/laboratorio.servicio';
import type {
  AsignacionComponenteLaboratorio,
  EquipoLaboratorio,
} from '@/tipos/dominio';
import {
  buildDuplicateEquipoMessage,
  findDuplicateEquipoIdentity,
  getCategoriaComponenteDesdeTipo,
  readString,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type SaveContext = {
  organizationId: string | null;
  userId: string;
};

type UseComponentesLaboratorioParams = {
  equipos: EquipoLaboratorio[];
  getEquipoById: (id: string) => EquipoLaboratorio | null;
  refresh: () => Promise<void>;
  responsableSesion: string;
  saveContext: SaveContext;
  setComponentMoveTargets: Dispatch<SetStateAction<Record<string, string>>>;
  setError: (message: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setMessage: (message: string | null) => void;
};

function useComponentesLaboratorio({
  equipos,
  getEquipoById,
  refresh,
  responsableSesion,
  saveContext,
  setComponentMoveTargets,
  setError,
  setIsSaving,
  setMessage,
}: UseComponentesLaboratorioParams) {
  async function handleAsignarComponente(event: FormEvent<HTMLFormElement>, equipoPadre: EquipoLaboratorio) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const componenteId = readString(data, 'componenteId');
    const tipo = readString(data, 'tipo') as AsignacionComponenteLaboratorio['tipo'];
    const detalle = readString(data, 'detalle');
    const componente = equipos.find((item) => item.id === componenteId);

    if (!componente) {
      setError('Seleccione un componente del inventario.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createAsignacionComponenteLaboratorio(
        {
          equipoPadreId: equipoPadre.id,
          componenteId,
          tipo,
          fechaAsignacion: new Date().toISOString(),
          fechaRetiro: null,
          detalle,
          responsable: responsableSesion,
        },
        saveContext,
      );
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Asignacion de componente',
          titulo: `Componente asignado a ${equipoPadre.nombre}`,
          descripcion: `${componente.codigo || 'S/N'} - ${componente.nombre} fue asignado a ${
            equipoPadre.codigo || 'S/N'
          } - ${equipoPadre.nombre}. ${detalle || 'Sin detalle adicional.'}`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: equipoPadre.id,
          equipoOrigen: componente.ubicacion || 'Sin ubicacion',
          equipoDestino: `${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}`,
          ubicacion: equipoPadre.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      form.reset();
      await refresh();
      setMessage('Componente asignado y registrado en el historial.');
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'No se pudo asignar el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCrearYAsignarComponente(event: FormEvent<HTMLFormElement>, equipoPadre: EquipoLaboratorio) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const tipo = (readString(data, 'nuevoComponenteTipo') || 'monitor') as AsignacionComponenteLaboratorio['tipo'];
    const codigo = readString(data, 'nuevoComponenteCodigo');
    const nombre = readString(data, 'nuevoComponenteNombre') || `${getCategoriaComponenteDesdeTipo(tipo)} de ${equipoPadre.nombre}`;
    const marca = readString(data, 'nuevoComponenteMarca');
    const modelo = readString(data, 'nuevoComponenteModelo');
    const serie = readString(data, 'nuevoComponenteSerie');
    const detalle = readString(data, 'nuevoComponenteDetalle');
    const input: EquipoLaboratorioInput = {
      codigo,
      nombre,
      categoria: getCategoriaComponenteDesdeTipo(tipo),
      marcaModelo: [marca, modelo].filter(Boolean).join(' '),
      serie,
      ubicacion: equipoPadre.ubicacion,
      estado: equipoPadre.estado || 'operativo',
      observaciones: `Componente creado y asignado desde el expediente de ${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}.`,
    };

    if (!codigo && !serie) {
      setError('Para crear el componente indique numero de inventario o serie.');
      return;
    }

    const duplicate = findDuplicateEquipoIdentity(input, equipos);
    if (duplicate) {
      setError(buildDuplicateEquipoMessage(duplicate));
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const createdComponente = await createEquipoLaboratorio(input, saveContext);
      await createAsignacionComponenteLaboratorio(
        {
          equipoPadreId: equipoPadre.id,
          componenteId: createdComponente.id,
          tipo,
          fechaAsignacion: new Date().toISOString(),
          fechaRetiro: null,
          detalle,
          responsable: responsableSesion,
        },
        saveContext,
      );
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Registro y asignacion de componente',
          titulo: `Componente nuevo asignado a ${equipoPadre.nombre}`,
          descripcion: `${createdComponente.codigo || 'S/N'} - ${createdComponente.nombre} fue creado y asignado a ${
            equipoPadre.codigo || 'S/N'
          } - ${equipoPadre.nombre}. ${detalle || 'Sin detalle adicional.'}`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: equipoPadre.id,
          equipoOrigen: 'Registro desde expediente',
          equipoDestino: `${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}`,
          ubicacion: equipoPadre.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      form.reset();
      await refresh();
      setMessage('Componente creado, asignado y registrado en el historial.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear y asignar el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRetirarComponente(asignacion: AsignacionComponenteLaboratorio, equipoPadre: EquipoLaboratorio) {
    const componente = getEquipoById(asignacion.componenteId);
    if (!componente) {
      setError('No se encontro el componente seleccionado.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await retirarAsignacionComponenteLaboratorio(asignacion.id, saveContext);
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Retiro de componente',
          titulo: `Componente retirado de ${equipoPadre.nombre}`,
          descripcion: `${componente.codigo || 'S/N'} - ${componente.nombre} fue retirado de ${
            equipoPadre.codigo || 'S/N'
          } - ${equipoPadre.nombre}.`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: equipoPadre.id,
          equipoOrigen: `${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}`,
          equipoDestino: componente.nombre,
          ubicacion: equipoPadre.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      await refresh();
      setMessage('Componente retirado y registrado en el historial.');
    } catch (retireError) {
      setError(retireError instanceof Error ? retireError.message : 'No se pudo retirar el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMoverComponente(
    asignacion: AsignacionComponenteLaboratorio,
    equipoActual: EquipoLaboratorio,
    nuevoEquipoId: string,
  ) {
    const componente = getEquipoById(asignacion.componenteId);
    const nuevoEquipo = getEquipoById(nuevoEquipoId);
    if (!componente || !nuevoEquipo) {
      setError('Seleccione un equipo destino valido.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await retirarAsignacionComponenteLaboratorio(asignacion.id, saveContext);
      await createAsignacionComponenteLaboratorio(
        {
          equipoPadreId: nuevoEquipo.id,
          componenteId: componente.id,
          tipo: asignacion.tipo,
          fechaAsignacion: new Date().toISOString(),
          fechaRetiro: null,
          detalle: `Movido desde ${equipoActual.codigo || 'S/N'} - ${equipoActual.nombre} hacia ${
            nuevoEquipo.codigo || 'S/N'
          } - ${nuevoEquipo.nombre}.`,
          responsable: responsableSesion,
        },
        saveContext,
      );
      await createBitacoraLaboratorio(
        {
          fecha: new Date().toISOString(),
          tipoTrabajo: 'Movimiento de componente',
          titulo: `Componente movido a ${nuevoEquipo.nombre}`,
          descripcion: `${componente.codigo || 'S/N'} - ${componente.nombre} fue movido desde ${
            equipoActual.codigo || 'S/N'
          } - ${equipoActual.nombre} hacia ${nuevoEquipo.codigo || 'S/N'} - ${nuevoEquipo.nombre}.`,
          responsable: responsableSesion,
          prioridad: 'media',
          estado: 'cerrado',
          clase: 'mantenimiento',
          equipoId: nuevoEquipo.id,
          equipoOrigen: `${equipoActual.codigo || 'S/N'} - ${equipoActual.nombre}`,
          equipoDestino: `${nuevoEquipo.codigo || 'S/N'} - ${nuevoEquipo.nombre}`,
          ubicacion: nuevoEquipo.ubicacion,
          evidenciaTitulo: '',
          evidenciaUrl: '',
        },
        saveContext,
      );
      setComponentMoveTargets((current) => {
        const next = { ...current };
        delete next[asignacion.id];
        return next;
      });
      await refresh();
      setMessage('Componente movido y registrado en el historial.');
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'No se pudo mover el componente.');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    handleAsignarComponente,
    handleCrearYAsignarComponente,
    handleMoverComponente,
    handleRetirarComponente,
  };
}

export { useComponentesLaboratorio };
