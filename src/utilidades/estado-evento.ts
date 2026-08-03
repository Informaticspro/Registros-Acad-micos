import { EstadoEvento, EventoAcademico } from '@/tipos/dominio';

const manualStatuses = new Set<EstadoEvento>(['draft', 'archived']);

type EventoPermanenteContexto = Pick<EventoAcademico, 'status' | 'startsAt' | 'endsAt'> &
  Partial<Pick<EventoAcademico, 'title' | 'description' | 'eventType' | 'registrationFormType' | 'isPermanent'>>;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isRegistroPermanenteEvento(event: Partial<EventoPermanenteContexto>) {
  if (event.isPermanent) return true;
  if (event.registrationFormType === 'educacion_continua') return true;
  if (event.eventType !== 'seminario') return false;

  const searchableText = normalizeText(`${event.title ?? ''} ${event.description ?? ''}`);
  return (
    searchableText.includes('educacion continua') ||
    searchableText.includes('informatica intermedia') ||
    searchableText.includes('posgrado') ||
    searchableText.includes('maestria')
  );
}

export function getEstadoEventoPorFecha(
  event: EventoPermanenteContexto,
  referenceDate = new Date(),
): EstadoEvento {
  if (manualStatuses.has(event.status)) return event.status;
  if (isRegistroPermanenteEvento(event)) return event.status === 'closed' ? 'published' : event.status;

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
  isPermanent?: boolean;
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

export function getEstadoEventoClassName(status: EstadoEvento) {
  return `status-pill status-pill-${status}`;
}

export function getEstadoEventoVisualLabel(event: EventoAcademico) {
  if (isRegistroPermanenteEvento(event) && (event.status === 'published' || event.status === 'active')) {
    return 'Abierto permanente';
  }

  return getEstadoEventoLabel(event.status);
}

export function getEstadoEventoVisualClassName(event: EventoAcademico) {
  if (isRegistroPermanenteEvento(event) && (event.status === 'published' || event.status === 'active')) {
    return getEstadoEventoClassName('active');
  }

  return getEstadoEventoClassName(event.status);
}

export function isPublicRegistrationOpen(event: EventoAcademico) {
  return event.status === 'published' || event.status === 'active';
}
