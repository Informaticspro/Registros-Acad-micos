import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Camera, CheckCircle2, ScanLine, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { listLaboratorioData } from '@/servicios/laboratorio.servicio';
import type { EquipoLaboratorio } from '@/tipos/dominio';

type EscanerInventarioModalProps = {
  onClose: () => void;
};

function normalizeScanValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getEquipoPathFromQr(rawValue: string) {
  const value = rawValue.trim();
  const urlMatch = value.match(/https?:\/\/[^\s]+/i);
  const candidate = urlMatch?.[0] ?? value;

  try {
    const parsedUrl = new URL(candidate, window.location.origin);
    const routeMatch = parsedUrl.pathname.match(/\/laboratorio\/equipos\/([^/?#]+)/i);
    if (routeMatch?.[1]) return `/laboratorio/equipos/${routeMatch[1]}`;
  } catch {
    // Si no es URL valida, se intenta interpretar como ID directo abajo.
  }

  const uuidMatch = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return uuidMatch ? `/laboratorio/equipos/${uuidMatch[0]}` : null;
}

function findEquipoByBarcode(rawValue: string, equipos: EquipoLaboratorio[]) {
  const scanned = normalizeScanValue(rawValue.replace(/^\*|\*$/g, ''));
  if (!scanned) return null;

  return (
    equipos.find((equipo) => normalizeScanValue(equipo.codigo) === scanned) ??
    equipos.find((equipo) => normalizeScanValue(equipo.serie) === scanned) ??
    null
  );
}

function playInventoryScanSound(success: boolean) {
  const AudioContextClass =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(success ? 900 : 240, audioContext.currentTime);
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
}

export function EscanerInventarioModal({ onClose }: EscanerInventarioModalProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const didNavigateRef = useRef(false);
  const [isScanning, setIsScanning] = useState(true);
  const [message, setMessage] = useState('Apunte la camara al QR o al codigo de barras de la etiqueta.');
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(
    async (rawValue: string) => {
      if (didNavigateRef.current) return;

      let equipoPath = getEquipoPathFromQr(rawValue);
      let targetLabel = 'expediente tecnico';

      if (!equipoPath) {
        try {
          const data = await listLaboratorioData();
          const equipo = findEquipoByBarcode(rawValue, data.equipos);
          if (equipo) {
            equipoPath = `/laboratorio/equipos/${equipo.id}?seccion=fichas`;
            targetLabel = 'fichas tecnicas';
          }
        } catch {
          setError('No se pudo consultar el inventario para validar el codigo de barras.');
          setMessage('Revise la conexion e intente nuevamente.');
          playInventoryScanSound(false);
          return;
        }
      }

      if (!equipoPath) {
        setError('El codigo escaneado no coincide con ningun equipo registrado.');
        setMessage('Use el QR para expediente completo o el codigo de barras para ficha tecnica.');
        playInventoryScanSound(false);
        return;
      }

      didNavigateRef.current = true;
      playInventoryScanSound(true);
      setError(null);
      setMessage(`Equipo encontrado. Abriendo ${targetLabel}...`);
      controlsRef.current?.stop();
      setIsScanning(false);

      window.setTimeout(() => {
        onClose();
        navigate(equipoPath);
      }, 450);
    },
    [navigate, onClose],
  );

  useEffect(() => {
    if (!isScanning || !videoRef.current) return undefined;

    const reader = new BrowserMultiFormatReader();
    let active = true;

    void reader
      .decodeFromVideoDevice(undefined, videoRef.current, (scanResult, scanError, controls) => {
        controlsRef.current = controls;
        if (!active) return;
        if (scanResult) {
          void handleScan(scanResult.getText());
          return;
        }
        if (scanError && scanError.name !== 'NotFoundException') {
          setError('No se pudo leer el codigo. Intente acercar la camara o mejorar la luz.');
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch(() => {
        setError('No se pudo activar la camara. Revise los permisos del navegador.');
        setMessage('Tambien puede abrir el QR con la camara del celular si la etiqueta tiene el enlace.');
      });

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [handleScan, isScanning]);

  return (
    <div className="modal-backdrop lab-scanner-backdrop" role="presentation">
      <section className="modal-panel lab-scanner-modal" role="dialog" aria-modal="true" aria-labelledby="lab-scanner-title">
        <div className="lab-scanner-header">
          <div>
            <span className="eyebrow">Escaner de inventario</span>
            <h2 id="lab-scanner-title">Buscar equipo por etiqueta</h2>
            <p>QR: expediente completo. Codigo de barras: ficha tecnica del equipo.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar escaner" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="lab-scanner-preview">
          {isScanning ? (
            <video ref={videoRef} className="scanner-video" muted playsInline />
          ) : (
            <div className="lab-scanner-success">
              <CheckCircle2 size={54} />
              <span>Expediente encontrado</span>
            </div>
          )}
          <div className="lab-scanner-reticle" aria-hidden="true">
            <ScanLine size={92} />
          </div>
        </div>

        <div className={`lab-scanner-message ${error ? 'error' : 'success'}`}>
          {error ? <X size={18} /> : <Camera size={18} />}
          <span>{error ?? message}</span>
        </div>

        <div className="lab-scanner-actions">
          <button className="secondary-button" type="button" onClick={() => setIsScanning((current) => !current)}>
            {isScanning ? 'Pausar camara' : 'Reactivar camara'}
          </button>
          <button className="secondary-button" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </section>
    </div>
  );
}
