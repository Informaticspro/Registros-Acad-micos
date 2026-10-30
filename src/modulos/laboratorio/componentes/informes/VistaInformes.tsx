import { useState } from 'react';
import { Download, FileText, Tags } from 'lucide-react';
import type { LaboratorioState } from '@/servicios/laboratorio.servicio';
import { descargarVistaInforme, gruposInformes, normalizarPersona, obtenerFilasInforme, type TipoInforme } from './informes.modelo';
import './informes.css';

type VistaInformesProps = {
  reportEndDate: string; reportStartDate: string; selectedReportEquipoId: string;
  selectedReportLocation: string; selectedReportMonth: string;
  state: LaboratorioState; ubicacionesInventario: string[];
  exportCsv: () => void; exportDiscardsExcel: () => void; exportEquipmentHistoryReport: () => void;
  exportInventoryExcel: () => void; exportInventoryLabels: () => void; exportLocationReport: () => void;
  exportMonthlyReport: () => void; exportPendingReport: () => void; exportRangeMaintenanceReport: () => void;
  exportReport: () => void;
  setReportEndDate: (value: string) => void; setReportStartDate: (value: string) => void;
  setSelectedReportEquipoId: (value: string) => void; setSelectedReportLocation: (value: string) => void;
  setSelectedReportMonth: (value: string) => void;
};

export function VistaInformes(p: VistaInformesProps) {
  const [tipo, setTipo] = useState<TipoInforme>('inventario');
  const [rol, setRol] = useState<'tecnico' | 'beneficiario' | 'todos'>('tecnico');
  const [persona, setPersona] = useState('');
  const [trabajos, setTrabajos] = useState(true);
  const [prestamos, setPrestamos] = useState(true);
  const [evidencias, setEvidencias] = useState(false);
  const [periodo, setPeriodo] = useState('Personalizado');
  const [formato, setFormato] = useState('excel');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [recientes, setRecientes] = useState<{ tipo: TipoInforme; nombre: string }[]>([]);
  const titulo = gruposInformes.flatMap(g => g.opciones).find(o => o[0] === tipo)?.[1] || 'Informe';
  const filas = obtenerFilasInforme(p.state, { tipo, desde: p.reportStartDate, hasta: p.reportEndDate,
    mes: p.selectedReportMonth, ubicacion: p.selectedReportLocation, equipoId: p.selectedReportEquipoId,
    rol, persona, trabajos, prestamos, evidencias });
  const nombres = rol === 'beneficiario' ? p.state.prestamos.map(x => x.entregadoA) : [...p.state.bitacoras.map(x => x.responsable), ...p.state.prestamos.map(x => x.responsableEntrega)];
  const personas = [...new Map(nombres.filter(Boolean).map(nombre=>[normalizarPersona(nombre),nombre.trim()])).values()].sort();
  const pendientes = p.state.bitacoras.filter(b => ['pendiente', 'en_proceso'].includes(b.estado)).length;
  const invalido = p.reportStartDate > p.reportEndDate && ['rango', 'persona'].includes(tipo);
  const faltaPersona = tipo === 'persona' && rol !== 'todos' && !persona;
  const faltaEquipo = tipo === 'historial' && !p.selectedReportEquipoId;

  function elegirPeriodo(nombre: string) {
    setPeriodo(nombre);
    if (nombre === 'Personalizado') return;
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const fin = new Date(inicio);
    if (nombre === 'Semana') inicio.setDate(inicio.getDate() - (inicio.getDay() + 6) % 7);
    if (nombre === 'Este mes') inicio.setDate(1);
    if (nombre === 'Mes anterior') { inicio.setMonth(inicio.getMonth() - 1, 1); fin.setDate(0); }
    const fecha = (d: Date) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    p.setReportStartDate(fecha(inicio)); p.setReportEndDate(fecha(fin));
  }

  async function descargar() {
    setError(''); setOcupado(true);
    try {
      const acciones: Partial<Record<TipoInforme, () => void | Promise<void>>> = {
        inventario: p.exportInventoryExcel, ubicacion: p.exportLocationReport, historial: p.exportEquipmentHistoryReport,
        mensual: p.exportMonthlyReport, rango: p.exportRangeMaintenanceReport, pendientes: p.exportPendingReport,
        descartes: p.exportDiscardsExcel,
      };
      if (tipo === 'csv') await p.exportCsv();
      else if (tipo === 'txt') await p.exportReport();
      else if (formato === 'excel' && acciones[tipo]) await acciones[tipo]?.();
      else await descargarVistaInforme(filas, titulo, formato,tipo==='persona'?{persona,rol,desde:p.reportStartDate,hasta:p.reportEndDate,trabajos,prestamos,evidencias}:undefined);
      setRecientes(actual => [{ tipo, nombre: titulo }, ...actual.filter(x => x.tipo !== tipo)].slice(0, 4));
    } catch { setError('No se pudo generar el archivo. Intente nuevamente.'); }
    finally { setOcupado(false); }
  }

  return (
    <div className="reports-workspace">
      <header className="reports-heading"><h2>Informes</h2><p>Elija el tipo de informe, ajuste los filtros y descarguelo en el formato que necesite.</p></header>
      <div className="reports-layout">
        <nav className="reports-navigation" aria-label="Tipos de informe">
          <h3><b className="reports-step">1</b> Que informe necesita?</h3>
          {gruposInformes.map(grupo => <div className="reports-group" key={grupo.titulo}>
            <h4>{grupo.titulo}</h4>
            {grupo.opciones.map(([id, nombre]) => <button key={id} type="button" aria-current={tipo === id ? 'true' : undefined}
              className={tipo === id ? 'selected' : ''} onClick={() => { setTipo(id); setError(''); }}>
              {nombre}{id === 'pendientes' && pendientes > 0 ? <span className="reports-count">{pendientes}</span> : null}
            </button>)}
          </div>)}
        </nav>
        <div className="reports-content">
          <section className="reports-filters" aria-labelledby="report-filters-title">
            <h3 id="report-filters-title"><b className="reports-step">2</b> {titulo} · filtros</h3>
            {tipo === 'persona' ? <>
              <div className="reports-segments" aria-label="Tipo de persona">
                {([['tecnico', 'Tecnico'], ['beneficiario', 'Docente o solicitante'], ['todos', 'Todos los tecnicos']] as const).map(([id, nombre]) =>
                  <button type="button" key={id} aria-pressed={rol === id} onClick={() => { setRol(id); setPersona(''); }}>{nombre}</button>)}
              </div>
              {rol !== 'todos' ? <label>Persona<select value={persona} onChange={e => setPersona(e.target.value)}>
                <option value="">Seleccione una persona</option>{personas.map(nombre => <option key={nombre}>{nombre}</option>)}
              </select></label> : null}
            </> : null}
            {tipo === 'mensual' ? <label>Mes del informe<input type="month" value={p.selectedReportMonth} onChange={e => p.setSelectedReportMonth(e.target.value)} /></label> : null}
            {['rango', 'persona'].includes(tipo) ? <>
              <div className="reports-segments" aria-label="Periodo">{['Hoy', 'Semana', 'Este mes', 'Mes anterior', 'Personalizado'].map(nombre =>
                <button key={nombre} type="button" aria-pressed={periodo === nombre} onClick={() => elegirPeriodo(nombre)}>{nombre}</button>)}</div>
              <div className="reports-dates"><label>Desde<input type="date" value={p.reportStartDate} onChange={e => { setPeriodo('Personalizado'); p.setReportStartDate(e.target.value); }} /></label>
                <label>Hasta<input type="date" value={p.reportEndDate} onChange={e => { setPeriodo('Personalizado'); p.setReportEndDate(e.target.value); }} /></label></div>
            </> : null}
            {tipo === 'ubicacion' ? <label>Ubicacion<select value={p.selectedReportLocation} onChange={e => p.setSelectedReportLocation(e.target.value)}>
              {p.ubicacionesInventario.filter(u => u !== 'Componentes asignados').map(u => <option key={u}>{u}</option>)}</select></label> : null}
            {tipo === 'historial' ? <label>Equipo<select value={p.selectedReportEquipoId} onChange={e => p.setSelectedReportEquipoId(e.target.value)}>
              <option value="">Seleccione un equipo</option>{p.state.equipos.map(e => <option key={e.id} value={e.id}>{e.codigo} - {e.nombre} - {e.ubicacion}</option>)}</select></label> : null}
            {tipo === 'persona' ? <fieldset className="reports-checks"><legend>Incluir en el informe</legend>
              <label><input type="checkbox" checked={trabajos} onChange={e => setTrabajos(e.target.checked)} />Trabajos realizados</label>
              <label><input type="checkbox" checked={prestamos} onChange={e => setPrestamos(e.target.checked)} />Prestamos gestionados</label>
              <label><input type="checkbox" checked={evidencias} onChange={e => setEvidencias(e.target.checked)} />Solo trabajos con evidencia</label>
            </fieldset> : null}
            {['inventario', 'pendientes', 'prestamos', 'descartes', 'csv', 'txt'].includes(tipo) ? <p className="reports-scope">Todos los registros disponibles de {titulo.toLowerCase()}.</p> : null}
            {invalido ? <p role="alert" className="form-error">La fecha inicial debe ser anterior o igual a la fecha final.</p> : null}
          </section>
          <section className="reports-preview" aria-labelledby="report-preview-title">
            <div className="reports-preview-heading"><h3 id="report-preview-title"><b className="reports-step">3</b> Vista previa</h3>
              <div className="reports-download">
                <select aria-label="Formato de descarga" value={formato} onChange={e => setFormato(e.target.value)} disabled={tipo === 'csv' || tipo === 'txt'}>
                  <option value="excel">Excel</option><option value="pdf">PDF</option><option value="csv">CSV</option><option value="txt">TXT</option>
                </select>
                <button type="button" onClick={() => void descargar()} disabled={ocupado || invalido || faltaPersona || faltaEquipo || filas.length === 0}>
                  <Download size={17} />{ocupado ? 'Generando...' : 'Descargar ' + (tipo === 'csv' || tipo === 'txt' ? tipo.toUpperCase() : formato === 'excel' ? 'Excel' : formato.toUpperCase())}
                </button>
              </div>
            </div>
            {tipo === 'persona' && !faltaPersona ? <div className="reports-person-heading"><strong>{rol==='todos'?'Todos los técnicos':persona}</strong><p>Informe de actividades y gestiones · {p.reportStartDate} al {p.reportEndDate}</p><small>La descarga incluye encabezado institucional, nombre, período y descripción completa de cada registro.</small></div> : null}
            <div className="reports-metrics">
              {[[filas.length, 'Registros encontrados'], [new Set(filas.map(f => f.equipo)).size, 'Equipos en resultados'],
                [filas.filter(f => ['resuelto', 'cerrado', 'devuelto'].includes(f.estado)).length, 'Finalizados'],
                [filas.filter(f => ['pendiente', 'en_proceso', 'vencido', 'activo'].includes(f.estado)).length, 'En seguimiento']].map(([valor, texto]) =>
                <div key={texto}><strong>{valor}</strong><span>{texto}</span></div>)}
            </div>
            <div className="reports-table-scroll"><table><thead><tr><th>Fecha</th><th>Equipo</th><th>Detalle</th><th>Estado</th></tr></thead>
              <tbody>{filas.slice(0, 8).map((f, i) => <tr key={i}><td>{f.fecha.slice(0, 10)}</td><td>{f.equipo}</td><td>{f.detalle}</td><td><span className="reports-status">{f.estado.replace(/_/g, ' ')}</span></td></tr>)}</tbody>
            </table></div>
            {filas.length === 0 ? <p className="reports-empty"><FileText size={24} />{faltaPersona ? 'Seleccione una persona para consultar sus registros.' : faltaEquipo ? 'Seleccione un equipo para consultar su historial.' : 'No hay registros para esta seleccion.'}</p> : <p className="reports-footnote">Mostrando {Math.min(8, filas.length)} de {filas.length} registros.{formato === 'excel' && !['persona', 'prestamos'].includes(tipo) ? ' El Excel institucional incluye sus hojas y resumenes completos.' : ' La descarga incluye todos los resultados.'}</p>}
            {tipo === 'inventario' ? <button className="reports-labels" type="button" onClick={p.exportInventoryLabels}><Tags size={17} /> Descargar etiquetas para imprimir</button> : null}
            {error ? <p role="alert" className="form-error">{error}</p> : null}
          </section>
          {recientes.length > 0 ? <section className="reports-recent"><h4>Informes descargados en esta sesion</h4><div className="reports-segments">{recientes.map(r =>
            <button key={r.tipo} type="button" onClick={() => setTipo(r.tipo)}>{r.nombre}</button>)}</div></section> : null}
        </div>
      </div>
    </div>
  );
}
