import { useEffect, useMemo, useState } from 'react';
import type { LaboratorioState } from '@/servicios/laboratorio.servicio';
import { supabase } from '@/infraestructura/supabase';
import { estadoTrabajoLabels } from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import type { LabTab } from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';
import {
  getEstadoEquipoLabel,
  isUuid,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type PerfilActividad = {
  id?: string;
  fullName?: string;
};

type UseActividadLaboratorioParams = {
  estadoEquipoNombre: Record<string, string>;
  profile: PerfilActividad | null;
  state: LaboratorioState;
};

function resolveResponsableEquipo(
  registradoPor: string | null | undefined,
  profile: PerfilActividad | null,
  profileNamesById: Record<string, string>,
) {
  if (registradoPor && registradoPor === profile?.id) return profile.fullName ?? 'Usuario del sistema';
  if (registradoPor && profileNamesById[registradoPor]) return profileNamesById[registradoPor];
  if (registradoPor && !isUuid(registradoPor)) return registradoPor;
  return 'Usuario del sistema';
}

function useActividadLaboratorio({ estadoEquipoNombre, profile, state }: UseActividadLaboratorioParams) {
  const [profileNamesById, setProfileNamesById] = useState<Record<string, string>>({});
  const [showMoreActivity, setShowMoreActivity] = useState(false);

  useEffect(() => {
    const registeredIds = Array.from(new Set(state.equipos.map((item) => item.registradoPor).filter((value) => value && isUuid(value))));
    const missingIds = registeredIds.filter((id) => !profileNamesById[id]);
    if (profile?.id && profile.fullName) {
      const profileId = profile.id;
      const profileName = profile.fullName;
      setProfileNamesById((current) => (current[profileId] ? current : { ...current, [profileId]: profileName }));
    }
    if (!supabase || missingIds.length === 0) return;

    supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', missingIds)
      .then(({ data }) => {
        if (!data?.length) return;
        setProfileNamesById((current) => ({
          ...current,
          ...Object.fromEntries(data.map((row) => [row.id, row.full_name])),
        }));
      });
  }, [profile?.fullName, profile?.id, profileNamesById, state.equipos]);

  const indicadores = useMemo(() => {
    const trabajosAbiertos = state.bitacoras.filter((item) => item.estado !== 'cerrado').length;
    const equiposMantenimiento = state.equipos.filter((item) => item.estado === 'mantenimiento').length;
    const equiposPendientes = state.equipos.filter((item) => item.estado !== 'operativo').length;
    const prestamosActivos = state.prestamos.filter((item) => item.estado === 'activo').length;
    const descartesRegistrados = state.descartes.length;
    const evidencias = state.bitacoras.filter((item) => item.evidenciaUrl || item.evidenciaTitulo).length;

    return { trabajosAbiertos, equiposMantenimiento, equiposPendientes, prestamosActivos, descartesRegistrados, evidencias };
  }, [state]);

  const actividadReciente = useMemo(() => {
    const bitacoras = state.bitacoras.map((item) => ({
      id: `bitacora-${item.id}`,
      fecha: item.fecha,
      tipo: 'Bitacora',
      titulo: item.titulo,
      detalle: `${item.responsable || 'Sin responsable'} | ${estadoTrabajoLabels[item.estado]}`,
      tab: 'bitacoras' as LabTab,
    }));
    const fichas = state.fichas.map((item) => ({
      id: `ficha-${item.id}`,
      fecha: item.updatedAt,
      tipo: 'Ficha tecnica',
      titulo: item.pc,
      detalle: `${item.ubicacion || 'Sin ubicacion'} | ${item.responsable || 'Sin responsable'}`,
      tab: 'fichas' as LabTab,
    }));
    const prestamos = state.prestamos.map((item) => ({
      id: `prestamo-${item.id}`,
      fecha: item.fechaPrestamo,
      tipo: 'Prestamo',
      titulo: item.equipo,
      detalle: `${item.entregadoA} | ${item.estado}`,
      tab: 'prestamos' as LabTab,
    }));
    const descartes = state.descartes.map((item) => ({
      id: `descarte-${item.id}`,
      fecha: item.fecha,
      tipo: 'Descarte',
      titulo: item.equipo,
      detalle: `${item.responsable || 'Sin responsable'} | ${item.ubicacion || 'Sin ubicacion'}`,
      tab: 'descartes' as LabTab,
    }));
    const equipos = state.equipos.map((item) => {
      const isCreation = Math.abs(new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime()) < 2000;
      const responsable = resolveResponsableEquipo(item.registradoPor, profile, profileNamesById);
      return {
        id: `equipo-${item.id}`,
        fecha: item.updatedAt || item.createdAt,
        tipo: isCreation ? 'Equipo registrado' : 'Equipo actualizado',
        titulo: item.nombre,
        detalle: `${responsable} | ${item.ubicacion || 'Sin ubicacion'} | ${estadoEquipoNombre[item.estado] ?? getEstadoEquipoLabel(item.estado)}`,
        tab: 'inventario' as LabTab,
      };
    });

    return [...bitacoras, ...fichas, ...prestamos, ...descartes, ...equipos]
      .sort((first, second) => second.fecha.localeCompare(first.fecha))
      .slice(0, showMoreActivity ? 20 : 8);
  }, [estadoEquipoNombre, profile, profileNamesById, showMoreActivity, state.bitacoras, state.descartes, state.equipos, state.fichas, state.prestamos]);

  return {
    actividadReciente,
    indicadores,
    setShowMoreActivity,
    showMoreActivity,
  };
}

export { useActividadLaboratorio };
