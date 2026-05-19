import { FormEvent, useState } from 'react';
import { Camera, CheckCircle2, ScanLine } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { verifyQrToken } from '@/services/attendance.service';

export function ScannerPage() {
  const [token, setToken] = useState('ACAD-EVT002-REG002');
  const [result, setResult] = useState<string | null>(null);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await verifyQrToken(token);
    setResult(response.valid ? `Asistencia válida: ${response.registration?.certificateCode}` : 'QR no válido');
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Control de asistencia"
        title="Escaneo QR"
        description="Preparado para cámara móvil o lector externo. El token se valida contra la inscripción."
      />
      <section className="scanner-grid">
        <article className="scanner-preview">
          <Camera size={34} />
          <ScanLine size={96} />
        </article>
        <form className="panel stack-form" onSubmit={handleVerify}>
          <label>
            Token QR
            <input value={token} onChange={(event) => setToken(event.target.value)} />
          </label>
          <button className="primary-button" type="submit">
            Validar asistencia
          </button>
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
