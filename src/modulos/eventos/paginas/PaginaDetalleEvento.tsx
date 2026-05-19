import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Download, Edit, ExternalLink, Trash2, UserPlus } from 'lucide-react';
import QRCode from 'qrcode';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { env } from '@/infraestructura/entorno';
import { deleteEvent, getEvent } from '@/servicios/eventos.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';
import { formatDateTime } from '@/utilidades/formato';

function getInscripcionFormDescription(eventType: EventoAcademico['eventType']) {
  if (eventType === 'congreso') {
    return 'Formulario extendido: sexo, categoria, correo personal, nacionalidad, modalidad, tipo de participacion y entidad.';
  }
  return 'Formulario simple: nombre, apellido, cedula y correo institucional.';
}

function getQrDownloadName(event: EventoAcademico) {
  const safeTitle = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return `qr-registro-${safeTitle || event.id}.png`;
}

export function PaginaDetalleEvento() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventoAcademico | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  const registrationUrl = useMemo(() => {
    if (!eventId) return '';
    const origin = env.publicAppUrl || window.location.origin;
    return `${origin}/eventos/${eventId}/registro`;
  }, [eventId]);

  useEffect(() => {
    if (eventId) void getEvent(eventId).then(setEvent);
  }, [eventId]);

  useEffect(() => {
    if (!registrationUrl) return;
    void QRCode.toDataURL(registrationUrl, { margin: 2, width: 320 }).then(setQrDataUrl);
  }, [registrationUrl]);

  async function handleDelete() {
    if (!event) return;
    const confirmed = window.confirm(`Desea eliminar el evento "${event.title}"? Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    setError(null);
    try {
      await deleteEvent(event.id);
      navigate('/eventos');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el evento'));
    }
  }

  async function handleCopyRegistrationUrl() {
    if (!registrationUrl) return;

    try {
      await navigator.clipboard.writeText(registrationUrl);
      setQrMessage('Enlace copiado.');
    } catch {
      setQrMessage('No se pudo copiar automaticamente. Puedes seleccionar el enlace manualmente.');
    }
  }

  if (!event) {
    return <div className="screen-loader">Cargando evento...</div>;
  }

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow={event.status}
        title={event.title}
        description={event.description}
        actions={
          <>
            <a className="secondary-button" href={registrationUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={18} />
              Formulario publico
            </a>
            <Link className="primary-button" to={`/eventos/${event.id}/editar`}>
              <Edit size={18} />
              Editar
            </Link>
            <button className="secondary-button" type="button" onClick={() => void handleDelete()}>
              <Trash2 size={18} />
              Eliminar
            </button>
          </>
        }
      />
      {error ? <p className="form-error">{error}</p> : null}
      <section className="detail-grid">
        <article className="panel">
          <h2>Informacion</h2>
          <dl className="definition-list">
            <div>
              <dt>Tipo</dt>
              <dd>{event.eventType}</dd>
            </div>
            <div>
              <dt>Lugar</dt>
              <dd>{event.location}</dd>
            </div>
            <div>
              <dt>Inicio</dt>
              <dd>{formatDateTime(event.startsAt)}</dd>
            </div>
            <div>
              <dt>Cierre</dt>
              <dd>{formatDateTime(event.endsAt)}</dd>
            </div>
            <div>
              <dt>Capacidad</dt>
              <dd>{event.capacity} participantes</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h2>Operacion</h2>
          <div className="workflow-list">
            <span>QR publico del evento para mostrar en el salon</span>
            <span>{getInscripcionFormDescription(event.eventType)}</span>
            <span>Registro publico sin cuenta de participante</span>
            <span>Check-in guardado para certificado</span>
          </div>
        </article>

        <article className="panel qr-event-panel">
          <div className="qr-event-header">
            <div>
              <h2>QR publico de registro</h2>
              <p>
                Imprime o pega este codigo en el salon. Los participantes escanean y llenan el formulario sin iniciar
                sesion.
              </p>
            </div>
            <span className="status-pill">Publico</span>
          </div>

          <div className="qr-event-content">
            <div className="qr-event-preview">
              {qrDataUrl ? <img src={qrDataUrl} alt="QR de registro publico del evento" /> : null}
            </div>
            <div className="qr-event-actions">
              {qrDataUrl ? (
                <a className="primary-button" href={qrDataUrl} download={getQrDownloadName(event)}>
                  <Download size={18} />
                  Descargar QR
                </a>
              ) : null}
              <a className="secondary-button" href={registrationUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={18} />
                Probar formulario
              </a>
              <button className="secondary-button" type="button" onClick={() => void handleCopyRegistrationUrl()}>
                <Copy size={18} />
                Copiar enlace
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => navigate(`/eventos/${event.id}/registro`, { state: { fromAdmin: true } })}
              >
                <UserPlus size={18} />
                Registro manual
              </button>
            </div>
          </div>

          <div className="qr-public-url">
            <span>URL publica</span>
            <code>{registrationUrl}</code>
          </div>
          {qrMessage ? <p className="form-hint">{qrMessage}</p> : null}
          <Link className="secondary-button qr-lookup-link" to={`/eventos/${event.id}/mi-codigo`}>
            <ExternalLink size={18} />
            Consultar QR con cedula
          </Link>
        </article>
      </section>
    </div>
  );
}
