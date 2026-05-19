import jsPDF from 'jspdf';
import { Award, Download } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';

export function PaginaCertificados() {
  function generateCertificate() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFillColor(9, 11, 16);
    doc.rect(0, 0, 842, 595, 'F');
    doc.setTextColor(232, 237, 245);
    doc.setFontSize(30);
    doc.text('Certificado de Participacion', 421, 190, { align: 'center' });
    doc.setFontSize(18);
    doc.text('Otorgado por asistencia registrada mediante QR', 421, 245, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Codigo: CERT-2026-001', 421, 340, { align: 'center' });
    doc.save('certificado-academico.pdf');
  }

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="PDF automatico"
        title="Certificados"
        description="Generacion basada en asistencia confirmada y codigo verificable."
      />
      <section className="panel certificate-panel">
        <Award size={42} />
        <div>
          <h2>Plantilla inicial de certificado</h2>
          <p>La base queda lista para personalizar logo, firmas, horas academicas y validacion publica.</p>
        </div>
        <button className="primary-button" onClick={generateCertificate} type="button">
          <Download size={18} />
          Descargar PDF
        </button>
      </section>
    </div>
  );
}

