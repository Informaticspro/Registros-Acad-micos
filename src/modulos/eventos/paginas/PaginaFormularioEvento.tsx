import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { createEvent, getEvent, updateEvent } from '@/servicios/eventos.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';

function getEditableStatus(status: EventoAcademico['status']) {
  if (status === 'draft' || status === 'archived') return status;
  return 'published';
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function PaginaFormularioEvento() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { profile } = useAutenticacion();
  const [eventToEdit, setEventToEdit] = useState<EventoAcademico | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(eventId);

  const initialValues = useMemo(
    () => ({
      title: eventToEdit?.title ?? '',
      eventType: eventToEdit?.eventType ?? 'congreso',
      location: eventToEdit?.location ?? '',
      capacity: eventToEdit?.capacity ?? '',
      startsAt: toDateTimeLocal(eventToEdit?.startsAt ?? null),
      endsAt: toDateTimeLocal(eventToEdit?.endsAt ?? null),
      status: getEditableStatus(eventToEdit?.status ?? 'published'),
      description: eventToEdit?.description ?? '',
    }),
    [eventToEdit],
  );

  useEffect(() => {
    if (!eventId) return;

    void getEvent(eventId)
      .then((event) => {
        if (!event) {
          setError('Evento no encontrado');
          return;
        }
        setEventToEdit(event);
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar el evento')));
  }, [eventId]);

  function getRequiredText(form: FormData, field: string, label: string) {
    const value = String(form.get(field) ?? '').trim();
    if (!value) throw new Error(`${label} es obligatorio`);
    return value;
  }

  function getOptionalDateTime(form: FormData, field: string) {
    const value = String(form.get(field) ?? '').trim();
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new Error('La fecha u hora ingresada no es valida');

    return parsed.toISOString();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      setError('Debes iniciar sesion para guardar eventos');
      return;
    }

    const form = new FormData(event.currentTarget);
    setError(null);
    setIsSaving(true);

    try {
      const capacity = Number(form.get('capacity') ?? 0);
      if (!Number.isFinite(capacity) || capacity <= 0) throw new Error('La capacidad debe ser mayor que cero');

      const payload = {
        title: getRequiredText(form, 'title', 'El nombre del evento'),
        eventType: String(form.get('eventType') ?? 'seminario') as EventoAcademico['eventType'],
        description: String(form.get('description') ?? '').trim(),
        location: getRequiredText(form, 'location', 'El lugar'),
        startsAt: getOptionalDateTime(form, 'startsAt'),
        endsAt: getOptionalDateTime(form, 'endsAt'),
        capacity,
        status: String(form.get('status') ?? 'published') as EventoAcademico['status'],
      };

      const savedEvent = isEditing && eventId
        ? await updateEvent({ id: eventId, ...payload })
        : await createEvent({
            ...payload,
            organizerId: profile.id,
            organizationId: profile.organizationId,
          });

      navigate(`/eventos/${savedEvent.id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el evento'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="Gestion de eventos"
        title={isEditing ? 'Editar evento' : 'Nuevo evento'}
        description={isEditing ? 'Modifique los datos del evento seleccionado.' : 'Cree un evento academico para registro y control de asistencia.'}
      />
      <form className="panel form-grid" onSubmit={handleSubmit} noValidate>
        <label>
          Nombre del evento
          <input name="title" required placeholder="Ej. Congreso de Investigacion Aplicada" defaultValue={initialValues.title} />
        </label>
        <label>
          Tipo
          <select name="eventType" defaultValue={initialValues.eventType} required key={`type-${initialValues.eventType}`}>
            <option value="seminario">Seminario</option>
            <option value="congreso">Congreso</option>
            <option value="taller">Taller</option>
            <option value="capacitacion">Capacitacion</option>
            <option value="universitario">Evento universitario</option>
          </select>
        </label>
        <label>
          Lugar
          <input name="location" required placeholder="Auditorio, salon o campus" defaultValue={initialValues.location} />
        </label>
        <label>
          Capacidad
          <input name="capacity" required min="1" type="number" placeholder="120" defaultValue={initialValues.capacity} />
        </label>
        <label>
          Inicio opcional
          <input name="startsAt" type="datetime-local" step="60" defaultValue={initialValues.startsAt} />
        </label>
        <label>
          Fin opcional
          <input name="endsAt" type="datetime-local" step="60" defaultValue={initialValues.endsAt} />
        </label>
        <label>
          Estado
          <select name="status" defaultValue={initialValues.status} required key={`status-${initialValues.status}`}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado / visible</option>
            <option value="archived">Archivado</option>
          </select>
          <span className="field-hint">
            Activo y Finalizado no se eligen manualmente: el sistema los calcula segun la fecha de inicio y fin.
          </span>
        </label>
        <label className="full-field">
          Descripcion
          <textarea
            name="description"
            rows={5}
            placeholder="Resumen academico, objetivos y publico esperado"
            defaultValue={initialValues.description}
          />
        </label>
        {error ? <p className="form-error full-field">{error}</p> : null}
        <button className="primary-button full-field" type="submit" disabled={isSaving}>
          <Save size={18} />
          {isSaving ? 'Guardando...' : isEditing ? 'Actualizar evento' : 'Guardar evento'}
        </button>
      </form>
    </div>
  );
}
