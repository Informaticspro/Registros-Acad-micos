import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardCheck, QrCode, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { listAttendance } from '@/services/attendance.service';
import { listEvents } from '@/services/events.service';
import { listParticipants, listRegistrations } from '@/services/participants.service';
import { AcademicEvent, AttendanceRecord, Participant, Registration } from '@/types/domain';
import { formatDateTime } from '@/utils/format';

export function DashboardPage() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    void Promise.all([listEvents(), listParticipants(), listRegistrations(), listAttendance()]).then(
      ([eventsData, participantsData, registrationsData, attendanceData]) => {
        setEvents(eventsData);
        setParticipants(participantsData);
        setRegistrations(registrationsData);
        setAttendance(attendanceData);
      },
    );
  }, []);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Panel administrativo"
        title="Dashboard"
        description="Vista ejecutiva de eventos, inscripciones, asistencia y certificados."
      />
      <section className="stats-grid">
        <StatCard label="Eventos activos" value={String(events.length)} trend="Multi-evento habilitado" icon={CalendarDays} />
        <StatCard label="Participantes" value={String(participants.length)} trend="Base única de personas" icon={Users} />
        <StatCard label="Inscripciones" value={String(registrations.length)} trend="QR por registro" icon={QrCode} />
        <StatCard label="Asistencias" value={String(attendance.length)} trend="Escaneo en tiempo real" icon={ClipboardCheck} />
      </section>
      <section className="split-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>Próximos eventos</h2>
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
