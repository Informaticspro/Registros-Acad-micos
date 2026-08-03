import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { listEvents } from '@/servicios/eventos.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import {
  getEstadoEventoVisualClassName,
  getEstadoEventoVisualLabel,
  isRegistroPermanenteEvento,
} from '@/utilidades/estado-evento';
import { formatDateTime, toTitleCase } from '@/utilidades/formato';

function getCapacityLabel(event: EventoAcademico) {
  return isRegistroPermanenteEvento(event) ? 'Sin limite' : `${event.capacity} cupos`;
}

function getEventDateLabel(event: EventoAcademico) {
  return isRegistroPermanenteEvento(event) ? 'Registro permanente' : formatDateTime(event.startsAt);
}

export function PaginaEventos() {
  const [events, setEvents] = useState<EventoAcademico[]>([]);

  useEffect(() => {
    void listEvents().then(setEvents);
  }, []);

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="CRUD multi-evento"
        title="Eventos academicos"
        description="Seminarios, congresos, talleres, capacitaciones y eventos universitarios "
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
              <strong className={getEstadoEventoVisualClassName(event)}>{getEstadoEventoVisualLabel(event)}</strong>
            </div>
            <h2>{event.title}</h2>
            <p>{event.description}</p>
            <div className="event-meta">
              <span>{event.location}</span>
              <span>{getEventDateLabel(event)}</span>
              <span>{getCapacityLabel(event)}</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
