import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { getEvent } from '@/services/events.service';
import { registerPublicCheckIn, PublicCheckInResult } from '@/services/public-check-in.service';
import { AcademicEvent } from '@/types/domain';
import { getErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';

function getValue(form: FormData, field: string) {
  return String(form.get(field) ?? '').trim();
}

function collectMetadata(form: FormData, eventType: AcademicEvent['eventType'] | undefined): Record<string, string> {
  if (eventType !== 'congreso') return {};

  return {
    sex: getValue(form, 'sex'),
    category: getValue(form, 'category'),
    personalEmail: getValue(form, 'personalEmail'),
    nationality: getValue(form, 'nationality'),
    otherNationality: getValue(form, 'otherNationality'),
    modality: getValue(form, 'modality'),
    participationType: getValue(form, 'participationType'),
  };
}

export function RegisterParticipantPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<AcademicEvent | null>(null);
  const [result, setResult] = useState<PublicCheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (eventId) void getEvent(eventId).then(setEvent);
  }, [eventId]);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!eventId) return;

    const formElement = formEvent.currentTarget;
    const form = new FormData(formElement);
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await registerPublicCheckIn({
        eventId,
        firstName: getValue(form, 'firstName'),
        lastName: getValue(form, 'lastName'),
        documentId: getValue(form, 'documentId'),
        email: getValue(form, 'email'),
        metadata: collectMetadata(form, event?.eventType),
      });
      setResult(response);
      formElement.reset();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar la asistencia'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="public-register">
      <div className="public-copy">
        <div className="public-icon">
          <ClipboardCheck size={28} />
        </div>
        <span className="eyebrow">Registro de asistencia</span>
        <h1>{event?.title ?? 'Evento académico'}</h1>
        <p>
          Complete sus datos al llegar al salón. Su asistencia quedará guardada para emisión de certificado.
        </p>
        {event ? (
          <div className="public-event-meta">
            <span>{event.location}</span>
            <span>{formatDateTime(event.startsAt)}</span>
          </div>
        ) : null}
      </div>
      <form className="panel stack-form" onSubmit={handleSubmit}>
        {event?.eventType === 'congreso' ? (
          <span className="form-hint">Formulario de congreso</span>
        ) : (
          <span className="form-hint">Formulario simple para taller o evento general</span>
        )}
        <label>
          Nombre
          <input name="firstName" required placeholder="Ej. Maria" autoComplete="given-name" />
        </label>
        <label>
          Apellido
          <input name="lastName" required placeholder="Ej. Gonzalez" autoComplete="family-name" />
        </label>
        <label>
          Cedula
          <input name="documentId" required placeholder="Ej. 8-888-111" autoComplete="off" />
        </label>
        <label>
          {event?.eventType === 'congreso' ? 'Correo institucional' : 'Correo institucional'}
          <input name="email" required type="email" placeholder="correo@institucion.edu" autoComplete="email" />
        </label>
        {event?.eventType === 'congreso' ? (
          <>
            <label>
              Sexo
              <select name="sex" required defaultValue="">
                <option value="" disabled>Seleccione</option>
                <option value="femenino">Femenino</option>
                <option value="masculino">Masculino</option>
                <option value="otro">Otro</option>
                <option value="prefiere_no_decir">Prefiere no decir</option>
              </select>
            </label>
            <label>
              Categoria
              <input name="category" required placeholder="Ej. Estudiante, docente, investigador" />
            </label>
            <label>
              Correo P.
              <input name="personalEmail" required type="email" placeholder="correo.personal@gmail.com" />
            </label>
            <label>
              Nacionalidad
              <input name="nationality" required placeholder="Ej. Panamena" />
            </label>
            <label>
              Otra Nacionalidad
              <input name="otherNationality" placeholder="Opcional" />
            </label>
            <label>
              Modalidad
              <select name="modality" required defaultValue="">
                <option value="" disabled>Seleccione</option>
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="hibrida">Hibrida</option>
              </select>
            </label>
            <label>
              Tipo Participacion
              <select name="participationType" required defaultValue="">
                <option value="" disabled>Seleccione</option>
                <option value="asistente">Asistente</option>
                <option value="ponente">Ponente</option>
                <option value="organizador">Organizador</option>
                <option value="invitado">Invitado</option>
              </select>
            </label>
          </>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registrando...' : 'Registrar asistencia'}
        </button>
        {result ? (
          <div className="qr-result">
            <CheckCircle2 size={22} />
            <strong>{result.alreadyCheckedIn ? 'Asistencia ya registrada' : 'Asistencia registrada'}</strong>
            <span>Código de certificado: {result.certificateCode}</span>
          </div>
        ) : null}
      </form>
    </section>
  );
}
