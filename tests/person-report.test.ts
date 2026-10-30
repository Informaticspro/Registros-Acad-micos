import { expect, test } from 'vitest';
import { read, write } from 'xlsx-js-style';
import { crearLibroPersona, nombreArchivoPersona, type ContextoPersona } from '../src/modulos/laboratorio/componentes/informes/informe-persona';
import { obtenerFilasInforme, type FiltrosInforme } from '../src/modulos/laboratorio/componentes/informes/informes.modelo';
import { emptyState } from '../src/modulos/laboratorio/constantes/laboratorio.constantes';
import type { BitacoraLaboratorio, EquipoLaboratorio } from '../src/tipos/dominio';

const contexto: ContextoPersona={persona:'José Acosta',rol:'tecnico',desde:'2026-10-01',hasta:'2026-10-30',trabajos:true,prestamos:true,evidencias:false};
const descripcion='Se instaló Visual Studio Code a solicitud de la profesora. Se comprobó la apertura del programa y la ejecución del proyecto.';

test('the delivered workbook identifies its owner and period, labels columns and retains complete work details', async () => {
  const libro=await crearLibroPersona([{fecha:'2026-10-22T16:30:00Z',equipo:'EST 01',inventario:'51251',ubicacion:'Laboratorio 2',detalle:'Instalación de software · Visual Studio Code',descripcion,estado:'cerrado',tipo:'Trabajo técnico',tipoTrabajo:'Instalación de software',responsable:'José Acosta'}],contexto);
  const hoja=libro.Sheets.Informe;
  expect(hoja.A1.v).toBe('UNIVERSIDAD AUTÓNOMA DE CHIRIQUÍ');
  expect(hoja.A4.v).toBe('Técnico responsable: JOSÉ ACOSTA');
  expect(hoja.A5.v).toContain('01/10/2026 al 30/10/2026');
  expect(hoja.B10.v).toBe('Fecha y hora');
  expect(hoja.F10.v).toBe('Actividad y trabajo realizado');
  expect(hoja.F11.v).toContain(descripcion);
  expect(hoja.D11.v).toContain('51251');
  expect(hoja.E11.v).toBe('Laboratorio 2');
  expect(hoja.G11.v).toBe('Finalizado');
  expect(hoja.F11.s.alignment.wrapText).toBe(true);
  expect(hoja.A10.s.fill.fgColor.rgb).toBe('116448');
  expect(nombreArchivoPersona(contexto)).toBe('informe-actividades-jose-acosta-2026-10-01-a-2026-10-30');
  const delivered=read(write(libro,{type:'buffer',bookType:'xlsx'}),{type:'buffer',cellStyles:true});
  expect(delivered.Sheets.Informe.F11.v).toContain(descripcion);
  expect(delivered.Sheets.Informe['!autofilter']?.ref).toBe('A10:I11');
  expect(delivered.Workbook?.Names).toEqual(expect.arrayContaining([expect.objectContaining({Name:'_xlnm.Print_Titles',Ref:"'Informe'!$10:$10"})]));
});

test('person filtering uses Panama calendar dates and tolerates capitalization without including another technician', () => {
  const trabajos=[
    {fecha:'2026-10-01T02:00:00Z',responsable:'José Acosta',titulo:'Fuera del período'},
    {fecha:'2026-10-31T04:59:00Z',responsable:' josé acosta ',titulo:'Última actividad del día',descripcion},
    {fecha:'2026-10-20T12:00:00Z',responsable:'Otro técnico',titulo:'Otra persona'},
  ].map(item=>({...item,equipoId:'pc',estado:'cerrado'})) as BitacoraLaboratorio[];
  const filtros: FiltrosInforme={...contexto,tipo:'persona',mes:'2026-10',equipoId:'',ubicacion:'Todas'};
  const filas=obtenerFilasInforme({...emptyState,equipos:[{id:'pc',nombre:'EST 01',codigo:'51251',ubicacion:'Laboratorio 2'} as EquipoLaboratorio],bitacoras:trabajos},filtros);
  expect(filas.map(f=>f.detalle)).toEqual(['Última actividad del día']);
  expect(filas[0].descripcion).toBe(descripcion);
});
