import { listAttendance } from '@/servicios/asistencia.servicio';
import { listEvents } from '@/servicios/eventos.servicio';
import { listInscripcions, listParticipantes } from '@/servicios/participantes.servicio';
import { Inscripcion, Participante } from '@/tipos/dominio';
import { getEstadoEventoLabel } from '@/utilidades/estado-evento';
import { formatDateTime, toTitleCase } from '@/utilidades/formato';

export type TipoResultadoBusqueda = 'evento' | 'participante' | 'asistencia';

export type ResultadoBusqueda = {
  id: string;
  title: string;
  description: string;
  kind: TipoResultadoBusqueda;
  to: string;
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  const searchText = normalize(values.filter(Boolean).join(' '));
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchText.includes(term));
}

function getMetadataValues(participant: Participante) {
  return Object.values(participant.metadata ?? {});
}

function getParticipantName(participant?: Participante) {
  if (!participant) return 'Participante';
  return `${participant.firstName} ${participant.lastName}`.trim() || 'Participante';
}

function getParticipantEventNames(registrations: Inscripcion[], eventNames: Map<string, string>) {
  return registrations
    .map((registration) => eventNames.get(registration.eventId))
    .filter((eventName): eventName is string => Boolean(eventName));
}

export async function buscarGlobal(query: string): Promise<ResultadoBusqueda[]> {
  if (normalize(query).length < 2) return [];

  const [events, participants, registrations, attendance] = await Promise.all([
    listEvents(),
    listParticipantes(),
    listInscripcions(),
    listAttendance(),
  ]);

  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const registrationsById = new Map(registrations.map((registration) => [registration.id, registration]));
  const registrationsByParticipant = registrations.reduce<Map<string, Inscripcion[]>>((map, registration) => {
    const current = map.get(registration.participantId) ?? [];
    current.push(registration);
    map.set(registration.participantId, current);
    return map;
  }, new Map());
  const eventNames = new Map(events.map((event) => [event.id, event.title]));

  const eventResults = events
    .filter((event) =>
      matchesQuery(
        [
          'evento',
          event.title,
          event.eventType,
          event.description,
          event.location,
          getEstadoEventoLabel(event.status),
        ],
        query,
      ),
    )
    .slice(0, 5)
    .map<ResultadoBusqueda>((event) => ({
      id: `evento-${event.id}`,
      kind: 'evento',
      title: event.title,
      description: `${toTitleCase(event.eventType)} | ${event.location || 'Sin lugar'} | ${getEstadoEventoLabel(event.status)}`,
      to: `/eventos/${event.id}`,
    }));

  const participantResults = participants
    .filter((participant) => {
      const eventMatches = getParticipantEventNames(registrationsByParticipant.get(participant.id) ?? [], eventNames);
      return matchesQuery(
        [
          'participante',
          getParticipantName(participant),
          participant.documentId,
          participant.email,
          participant.institution,
          participant.phone,
          ...getMetadataValues(participant),
          ...eventMatches,
        ],
        query,
      );
    })
    .slice(0, 5)
    .map<ResultadoBusqueda>((participant) => {
      const registeredEvents = getParticipantEventNames(
        registrationsByParticipant.get(participant.id) ?? [],
        eventNames,
      );
      const eventHint = registeredEvents[0] ? ` | ${registeredEvents[0]}` : '';

      return {
        id: `participante-${participant.id}`,
        kind: 'participante',
        title: getParticipantName(participant),
        description: `Cedula ${participant.documentId} | ${participant.email}${eventHint}`,
        to: '/participantes',
      };
    });

  const attendanceResults = attendance
    .map((record) => {
      const registration = registrationsById.get(record.registrationId);
      const participant = registration ? participantsById.get(registration.participantId) : undefined;
      const event = eventsById.get(record.eventId);

      return { event, participant, record };
    })
    .filter(({ event, participant, record }) =>
      matchesQuery(
        [
          'asistencia',
          'marcaje',
          event?.title,
          event?.eventType,
          getParticipantName(participant),
          participant?.documentId,
          participant?.email,
          record.status,
          formatDateTime(record.checkedInAt),
        ],
        query,
      ),
    )
    .slice(0, 5)
    .map<ResultadoBusqueda>(({ event, participant, record }) => ({
      id: `asistencia-${record.id}`,
      kind: 'asistencia',
      title: getParticipantName(participant),
      description: `${event?.title ?? 'Evento'} | ${formatDateTime(record.checkedInAt)}`,
      to: event ? `/eventos/${event.id}#asistencias-hoy` : '/eventos',
    }));

  return [...eventResults, ...participantResults, ...attendanceResults];
}
