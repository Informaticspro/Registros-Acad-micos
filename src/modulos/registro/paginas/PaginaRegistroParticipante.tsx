import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardCheck, ThumbsUp, UserPlus } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { TarjetaQrParticipante } from '@/componentes/registro/TarjetaQrParticipante';
import { CamposFormularioRegistro } from '@/modulos/registro/componentes/CamposFormularioRegistro';
import {
  getInscripcionFormHint,
  getInscripcionFormKind,
} from '@/modulos/registro/configuracion-registro';
import { getEvent } from '@/servicios/eventos.servicio';
import { registerPublicCheckIn, PublicCheckInResult } from '@/servicios/registro-publico.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';
import { formatDateTime } from '@/utilidades/formato';

function getValue(form: FormData, field: string) {
  return String(form.get(field) ?? '').trim();
}

function collectMetadata(form: FormData, eventType: EventoAcademico['eventType'] | undefined): Record<string, string> {
  if (getInscripcionFormKind(eventType) !== 'congreso') return {};

  return {
    sex: getValue(form, 'sex'),
    category: getValue(form, 'category'),
    personalEmail: getValue(form, 'personalEmail'),
    nationality: getValue(form, 'nationality'),
    otherNationality: getValue(form, 'otherNationality'),
    modality: getValue(form, 'modality'),
    participationType: getValue(form, 'participationType'),
    entity: getValue(form, 'entity'),
  };
}

type RegisterLocationState = {
  fromAdmin?: boolean;
};

export function PaginaRegistroParticipante() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const location = useLocation();
  const fromAdmin = Boolean((location.state as RegisterLocationState | null)?.fromAdmin);
  const [event, setEvent] = useState<EventoAcademico | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [result, setResult] = useState<PublicCheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setIsLoadingEvent(false);
      setLoadError('No se indico el evento.');
      return;
    }

    setIsLoadingEvent(true);
    setLoadError(null);
    void getEvent(eventId)
      .then((loaded) => {
        if (!loaded) {
          setLoadError('Evento no encontrado o no disponible para registro publico.');
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

  const formKind = getInscripcionFormKind(event?.eventType);
  const showDraftWarning =
    event && (event.status === 'draft' || event.status === 'closed' || event.status === 'archived');

  function resetForAnotherInscripcion() {
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
    const shouldGenerateParticipantQr = event.eventType === 'congreso';
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
          <h1>
            {fromAdmin
              ? result.alreadyCheckedIn
                ? 'Asistencia ya registrada'
                : 'Participante registrado'
              : 'Gracias por inscribirse'}
          </h1>
          <p>
            {!fromAdmin
              ? shouldGenerateParticipantQr
                ? 'Su registro fue recibido correctamente. Guarde el QR que aparece abajo y presentelo el dia del congreso.'
                : 'Su registro fue recibido correctamente. No necesita realizar ninguna otra accion.'
              : shouldGenerateParticipantQr
              ? result.alreadyCheckedIn
                ? 'Este participante ya tenia registro previo. Se muestra su QR para el control del evento.'
                : 'Guarde o imprima el QR. Lo presentara el dia del congreso para validar su asistencia.'
              : 'Su registro de asistencia quedo guardado. Para talleres y capacitaciones no se genera QR personal.'}
          </p>
        </div>
        <div className="panel stack-form register-success-panel">
          {shouldGenerateParticipantQr ? (
            <>
              <TarjetaQrParticipante
                eventId={eventId}
                qrToken={result.qrToken}
                documentId={result.documentId}
                fullName={fullName}
                certificateCode={result.certificateCode}
                showDownload
              />
            </>
          ) : (
            <dl className="definition-list compact">
              <div>
                <dt>Participante</dt>
                <dd>{fullName}</dd>
              </div>
              <div>
                <dt>Cedula</dt>
                <dd>{result.documentId}</dd>
              </div>
              <div>
                <dt>Evento</dt>
                <dd>{event.title}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{result.alreadyCheckedIn ? 'Asistencia ya registrada' : 'Asistencia registrada'}</dd>
              </div>
            </dl>
          )}
          <div className="register-success-actions">
            {fromAdmin ? (
              <>
                <button className="primary-button" type="button" onClick={resetForAnotherInscripcion}>
                  <UserPlus size={18} />
                  Registrar otro participante
                </button>
                <Link className="secondary-button" to={`/eventos/${eventId}`}>
                  Volver al evento
                </Link>
                <Link className="secondary-button" to="/participantes">
                  Ver listado de participantes
                </Link>
              </>
            ) : (
              <div className="registration-done-badge" aria-label="Registro realizado exitosamente">
                <ThumbsUp size={28} />
                <strong>Registro realizado exitosamente</strong>
              </div>
            )}
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
        <h1>{event?.title ?? 'Evento academico'}</h1>
        <p>
          Complete sus datos al llegar al salon. Su asistencia quedara guardada para emision de certificado.
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
          <span className="form-hint">{getInscripcionFormHint(formKind)}</span>
          {showDraftWarning ? (
            <p className="form-hint">
              Este evento esta en estado "{event.status}". Para registro publico debe estar publicado o activo.
              {fromAdmin
                ? ' Si eres organizador, el sistema permite registrar manualmente en borrador.'
                : null}
            </p>
          ) : null}
          <CamposFormularioRegistro formKind={formKind} />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registrando...' : 'Registrar asistencia'}
          </button>
        </form>
      ) : null}
    </section>
  );
}

