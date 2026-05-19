import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Edit, ExternalLink, Trash2, UserPlus } from 'lucide-react';
import QRCode from 'qrcode';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { deleteEvent, getEvent } from '@/servicios/eventos.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';
import { getErrorMessage } from '@/utilidades/errores';

function getInscripcionFormDescription(eventType: EventoAcademico['eventType']) {
  if (eventType === 'congreso') {
    return 'Formulario extendido: sexo, categoria, correo personal, nacionalidad, modalidad y tipo de participacion.';
  }
  return 'Formulario simple: nombre, apellido, cedula y correo institucional.';
}

export function PaginaDetalleEvento() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventoAcademico | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
            <Link
              className="secondary-button"
              to={`/eventos/${event.id}/registro`}
              state={{ fromAdmin: true }}
            >
              <ExternalLink size={18} />
              Registro publico
            </Link>
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
            <div><dt>Tipo</dt><dd>{event.eventType}</dd></div>
            <div><dt>Lugar</dt><dd>{event.location}</dd></div>
            <div><dt>Inicio</dt><dd>{formatDateTime(event.startsAt)}</dd></div>
            <div><dt>Cierre</dt><dd>{formatDateTime(event.endsAt)}</dd></div>
            <div><dt>Capacidad</dt><dd>{event.capacity} participantes</dd></div>
          </dl>
        </article>
        <article className="panel">
          <h2>Operacion</h2>
          <div className="workflow-list">
            <span>QR publico del evento para mostrar en el salon</span>
            <span>{getInscripcionFormDescription(event.eventType)}</span>
            <span>Check-in guardado para certificado</span>
            <span>Certificado PDF por asistencia</span>
          </div>
        </article>
        <article className="panel qr-event-panel">
          <h2>QR para estudiantes</h2>
          <p>Proyecta o imprime este codigo en el salon. Cada estudiante lo escanea y registra su asistencia.</p>
          {qrDataUrl ? <img src={qrDataUrl} alt="QR de registro del evento" /> : null}
          <button
            className="primary-button"
            type="button"
            onClick={() =>
              navigate(`/eventos/${event.id}/registro`, { state: { fromAdmin: true } })
            }
          >
            <UserPlus size={18} />
            Registrar participante
          </button>
          <Link className="secondary-button" to={`/eventos/${event.id}/mi-codigo`}>
            <ExternalLink size={18} />
            Consultar QR con cedula
          </Link>
          <a className="secondary-button" href={registrationUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={18} />
            Abrir registro en pestana nueva
          </a>
          <code>{registrationUrl}</code>
        </article>
      </section>
    </div>
  );
}

