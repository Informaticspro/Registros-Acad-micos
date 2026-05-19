import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  MapPin,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { listEvents } from '@/servicios/eventos.servicio';
import {
  deleteInscripcion,
  deleteParticipante,
  listInscripcions,
  listParticipantes,
  updateParticipante,
} from '@/servicios/participantes.servicio';
import { EventoAcademico, Inscripcion, Participante } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';
import { formatDateTime, toTitleCase } from '@/utilidades/formato';

type ParticipanteInscrito = {
  participant: Participante;
  registration: Inscripcion;
};

type GrupoEvento = {
  event: EventoAcademico;
  participants: ParticipanteInscrito[];
};

type GrupoTipoEvento = {
  eventType: EventoAcademico['eventType'];
  events: GrupoEvento[];
};

const unassignedEventType = 'sin-evento';

type GrupoParticipantesSinEvento = {
  eventType: typeof unassignedEventType;
  participants: Participante[];
};

type EditTarget = {
  participantId: string;
  rowId: string;
} | null;

const eventTypeOrder: EventoAcademico['eventType'][] = [
  'congreso',
  'taller',
  'seminario',
  'capacitacion',
  'universitario',
];

const metadataFields = [
  { key: 'sex', label: 'Sexo' },
  { key: 'category', label: 'Categoria' },
  { key: 'personalEmail', label: 'Correo P.' },
  { key: 'nationality', label: 'Nacionalidad' },
  { key: 'otherNationality', label: 'Otra nacionalidad' },
  { key: 'modality', label: 'Modalidad' },
  { key: 'participationType', label: 'Tipo participacion' },
  { key: 'entity', label: 'Entidad' },
] as const;

export function PaginaParticipantes() {
  const { profile } = useAutenticacion();
  const isAdmin = profile?.role === 'admin';
  const [groups, setGroups] = useState<GrupoTipoEvento[]>([]);
  const [unassignedParticipants, setUnassignedParticipants] = useState<GrupoParticipantesSinEvento>({
    eventType: unassignedEventType,
    participants: [],
  });
  const [editing, setEditing] = useState<EditTarget>(null);
  const [totalParticipants, setTotalParticipantes] = useState(0);
  const [totalRegistrations, setTotalInscripciones] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadParticipantes() {
    setIsLoading(true);
    setError(null);
    try {
      const [events, participants, registrations] = await Promise.all([
        listEvents(),
        listParticipantes(),
        listInscripcions(),
      ]);

      const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
      const assignedParticipantIds = new Set<string>();
      const registrationsByEvent = registrations.reduce<Map<string, ParticipanteInscrito[]>>(
        (accumulator, registration) => {
          const participant = participantsById.get(registration.participantId);
          if (!participant) return accumulator;

          assignedParticipantIds.add(participant.id);
          const eventParticipants = accumulator.get(registration.eventId) ?? [];
          eventParticipants.push({ participant, registration });
          accumulator.set(registration.eventId, eventParticipants);
          return accumulator;
        },
        new Map(),
      );

      const eventGroups = events.map((event) => ({
        event,
        participants: registrationsByEvent.get(event.id) ?? [],
      }));

      const groupedByType = eventTypeOrder
        .map((eventType) => ({
          eventType,
          events: eventGroups.filter((group) => group.event.eventType === eventType),
        }))
        .filter((group) => group.events.length > 0);

      setGroups(groupedByType);
      setUnassignedParticipants({
        eventType: unassignedEventType,
        participants: participants.filter((participant) => !assignedParticipantIds.has(participant.id)),
      });
      setTotalParticipantes(participants.length);
      setTotalInscripciones(registrations.length);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los participantes'));
    } finally {
      setIsLoading(false);
    }
  }

  function getExtraData(participant: Participante, eventType?: EventoAcademico['eventType']) {
    if (eventType && eventType !== 'congreso') {
      return participant.institution ? `Institucion: ${participant.institution}` : 'Registro simple';
    }

    const metadata = participant.metadata ?? {};
    const values = metadataFields
      .map((field) => (metadata[field.key] ? `${field.label}: ${metadata[field.key]}` : null))
      .filter(Boolean);

    return values.length > 0 ? values.join(' | ') : 'Registro simple';
  }

  async function handleEditParticipant(event: FormEvent<HTMLFormElement>, participant: Participante) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const metadata = metadataFields.reduce<Record<string, string>>((values, field) => {
      const value = String(form.get(field.key) ?? '').trim();
      if (value) values[field.key] = value;
      return values;
    }, {});

    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      await updateParticipante({
        id: participant.id,
        firstName: String(form.get('firstName') ?? '').trim(),
        lastName: String(form.get('lastName') ?? '').trim(),
        documentId: String(form.get('documentId') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        institution: String(form.get('institution') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim(),
        metadata,
      });
      setSuccess('Participante actualizado correctamente.');
      setEditing(null);
      await loadParticipantes();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el participante'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRegistration(registration: Inscripcion, participant: Participante, event: EventoAcademico) {
    const fullName = `${participant.firstName} ${participant.lastName}`.trim();
    const confirmed = window.confirm(`Desea quitar a ${fullName} del evento "${event.title}"?`);
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      await deleteInscripcion(registration.id);
      setSuccess('Inscripcion eliminada del evento.');
      await loadParticipantes();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar la inscripcion'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteParticipant(participant: Participante) {
    const fullName = `${participant.firstName} ${participant.lastName}`.trim();
    const confirmed = window.confirm(`Desea eliminar por completo a ${fullName}?`);
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      await deleteParticipante(participant.id);
      setSuccess('Participante eliminado correctamente.');
      await loadParticipantes();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el participante'));
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void loadParticipantes();
  }, []);

  const totalEvents = groups.reduce((total, group) => total + group.events.length, 0);

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="CRUD participantes"
        title="Participantes"
        description="Base central para asistentes, expositores, estudiantes, docentes e invitados."
        actions={
          <>
            <button className="secondary-button" type="button" onClick={() => void loadParticipantes()}>
              <RefreshCw size={18} />
              Actualizar
            </button>
            <Link className="primary-button" to="/eventos">
              <UserPlus size={18} />
              Registrar en un evento
            </Link>
          </>
        }
      />

      <section className="panel">
        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-hint">{success}</p> : null}
        {isLoading ? <p className="form-hint">Cargando participantes...</p> : null}
        {!isLoading && !error ? (
          <div className="participant-summary">
            <div>
              <span>Eventos visibles</span>
              <strong>{totalEvents}</strong>
            </div>
            <div>
              <span>Participantes</span>
              <strong>{totalParticipants}</strong>
            </div>
            <div>
              <span>Inscripciones visibles</span>
              <strong>{totalRegistrations}</strong>
            </div>
          </div>
        ) : null}
        {!isLoading && !error && groups.length === 0 && unassignedParticipants.participants.length === 0 ? (
          <p className="form-hint">Todavia no hay eventos con participantes registrados.</p>
        ) : null}
        {!isLoading && !error && totalParticipants > 0 && totalRegistrations === 0 ? (
          <p className="form-hint">
            Hay participantes guardados, pero no hay inscripciones visibles. Revisa permisos RLS de la tabla
            registrations en Supabase.
          </p>
        ) : null}
      </section>

      {!isLoading && !error
        ? groups.map((typeGroup) => (
            <section className="participant-type-section" key={typeGroup.eventType}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{toTitleCase(typeGroup.eventType)}</span>
                  <h2>{toTitleCase(typeGroup.eventType)}s</h2>
                </div>
                <span>{countGroupParticipants(typeGroup)} participantes</span>
              </div>

              <div className="event-participants-grid">
                {typeGroup.events.map((eventGroup) => (
                  <article className="event-participants-card" key={eventGroup.event.id}>
                    <div className="event-participants-header">
                      <div>
                        <span className="status-pill">{toTitleCase(eventGroup.event.status)}</span>
                        <h3>{eventGroup.event.title}</h3>
                      </div>
                      <strong>
                        <Users size={17} />
                        {eventGroup.participants.length}
                      </strong>
                    </div>

                    <div className="event-card-meta">
                      <span>
                        <MapPin size={16} />
                        {eventGroup.event.location || 'Sin ubicacion'}
                      </span>
                      <span>
                        <CalendarDays size={16} />
                        {formatEventDate(eventGroup.event.startsAt)}
                      </span>
                    </div>

                    {eventGroup.participants.length === 0 ? (
                      <p className="form-hint">Este evento aun no tiene participantes.</p>
                    ) : (
                      <ParticipantsTable
                        canManage={isAdmin}
                        editing={editing}
                        event={eventGroup.event}
                        getExtraData={getExtraData}
                        isSaving={isSaving}
                        onCancelEdit={() => setEditing(null)}
                        onDeleteRegistration={handleDeleteRegistration}
                        onEditParticipant={handleEditParticipant}
                        onStartEdit={setEditing}
                        participants={eventGroup.participants}
                      />
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))
        : null}

      {!isLoading && !error && unassignedParticipants.participants.length > 0 ? (
        <section className="participant-type-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Revision</span>
              <h2>Participantes sin evento visible</h2>
            </div>
            <span>{unassignedParticipants.participants.length} participantes</span>
          </div>

          <article className="event-participants-card">
            <p className="form-hint">
              Estos participantes existen en la base de datos, pero la app no puede ver una inscripcion asociada.
            </p>
            <div className="participants-mini-table">
              <div className="participants-mini-head with-actions">
                <span>Participante</span>
                <span>Documento</span>
                <span>Correo</span>
                <span>Registro</span>
                {isAdmin ? <span>Acciones</span> : null}
              </div>
              {unassignedParticipants.participants.map((participant) =>
                editing?.rowId === participant.id ? (
                  <EditParticipantRow
                    key={participant.id}
                    eventType={undefined}
                    isSaving={isSaving}
                    onCancel={() => setEditing(null)}
                    onSubmit={handleEditParticipant}
                    participant={participant}
                  />
                ) : (
                  <div className={`participants-mini-row ${isAdmin ? 'with-actions' : ''}`} key={participant.id}>
                    <div>
                      <strong>
                        {participant.firstName} {participant.lastName}
                      </strong>
                    <small>{getExtraData(participant)}</small>
                    </div>
                    <span>{participant.documentId}</span>
                    <span>{participant.email}</span>
                    <span>Sin evento visible</span>
                    {isAdmin ? (
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          type="button"
                          aria-label="Editar participante"
                          onClick={() => setEditing({ participantId: participant.id, rowId: participant.id })}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label="Eliminar participante"
                          disabled={isSaving}
                          onClick={() => void handleDeleteParticipant(participant)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ),
              )}
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}

type ParticipantsTableProps = {
  canManage: boolean;
  editing: EditTarget;
  event: EventoAcademico;
  getExtraData: (participant: Participante, eventType?: EventoAcademico['eventType']) => string;
  isSaving: boolean;
  onCancelEdit: () => void;
  onDeleteRegistration: (
    registration: Inscripcion,
    participant: Participante,
    event: EventoAcademico,
  ) => Promise<void>;
  onEditParticipant: (event: FormEvent<HTMLFormElement>, participant: Participante) => Promise<void>;
  onStartEdit: (target: EditTarget) => void;
  participants: ParticipanteInscrito[];
};

function ParticipantsTable({
  canManage,
  editing,
  event,
  getExtraData,
  isSaving,
  onCancelEdit,
  onDeleteRegistration,
  onEditParticipant,
  onStartEdit,
  participants,
}: ParticipantsTableProps) {
  return (
    <div className="participants-mini-table">
      <div className={`participants-mini-head ${canManage ? 'with-actions' : ''}`}>
        <span>Participante</span>
        <span>Documento</span>
        <span>Correo</span>
        <span>Asistencia</span>
        {canManage ? <span>Acciones</span> : null}
      </div>
      {participants.map(({ participant, registration }) =>
        editing?.rowId === registration.id ? (
            <EditParticipantRow
            eventType={event.eventType}
            key={registration.id}
            isSaving={isSaving}
            onCancel={onCancelEdit}
            onSubmit={onEditParticipant}
            participant={participant}
          />
        ) : (
          <div className={`participants-mini-row ${canManage ? 'with-actions' : ''}`} key={registration.id}>
            <div>
              <strong>
                {participant.firstName} {participant.lastName}
              </strong>
              <small>{getExtraData(participant, event.eventType)}</small>
            </div>
            <span>{participant.documentId}</span>
            <span>{participant.email}</span>
            <span>{registration.checkedInAt ? 'Registrada' : 'Pendiente'}</span>
            {canManage ? (
              <div className="row-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Editar participante"
                  onClick={() => onStartEdit({ participantId: participant.id, rowId: registration.id })}
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Quitar participante del evento"
                  disabled={isSaving}
                  onClick={() => void onDeleteRegistration(registration, participant, event)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : null}
          </div>
        ),
      )}
    </div>
  );
}

type EditParticipantRowProps = {
  eventType?: EventoAcademico['eventType'];
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, participant: Participante) => Promise<void>;
  participant: Participante;
};

function EditParticipantRow({ eventType, isSaving, onCancel, onSubmit, participant }: EditParticipantRowProps) {
  const metadata = participant.metadata ?? {};
  const showMetadataFields = !eventType || eventType === 'congreso';

  return (
    <form className="participant-edit-form" onSubmit={(event) => void onSubmit(event, participant)}>
      <div className="form-grid">
        <label>
          Nombre
          <input name="firstName" defaultValue={participant.firstName} required />
        </label>
        <label>
          Apellido
          <input name="lastName" defaultValue={participant.lastName} required />
        </label>
        <label>
          Cedula
          <input name="documentId" defaultValue={participant.documentId} required />
        </label>
        <label>
          Correo
          <input name="email" defaultValue={participant.email} type="email" required />
        </label>
        <label>
          Entidad / Institucion
          <input name="institution" defaultValue={participant.institution} />
        </label>
        <label>
          Telefono
          <input name="phone" defaultValue={participant.phone ?? ''} />
        </label>
        {showMetadataFields
          ? metadataFields.map((field) => (
              <label key={field.key}>
                {field.label}
                <input name={field.key} defaultValue={metadata[field.key] ?? ''} />
              </label>
            ))
          : metadataFields.map((field) => (
              <input key={field.key} name={field.key} type="hidden" value={metadata[field.key] ?? ''} />
            ))}
      </div>
      <div className="row-actions">
        <button className="primary-button" type="submit" disabled={isSaving}>
          <Save size={18} />
          Guardar
        </button>
        <button className="secondary-button" type="button" onClick={onCancel}>
          <X size={18} />
          Cancelar
        </button>
      </div>
    </form>
  );
}

function countGroupParticipants(group: GrupoTipoEvento) {
  return group.events.reduce((total, eventGroup) => total + eventGroup.participants.length, 0);
}

function formatEventDate(value: string | null) {
  return value ? formatDateTime(value) : 'Fecha opcional';
}
