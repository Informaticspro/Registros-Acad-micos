import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import QRCode from 'qrcode';
import { buildParticipanteQrPayload } from '@/utilidades/qr';

type Props = {
  eventId: string;
  qrToken: string;
  documentId: string;
  fullName: string;
  certificateCode: string;
  showDownload?: boolean;
  title?: string;
  description?: string;
  downloadLabel?: string;
};

export function TarjetaQrParticipante({
  eventId,
  qrToken,
  documentId,
  fullName,
  certificateCode,
  showDownload = false,
  title = 'Tu codigo QR de asistencia',
  description = 'Guarde o descargue esta imagen. Presentela al llegar cada dia del evento.',
  downloadLabel = 'Descargar QR en el celular',
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const payload = buildParticipanteQrPayload({ eventId, qrToken, documentId });
  const downloadName = `qr-${documentId.replace(/\W/g, '-')}.png`;

  useEffect(() => {
    void QRCode.toDataURL(payload, { margin: 2, width: 280 }).then(setQrDataUrl);
  }, [payload]);

  return (
    <article className="participant-qr-card panel">
      <h3>{title}</h3>
      <p>{description}</p>
      {qrDataUrl ? <img src={qrDataUrl} alt={`QR de ${fullName}`} className="participant-qr-image" /> : null}
      {showDownload && qrDataUrl ? (
        <a className="primary-button" href={qrDataUrl} download={downloadName}>
          <Download size={18} />
          {downloadLabel}
        </a>
      ) : null}
      <dl className="definition-list compact">
        <div>
          <dt>Participante</dt>
          <dd>{fullName}</dd>
        </div>
        <div>
          <dt>Cedula</dt>
          <dd>{documentId}</dd>
        </div>
        <div>
          <dt>Codigo certificado</dt>
          <dd>{certificateCode}</dd>
        </div>
      </dl>
    </article>
  );
}

