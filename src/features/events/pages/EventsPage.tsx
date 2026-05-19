import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { listEvents } from '@/services/events.service';
import { AcademicEvent } from '@/types/domain';
import { formatDateTime, toTitleCase } from '@/utils/format';

export function EventsPage() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);

  useEffect(() => {
    void listEvents().then(setEvents);
  }, []);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="CRUD multi-evento"
        title="Eventos académicos"
        description="Seminarios, congresos, talleres, capacitaciones y eventos universitarios en una misma operación."
        actions={
          <Link className="primary-button" to="/eventos/nuevo">
            <Plus size={18} />
            Nuevo evento
          </Link>
        }
      />
      <section className="cards-grid">
        {events.map((event) => (
          <Link className="event-card" to={`/eventos/${event.id}`} key={event.id}>
            <div className="card-topline">
              <span>{toTitleCase(event.eventType)}</span>
              <strong>{event.status}</strong>
            </div>
            <h2>{event.title}</h2>
            <p>{event.description}</p>
            <div className="event-meta">
              <span>{event.location}</span>
              <span>{formatDateTime(event.startsAt)}</span>
              <span>{event.capacity} cupos</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
