import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { mockEvents } from '@/datos/datosPrueba';
import { getEstadoEventoLabel, getEstadoEventoPorFecha } from '@/utilidades/estado-evento';
import { formatDateTime } from '@/utilidades/formato';

export function PaginaHistorial() {
  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="Archivo academico"
        title="Historial de eventos"
        description="Consulta de eventos cerrados, metricas historicas, certificados emitidos y reportes descargados."
      />
      <section className="panel timeline">
        {mockEvents.map((event) => (
          <div className="timeline-item" key={event.id}>
            <span />
            <div>
              <strong>{event.title}</strong>
              <p>{formatDateTime(event.startsAt)} - {getEstadoEventoLabel(getEstadoEventoPorFecha(event))}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
