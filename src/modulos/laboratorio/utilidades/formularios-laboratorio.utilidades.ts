import type {
  BitacoraLaboratorioInput,
  EquipoLaboratorioInput,
  FichaTecnicaLaboratorioInput,
  PrestamoLaboratorioInput,
} from '@/servicios/laboratorio.servicio';
import type {
  AsignacionComponenteLaboratorio,
  EstadoEquipoLaboratorio,
  EstadoTrabajoLaboratorio,
  PrioridadLaboratorio,
} from '@/tipos/dominio';
import {
  aplicacionesBase,
  caracteristicasBase,
  inventarioBase,
} from '@/modulos/laboratorio/constantes/laboratorio.constantes';

type ComponenteNuevoDraft = {
  id: string;
  tipo: AsignacionComponenteLaboratorio['tipo'];
};

function readString(data: FormData, key: string) {
  return String(data.get(key) ?? '').trim();
}

function buildBitacoraInput(form: HTMLFormElement): BitacoraLaboratorioInput {
  const data = new FormData(form);
  const equipoId = readString(data, 'equipoId');
  const equipoLabel = readString(data, 'equipoLabel');
  const tipoTrabajo = readString(data, 'tipoTrabajo');
  const clase = tipoTrabajo === 'Incidencia' ? 'incidencia' : 'mantenimiento';
  return {
    fecha: new Date(readString(data, 'fecha')).toISOString(),
    tipoTrabajo,
    titulo: readString(data, 'titulo'),
    descripcion: readString(data, 'descripcion'),
    responsable: readString(data, 'responsable'),
    prioridad: readString(data, 'prioridad') as PrioridadLaboratorio,
    estado: readString(data, 'estado') as EstadoTrabajoLaboratorio,
    clase,
    equipoId,
    equipoOrigen: readString(data, 'equipoOrigenInventario') || readString(data, 'equipoOrigen'),
    equipoDestino: equipoLabel || readString(data, 'equipoDestino'),
    ubicacion: readString(data, 'ubicacion'),
    evidenciaTitulo: readString(data, 'evidenciaTitulo'),
    evidenciaUrl: readString(data, 'evidenciaUrl'),
  };
}

function buildFichaTecnicaInput(form: HTMLFormElement): FichaTecnicaLaboratorioInput {
  const data = new FormData(form);

  return {
    fecha: new Date(readString(data, 'fecha')).toISOString(),
    pc: readString(data, 'pc'),
    direccionIp: readString(data, 'direccionIp'),
    ubicacion: readString(data, 'ubicacion'),
    responsable: readString(data, 'responsable'),
    usuarioAsignado: readString(data, 'usuarioAsignado'),
    referenciaAcceso: readString(data, 'referenciaAcceso'),
    aplicaciones: aplicacionesBase.map((nombre) => ({
      nombre,
      instalada: data.get(`app-${nombre}`) === 'on',
      observacion: readString(data, `appObs-${nombre}`),
    })),
    caracteristicas: caracteristicasBase.map((nombre) => ({
      nombre,
      valor: readString(data, `caracteristica-${nombre}`),
    })),
    inventario: inventarioBase.map((equipo) => ({
      equipo,
      numero: readString(data, `inventario-${equipo}`),
    })),
    acciones: Array.from({ length: 6 }, (_, index) => ({
      fecha: readString(data, `accionFecha-${index}`),
      accion: readString(data, `accion-${index}`),
      observacion: readString(data, `accionObs-${index}`),
      responsable: readString(data, `accionResponsable-${index}`),
    })).filter((accion) => accion.fecha || accion.accion || accion.observacion || accion.responsable),
    observacionGeneral: readString(data, 'observacionGeneral'),
  };
}

function buildEquipoInput(form: HTMLFormElement): EquipoLaboratorioInput {
  const data = new FormData(form);
  const marca = readString(data, 'marca');
  const modelo = readString(data, 'modelo');
  return {
    codigo: readString(data, 'codigo'),
    nombre: readString(data, 'nombre'),
    categoria: readString(data, 'categoria'),
    marcaModelo: [marca, modelo].filter(Boolean).join(' '),
    serie: readString(data, 'serie'),
    ubicacion: readString(data, 'ubicacion'),
    estado: readString(data, 'estado') as EstadoEquipoLaboratorio,
    observaciones: readString(data, 'observaciones'),
  };
}

function getCategoriaComponenteDesdeTipo(tipo: AsignacionComponenteLaboratorio['tipo']) {
  const labels: Record<AsignacionComponenteLaboratorio['tipo'], string> = {
    cpu: 'Computadora',
    monitor: 'Monitor',
    teclado: 'Teclado',
    mouse: 'Mouse',
    proyector: 'Proyector',
    otro: 'Accesorio',
  };
  return labels[tipo] ?? 'Accesorio';
}

function buildComponenteInput(
  data: FormData,
  equipoPadre: EquipoLaboratorioInput,
  id: string,
  tipoFallback: AsignacionComponenteLaboratorio['tipo'],
) {
  const prefix = `component-${id}`;
  const tipo = (readString(data, `${prefix}-tipo`) || tipoFallback || 'monitor') as AsignacionComponenteLaboratorio['tipo'];
  const codigo = readString(data, `${prefix}-codigo`);
  const nombre = readString(data, `${prefix}-nombre`) || `${getCategoriaComponenteDesdeTipo(tipo)} de ${equipoPadre.nombre}`;
  const marca = readString(data, `${prefix}-marca`);
  const modelo = readString(data, `${prefix}-modelo`);
  const serie = readString(data, `${prefix}-serie`);
  const detalle = readString(data, `${prefix}-detalle`);
  const hasData = Boolean(codigo || marca || modelo || serie || detalle || readString(data, `${prefix}-nombre`));

  if (!hasData) {
    throw new Error(
      `El componente ${getCategoriaComponenteDesdeTipo(tipo).toLowerCase()} esta agregado pero no tiene datos. Complete inventario/serie o quite esa tarjeta.`,
    );
  }
  if (!codigo && !serie) {
    throw new Error(`Para agregar ${getCategoriaComponenteDesdeTipo(tipo).toLowerCase()} indique numero de inventario o serie.`);
  }

  return {
    asignacionTipo: tipo,
    detalle: detalle || `${getCategoriaComponenteDesdeTipo(tipo)} registrado junto con ${equipoPadre.nombre}.`,
    equipo: {
      codigo,
      nombre,
      categoria: getCategoriaComponenteDesdeTipo(tipo),
      marcaModelo: [marca, modelo].filter(Boolean).join(' '),
      serie,
      ubicacion: equipoPadre.ubicacion,
      estado: equipoPadre.estado || 'operativo',
      observaciones: `Componente registrado inicialmente para ${equipoPadre.codigo || 'S/N'} - ${equipoPadre.nombre}.`,
    } satisfies EquipoLaboratorioInput,
  };
}

function buildComponentesInicialesInput(
  form: HTMLFormElement,
  equipoPadre: EquipoLaboratorioInput,
  drafts: ComponenteNuevoDraft[],
) {
  const data = new FormData(form);
  return drafts
    .map((draft) => buildComponenteInput(data, equipoPadre, draft.id, draft.tipo))
    .filter((item): item is NonNullable<ReturnType<typeof buildComponenteInput>> => Boolean(item));
}

function buildDescarteInput(form: HTMLFormElement, responsableSesion: string) {
  const data = new FormData(form);
  const fecha = readString(data, 'fecha');
  return {
    fecha: fecha ? new Date(`${fecha}T12:00:00`).toISOString() : new Date().toISOString(),
    equipoId: readString(data, 'equipoId'),
    inventario: readString(data, 'inventario'),
    equipo: readString(data, 'equipo'),
    marca: readString(data, 'marca'),
    modelo: readString(data, 'modelo'),
    serie: readString(data, 'serie'),
    detalle: readString(data, 'detalle'),
    ubicacion: readString(data, 'ubicacion'),
    responsable: readString(data, 'responsable') || responsableSesion,
    evidenciaTitulo: readString(data, 'evidenciaTitulo'),
    evidenciaUrl: readString(data, 'evidenciaUrl'),
  };
}

function buildSeccionInput(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    nombre: readString(data, 'nombre'),
    descripcion: readString(data, 'descripcion'),
  };
}

function buildPrestamoInput(form: HTMLFormElement): PrestamoLaboratorioInput {
  const data = new FormData(form);
  const fechaDevolucion = readString(data, 'fechaDevolucion');

  return {
    equipo: readString(data, 'equipo'),
    entregadoA: readString(data, 'entregadoA'),
    tipoBeneficiario: readString(data, 'tipoBeneficiario') as PrestamoLaboratorioInput['tipoBeneficiario'],
    documento: readString(data, 'documento'),
    responsableEntrega: readString(data, 'responsableEntrega'),
    fechaPrestamo: new Date(readString(data, 'fechaPrestamo')).toISOString(),
    fechaDevolucion: fechaDevolucion ? new Date(fechaDevolucion).toISOString() : null,
    estado: readString(data, 'estado') as PrestamoLaboratorioInput['estado'],
    observaciones: readString(data, 'observaciones'),
  };
}

export {
  buildBitacoraInput,
  buildComponenteInput,
  buildComponentesInicialesInput,
  buildDescarteInput,
  buildEquipoInput,
  buildFichaTecnicaInput,
  buildPrestamoInput,
  buildSeccionInput,
  getCategoriaComponenteDesdeTipo,
};

export type { ComponenteNuevoDraft };
