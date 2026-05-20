import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Camera, CheckCircle2, ScanLine, ShieldCheck, Volume2 } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { listEvents } from '@/servicios/eventos.servicio';
import {
  DailyAttendanceResult,
  getAttendancePeriodLabel,
  getAutomaticAttendancePeriod,
  getPanamaTimeLabel,
  recordDailyAttendance,
} from '@/servicios/asistencia.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';
import { formatDateTime } from '@/utilidades/formato';

type ScanResultState = DailyAttendanceResult & {
  message: string;
  variant: 'success' | 'duplicate';
};

function playScanSound(variant: ScanResultState['variant'] | 'error') {
  const AudioContextClass =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const frequency = variant === 'success' ? 880 : variant === 'duplicate' ? 520 : 220;

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
}

export function PaginaEscaner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lookupInProgressRef = useRef(false);
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
      if (lookupInProgressRef.current) return;

      if (!eventId) {
        setError('Seleccione el evento activo antes de escanear.');
        playScanSound('error');
        return;
      }

      lookupInProgressRef.current = true;
      setError(null);
      setResult(null);
      setIsSubmitting(true);

      try {
        const automaticPeriod = getAutomaticAttendancePeriod();
        setCurrentTime(new Date());
        const response = await recordDailyAttendance(eventId, rawValue, automaticPeriod);
        const message = response.alreadyLoggedToday
          ? `Este participante ya tiene asistencia registrada en la jornada ${automaticPeriod}. No se creo duplicado.`
          : 'Asistencia registrada correctamente.';
        const variant = response.alreadyLoggedToday ? 'duplicate' : 'success';
        setResult({ ...response, message, variant });
        playScanSound(variant);
        setManualValue('');
        setIsScanning(false);
      } catch (err) {
        setError(getErrorMessage(err, 'No se pudo validar el QR'));
        playScanSound('error');
      } finally {
        setIsSubmitting(false);
        lookupInProgressRef.current = false;
      }
    },
    [eventId],
  );

  useEffect(() => {
    if (!result && !error) return;
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error, result]);

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
            <small>Hora Panama: {getPanamaTimeLabel(currentTime)}</small>
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
          <div ref={resultRef} className="scanner-feedback-anchor">
            {result ? (
              <div className={`scan-result attendance-scan-card ${result.variant}`}>
                {result.variant === 'duplicate' ? <ShieldCheck size={24} /> : <CheckCircle2 size={24} />}
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
            {error ? (
              <div className="scan-result attendance-scan-card error">
                <Volume2 size={24} />
                <div>
                  <strong>No se pudo registrar</strong>
                  <span>{error}</span>
                </div>
              </div>
            ) : null}
          </div>
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
        </form>
      </section>
      {result ? (
        <div className={`scanner-floating-result ${result.variant}`}>
          <strong>{result.variant === 'duplicate' ? 'Ya registrado' : 'Registrado'}</strong>
          <span>
            {result.participantName} - {getAttendancePeriodLabel(result.attendancePeriod)}
          </span>
        </div>
      ) : null}
      {error ? (
        <div className="scanner-floating-result error">
          <strong>Error de escaneo</strong>
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}

