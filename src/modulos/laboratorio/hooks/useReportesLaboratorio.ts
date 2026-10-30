import type { LaboratorioState } from '@/servicios/laboratorio.servicio';
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

type Exportadores = typeof import('@/servicios/laboratorio-exportaciones.servicio');

export function useReportesLaboratorio({
  reportEndDate, reportStartDate, selectedReportEquipoId, selectedReportLocation,
  selectedReportMonth, setError, setMessage, state,
}: UseReportesLaboratorioOptions) {
  async function generar(accion: (exportadores: Exportadores) => void | Promise<void>, mensaje?: string) {
    setError(null);
    try {
      const exportadores = await import('@/servicios/laboratorio-exportaciones.servicio');
      await accion(exportadores);
      if (mensaje) setMessage(mensaje);
    } catch {
      setError('No se pudo generar el archivo. Intente nuevamente.');
    }
  }

  function exportCsv() {
    return generar(m => downloadTextFile(m.exportLaboratorioCsv(state), 'informe-laboratorio.csv', 'text/csv;charset=utf-8'));
  }
  function exportReport() {
    return generar(m => downloadTextFile(m.buildLaboratorioReport(state), 'informe-laboratorio.txt'));
  }
  function exportInventoryExcel() {
    if (!state.equipos.length) { setError('No hay equipos registrados para generar el informe de inventario.'); return; }
    return generar(m => m.exportInventarioLaboratorioExcel(state), 'Informe de inventario descargado correctamente.');
  }
  function exportInventoryLabels() {
    if (!state.equipos.length) { setError('No hay equipos registrados para generar etiquetas de inventario.'); return; }
    return generar(m => m.exportEtiquetasInventarioLaboratorioPdf(state), 'Etiquetas de inventario descargadas en PDF correctamente.');
  }
  function exportDiscardsExcel() {
    if (!state.descartes.length) { setError('No hay descartes registrados para generar el informe.'); return; }
    return generar(m => m.exportDescartesLaboratorioExcel(state), 'Informe de descartes descargado correctamente.');
  }
  function exportMonthlyReport() {
    return generar(m => m.exportInformeMensualMantenimientoExcel(state, selectedReportMonth), 'Informe mensual de mantenimiento descargado correctamente.');
  }
  function exportRangeMaintenanceReport() {
    if (reportStartDate && reportEndDate && reportStartDate > reportEndDate) { setError('La fecha inicial no puede ser posterior a la fecha final.'); return; }
    return generar(m => m.exportInformeMantenimientoPorRangoExcel(state, reportStartDate, reportEndDate), 'Informe por rango descargado correctamente.');
  }
  function exportLocationReport() {
    return generar(m => m.exportInformeUbicacionLaboratorioExcel(state, selectedReportLocation), 'Informe por ubicacion descargado correctamente.');
  }
  function exportPendingReport() {
    return generar(m => m.exportInformePendientesLaboratorioExcel(state), 'Informe de pendientes descargado correctamente.');
  }
  function exportEquipmentHistoryById(equipoId: string) {
    return generar(m => m.exportHistorialEquipoLaboratorioExcel(state, equipoId), 'Historial tecnico del equipo descargado correctamente.');
  }
  function exportEquipmentHistoryReport() {
    if (!selectedReportEquipoId) { setError('Seleccione un equipo para generar su historial tecnico.'); return; }
    return exportEquipmentHistoryById(selectedReportEquipoId);
  }
  return {
    exportCsv, exportDiscardsExcel, exportEquipmentHistoryById, exportEquipmentHistoryReport,
    exportInventoryExcel, exportInventoryLabels, exportLocationReport, exportMonthlyReport,
    exportPendingReport, exportRangeMaintenanceReport, exportReport,
  };
}
