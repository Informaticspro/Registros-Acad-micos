import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Camera, CheckCircle2, ScanLine } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { listEvents } from '@/servicios/eventos.servicio';
import {
  DailyAttendanceResult,
  getAttendancePeriodLabel,
  getAutomaticAttendancePeriod,
  recordDailyAttendance,
} from '@/servicios/asistencia.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';
import { formatDateTime } from '@/utilidades/formato';

type ScanResultState = DailyAttendanceResult & {
  message: string;
};

export function PaginaEscaner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [eventId, setEventId] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [manualValue, setManualValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void listEvents().then((loaded) => {
      const congressEvents = loaded.filter(
        (event) =>
          event.eventType === 'congreso' &&
          (event.status === 'published' || event.status === 'active' || event.status === 'closed'),
      );
      setEvents(congressEvents);
      if (congressEvents[0]) setEventId(congressEvents[0].id);
    });
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleLookup = useCallback(
    async (rawValue: string) => {
      if (!eventId) {
        setError('Seleccione el evento activo antes de escanear.');
        return;
      }

      setError(null);
      setResult(null);
      setIsSubmitting(true);

      try {
        const automaticPeriod = getAutomaticAttendancePeriod();
        setCurrentTime(new Date());
        const response = await recordDailyAttendance(eventId, rawValue, automaticPeriod);
        const message = response.alreadyLoggedToday
          ? `Este participante ya tenia marcaje en la jornada ${automaticPeriod}. Se guardo un nuevo registro.`
          : 'Asistencia registrada correctamente.';
        setResult({ ...response, message });
        setManualValue('');
        setIsScanning(false);
      } catch (err) {
        setError(getErrorMessage(err, 'No se pudo validar el QR'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    if (!isScanning || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    let active = true;

    void reader
      .decodeFromVideoDevice(undefined, videoRef.current, (scanResult, scanError, controls) => {
        controlsRef.current = controls;
        if (!active || !scanResult) return;
        if (scanError && scanError.name === 'NotFoundException') return;
        setManualValue(scanResult.getText());
        void handleLookup(scanResult.getText());
      })
      .then((controls) => {
        controlsRef.current = controls;
      });

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [isScanning, handleLookup]);

  async function handleManualSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    await handleLookup(manualValue);
  }

  const selectedEvent = events.find((event) => event.id === eventId);
  const attendancePeriod = getAutomaticAttendancePeriod(currentTime);

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="Control de congreso"
        title="Escanear asistencia"
        description="Registra entrada por jornada usando el QR personal generado al inscribirse al congreso."
      />
      <section className="scanner-grid">
        <article className="panel stack-form">
          <label>
            Congreso
            <select value={eventId} onChange={(event) => setEventId(event.target.value)} required>
              <option value="" disabled>
                Seleccione el congreso
              </option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({event.eventType})
                </option>
              ))}
            </select>
          </label>
          {selectedEvent ? (
            <p className="form-hint">
              {selectedEvent.location} - {formatDateTime(selectedEvent.startsAt)}
            </p>
          ) : null}
          <div className="auto-period-card">
            <span>Jornada automatica</span>
            <strong>{getAttendancePeriodLabel(attendancePeriod)}</strong>
            <small>
              Hora actual: {currentTime.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
            </small>
            <small>8:00 a. m. - 12:59 p. m. matutina / 1:00 p. m. - 6:00 p. m. vespertina</small>
          </div>
          {events.length === 0 ? (
            <p className="form-hint">No hay congresos publicados o activos disponibles para escaneo.</p>
          ) : null}
          <div className="scanner-preview">
            {isScanning ? (
              <video ref={videoRef} className="scanner-video" muted playsInline />
            ) : (
              <>
                <Camera size={34} />
                <ScanLine size={96} />
              </>
            )}
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setIsScanning((value) => !value)}
            disabled={!eventId}
          >
            {isScanning ? 'Detener camara' : 'Activar camara'}
          </button>
        </article>
        <form className="panel stack-form" onSubmit={handleManualSubmit}>
          <label>
            QR personal del participante o cedula
            <input
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
              placeholder="Escanee el QR o escriba la cedula"
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={isSubmitting || !eventId}>
            {isSubmitting ? 'Validando...' : `Registrar asistencia ${getAttendancePeriodLabel(attendancePeriod)}`}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
          {result ? (
            <div className="scan-result attendance-scan-card">
              <CheckCircle2 size={24} />
              <div>
                <strong>{result.message}</strong>
                <span>{result.participantName}</span>
                <small>Cedula: {result.documentId}</small>
                <small>Jornada: {getAttendancePeriodLabel(result.attendancePeriod)}</small>
                <small>Fecha y hora: {formatDateTime(result.checkedInAt)}</small>
                <small>Certificado: {result.certificateCode}</small>
              </div>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}

