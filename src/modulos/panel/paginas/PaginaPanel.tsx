import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardCheck, Users } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { TarjetaEstadistica } from '@/componentes/interfaz/TarjetaEstadistica';
import { isTodayInPanama, listAttendance } from '@/servicios/asistencia.servicio';
import { listEvents } from '@/servicios/eventos.servicio';
import { listInscripcions, listParticipantes } from '@/servicios/participantes.servicio';
import { EventoAcademico, Inscripcion, Participante, RegistroAsistencia } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';

const recentActivityLimit = 6;

type ActividadReciente = {
  id: string;
  kind: 'asistencia' | 'registro';
  title: string;
  description: string;
  date: string;
};

function getParticipantName(participant?: Participante) {
  if (!participant) return 'Participante';
  return `${participant.firstName} ${participant.lastName}`.trim() || 'Participante';
}

export function PaginaPanel() {
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [participants, setParticipantes] = useState<Participante[]>([]);
  const [registrations, setRegistrations] = useState<Inscripcion[]>([]);
  const [attendance, setAttendance] = useState<RegistroAsistencia[]>([]);

  useEffect(() => {
    void Promise.all([listEvents(), listParticipantes(), listInscripcions(), listAttendance()]).then(
      ([eventsData, participantsData, registrationsData, attendanceData]) => {
        setEvents(eventsData);
        setParticipantes(participantsData);
        setRegistrations(registrationsData);
        setAttendance(attendanceData);
      },
    );
  }, []);

  const activeEvents = events.filter((event) => event.status === 'active');
  const todayAttendance = attendance.filter((item) => isTodayInPanama(item.checkedInAt));
  const congressEvent =
    events.find((event) => event.eventType === 'congreso' && event.status === 'active') ??
    events.find((event) => event.eventType === 'congreso' && event.status === 'published') ??
    events.find((event) => event.eventType === 'congreso');
  const attendanceTarget = congressEvent ? `/eventos/${congressEvent.id}#asistencias-hoy` : '/eventos';
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const registrationsById = new Map(registrations.map((registration) => [registration.id, registration]));
  const recentActivity: ActividadReciente[] = [
    ...registrations.map((registration) => {
      const participant = participantsById.get(registration.participantId);
      const event = eventsById.get(registration.eventId);

      return {
        id: `registro-${registration.id}`,
        kind: 'registro' as const,
        title: 'Participante registrado',
        description: `${getParticipantName(participant)} | ${event?.title ?? 'Evento'}`,
        date: registration.createdAt,
      };
    }),
    ...attendance.map((item) => {
      const registration = registrationsById.get(item.registrationId);
      const participant = registration ? participantsById.get(registration.participantId) : undefined;
      const event = eventsById.get(item.eventId);

      return {
        id: `asistencia-${item.id}`,
        kind: 'asistencia' as const,
        title: 'Asistencia confirmada',
        description: `${getParticipantName(participant)} | ${event?.title ?? 'Evento'}`,
        date: item.checkedInAt,
      };
    }),
  ]
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, recentActivityLimit);

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="Panel administrativo"
        title="Panel de control"
        description="Vista ejecutiva de eventos, participantes, asistencia y certificados."
      />
      <section className="stats-grid">
        <TarjetaEstadistica
          label="Eventos activos"
          value={String(activeEvents.length)}
          trend="Ver eventos"
          icon={CalendarDays}
          to="/eventos"
        />
        <TarjetaEstadistica
          label="Participantes"
          value={String(participants.length)}
          trend="Ver participantes"
          icon={Users}
          to="/participantes"
        />
        <TarjetaEstadistica
          label="Asistencias de hoy"
          value={String(todayAttendance.length)}
          trend="Ver asistencia de hoy"
          icon={ClipboardCheck}
          to={attendanceTarget}
        />
      </section>
      <section className="split-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>Proximos eventos</h2>
            <span>{events.length} registros</span>
          </div>
          <div className="table-list">
            {events.map((event) => (
              <div className="table-row" key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.location}</span>
                </div>
                <small>{formatDateTime(event.startsAt)}</small>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-heading">
            <h2>Actividad reciente</h2>
            <span>Ultimos {recentActivityLimit}</span>
          </div>
          <div className="timeline">
            {recentActivity.map((item) => (
              <div className={`timeline-item ${item.kind}`} key={item.id}>
                <span />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <small>{formatDateTime(item.date)}</small>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 ? <p className="form-hint">Todavia no hay actividad registrada.</p> : null}
          </div>
        </article>
      </section>
    </div>
  );
}
