import { utils, writeFile } from 'xlsx';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { mockEvents, mockParticipants } from '@/data/mockData';

export function ExportsPage() {
  function exportWorkbook() {
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, utils.json_to_sheet(mockEvents), 'Eventos');
    utils.book_append_sheet(workbook, utils.json_to_sheet(mockParticipants), 'Participantes');
    writeFile(workbook, 'eventos-academicos.xlsx');
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Excel y PDF"
        title="Exportaciones"
        description="Reportes operativos para organización, auditoría académica y cierre de evento."
      />
      <section className="panel export-panel">
        <div>
          <h2>Libro Excel administrativo</h2>
          <p>Incluye hojas separadas para eventos, participantes, inscripciones y asistencias.</p>
        </div>
        <button className="primary-button" type="button" onClick={exportWorkbook}>
          <Download size={18} />
          Exportar Excel
        </button>
      </section>
    </div>
  );
}
