import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { exportEventExcel, ExportableEvent, listExportableEvents } from '@/servicios/exportaciones.servicio';
import { getErrorMessage } from '@/utilidades/errores';
import { getEstadoEventoLabel } from '@/utilidades/estado-evento';
import { formatDateTime, toTitleCase } from '@/utilidades/formato';

export function PaginaExportaciones() {
  const [events, setEvents] = useState<ExportableEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    void listExportableEvents()
      .then(setEvents)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los eventos')));
  }, []);

  async function handleExport(event: ExportableEvent) {
    setExportingId(event.id);
    setError(null);
    try {
      await exportEventExcel(event);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo exportar el evento'));
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="Excel por evento"
        title="Exportaciones"
        description="Eventos activos, publicados o con participantes registrados. Cada descarga genera un Excel independiente."
      />
      {error ? <p className="form-error">{error}</p> : null}
      <section className="cards-grid">
        {events.length === 0 ? (
          <article className="panel">
            <p className="form-hint">
              No hay eventos activos ni con registros. Publique un evento o registre participantes primero.
            </p>
          </article>
        ) : null}
        {events.map((event) => (
          <article className="panel export-panel" key={event.id}>
            <div>
              <h2>{event.title}</h2>
              <p>
                {toTitleCase(event.eventType)} - {getEstadoEventoLabel(event.status)} - {event.registrationCount} inscrito
                {event.registrationCount === 1 ? '' : 's'}
              </p>
              <p className="form-hint">
                {event.location} - {formatDateTime(event.startsAt)}
              </p>
            </div>
            <button
              className="primary-button"
              type="button"
              disabled={exportingId === event.id || event.registrationCount === 0}
              onClick={() => void handleExport(event)}
            >
              <Download size={18} />
              {exportingId === event.id
                ? 'Exportando...'
                : event.registrationCount === 0
                  ? 'Sin registros'
                  : 'Descargar Excel'}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

