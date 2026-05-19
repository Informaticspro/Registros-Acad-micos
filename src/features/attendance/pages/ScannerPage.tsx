import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Camera, CheckCircle2, ScanLine } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { listEvents } from '@/services/events.service';
import { recordDailyAttendance } from '@/services/attendance.service';
import { AcademicEvent } from '@/types/domain';
import { getErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';

export function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [eventId, setEventId] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void listEvents().then((loaded) => {
      setEvents(loaded);
      if (loaded[0]) setEventId(loaded[0].id);
    });
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
        const response = await recordDailyAttendance(eventId, rawValue);
        const message = response.alreadyLoggedToday
          ? `${response.participantName} (${response.documentId}) ya tenía marcaje hoy. Nuevo registro: ${formatDateTime(response.checkedInAt)}`
          : `Asistencia registrada: ${response.participantName} (${response.documentId}) — ${formatDateTime(response.checkedInAt)}`;
        setResult(message);
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

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Control de asistencia"
        title="Escanear QR"
        description="Marca la llegada diaria de participantes inscritos. Funciona con el QR personal (cédula) o ingresando la cédula manualmente."
      />
      <section className="scanner-grid">
        <article className="panel stack-form">
          <label>
            Evento del día
            <select value={eventId} onChange={(event) => setEventId(event.target.value)} required>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({event.eventType})
                </option>
              ))}
            </select>
          </label>
          {selectedEvent ? (
            <p className="form-hint">
              {selectedEvent.location} — {formatDateTime(selectedEvent.startsAt)}
            </p>
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
            {isScanning ? 'Detener cámara' : 'Activar cámara'}
          </button>
        </article>
        <form className="panel stack-form" onSubmit={handleManualSubmit}>
          <label>
            QR del participante o cédula
            <input
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
              placeholder="Escanee o escriba la cédula"
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={isSubmitting || !eventId}>
            {isSubmitting ? 'Validando...' : 'Registrar llegada del día'}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
          {result ? (
            <div className="scan-result">
              <CheckCircle2 size={20} />
              <span>{result}</span>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}
