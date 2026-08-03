import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Files, Plus, Users, XCircle } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { env } from '@/infraestructura/entorno';
import { listEvents } from '@/servicios/eventos.servicio';
import { listInscripcions, listParticipantes } from '@/servicios/participantes.servicio';
import { EventoAcademico, Inscripcion, Participante } from '@/tipos/dominio';
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

const participantMetadataLabels: Record<string, string> = {
  sex: 'Sexo',
  category: 'Categoria',
  personalEmail: 'Correo personal',
  nationality: 'Nacionalidad',
  otherNationality: 'Otra nacionalidad',
  modality: 'Modalidad',
  participationType: 'Tipo participacion',
  entity: 'Entidad',
  hasDisability: 'Discapacidad',
  disabilityDetail: 'Detalle discapacidad',
  phone: 'Celular',
  virtualClassEmail: 'Correo aula virtual',
  faculty: 'Facultad',
  regionalCenter: 'Centro universitario',
  otherUniversity: 'Otra universidad',
  participantType: 'Tipo participante',
  seminarDate: 'Fecha seminario',
  seminarPurpose: 'Motivo seminario',
};

function getParticipantDisplayName(participant: Participante) {
  return [participant.firstName, participant.lastName].filter(Boolean).join(' ') || 'Participante sin nombre';
}

export function PaginaEventos() {
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [participants, setParticipants] = useState<Participante[]>([]);
  const [registrations, setRegistrations] = useState<Inscripcion[]>([]);
  const [selectedParticipantsEvent, setSelectedParticipantsEvent] = useState<EventoAcademico | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listEvents(), listParticipantes(), listInscripcions()]).then(([eventRows, participantRows, registrationRows]) => {
      setEvents(eventRows);
      setParticipants(participantRows);
      setRegistrations(registrationRows);
    });
  }, []);

  async function handleCopyRegistrationUrl(event: EventoAcademico) {
    try {
      await navigator.clipboard.writeText(getRegistrationUrl(event.id));
      setMessage(`Enlace copiado: ${event.title}`);
    } catch {
      setMessage('No se pudo copiar automaticamente. Abra el detalle y copie el enlace manualmente.');
    }
  }

  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));

  function getEventParticipants(eventId: string) {
    return registrations
      .filter((registration) => registration.eventId === eventId)
      .map((registration) => ({
        registration,
        participant: participantsById.get(registration.participantId),
      }))
      .filter((row): row is { registration: Inscripcion; participant: Participante } => Boolean(row.participant));
  }

  const selectedParticipants = selectedParticipantsEvent ? getEventParticipants(selectedParticipantsEvent.id) : [];

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
            <button className="event-participants-button" type="button" onClick={() => setSelectedParticipantsEvent(event)}>
              <Users size={16} />
              <strong>{getEventParticipants(event.id).length}</strong>
              <span>participantes</span>
            </button>
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
      {selectedParticipantsEvent ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedParticipantsEvent(null)}>
          <article
            className="modal-panel event-participants-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-participants-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">Participantes inscritos</span>
                <h2 id="event-participants-title">{selectedParticipantsEvent.title}</h2>
                <p>{selectedParticipants.length} participantes registrados</p>
              </div>
              <button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setSelectedParticipantsEvent(null)}>
                <XCircle size={18} />
              </button>
            </div>
            {selectedParticipants.length === 0 ? <p className="form-hint">Todavia no hay participantes registrados en este evento.</p> : null}
            {selectedParticipants.length > 0 ? (
              <div className="event-participants-modal-list">
                <div className="event-participants-modal-head">
                  <span>Participante</span>
                  <span>Cedula</span>
                  <span>Correo</span>
                  <span>Datos del registro</span>
                </div>
                {selectedParticipants.map(({ participant, registration }) => {
                  const metadata = participant.metadata ?? {};
                  const metadataText = Object.entries(metadata)
                    .filter(([, value]) => Boolean(value))
                    .map(([key, value]) => `${participantMetadataLabels[key] ?? key}: ${value}`)
                    .join(' | ');

                  return (
                    <div className="event-participants-modal-row" key={registration.id}>
                      <strong>{getParticipantDisplayName(participant)}</strong>
                      <span>{participant.documentId || 'No indicada'}</span>
                      <span>{participant.email || 'No indicado'}</span>
                      <small>
                        {metadataText || participant.institution || 'Registro simple'} | Registrado:{' '}
                        {formatDateTime(registration.createdAt)}
                      </small>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
    </div>
  );
}
