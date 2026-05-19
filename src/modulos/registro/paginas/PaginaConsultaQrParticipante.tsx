import { FormEvent, useEffect, useState } from 'react';
import { QrCode, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TarjetaQrParticipante } from '@/componentes/registro/TarjetaQrParticipante';
import { getEvent, listPublicEvents } from '@/servicios/eventos.servicio';
import { lookupParticipanteQr, ParticipanteQrLookup } from '@/servicios/qr-participante.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';

export function PaginaConsultaQrParticipante() {
  const { eventId: eventIdParam } = useParams();
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [eventId, setEventId] = useState(eventIdParam ?? '');
  const [documentId, setDocumentId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<EventoAcademico | null>(null);
  const [lookup, setLookup] = useState<ParticipanteQrLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void listPublicEvents()
      .then((open) => {
        setEvents(open);
        if (eventIdParam) {
          setEventId(eventIdParam);
          return;
        }
        if (open[0]) setEventId(open[0].id);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los eventos')));
  }, [eventIdParam]);

  useEffect(() => {
    if (!eventId) {
      setSelectedEvent(null);
      return;
    }
    void getEvent(eventId).then(setSelectedEvent);
  }, [eventId]);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!eventId) {
      setError('Seleccione el evento.');
      return;
    }

    setError(null);
    setLookup(null);
    setIsLoading(true);

    try {
      const result = await lookupParticipanteQr(eventId, documentId);
      if (!result) {
        setError('No encontramos inscripcion con esa cedula en este evento. Revise el numero o registrese primero.');
        return;
      }
      setLookup(result);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo consultar el codigo QR'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="public-register">
      <div className="public-copy">
        <div className="public-icon">
          <QrCode size={28} />
        </div>
        <span className="eyebrow">Consulta de participante</span>
        <h1>Obtener mi codigo QR</h1>
        <p>
          Si ya se registro en CESI, ingrese su cedula para ver y descargar el QR que presentara el dia del evento.
        </p>
        {selectedEvent ? (
          <p className="form-hint">
            Evento: <strong>{selectedEvent.title}</strong>
          </p>
        ) : null}
      </div>
      <form className="panel stack-form" onSubmit={handleSubmit}>
        <label>
          Evento
          <select value={eventId} onChange={(event) => setEventId(event.target.value)} required>
            <option value="" disabled>
              Seleccione el evento
            </option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} ({event.eventType})
              </option>
            ))}
          </select>
        </label>
        {events.length === 0 ? (
          <p className="form-hint">No hay eventos publicados o activos en este momento.</p>
        ) : null}
        <label>
          Cedula
          <input
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
            placeholder="Ej. 8-888-111"
            required
            autoComplete="off"
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isLoading || !eventId}>
          <Search size={18} />
          {isLoading ? 'Buscando...' : 'Ver mi QR'}
        </button>
        <Link className="secondary-button" to={eventId ? `/eventos/${eventId}/registro` : '/login'}>
          Aun no esta registrado? Inscribirse
        </Link>
      </form>
      {lookup ? (
        <TarjetaQrParticipante
          eventId={lookup.eventId}
          qrToken={lookup.qrToken}
          documentId={lookup.documentId}
          fullName={`${lookup.firstName} ${lookup.lastName}`.trim()}
          certificateCode={lookup.certificateCode}
          showDownload
        />
      ) : null}
    </section>
  );
}

