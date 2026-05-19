import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { getEvent } from '@/services/events.service';
import { registerPublicCheckIn, PublicCheckInResult } from '@/services/public-check-in.service';
import { AcademicEvent } from '@/types/domain';
import { getErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';

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
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        documentId: String(form.get('documentId') ?? ''),
        email: String(form.get('email') ?? ''),
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
        <label>
          Nombre
          <input name="firstName" required placeholder="Ej. María" autoComplete="given-name" />
        </label>
        <label>
          Apellido
          <input name="lastName" required placeholder="Ej. González" autoComplete="family-name" />
        </label>
        <label>
          Cédula
          <input name="documentId" required placeholder="Ej. 8-888-111" autoComplete="off" />
        </label>
        <label>
          Correo
          <input name="email" required type="email" placeholder="correo@institucion.edu" autoComplete="email" />
        </label>
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
