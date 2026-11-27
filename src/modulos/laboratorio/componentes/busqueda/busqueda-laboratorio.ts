import type { LaboratorioState } from '@/servicios/laboratorio.servicio';

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');

const labels = {
  equipo: 'Inventario', ficha: 'Ficha técnica', trabajo: 'Trabajo de soporte',
  descarte: 'Descarte', prestamo: 'Préstamo', publico: 'Préstamo de recepción', ubicacion: 'Ubicación',
} as const;

type Tipo = keyof typeof labels;
export type ResultadoLaboratorio = { tipo: Tipo; id: string; titulo: string; detalle: string; etiqueta: string };
type Entrada = ResultadoLaboratorio & { nombre: string; texto: string; codigos: string[] };
type DatosBusqueda = Pick<LaboratorioState, 'equipos' | 'fichas' | 'bitacoras' | 'descartes' | 'prestamos'>;

export function crearIndiceLaboratorio(datos: DatosBusqueda, ubicaciones: readonly string[]): Entrada[] {
  const entrada = (tipo: Tipo, id: string, titulo: string, vista: string[], campos: string[], codigos: string[] = []): Entrada => ({
    tipo, id, titulo, detalle: vista.filter(Boolean).join(' · '), etiqueta: labels[tipo], nombre: normalize(titulo),
    texto: normalize([titulo, labels[tipo], ...vista, ...campos, ...codigos].join(' ')), codigos: codigos.filter(Boolean).map(normalize),
  });
  const equipos = new Map(datos.equipos.map(equipo => [equipo.id, equipo]));
  return [
    ...datos.equipos.map(e => entrada('equipo', e.id, e.nombre, [e.codigo, e.serie, e.ubicacion], [e.categoria, e.marcaModelo, e.estado, e.observaciones], [e.codigo, e.serie])),
    ...datos.bitacoras.map(b => entrada('trabajo', b.id, b.titulo, [b.tipoTrabajo, b.ubicacion, b.fecha],
      [b.descripcion, b.responsable, b.estado, b.prioridad, b.equipoOrigen, b.equipoDestino, b.evidenciaTitulo, equipos.get(b.equipoId)?.nombre ?? ''])),
    ...datos.fichas.map(f => entrada('ficha', f.id, f.pc, [f.ubicacion, f.fecha], [f.responsable, f.observacionGeneral,
      ...f.aplicaciones.map(a => a.nombre), ...f.caracteristicas.flatMap(c => [c.nombre, c.valor])],
    f.inventario.map(e => e.numero))),
    ...datos.descartes.map(d => entrada('descarte', d.id, d.equipo, [d.inventario, d.serie, d.ubicacion], [d.detalle, d.marca, d.modelo, d.responsable, d.fecha, d.evidenciaTitulo], [d.inventario, d.serie])),
    ...datos.prestamos.map(p => entrada(p.observaciones.startsWith('Solicitud pública.') ? 'publico' : 'prestamo',
      p.id, p.equipo, [p.entregadoA, p.estado, p.fechaPrestamo], [p.tipoBeneficiario, p.responsableEntrega])),
    ...ubicaciones.filter(u => u !== 'Todas').map(u => entrada('ubicacion', u, u, ['Ver en inventario'], [])),
  ];
}

export function buscarEnLaboratorio(indice: Entrada[], consulta: string): ResultadoLaboratorio[] {
  const query = normalize(consulta);
  if (query.length < 2) return [];
  const palabras = query.split(' ');
  return indice.flatMap(item => {
    const exacto = item.codigos.includes(query);
    const separadas = palabras.every(p => palabras.length > 1 && /^\d{1,2}$/.test(p)
      ? item.texto.split(/[^\p{L}\p{N}]+/u).includes(p)
      : item.texto.includes(p));
    if (!exacto && !separadas) return [];
    const prioridad = exacto ? 0 : item.nombre === query ? 1 : item.nombre.startsWith(query) ? 2 : item.nombre.includes(query) ? 3 : 4;
    return [{ item, prioridad }];
  }).sort((a, b) => a.prioridad - b.prioridad).map(({ item }) => item);
}

export function destinoRegistroLaboratorio(tipo: 'trabajo' | 'descarte' | 'prestamo', id: string) {
  return `lab-resultado-${tipo}-${id}`;
}
