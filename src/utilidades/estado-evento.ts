import { EstadoEvento, EventoAcademico } from '@/tipos/dominio';

const manualStatuses = new Set<EstadoEvento>(['draft', 'archived']);

export function getEstadoEventoPorFecha(
  event: Pick<EventoAcademico, 'status' | 'startsAt' | 'endsAt'>,
  referenceDate = new Date(),
): EstadoEvento {
  if (manualStatuses.has(event.status)) return event.status;

  const startsAt = event.startsAt ? new Date(event.startsAt) : null;
  const endsAt = event.endsAt ? new Date(event.endsAt) : null;
  const now = referenceDate.getTime();

  if (endsAt && !Number.isNaN(endsAt.getTime()) && now > endsAt.getTime()) return 'closed';
  if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt.getTime()) return 'published';
  if (startsAt && !Number.isNaN(startsAt.getTime()) && now >= startsAt.getTime()) return 'active';

  return event.status;
}

export function normalizeEventStatusForSave(input: {
  status: EstadoEvento;
  startsAt: string | null;
  endsAt: string | null;
}) {
  return getEstadoEventoPorFecha(input);
}

export function getEstadoEventoLabel(status: EstadoEvento) {
  const labels: Record<EstadoEvento, string> = {
    draft: 'Borrador',
    published: 'Programado',
    active: 'Activo',
    closed: 'Finalizado',
    archived: 'Archivado',
  };

  return labels[status];
}

export function isPublicRegistrationOpen(event: EventoAcademico) {
  if (event.eventType === 'congreso') return event.status === 'published' || event.status === 'active';
  return event.status === 'active';
}
