import { PageHeader } from '@/components/ui/PageHeader';
import { mockEvents } from '@/data/mockData';
import { formatDateTime } from '@/utils/format';

export function HistoryPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Archivo académico"
        title="Historial de eventos"
        description="Consulta de eventos cerrados, métricas históricas, certificados emitidos y reportes descargados."
      />
      <section className="panel timeline">
        {mockEvents.map((event) => (
          <div className="timeline-item" key={event.id}>
            <span />
            <div>
              <strong>{event.title}</strong>
              <p>{formatDateTime(event.startsAt)} · {event.status}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
