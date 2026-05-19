import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardCheck, UserPlus } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ParticipantQrCard } from '@/components/registration/ParticipantQrCard';
import { RegistrationFormFields } from '@/features/registration/components/RegistrationFormFields';
import {
  getRegistrationFormHint,
  getRegistrationFormKind,
} from '@/features/registration/registration-config';
import { getEvent } from '@/services/events.service';
import { registerPublicCheckIn, PublicCheckInResult } from '@/services/public-check-in.service';
import { AcademicEvent } from '@/types/domain';
import { getErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';

function getValue(form: FormData, field: string) {
  return String(form.get(field) ?? '').trim();
}

function collectMetadata(form: FormData, eventType: AcademicEvent['eventType'] | undefined): Record<string, string> {
  if (getRegistrationFormKind(eventType) !== 'congreso') return {};

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

type RegisterLocationState = {
  fromAdmin?: boolean;
};

export function RegisterParticipantPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const location = useLocation();
  const fromAdmin = Boolean((location.state as RegisterLocationState | null)?.fromAdmin);
  const [event, setEvent] = useState<AcademicEvent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [result, setResult] = useState<PublicCheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setIsLoadingEvent(false);
      setLoadError('No se indicó el evento.');
      return;
    }

    setIsLoadingEvent(true);
    setLoadError(null);
    void getEvent(eventId)
      .then((loaded) => {
        if (!loaded) {
          setLoadError('Evento no encontrado o no disponible para registro público.');
          setEvent(null);
          return;
        }
        setEvent(loaded);
      })
      .catch((err) => {
        setLoadError(getErrorMessage(err, 'No se pudo cargar el evento'));
        setEvent(null);
      })
      .finally(() => setIsLoadingEvent(false));
  }, [eventId]);

  const formKind = getRegistrationFormKind(event?.eventType);
  const showDraftWarning =
    event && (event.status === 'draft' || event.status === 'closed' || event.status === 'archived');

  function resetForAnotherRegistration() {
    setResult(null);
    setError(null);
    if (eventId) {
      navigate(`/eventos/${eventId}/registro`, {
        replace: true,
        state: fromAdmin ? { fromAdmin: true } : undefined,
      });
    }
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!eventId || !event) return;

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
        eventType: event.eventType,
        metadata: collectMetadata(form, event.eventType),
      });
      setResult(response);
      formElement.reset();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar la asistencia'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const shellClass = fromAdmin ? 'page-stack register-in-app' : 'public-register';

  if (result && eventId && event) {
    const fullName = `${result.firstName} ${result.lastName}`.trim();
    return (
      <section className={shellClass}>
        {fromAdmin && eventId ? (
          <Link className="secondary-button register-back-link" to={`/eventos/${eventId}`}>
            <ArrowLeft size={18} />
            Volver al evento
          </Link>
        ) : null}
        <div className="public-copy">
          <div className="public-icon">
            <CheckCircle2 size={28} />
          </div>
          <span className="eyebrow">Registro completado</span>
          <h1>{result.alreadyCheckedIn ? 'Asistencia ya registrada' : 'Participante registrado'}</h1>
          <p>
            {result.alreadyCheckedIn
              ? 'Este participante ya tenía registro previo. Se muestra su QR para el control diario.'
              : 'Guarde o imprima el QR. Lo presentará en cada jornada del evento para marcar llegada con fecha y hora.'}
          </p>
        </div>
        <div className="panel stack-form register-success-panel">
          <ParticipantQrCard
            eventId={eventId}
            qrToken={result.qrToken}
            documentId={result.documentId}
            fullName={fullName}
            certificateCode={result.certificateCode}
            showDownload
          />
          <Link className="secondary-button" to={`/eventos/${eventId}/mi-codigo`}>
            Consultar este QR después con mi cédula
          </Link>
          <div className="register-success-actions">
            <button className="primary-button" type="button" onClick={resetForAnotherRegistration}>
              <UserPlus size={18} />
              Registrar otro participante
            </button>
            {fromAdmin ? (
              <>
                <Link className="secondary-button" to={`/eventos/${eventId}`}>
                  Volver al evento
                </Link>
                <Link className="secondary-button" to="/participantes">
                  Ver listado de participantes
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={shellClass}>
      {fromAdmin && eventId ? (
        <Link className="secondary-button register-back-link" to={`/eventos/${eventId}`}>
          <ArrowLeft size={18} />
          Volver al evento
        </Link>
      ) : null}
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
            <span>Tipo: {event.eventType}</span>
            <span>{event.location}</span>
            <span>{formatDateTime(event.startsAt)}</span>
          </div>
        ) : null}
      </div>
      {isLoadingEvent ? <p className="form-hint">Cargando formulario...</p> : null}
      {loadError ? <p className="form-error">{loadError}</p> : null}
      {!isLoadingEvent && !loadError && event ? (
        <form className="panel stack-form" onSubmit={handleSubmit}>
          <span className="form-hint">{getRegistrationFormHint(formKind)}</span>
          {showDraftWarning ? (
            <p className="form-hint">
              Este evento está en estado «{event.status}». Para registro público debe estar publicado o activo.
              {fromAdmin
                ? ' Si eres organizador, el sistema permite registrar manualmente en borrador.'
                : null}
            </p>
          ) : null}
          <RegistrationFormFields formKind={formKind} />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registrando...' : 'Registrar asistencia'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
