import {
  LaboratorioState,
  buildLaboratorioReport,
  exportDescartesLaboratorioExcel,
  exportHistorialEquipoLaboratorioExcel,
  exportInformeMantenimientoPorRangoExcel,
  exportInformeMensualMantenimientoExcel,
  exportInformePendientesLaboratorioExcel,
  exportInformeUbicacionLaboratorioExcel,
  exportEtiquetasInventarioLaboratorioHtml,
  exportInventarioLaboratorioExcel,
  exportLaboratorioCsv,
} from '@/servicios/laboratorio.servicio';
import { downloadTextFile } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type UseReportesLaboratorioOptions = {
  reportEndDate: string;
  reportStartDate: string;
  selectedReportEquipoId: string;
  selectedReportLocation: string;
  selectedReportMonth: string;
  setError: (message: string | null) => void;
  setMessage: (message: string | null) => void;
  state: LaboratorioState;
};

export function useReportesLaboratorio({
  reportEndDate,
  reportStartDate,
  selectedReportEquipoId,
  selectedReportLocation,
  selectedReportMonth,
  setError,
  setMessage,
  state,
}: UseReportesLaboratorioOptions) {
  function exportCsv() {
    downloadTextFile(exportLaboratorioCsv(state), 'informe-laboratorio.csv', 'text/csv;charset=utf-8');
  }

  function exportReport() {
    downloadTextFile(buildLaboratorioReport(state), 'informe-laboratorio.txt');
  }

  function exportInventoryExcel() {
    if (state.equipos.length === 0) {
      setError('No hay equipos registrados para generar el informe de inventario.');
      return;
    }
    exportInventarioLaboratorioExcel(state);
    setMessage('Informe de inventario descargado correctamente.');
  }

  async function exportInventoryLabels() {
    if (state.equipos.length === 0) {
      setError('No hay equipos registrados para generar etiquetas de inventario.');
      return;
    }

    try {
      await exportEtiquetasInventarioLaboratorioHtml(state);
      setMessage('Etiquetas de inventario descargadas correctamente. Abra el HTML para imprimir o guardar como PDF.');
    } catch {
      setError('No se pudieron generar las etiquetas de inventario.');
    }
  }

  function exportDiscardsExcel() {
    if (state.descartes.length === 0) {
      setError('No hay descartes registrados para generar el informe.');
      return;
    }
    exportDescartesLaboratorioExcel(state);
    setMessage('Informe de descartes descargado correctamente.');
  }

  function exportMonthlyReport() {
    exportInformeMensualMantenimientoExcel(state, selectedReportMonth);
    setMessage('Informe mensual de mantenimiento descargado correctamente.');
  }

  function exportRangeMaintenanceReport() {
    if (reportStartDate && reportEndDate && reportStartDate > reportEndDate) {
      setError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    exportInformeMantenimientoPorRangoExcel(state, reportStartDate, reportEndDate);
    setMessage('Informe por rango descargado correctamente.');
  }

  function exportLocationReport() {
    exportInformeUbicacionLaboratorioExcel(state, selectedReportLocation);
    setMessage('Informe por ubicacion descargado correctamente.');
  }

  function exportPendingReport() {
    exportInformePendientesLaboratorioExcel(state);
    setMessage('Informe de pendientes descargado correctamente.');
  }

  function exportEquipmentHistoryReport() {
    if (!selectedReportEquipoId) {
      setError('Seleccione un equipo para generar su historial tecnico.');
      return;
    }
    exportHistorialEquipoLaboratorioExcel(state, selectedReportEquipoId);
    setMessage('Historial tecnico del equipo descargado correctamente.');
  }

  function exportEquipmentHistoryById(equipoId: string) {
    exportHistorialEquipoLaboratorioExcel(state, equipoId);
    setMessage('Historial tecnico del equipo descargado correctamente.');
  }

  return {
    exportCsv,
    exportDiscardsExcel,
    exportEquipmentHistoryById,
    exportEquipmentHistoryReport,
    exportInventoryExcel,
    exportInventoryLabels,
    exportLocationReport,
    exportMonthlyReport,
    exportPendingReport,
    exportRangeMaintenanceReport,
    exportReport,
  };
}
