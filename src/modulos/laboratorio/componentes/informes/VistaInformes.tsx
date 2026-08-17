import { ClipboardList, Download, HardDrive, History, Trash2, Wrench } from 'lucide-react';
import {
  LaboratorioState,
  buildInformeMantenimientoPorRango,
  buildLaboratorioReport,
} from '@/servicios/laboratorio.servicio';

type VistaInformesProps = {
  reportEndDate: string;
  reportStartDate: string;
  selectedReportEquipoId: string;
  selectedReportLocation: string;
  selectedReportMonth: string;
  state: LaboratorioState;
  ubicacionesInventario: string[];
  exportCsv: () => void;
  exportDiscardsExcel: () => void;
  exportEquipmentHistoryReport: () => void;
  exportInventoryExcel: () => void;
  exportLocationReport: () => void;
  exportMonthlyReport: () => void;
  exportPendingReport: () => void;
  exportRangeMaintenanceReport: () => void;
  exportReport: () => void;
  setReportEndDate: (value: string) => void;
  setReportStartDate: (value: string) => void;
  setSelectedReportEquipoId: (value: string) => void;
  setSelectedReportLocation: (value: string) => void;
  setSelectedReportMonth: (value: string) => void;
};

export function VistaInformes({
  reportEndDate,
  reportStartDate,
  selectedReportEquipoId,
  selectedReportLocation,
  selectedReportMonth,
  state,
  ubicacionesInventario,
  exportCsv,
  exportDiscardsExcel,
  exportEquipmentHistoryReport,
  exportInventoryExcel,
  exportLocationReport,
  exportMonthlyReport,
  exportPendingReport,
  exportRangeMaintenanceReport,
  exportReport,
  setReportEndDate,
  setReportStartDate,
  setSelectedReportEquipoId,
  setSelectedReportLocation,
  setSelectedReportMonth,
}: VistaInformesProps) {
  return (
    <div className="lab-report-grid">
      <article className="lab-report-card full">
        <Wrench size={26} />
        <h2>Informe de mantenimiento bajo demanda</h2>
        <p>
          Elija cualquier rango de fechas. Consolida mantenimientos efectuados, equipos atendidos, incidencias encontradas
          y reparaciones pendientes o en proceso.
        </p>
        <div className="form-grid compact-form-grid">
          <label>
            Desde
            <input type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} />
          </label>
          <label>
            Hasta
            <input type="date" value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} />
          </label>
        </div>
        <button className="primary-button" type="button" onClick={exportRangeMaintenanceReport}>
          <Download size={18} />
          Descargar Excel por rango
        </button>
        <pre>{buildInformeMantenimientoPorRango(state, reportStartDate, reportEndDate)}</pre>
      </article>

      <article className="lab-report-card">
        <History size={26} />
        <h2>Informe mensual</h2>
        <p>Resumen ejecutivo del mes con bitacoras, fichas tecnicas, prestamos y pendientes del laboratorio.</p>
        <label>
          Mes del informe
          <input type="month" value={selectedReportMonth} onChange={(event) => setSelectedReportMonth(event.target.value)} />
        </label>
        <button className="primary-button" type="button" onClick={exportMonthlyReport}>
          <Download size={18} />
          Descargar Excel
        </button>
      </article>

      <article className="lab-report-card">
        <HardDrive size={26} />
        <h2>Informe por ubicacion</h2>
        <p>Equipos y bitacoras organizadas por area: laboratorio, biblioteca, decanato, ORD u otra seccion.</p>
        <label>
          Ubicacion
          <select value={selectedReportLocation} onChange={(event) => setSelectedReportLocation(event.target.value)}>
            {ubicacionesInventario.map((ubicacion) => (
              <option value={ubicacion} key={ubicacion}>
                {ubicacion}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button" type="button" onClick={exportLocationReport}>
          <Download size={18} />
          Descargar Excel
        </button>
      </article>

      <article className="lab-report-card">
        <Wrench size={26} />
        <h2>Pendientes tecnicos</h2>
        <p>Equipos no operativos, trabajos abiertos y prestamos activos o vencidos para seguimiento inmediato.</p>
        <button className="primary-button" type="button" onClick={exportPendingReport}>
          <Download size={18} />
          Descargar Excel
        </button>
      </article>

      <article className="lab-report-card">
        <ClipboardList size={26} />
        <h2>Historial por equipo</h2>
        <p>Ficha de seguimiento con datos del equipo, fichas tecnicas y bitacoras relacionadas.</p>
        <label>
          Equipo
          <select value={selectedReportEquipoId} onChange={(event) => setSelectedReportEquipoId(event.target.value)}>
            <option value="">Seleccione un equipo</option>
            {state.equipos.map((equipo) => (
              <option value={equipo.id} key={equipo.id}>
                {equipo.codigo} - {equipo.nombre} - {equipo.ubicacion}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-button" type="button" onClick={exportEquipmentHistoryReport}>
          <Download size={18} />
          Descargar historial
        </button>
      </article>

      <article className="lab-report-card">
        <HardDrive size={26} />
        <h2>Informe de inventario</h2>
        <p>Excel formal con inventario ordenado por ubicacion, categoria y equipo, mas resumen por areas.</p>
        <button className="primary-button" type="button" onClick={exportInventoryExcel}>
          <Download size={18} />
          Descargar Excel
        </button>
      </article>

      <article className="lab-report-card">
        <Trash2 size={26} />
        <h2>Informe de descartes</h2>
        <p>Excel formal con equipos descartados, inventario, serie, detalle y ubicacion, siguiendo el formato institucional.</p>
        <button className="primary-button" type="button" onClick={exportDiscardsExcel}>
          <Download size={18} />
          Descargar Excel
        </button>
      </article>

      <article className="lab-report-card">
        <ClipboardList size={26} />
        <h2>Base completa</h2>
        <p>Archivo CSV general para abrir en Excel con bitacoras, inventario, fichas y prestamos registrados.</p>
        <button className="secondary-button" type="button" onClick={exportCsv}>
          <Download size={18} />
          Descargar CSV
        </button>
      </article>

      <article className="lab-report-card">
        <History size={26} />
        <h2>Resumen TXT</h2>
        <p>Resumen rapido en texto plano para compartir o pegar en una nota administrativa.</p>
        <button className="secondary-button" type="button" onClick={exportReport}>
          <Download size={18} />
          Descargar TXT
        </button>
      </article>

      <article className="lab-report-card full">
        <h2>Vista previa del informe</h2>
        <pre>{buildLaboratorioReport(state)}</pre>
      </article>
    </div>
  );
}
