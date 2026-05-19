import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardCheck, QrCode, Users } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { TarjetaEstadistica } from '@/componentes/interfaz/TarjetaEstadistica';
import { listAttendance } from '@/servicios/asistencia.servicio';
import { listEvents } from '@/servicios/eventos.servicio';
import { listParticipantes, listInscripcions } from '@/servicios/participantes.servicio';
import { EventoAcademico, RegistroAsistencia, Participante, Inscripcion } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';

export function PaginaPanel() {
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [participants, setParticipantes] = useState<Participante[]>([]);
  const [registrations, setInscripcions] = useState<Inscripcion[]>([]);
  const [attendance, setAttendance] = useState<RegistroAsistencia[]>([]);

  useEffect(() => {
    void Promise.all([listEvents(), listParticipantes(), listInscripcions(), listAttendance()]).then(
      ([eventsData, participantsData, registrationsData, attendanceData]) => {
        setEvents(eventsData);
        setParticipantes(participantsData);
        setInscripcions(registrationsData);
        setAttendance(attendanceData);
      },
    );
  }, []);

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="Panel administrativo"
        title="Dashboard"
        description="Vista ejecutiva de eventos, inscripciones, asistencia y certificados."
      />
      <section className="stats-grid">
        <TarjetaEstadistica label="Eventos activos" value={String(events.length)} trend="Multi-evento habilitado" icon={CalendarDays} />
        <TarjetaEstadistica label="Participantes" value={String(participants.length)} trend="Base unica de personas" icon={Users} />
        <TarjetaEstadistica label="Inscripciones" value={String(registrations.length)} trend="QR por registro" icon={QrCode} />
        <TarjetaEstadistica label="Asistencias" value={String(attendance.length)} trend="Escaneo en tiempo real" icon={ClipboardCheck} />
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

