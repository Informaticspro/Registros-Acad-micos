import jsPDF from 'jspdf';
import { Award, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export function CertificatesPage() {
  function generateCertificate() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFillColor(9, 11, 16);
    doc.rect(0, 0, 842, 595, 'F');
    doc.setTextColor(232, 237, 245);
    doc.setFontSize(30);
    doc.text('Certificado de Participación', 421, 190, { align: 'center' });
    doc.setFontSize(18);
    doc.text('Otorgado por asistencia registrada mediante QR', 421, 245, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Código: CERT-2026-001', 421, 340, { align: 'center' });
    doc.save('certificado-academico.pdf');
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="PDF automático"
        title="Certificados"
        description="Generación basada en asistencia confirmada y código verificable."
      />
      <section className="panel certificate-panel">
        <Award size={42} />
        <div>
          <h2>Plantilla inicial de certificado</h2>
          <p>La base queda lista para personalizar logo, firmas, horas académicas y validación pública.</p>
        </div>
        <button className="primary-button" onClick={generateCertificate} type="button">
          <Download size={18} />
          Descargar PDF
        </button>
      </section>
    </div>
  );
}
