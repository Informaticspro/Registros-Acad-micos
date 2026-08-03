import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Files, Plus } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { env } from '@/infraestructura/entorno';
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

function getRegistrationUrl(eventId: string) {
  const origin = env.publicAppUrl || window.location.origin;
  return `${origin}/eventos/${eventId}/registro`;
}

export function PaginaEventos() {
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void listEvents().then(setEvents);
  }, []);

  async function handleCopyRegistrationUrl(event: EventoAcademico) {
    try {
      await navigator.clipboard.writeText(getRegistrationUrl(event.id));
      setMessage(`Enlace copiado: ${event.title}`);
    } catch {
      setMessage('No se pudo copiar automaticamente. Abra el detalle y copie el enlace manualmente.');
    }
  }

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
      {message ? <p className="form-hint">{message}</p> : null}
      <section className="cards-grid">
        {events.map((event) => (
          <article className="event-card" key={event.id}>
            <div className="card-topline">
              <span>{toTitleCase(event.eventType)}</span>
              <strong className={getEstadoEventoVisualClassName(event)}>{getEstadoEventoVisualLabel(event)}</strong>
            </div>
            <h2>
              <Link to={`/eventos/${event.id}`}>{event.title}</Link>
            </h2>
            <p className="event-card-description">{event.description}</p>
            <div className="event-meta">
              <span>{event.location}</span>
              <span>{getEventDateLabel(event)}</span>
              <span>{getCapacityLabel(event)}</span>
            </div>
            <div className="event-card-actions">
              <Link className="secondary-button" to={`/eventos/${event.id}`}>
                <ExternalLink size={16} />
                Ver
              </Link>
              <button className="secondary-button" type="button" onClick={() => void handleCopyRegistrationUrl(event)}>
                <Copy size={16} />
                Copiar enlace
              </button>
              <Link className="primary-button" to="/eventos/nuevo" state={{ duplicateFrom: event }}>
                <Files size={16} />
                Duplicar
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
