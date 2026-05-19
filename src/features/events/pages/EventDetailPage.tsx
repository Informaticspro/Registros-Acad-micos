import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Edit, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import { PageHeader } from '@/components/ui/PageHeader';
import { getEvent } from '@/services/events.service';
import { AcademicEvent } from '@/types/domain';
import { formatDateTime } from '@/utils/format';

export function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<AcademicEvent | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const registrationUrl = useMemo(() => {
    if (!eventId) return '';
    return `${window.location.origin}/eventos/${eventId}/registro`;
  }, [eventId]);

  useEffect(() => {
    if (eventId) void getEvent(eventId).then(setEvent);
  }, [eventId]);

  useEffect(() => {
    if (!registrationUrl) return;
    void QRCode.toDataURL(registrationUrl, { margin: 2, width: 260 }).then(setQrDataUrl);
  }, [registrationUrl]);

  if (!event) {
    return <div className="screen-loader">Cargando evento...</div>;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={event.status}
        title={event.title}
        description={event.description}
        actions={
          <>
            <Link className="secondary-button" to={`/eventos/${event.id}/registro`}>
              <ExternalLink size={18} />
              Registro público
            </Link>
            <Link className="primary-button" to={`/eventos/${event.id}/editar`}>
              <Edit size={18} />
              Editar
            </Link>
          </>
        }
      />
      <section className="detail-grid">
        <article className="panel">
          <h2>Información</h2>
          <dl className="definition-list">
            <div><dt>Tipo</dt><dd>{event.eventType}</dd></div>
            <div><dt>Lugar</dt><dd>{event.location}</dd></div>
            <div><dt>Inicio</dt><dd>{formatDateTime(event.startsAt)}</dd></div>
            <div><dt>Cierre</dt><dd>{formatDateTime(event.endsAt)}</dd></div>
            <div><dt>Capacidad</dt><dd>{event.capacity} participantes</dd></div>
          </dl>
        </article>
        <article className="panel">
          <h2>Operación</h2>
          <div className="workflow-list">
            <span>QR público del evento para mostrar en el salón</span>
            <span>Formulario de nombre, apellido, cédula y correo</span>
            <span>Check-in guardado para certificado</span>
            <span>Certificado PDF por asistencia</span>
          </div>
        </article>
        <article className="panel qr-event-panel">
          <h2>QR para estudiantes</h2>
          <p>Proyecta o imprime este código en el salón. Cada estudiante lo escanea y registra su asistencia.</p>
          {qrDataUrl ? <img src={qrDataUrl} alt="QR de registro del evento" /> : null}
          <code>{registrationUrl}</code>
        </article>
      </section>
    </div>
  );
}
