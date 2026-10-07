import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { CalendarDays, ClipboardCheck, Users } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { TarjetaEstadistica } from '@/componentes/interfaz/TarjetaEstadistica';
import { isTodayInPanama, listAttendance } from '@/servicios/asistencia.servicio';
import { listEvents } from '@/servicios/eventos.servicio';
import { listInscripcions, listParticipantes } from '@/servicios/participantes.servicio';
import { EventoAcademico, Inscripcion, Participante, RegistroAsistencia } from '@/tipos/dominio';
import { isRegistroPermanenteEvento } from '@/utilidades/estado-evento';
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

function getEventDateLabel(event: EventoAcademico) {
  return isRegistroPermanenteEvento(event) ? 'Registro permanente' : formatDateTime(event.startsAt);
}

function isOpenEvent(event: EventoAcademico) {
  return event.status === 'active' || (isRegistroPermanenteEvento(event) && event.status === 'published');
}

export function PaginaPanel() {
  const { profile } = useAutenticacion();
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [participants, setParticipantes] = useState<Participante[]>([]);
  const [registrations, setRegistrations] = useState<Inscripcion[]>([]);
  const [attendance, setAttendance] = useState<RegistroAsistencia[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void Promise.all([listEvents(), listParticipantes(), listInscripcions(), listAttendance()]).then(
      ([eventsData, participantsData, registrationsData, attendanceData]) => {
        if (cancelled) return;
        setEvents(eventsData);
        setParticipantes(participantsData);
        setRegistrations(registrationsData);
        setAttendance(attendanceData);
      },
    ).catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const activeEvents = events.filter(isOpenEvent);
  const upcomingEvents = events
    .filter((event) =>
      (event.status === 'published' || event.status === 'active') &&
      (isRegistroPermanenteEvento(event) || (event.startsAt !== null && new Date(event.startsAt).getTime() >= Date.now())),
    )
    .sort((first, second) => {
      const firstPermanent = isRegistroPermanenteEvento(first);
      const secondPermanent = isRegistroPermanenteEvento(second);
      if (firstPermanent !== secondPermanent) return firstPermanent ? 1 : -1;
      return new Date(first.startsAt ?? 0).getTime() - new Date(second.startsAt ?? 0).getTime();
    });
  const todayAttendance = attendance.filter((item) => isTodayInPanama(item.checkedInAt));
  const featuredEvent = upcomingEvents.find((event) => !isRegistroPermanenteEvento(event));
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

  if (loading) return <p role="status">Cargando panel...</p>;
  if (error) return <section className="panel"><p role="alert">No se pudo cargar el panel. No se muestran cifras incompletas.</p><button className="primary-button" onClick={() => setAttempt(attempt + 1)}>Reintentar</button></section>;
  return (
    <div className="page-stack dashboard-page">
      <PageEncabezado
        title={`Hola${profile?.fullName ? `, ${profile.fullName.trim().split(/\s+/)[0]}` : ''}`}
        description={`${new Intl.DateTimeFormat('es-PA', { timeZone: 'America/Panama', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}. Esto es lo que necesitas hoy.`}
        actions={<Link className="dashboard-create" to="/eventos/nuevo">+ Nuevo evento</Link>}
      />
      {featuredEvent ? <section className="dashboard-event-hero" aria-label="Próximo evento">
        <div>
          <span>PRÓXIMO EVENTO</span>
          <h2>{featuredEvent.title}</h2>
          <p>{getEventDateLabel(featuredEvent)}{featuredEvent.location ? ` · ${featuredEvent.location}` : ''}</p>
          <div className="dashboard-event-actions">
            <Link to={`/eventos/${featuredEvent.id}`}>Ver evento</Link>
            <Link to={`/eventos/${featuredEvent.id}/registro`}>Inscribir participante</Link>
          </div>
        </div>
        <CalendarDays size={64} aria-hidden="true" />
      </section> : null}
      <section className="dashboard-shortcuts" aria-label="Acciones frecuentes">
        <Link to="/asistencia/escanear" className="dashboard-shortcut featured"><ClipboardCheck size={22} /><strong>Tomar asistencia</strong><span>Escanea el QR de los participantes</span></Link>
        <Link to="/eventos" className="dashboard-shortcut"><Users size={22} /><strong>Inscribir participante</strong><span>Elige un evento y abre su formulario</span></Link>
        <Link to="/certificados" className="dashboard-shortcut"><CalendarDays size={22} /><strong>Certificados</strong><span>Consulta la vista de ejemplo</span></Link>
      </section>
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
            <h2>Próximos eventos y registros abiertos</h2>
            <span>{upcomingEvents.length} {upcomingEvents.length === 1 ? 'registro' : 'registros'}</span>
          </div>
          <div className="table-list">
            {upcomingEvents.map((event) => (
              <Link className="table-row" key={event.id} to={`/eventos/${event.id}`}>
                <div className="event-summary">
                  <strong>{event.title}</strong>
                  {event.location ? <span>{event.location}</span> : null}
                </div>
                <small>{getEventDateLabel(event)}</small>
              </Link>
            ))}
            {upcomingEvents.length === 0 ? <p className="form-hint">No hay próximos eventos ni registros permanentes abiertos.</p> : null}
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
