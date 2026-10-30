import type { FilaInforme, FiltrosInforme } from './informes.modelo';

export type ContextoPersona = Pick<FiltrosInforme, 'persona' | 'rol' | 'desde' | 'hasta' | 'trabajos' | 'prestamos' | 'evidencias'>;
export const columnasPersona = ['N.º', 'Fecha y hora', 'Tipo de registro', 'Equipo / inventario', 'Ubicación', 'Actividad y trabajo realizado', 'Estado', 'Responsable / solicitante', 'Evidencia / referencia'];

export function diaInforme(fecha: string) {
  if (!fecha.includes('T')) return fecha.slice(0, 10);
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)?.value).join('-');
}

function fechaPeriodo(fecha: string) { return fecha ? fecha.split('-').reverse().join('/') : 'Sin límite'; }
function fechaHora(fecha: string) {
  if (!fecha.includes('T')) return fechaPeriodo(fecha);
  return new Intl.DateTimeFormat('es-PA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(fecha));
}
export function encabezadoPersona(contexto: ContextoPersona, filas: FilaInforme[], emitido = new Date()) {
  const persona = contexto.rol === 'todos' ? 'Todos los técnicos' : contexto.persona.trim();
  const etiqueta = contexto.rol === 'beneficiario' ? 'Solicitante / beneficiario' : 'Técnico responsable';
  const titulo = contexto.rol === 'beneficiario' ? 'REGISTRO DE PRÉSTAMOS POR SOLICITANTE' : 'INFORME DE ACTIVIDADES Y GESTIONES';
  return [
    'UNIVERSIDAD AUTÓNOMA DE CHIRIQUÍ',
    'FACULTAD DE ECONOMÍA · SECCIÓN DE TECNOLOGÍA',
    titulo,
    `${etiqueta}: ${persona.toLocaleUpperCase('es-PA')}`,
    `Período: ${fechaPeriodo(contexto.desde)} al ${fechaPeriodo(contexto.hasta)}`,
    `Incluye: ${[contexto.trabajos && contexto.rol !== 'beneficiario' ? 'Trabajos técnicos' : '', contexto.prestamos ? (contexto.rol === 'beneficiario' ? 'Préstamos recibidos' : 'Préstamos gestionados') : '', contexto.evidencias ? 'Solo trabajos con evidencia' : ''].filter(Boolean).join(' · ')}`,
    `Total de registros: ${filas.length} · Trabajos técnicos: ${filas.filter(f => f.tipo === 'Trabajo técnico').length} · Préstamos: ${filas.filter(f => f.tipo === 'Préstamo').length}`,
    `Nexus FADECO · Emitido: ${fechaHora(emitido.toISOString())} (hora de Panamá)`,
  ];
}
export function celdasPersona(filas: FilaInforme[]) {
  const estados: Record<string,string> = { cerrado: 'Finalizado', resuelto: 'Resuelto, pendiente de cierre', pendiente: 'Pendiente', en_proceso: 'En proceso', devuelto: 'Devuelto', activo: 'En préstamo', vencido: 'Vencido' };
  return filas.map((fila,index) => [index+1, fechaHora(fila.fecha), fila.tipoTrabajo || fila.tipo || 'Registro',
    [fila.equipo, fila.inventario ? `Inventario: ${fila.inventario}` : ''].filter(Boolean).join('\n'),
    fila.ubicacion || 'No registrada', [fila.detalle, fila.descripcion].filter(Boolean).join('\n\n'),
    estados[fila.estado] || fila.estado,
    [fila.responsable ? `Responsable: ${fila.responsable}` : '', fila.beneficiario ? `Solicitante: ${fila.beneficiario}` : ''].filter(Boolean).join('\n') || 'No registrado',
    fila.evidencia || 'Sin evidencia registrada',
  ]);
}
export function nombreArchivoPersona(contexto: ContextoPersona) {
  const persona = contexto.rol === 'todos' ? 'todos-los-tecnicos' : contexto.persona;
  const slug = persona.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80) || 'persona';
  return `informe-actividades-${slug}-${contexto.desde || 'inicio'}-a-${contexto.hasta || 'hoy'}`;
}

export async function crearLibroPersona(filas: FilaInforme[], contexto: ContextoPersona) {
  const { utils } = await import('xlsx-js-style');
  const encabezado = encabezadoPersona(contexto, filas);
  const datos = celdasPersona(filas);
  const rows = [...encabezado.map(text => [text]), [], columnasPersona, ...datos, [], [`TOTAL DE REGISTROS: ${filas.length}`]];
  const hoja = utils.aoa_to_sheet(rows);
  const widths = [6, 23, 25, 25, 23, 76, 26, 32, 38];
  hoja['!cols'] = widths.map(wch => ({ wch }));
  hoja['!merges'] = [...encabezado.map((_,r)=>({s:{r,c:0},e:{r,c:8}})),{s:{r:rows.length-1,c:0},e:{r:rows.length-1,c:8}}];
  const heights = [26,23,28,27,22,22,23,21,9,32,...datos.map(row => Math.min(409,Math.max(45,...row.map((value,c) => String(value).split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/Math.max(1,widths[c]-3))),0)*15+12)))),10,25];
  hoja['!rows'] = heights.map(hpt => ({ hpt }));
  for (let r=0;r<rows.length;r++) for(let c=0;c<9;c++) {
    const address = utils.encode_cell({r,c});
    const cell = hoja[address] ?? { t:'s', v:'' };
    cell.s = {
      font: { name:'Calibri', sz:r===2?16:r===3?13:11, bold:r<4||r===9||r===rows.length-1, color:{rgb:r<2||r===9?'FFFFFF':'17352B'} },
      alignment: { vertical:'top', horizontal:r<3?'center':'left', wrapText:true },
      fill: { fgColor:{rgb:r<2||r===9?'116448':r<4||r===rows.length-1?'E4F2EB':r>=10&&r<10+datos.length&&r%2===0?'F3F7F5':'FFFFFF'} },
      ...(r>=9&&r<10+datos.length ? { border: { top:{style:'thin',color:{rgb:'D7E3DD'}},bottom:{style:'thin',color:{rgb:'D7E3DD'}},left:{style:'thin',color:{rgb:'D7E3DD'}},right:{style:'thin',color:{rgb:'D7E3DD'}} } } : {}),
    };
    hoja[address]=cell;
  }
  hoja['!autofilter']={ ref:`A10:I${Math.max(10,10+datos.length)}` };
  hoja['!margins']={ left:0.25,right:0.25,top:0.4,bottom:0.4,header:0.2,footer:0.2 };
  const libro = utils.book_new();
  utils.book_append_sheet(libro,hoja,'Informe');
  libro.Props={Title:`Informe de actividades · ${contexto.rol==='todos'?'Todos los técnicos':contexto.persona}`,Author:'Nexus FADECO',Company:'UNACHI · Facultad de Economía'};
  libro.Workbook={Names:[{Name:'_xlnm.Print_Titles',Sheet:0,Ref:"'Informe'!$10:$10"},{Name:'_xlnm.Print_Area',Sheet:0,Ref:`'Informe'!$A$1:$I$${rows.length}`}]};
  return libro;
}
