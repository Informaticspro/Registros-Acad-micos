import type { LaboratorioState } from '@/servicios/laboratorio.servicio';
import { celdasPersona, columnasPersona, crearLibroPersona, diaInforme, encabezadoPersona, nombreArchivoPersona, type ContextoPersona } from './informe-persona';

export type TipoInforme = 'inventario' | 'mensual' | 'rango' | 'ubicacion' | 'historial' | 'pendientes' | 'prestamos' | 'descartes' | 'persona' | 'csv' | 'txt';
export const gruposInformes: { titulo: string; opciones: [TipoInforme, string][] }[] = [
  { titulo: 'Inventario', opciones: [['inventario', 'Inventario general'], ['ubicacion', 'Por ubicacion'], ['historial', 'Historial por equipo']] },
  { titulo: 'Resumenes', opciones: [['mensual', 'Mensual'], ['rango', 'Mantenimiento por fechas']] },
  { titulo: 'Seguimiento', opciones: [['pendientes', 'Pendientes tecnicos'], ['prestamos', 'Prestamos activos y vencidos'], ['descartes', 'Descartes']] },
  { titulo: 'Personas', opciones: [['persona', 'Por persona']] },
  { titulo: 'Otros formatos', opciones: [['csv', 'Base completa (CSV)'], ['txt', 'Resumen rapido (TXT)']] },
];
export type FilaInforme = { fecha: string; equipo: string; detalle: string; estado: string; tipo?: string; tipoTrabajo?: string; descripcion?: string; inventario?: string; ubicacion?: string; responsable?: string; beneficiario?: string; evidencia?: string };
export function normalizarPersona(value: string) { return value.trim().replace(/\s+/g,' ').toLocaleLowerCase('es-PA'); }
export type FiltrosInforme = {
  tipo: TipoInforme; desde: string; hasta: string; mes: string; ubicacion: string; equipoId: string;
  persona: string; rol: 'tecnico' | 'beneficiario' | 'todos';
  trabajos: boolean; prestamos: boolean; evidencias: boolean;
};

export function obtenerFilasInforme(state: LaboratorioState, f: FiltrosInforme): FilaInforme[] {
  const dentro = (fecha: string) => {
    const dia = diaInforme(fecha);
    return f.tipo === 'mensual' ? dia.startsWith(f.mes) : (!f.desde || dia >= f.desde) && (!f.hasta || dia <= f.hasta);
  };
  const equipos = new Map(state.equipos.map(e => [e.id, e]));
  if (f.tipo === 'inventario' || f.tipo === 'ubicacion') {
    return state.equipos.filter(e => f.tipo !== 'ubicacion' || f.ubicacion === 'Todas' || e.ubicacion === f.ubicacion)
      .map(e => ({ fecha: e.updatedAt, equipo: e.nombre, detalle: [e.codigo, e.marcaModelo, e.serie, e.ubicacion].filter(Boolean).join(' | '), estado: e.estado }));
  }
  if (f.tipo === 'descartes') return state.descartes.map(d => ({ fecha: d.fecha, equipo: d.equipo, detalle: d.detalle, estado: 'Descartado' }));
  const bitacoras = state.bitacoras.filter(b => {
    if (f.tipo === 'historial') return Boolean(f.equipoId) && b.equipoId === f.equipoId;
    if (f.tipo === 'pendientes') return b.estado === 'pendiente' || b.estado === 'en_proceso';
    if (['mensual', 'rango', 'persona'].includes(f.tipo) && !dentro(b.fecha)) return false;
    if (f.tipo === 'persona') return f.trabajos && f.rol !== 'beneficiario' && (f.rol === 'todos' || Boolean(f.persona) && normalizarPersona(b.responsable) === normalizarPersona(f.persona)) && (!f.evidencias || Boolean(b.evidenciaUrl || b.evidenciaTitulo));
    return true;
  }).map(b => ({ fecha: b.fecha, equipo: equipos.get(b.equipoId)?.nombre || b.equipoDestino || 'S/N', detalle: b.titulo, estado: b.estado,
    tipo:'Trabajo técnico',tipoTrabajo:b.tipoTrabajo,descripcion:b.descripcion,inventario:equipos.get(b.equipoId)?.codigo,
    ubicacion:b.ubicacion || equipos.get(b.equipoId)?.ubicacion,responsable:b.responsable,evidencia:[b.evidenciaTitulo,b.evidenciaUrl].filter(Boolean).join(' · '),
  }));
  const prestamos = state.prestamos.filter(p => {
    if (f.tipo === 'prestamos' || f.tipo === 'pendientes') return p.estado !== 'devuelto';
    if (f.tipo === 'persona') return f.prestamos && dentro(p.fechaPrestamo) && (f.rol === 'todos' || Boolean(f.persona) && normalizarPersona(f.rol === 'beneficiario' ? p.entregadoA : p.responsableEntrega) === normalizarPersona(f.persona));
    if (f.tipo === 'mensual') return dentro(p.fechaPrestamo);
    return false;
  }).map(p => ({ fecha: p.fechaPrestamo, equipo: p.equipo, detalle: 'Prestamo a ' + p.entregadoA, estado: p.estado,
    tipo:'Préstamo',tipoTrabajo:'Gestión de préstamo',descripcion:[p.observaciones,p.fechaDevolucion ? `Devuelto: ${p.fechaDevolucion}` : ''].filter(Boolean).join('\n'),responsable:p.responsableEntrega,beneficiario:p.entregadoA,
  }));
  return (f.tipo === 'prestamos' ? prestamos : [...bitacoras, ...prestamos]).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function descargarVistaInforme(filas: FilaInforme[], titulo: string, formato: string, contexto?: ContextoPersona) {
  const filename = contexto ? nombreArchivoPersona(contexto) : 'informe-laboratorio';
  if (contexto && formato === 'excel') {
    const libro = await crearLibroPersona(filas,contexto);
    const { writeFile } = await import('xlsx-js-style');
    writeFile(libro,`${filename}.xlsx`);
    return;
  }
  const datos = filas.map(f => ({ Fecha: f.fecha.slice(0, 10), Equipo: f.equipo, Detalle: f.detalle, Estado: f.estado }));
  if (formato === 'excel') {
    const { utils, writeFile } = await import('xlsx');
    const libro = utils.book_new();
    const hoja = utils.json_to_sheet(datos);
    hoja['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 85 }, { wch: 20 }];
    utils.book_append_sheet(libro, hoja, 'Informe');
    writeFile(libro, 'informe-laboratorio.xlsx');
    return;
  }
  if (formato === 'pdf') {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    let y = 20;
    pdf.setFontSize(16); pdf.text(titulo, 14, y); y += 12; pdf.setFontSize(10);
    if (contexto) {
      const escribir = (text: string) => {
        for(const line of pdf.splitTextToSize(text,180) as string[]) {
          if(y>278) { pdf.addPage(); y=20; pdf.setFontSize(10); }
          pdf.text(line,14,y); y+=5;
        }
      };
      encabezadoPersona(contexto,filas).forEach(escribir); y+=6;
      for(const row of celdasPersona(filas)) { row.forEach((value,index)=>escribir(`${columnasPersona[index]}: ${value}`)); y+=6; }
      pdf.save(`${filename}.pdf`); return;
    }
    for (const f of datos) {
      const lineas = pdf.splitTextToSize(Object.values(f).join(' | '), 180) as string[];
      for (const linea of lineas) {
        if (y > 278) { pdf.addPage(); y = 20; }
        pdf.text(linea, 14, y); y += 5;
      }
      y += 4;
    }
    pdf.save('informe-laboratorio.pdf');
    return;
  }
  const { utils } = await import('xlsx');
  const texto = contexto ? (formato === 'csv'
    ? utils.sheet_to_csv(utils.aoa_to_sheet([...encabezadoPersona(contexto,filas).map(text=>[text]),[],columnasPersona,...celdasPersona(filas)]))
    : encabezadoPersona(contexto,filas).join('\n')+'\n\n'+celdasPersona(filas).map(row=>row.map((value,index)=>`${columnasPersona[index]}: ${value}`).join('\n')).join('\n\n'))
    : formato === 'csv' ? utils.sheet_to_csv(utils.json_to_sheet(datos)) : titulo + '\n\n' + datos.map(d => Object.values(d).join(' | ')).join('\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', texto], { type: formato === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' }));
  const enlace = document.createElement('a'); enlace.href = url; enlace.download = filename + '.' + formato;
  enlace.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
