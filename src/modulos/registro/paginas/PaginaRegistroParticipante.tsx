import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardCheck, ThumbsUp, UserPlus } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { TarjetaQrParticipante } from '@/componentes/registro/TarjetaQrParticipante';
import { CamposFormularioRegistro } from '@/modulos/registro/componentes/CamposFormularioRegistro';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import {
  getInscripcionFormHint,
  getInscripcionFormKind,
} from '@/modulos/registro/configuracion-registro';
import { getEvent } from '@/servicios/eventos.servicio';
import { registerPublicCheckIn, PublicCheckInResult } from '@/servicios/registro-publico.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';
import {
  getEstadoEventoLabel,
  isPublicRegistrationOpen,
  isRegistroPermanenteEvento,
} from '@/utilidades/estado-evento';
import { formatDateTime, toTitleCase } from '@/utilidades/formato';

function getValue(form: FormData, field: string) {
  return String(form.get(field) ?? '').trim();
}

function collectCustomMetadata(form: FormData, event: EventoAcademico | null): Record<string, string> {
  const fields = event?.customFormSchema?.fields ?? [];

  return Object.fromEntries(
    fields.map((field) => {
      const formKey = `custom_${field.id}`;
      const values = form.getAll(formKey).map((value) => String(value).trim()).filter(Boolean);
      return [`custom:${field.label}`, values.join(', ')];
    }),
  );
}

function getEventDateLabel(event: EventoAcademico) {
  return isRegistroPermanenteEvento(event) ? 'Registro permanente' : formatDateTime(event.startsAt);
}

function shouldShowPublicEventDate(event: EventoAcademico) {
  return !isRegistroPermanenteEvento(event);
}

function getPublicRegisterCopy(event: EventoAcademico | null) {
  if (event?.eventType === 'seminario') {
    return {
      eyebrow: 'Inscripcion de seminario',
      description:
        'Complete sus datos para quedar registrado en este seminario. La informacion sera validada por la Facultad de Economia.',
    };
  }

  if (event?.eventType === 'congreso') {
    return {
      eyebrow: 'Inscripcion de congreso',
      description: 'Complete sus datos para generar su registro y QR personal de participacion.',
    };
  }

  return {
    eyebrow: 'Registro de asistencia',
    description:
      'Complete sus datos al llegar al salon. Su asistencia quedara guardada para emision de certificado.',
  };
}

function EncabezadoInstitucionalPublico() {
  return (
    <header className="public-institution-header" aria-label="Facultad de Economia">
      <div className="public-institution-logo">
        <img src="/logo-unachi.png" alt="Logo de la Universidad Autonoma de Chiriqui" />
      </div>
      <div className="public-institution-title">
        <span>Universidad Autonoma de Chiriqui</span>
        <strong>Facultad de Economia</strong>
        <small>Registro academico institucional</small>
      </div>
      <div className="public-institution-logo">
        <img src="/logo-economia.png" alt="Logo de la Facultad de Economia" />
      </div>
    </header>
  );
}

function collectMetadata(form: FormData, event: EventoAcademico | null): Record<string, string> {
  const formKind = getInscripcionFormKind(event ?? undefined);

  if (formKind === 'congreso') {
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

  if (formKind === 'seminario') {
    return {
      institutionalEmail: getValue(form, 'email'),
      personalEmail: getValue(form, 'personalEmail'),
      sex: getValue(form, 'sex'),
      hasDisability: getValue(form, 'hasDisability'),
      disabilityDetail: getValue(form, 'disabilityDetail'),
      phone: getValue(form, 'phone'),
      virtualClassEmail: getValue(form, 'virtualClassEmail'),
      faculty: getValue(form, 'faculty'),
      regionalCenter: getValue(form, 'regionalCenter'),
      participantType: getValue(form, 'participantType'),
      seminarDate: getValue(form, 'seminarDate'),
      seminarPurpose: getValue(form, 'seminarPurpose'),
    };
  }

  if (formKind === 'seminario_general') {
    return {
      institutionalEmail: getValue(form, 'email'),
      personalEmail: getValue(form, 'personalEmail'),
      sex: getValue(form, 'sex'),
      phone: getValue(form, 'phone'),
      faculty: getValue(form, 'faculty'),
      regionalCenter: getValue(form, 'regionalCenter'),
      otherUniversity: getValue(form, 'otherUniversity'),
      participantType: getValue(form, 'participantType'),
    };
  }

  if (formKind === 'personalizado') {
    return collectCustomMetadata(form, event);
  }

  return {};
}

type RegisterLocationState = {
  fromAdmin?: boolean;
};

export function PaginaRegistroParticipante() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const location = useLocation();
  const { profile } = useAutenticacion();
  const isStaffUser = profile?.role === 'propietario' || profile?.role === 'admin' || profile?.role === 'organizador';
  const fromAdmin = Boolean((location.state as RegisterLocationState | null)?.fromAdmin || isStaffUser);
  const [event, setEvent] = useState<EventoAcademico | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [result, setResult] = useState<PublicCheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessNotice, setShowSuccessNotice] = useState(false);

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

  useEffect(() => {
    if (!result) return undefined;

    setShowSuccessNotice(true);
    const timeout = window.setTimeout(() => {
      setShowSuccessNotice(false);
      if (fromAdmin) {
        navigate('/dashboard', { replace: true });
      }
    }, 2600);

    return () => window.clearTimeout(timeout);
  }, [fromAdmin, navigate, result]);

  const formKind = getInscripcionFormKind(event ?? undefined);
  const registrationOpen = event ? isPublicRegistrationOpen(event) : false;
  const showDraftWarning = event && !registrationOpen;
  const publicRegisterCopy = getPublicRegisterCopy(event);

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
        metadata: collectMetadata(form, event),
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
        <EncabezadoInstitucionalPublico />
        {showSuccessNotice ? (
          <div className="success-popover" role="status" aria-live="polite">
            <div className="success-popover-icon">
              <CheckCircle2 size={30} />
            </div>
            <strong>Registro exitoso</strong>
            <span>
              {fromAdmin
                ? 'Volviendo al panel de control...'
                : shouldGenerateParticipantQr
                ? 'Su QR personal esta listo.'
                : 'Gracias por completar su registro.'}
            </span>
          </div>
        ) : null}
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
            <>
              {fromAdmin ? (
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
              ) : (
                <div className="public-logo-success">
                  <img src="/logo-registros-academicos.png" alt="Registros Academicos" />
                  <strong>Registro realizado exitosamente</strong>
                  <span>{event.title}</span>
                </div>
              )}
            </>
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
      <EncabezadoInstitucionalPublico />
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
        <span className="eyebrow">{publicRegisterCopy.eyebrow}</span>
        <h1>{event?.title ?? 'Evento academico'}</h1>
        <p>{publicRegisterCopy.description}</p>
        {event ? (
          <div className="public-event-meta">
            <span>Tipo: {toTitleCase(event.eventType)}</span>
            <span>{event.location}</span>
            {shouldShowPublicEventDate(event) ? <span>{getEventDateLabel(event)}</span> : null}
          </div>
        ) : null}
      </div>
      {isLoadingEvent ? <p className="form-hint">Cargando formulario...</p> : null}
      {loadError ? <p className="form-error">{loadError}</p> : null}
      {!isLoadingEvent && !loadError && event ? (
        <form className="panel stack-form" onSubmit={handleSubmit}>
          {formKind === 'seminario' ? null : <span className="form-hint">{getInscripcionFormHint(formKind)}</span>}
          {showDraftWarning ? (
            <p className="form-hint">
              Este evento esta en estado "{getEstadoEventoLabel(event.status)}" y no acepta registros en este momento.
              {fromAdmin
                ? ' Si eres organizador, el sistema permite registrar manualmente en borrador.'
                : null}
            </p>
          ) : null}
          <CamposFormularioRegistro formKind={formKind} customFormSchema={event.customFormSchema} />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registrando...' : 'Registrar asistencia'}
          </button>
        </form>
      ) : null}
    </section>
  );
}

