import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { useEffect, useState } from 'react';
import { listEvents } from '@/servicios/eventos.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { getEstadoEventoVisualLabel, isRegistroPermanenteEvento } from '@/utilidades/estado-evento';
import { formatDateTime } from '@/utilidades/formato';

function getEventDateLabel(event: EventoAcademico) {
  return isRegistroPermanenteEvento(event) ? 'Registro permanente' : formatDateTime(event.startsAt);
}

export function PaginaHistorial() {
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void listEvents().then((data) => {
      if (!cancelled) setEvents(data.filter((event) => event.status === 'closed' || event.status === 'archived')
        .sort((a, b) => new Date(b.endsAt ?? b.startsAt ?? 0).getTime() - new Date(a.endsAt ?? a.startsAt ?? 0).getTime()));
    }).catch(() => {
      if (!cancelled) setError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="Archivo academico"
        title="Historial de eventos"
        description="Consulta los eventos finalizados y archivados, ordenados del más reciente al más antiguo."
      />
      <section className="panel timeline">
        {loading ? <p role="status">Cargando historial...</p> : null}
        {error ? <p role="alert">No se pudo cargar el historial. Intenta recargar la página.</p> : null}
        {!loading && !error && events.length === 0 ? <p>No hay eventos finalizados ni archivados.</p> : null}
        {events.map((event) => (
          <div className="timeline-item" key={event.id}>
            <span />
            <div>
              <strong>{event.title}</strong>
              <p>{getEventDateLabel(event)} - {getEstadoEventoVisualLabel(event)}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
