import { FormEvent, useState } from 'react';
import { Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createEvent } from '@/services/events.service';
import { AcademicEvent } from '@/types/domain';
import { getErrorMessage } from '@/utils/errors';

export function EventFormPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function getRequiredText(form: FormData, field: string, label: string) {
    const value = String(form.get(field) ?? '').trim();
    if (!value) throw new Error(`${label} es obligatorio`);
    return value;
  }

  function getOptionalDateTime(form: FormData, field: string) {
    const value = String(form.get(field) ?? '').trim();
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('La fecha u hora ingresada no es valida');
    }

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
      if (!Number.isFinite(capacity) || capacity <= 0) {
        throw new Error('La capacidad debe ser mayor que cero');
      }

      const savedEvent = await createEvent({
        title: getRequiredText(form, 'title', 'El nombre del evento'),
        eventType: String(form.get('eventType') ?? 'seminario') as AcademicEvent['eventType'],
        description: String(form.get('description') ?? '').trim(),
        location: getRequiredText(form, 'location', 'El lugar'),
        startsAt: getOptionalDateTime(form, 'startsAt'),
        endsAt: getOptionalDateTime(form, 'endsAt'),
        capacity,
        status: String(form.get('status') ?? 'published') as AcademicEvent['status'],
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
      <PageHeader
        eyebrow="Gestion de eventos"
        title="Formulario de evento"
        description="Estructura lista para crear y editar eventos con reglas de negocio centralizadas en servicios."
      />
      <form className="panel form-grid" onSubmit={handleSubmit} noValidate>
        <label>
          Nombre del evento
          <input name="title" required placeholder="Ej. Congreso de Investigacion Aplicada" />
        </label>
        <label>
          Tipo
          <select name="eventType" defaultValue="congreso" required>
            <option value="seminario">Seminario</option>
            <option value="congreso">Congreso</option>
            <option value="taller">Taller</option>
            <option value="capacitacion">Capacitacion</option>
            <option value="universitario">Evento universitario</option>
          </select>
        </label>
        <label>
          Lugar
          <input name="location" required placeholder="Auditorio, salon o campus" />
        </label>
        <label>
          Capacidad
          <input name="capacity" required min="1" type="number" placeholder="120" />
        </label>
        <label>
          Inicio opcional
          <input name="startsAt" type="datetime-local" step="60" />
        </label>
        <label>
          Fin opcional
          <input name="endsAt" type="datetime-local" step="60" />
        </label>
        <label>
          Estado
          <select name="status" defaultValue="published" required>
            <option value="published">Publicado</option>
            <option value="active">Activo</option>
            <option value="draft">Borrador</option>
          </select>
        </label>
        <label className="full-field">
          Descripcion
          <textarea
            name="description"
            rows={5}
            placeholder="Resumen academico, objetivos y publico esperado"
          />
        </label>
        {error ? <p className="form-error full-field">{error}</p> : null}
        <button className="primary-button full-field" type="submit" disabled={isSaving}>
          <Save size={18} />
          {isSaving ? 'Guardando...' : 'Guardar evento'}
        </button>
      </form>
    </div>
  );
}
