import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Download, Edit, ExternalLink, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import QRCode from 'qrcode';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { env } from '@/infraestructura/entorno';
import {
  deleteEventDailyAttendanceLog,
  EventDailyAttendance,
  getAutomaticAttendancePeriod,
  getPanamaTimeLabel,
  listEventDailyAttendance,
} from '@/servicios/asistencia.servicio';
import { deleteEvent, getEvent } from '@/servicios/eventos.servicio';
import { CONGRESO_CATEGORY_OPTIONS } from '@/modulos/registro/configuracion-registro';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { EventoAcademico, JornadaAsistencia } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';
import { getEstadoEventoLabel } from '@/utilidades/estado-evento';
import { formatDateTime } from '@/utilidades/formato';

function getInscripcionFormDescription(eventType: EventoAcademico['eventType']) {
  if (eventType === 'congreso') {
    return 'Formulario extendido: sexo, categoria, correo personal, nacionalidad, modalidad, tipo de participacion y entidad.';
  }
  return 'Formulario simple: nombre, apellido, cedula y correo institucional.';
}

function getQrDownloadName(event: EventoAcademico) {
  const safeTitle = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return `qr-registro-${safeTitle || event.id}.png`;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getCategoryLabel(category: string) {
  const normalized = category.toLowerCase();
  const normalizedWithoutAccent = normalizeText(category);

  if (normalized.includes('admin')) return 'Administrativo';
  if (normalizedWithoutAccent.includes('estudiante') || normalizedWithoutAccent.includes('etudiante')) {
    return 'Estudiante';
  }
  if (normalizedWithoutAccent.includes('docente') || normalizedWithoutAccent.includes('profesor')) return 'Docente';
  if (normalizedWithoutAccent.includes('funcionario')) return 'Funcionario';
  if (normalizedWithoutAccent.includes('egresado')) return 'Egresado';
  if (normalizedWithoutAccent.includes('invit')) return 'Invitado';
  return 'Invitado';
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('es-PA', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export function PaginaDetalleEvento() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { profile } = useAutenticacion();
  const [event, setEvent] = useState<EventoAcademico | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [useAutomaticPeriod, setUseAutomaticPeriod] = useState(true);
  const [attendancePeriod, setAttendancePeriod] = useState<JornadaAsistencia>(() => getAutomaticAttendancePeriod());
  const [attendanceRows, setAttendanceRows] = useState<EventDailyAttendance[]>([]);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [deletingAttendanceId, setDeletingAttendanceId] = useState<string | null>(null);
  const [lastAttendanceRefresh, setLastAttendanceRefresh] = useState<string | null>(null);
  const canDeleteAttendance =
    profile?.role === 'propietario' || profile?.role === 'admin' || profile?.role === 'organizador';
  const registrationUrl = useMemo(() => {
    if (!eventId) return '';
    const origin = env.publicAppUrl || window.location.origin;
    return `${origin}/eventos/${eventId}/registro`;
  }, [eventId]);

  useEffect(() => {
    if (eventId) void getEvent(eventId).then(setEvent);
  }, [eventId]);

  useEffect(() => {
    if (!registrationUrl) return;
    void QRCode.toDataURL(registrationUrl, { margin: 2, width: 320 }).then(setQrDataUrl);
  }, [registrationUrl]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      if (useAutomaticPeriod) {
        setAttendancePeriod(getAutomaticAttendancePeriod(now));
      }
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [useAutomaticPeriod]);

  async function loadAttendance(showLoader = false) {
    if (!eventId || event?.eventType !== 'congreso') return;

    setAttendanceError(null);
    if (showLoader) setIsAttendanceLoading(true);
    try {
      const rows = await listEventDailyAttendance(eventId, attendancePeriod);
      setAttendanceRows(rows);
      setLastAttendanceRefresh(new Date().toISOString());
    } catch (err) {
      setAttendanceError(getErrorMessage(err, 'No se pudo cargar la asistencia del congreso'));
    } finally {
      if (showLoader) setIsAttendanceLoading(false);
    }
  }

  useEffect(() => {
    if (!eventId || event?.eventType !== 'congreso') return undefined;

    void loadAttendance(true);
    const intervalId = window.setInterval(() => {
      void loadAttendance();
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [attendancePeriod, event?.eventType, eventId]);

  async function handleDelete() {
    if (!event) return;
    const confirmed = window.confirm(`Desea eliminar el evento "${event.title}"? Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    setError(null);
    try {
      await deleteEvent(event.id);
      navigate('/eventos');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el evento'));
    }
  }

  async function handleCopyRegistrationUrl() {
    if (!registrationUrl) return;

    try {
      await navigator.clipboard.writeText(registrationUrl);
      setQrMessage('Enlace copiado.');
    } catch {
      setQrMessage('No se pudo copiar automaticamente. Puedes seleccionar el enlace manualmente.');
    }
  }

  function handleManualPeriodChange(period: JornadaAsistencia) {
    setUseAutomaticPeriod(false);
    setAttendancePeriod(period);
  }

  function handleSyncAutomaticPeriod() {
    const now = new Date();
    setUseAutomaticPeriod(true);
    setCurrentTime(now);
    setAttendancePeriod(getAutomaticAttendancePeriod(now));
  }

  async function handleDeleteAttendance(row: EventDailyAttendance) {
    const confirmed = window.confirm(
      `Desea eliminar la asistencia de ${row.participantName} registrada el ${formatDateTime(row.checkedInAt)}?`,
    );
    if (!confirmed) return;

    setAttendanceError(null);
    setDeletingAttendanceId(row.id);
    try {
      await deleteEventDailyAttendanceLog(row.id);
      setAttendanceRows((currentRows) => currentRows.filter((item) => item.id !== row.id));
      setLastAttendanceRefresh(new Date().toISOString());
    } catch (err) {
      setAttendanceError(getErrorMessage(err, 'No se pudo eliminar la asistencia'));
    } finally {
      setDeletingAttendanceId(null);
    }
  }

  if (!event) {
    return <div className="screen-loader">Cargando evento...</div>;
  }

  const attendanceSummary = attendanceRows.reduce(
    (summary, row) => {
      summary.total += 1;
      const category = getCategoryLabel(row.category);
      summary.categories[category] = (summary.categories[category] ?? 0) + 1;
      return summary;
    },
    {
      total: 0,
      categories: Object.fromEntries(CONGRESO_CATEGORY_OPTIONS.map((category) => [category, 0])) as Record<
        string,
        number
      >,
    },
  );

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow={getEstadoEventoLabel(event.status)}
        title={event.title}
        description={event.description}
        actions={
          <>
            <a className="secondary-button" href={registrationUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={18} />
              Formulario publico
            </a>
            <Link className="primary-button" to={`/eventos/${event.id}/editar`}>
              <Edit size={18} />
              Editar
            </Link>
            <button className="secondary-button" type="button" onClick={() => void handleDelete()}>
              <Trash2 size={18} />
              Eliminar
            </button>
          </>
        }
      />
      {error ? <p className="form-error">{error}</p> : null}
      <section className="detail-grid">
        <article className="panel">
          <h2>Informacion</h2>
          <dl className="definition-list">
            <div>
              <dt>Tipo</dt>
              <dd>{event.eventType}</dd>
            </div>
            <div>
              <dt>Lugar</dt>
              <dd>{event.location}</dd>
            </div>
            <div>
              <dt>Inicio</dt>
              <dd>{formatDateTime(event.startsAt)}</dd>
            </div>
            <div>
              <dt>Cierre</dt>
              <dd>{formatDateTime(event.endsAt)}</dd>
            </div>
            <div>
              <dt>Capacidad</dt>
              <dd>{event.capacity} participantes</dd>
            </div>
          </dl>
        </article>

        <article className="panel qr-event-panel">
          <div className="qr-event-header">
            <div>
              <h2>QR publico de registro</h2>
              <p>
                Imprime o pega este codigo en el salon. Los participantes escanean y llenan el formulario sin iniciar
                sesion.
              </p>
            </div>
            <span className="status-pill">Publico</span>
          </div>

          <div className="qr-event-content">
            <div className="qr-event-preview">
              {qrDataUrl ? <img src={qrDataUrl} alt="QR de registro publico del evento" /> : null}
            </div>
            <div className="qr-event-actions">
              {qrDataUrl ? (
                <a className="primary-button" href={qrDataUrl} download={getQrDownloadName(event)}>
                  <Download size={18} />
                  Descargar QR
                </a>
              ) : null}
              <a className="secondary-button" href={registrationUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={18} />
                Probar formulario
              </a>
              <button className="secondary-button" type="button" onClick={() => void handleCopyRegistrationUrl()}>
                <Copy size={18} />
                Copiar enlace
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => navigate(`/eventos/${event.id}/registro`, { state: { fromAdmin: true } })}
              >
                <UserPlus size={18} />
                Registro manual
              </button>
            </div>
          </div>

          <div className="qr-public-url">
            <span>URL publica</span>
            <code>{registrationUrl}</code>
          </div>
          {qrMessage ? <p className="form-hint">{qrMessage}</p> : null}
          <Link className="secondary-button qr-lookup-link" to={`/eventos/${event.id}/mi-codigo`}>
            <ExternalLink size={18} />
            Consultar QR con cedula
          </Link>
        </article>

        {event.eventType === 'congreso' ? (
          <article className="panel congress-attendance-panel" id="asistencias-hoy">
            <div className="attendance-panel-header">
              <div>
                <h2>Asistencia en tiempo real</h2>
                <p>
                  Marcajes de hoy, {getTodayLabel()}. La asistencia matutina y vespertina se controla por separado.
                </p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void loadAttendance(true)}
                disabled={isAttendanceLoading}
              >
                <RefreshCw size={18} />
                Actualizar
              </button>
            </div>

            <div className="attendance-toolbar">
              <div className="auto-period-card attendance-auto-period">
                <span>{useAutomaticPeriod ? 'Jornada automatica' : 'Jornada manual'}</span>
                <strong>{attendancePeriod === 'vespertina' ? 'Vespertina presencial' : 'Matutina presencial'}</strong>
                <small>Hora Panama: {getPanamaTimeLabel(currentTime)}</small>
              </div>
              <label>
                Revisar jornada
                <select
                  value={attendancePeriod}
                  onChange={(changeEvent) => handleManualPeriodChange(changeEvent.target.value as JornadaAsistencia)}
                >
                  <option value="matutina">Matutina presencial</option>
                  <option value="vespertina">Vespertina presencial</option>
                </select>
              </label>
              <button className="secondary-button" type="button" onClick={handleSyncAutomaticPeriod}>
                Usar hora actual
              </button>
              <span>
                {lastAttendanceRefresh ? `Actualizado: ${formatDateTime(lastAttendanceRefresh)}` : 'Sin actualizar'}
              </span>
            </div>

            <div className="attendance-summary-grid">
              <div>
                <span>Total</span>
                <strong>{attendanceSummary.total}</strong>
              </div>
              {CONGRESO_CATEGORY_OPTIONS.map((category) => (
                <div key={category}>
                  <span>{category}</span>
                  <strong>{attendanceSummary.categories[category] ?? 0}</strong>
                </div>
              ))}
            </div>

            {attendanceError ? <p className="form-error">{attendanceError}</p> : null}
            {isAttendanceLoading ? <p className="form-hint">Cargando asistencia...</p> : null}

            <div className="live-attendance-list">
              <div className={`live-attendance-head ${canDeleteAttendance ? 'with-actions' : ''}`}>
                <span>Participante</span>
                <span>Cedula</span>
                <span>Categoria</span>
                <span>Hora</span>
                <span>Escaneado por</span>
                {canDeleteAttendance ? <span>Acciones</span> : null}
              </div>
              {attendanceRows.map((row) => (
                <div className={`live-attendance-row ${canDeleteAttendance ? 'with-actions' : ''}`} key={row.id}>
                  <strong>{row.participantName}</strong>
                  <span>{row.documentId}</span>
                  <span>{row.category}</span>
                  <span>{formatDateTime(row.checkedInAt)}</span>
                  <span>{row.scannedByName}</span>
                  {canDeleteAttendance ? (
                    <button
                      className="icon-button danger-button"
                      type="button"
                      aria-label="Eliminar asistencia"
                      disabled={deletingAttendanceId === row.id}
                      onClick={() => void handleDeleteAttendance(row)}
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            {attendanceRows.length === 0 && !isAttendanceLoading ? (
              <p className="form-hint">Todavia no hay marcajes para esta jornada de hoy.</p>
            ) : null}
          </article>
        ) : null}

        <article className="panel">
          <h2>Operacion</h2>
          <div className="workflow-list">
            <span>QR publico del evento para mostrar en el salon</span>
            <span>{getInscripcionFormDescription(event.eventType)}</span>
            <span>Registro publico sin cuenta de participante</span>
            <span>Check-in guardado para certificado</span>
          </div>
        </article>

      </section>
    </div>
  );
}
