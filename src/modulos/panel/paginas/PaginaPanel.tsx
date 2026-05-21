import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardCheck, Users } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { TarjetaEstadistica } from '@/componentes/interfaz/TarjetaEstadistica';
import { listAttendance } from '@/servicios/asistencia.servicio';
import { listEvents } from '@/servicios/eventos.servicio';
import { listParticipantes } from '@/servicios/participantes.servicio';
import { EventoAcademico, RegistroAsistencia, Participante } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';

export function PaginaPanel() {
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [participants, setParticipantes] = useState<Participante[]>([]);
  const [attendance, setAttendance] = useState<RegistroAsistencia[]>([]);

  useEffect(() => {
    void Promise.all([listEvents(), listParticipantes(), listAttendance()]).then(
      ([eventsData, participantsData, attendanceData]) => {
        setEvents(eventsData);
        setParticipantes(participantsData);
        setAttendance(attendanceData);
      },
    );
  }, []);

  const activeEvents = events.filter((event) => event.status === 'active');
  const congressEvent =
    events.find((event) => event.eventType === 'congreso' && event.status === 'active') ??
    events.find((event) => event.eventType === 'congreso' && event.status === 'published') ??
    events.find((event) => event.eventType === 'congreso');
  const attendanceTarget = congressEvent ? `/eventos/${congressEvent.id}#asistencias-hoy` : '/eventos';

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
          label="Asistencias"
          value={String(attendance.length)}
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
            <span>Asistencia</span>
          </div>
          <div className="timeline">
            {attendance.map((item) => (
              <div className="timeline-item" key={item.id}>
                <span />
                <div>
                  <strong>Check-in confirmado</strong>
                  <p>{formatDateTime(item.checkedInAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
