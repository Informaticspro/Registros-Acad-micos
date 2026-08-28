export type RolAplicacion = 'propietario' | 'admin' | 'organizador' | 'scanner' | 'soporte';

export type EstadoEvento = 'draft' | 'published' | 'active' | 'closed' | 'archived';

export type EstadoAsistencia = 'present' | 'late' | 'excused';

export type JornadaAsistencia = 'matutina' | 'vespertina';

export type PerfilUsuario = {
  id: string;
  fullName: string;
  email: string;
  role: RolAplicacion;
  organizationId: string | null;
};

export type TipoCampoFormularioPersonalizado = 'text' | 'textarea' | 'email' | 'phone' | 'select' | 'radio' | 'checkbox';

export type CampoFormularioPersonalizado = {
  id: string;
  label: string;
  type: TipoCampoFormularioPersonalizado;
  required: boolean;
  helpText?: string;
  options?: string[];
};

export type ContenidoSeminarioEducacionContinua = {
  introText?: string;
  costText?: string;
  paymentText?: string;
  cancellationText?: string;
  capacityText?: string;
  considerations?: string[];
};

export type FormularioPersonalizado = {
  fields: CampoFormularioPersonalizado[];
  educationContent?: ContenidoSeminarioEducacionContinua;
};

export type EventoAcademico = {
  id: string;
  title: string;
  eventType: 'seminario' | 'congreso' | 'taller' | 'capacitacion' | 'universitario';
  registrationFormType?: 'educacion_continua' | 'seminario_general' | 'personalizado' | null;
  customFormSchema?: FormularioPersonalizado | null;
  isPermanent?: boolean;
  description: string;
  location: string;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number;
  status: EstadoEvento;
  organizerId: string;
  registrationUrl?: string;
};

export type Participante = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  documentId: string;
  institution: string;
  phone?: string;
  metadata?: Record<string, string>;
};

export type Inscripcion = {
  id: string;
  eventId: string;
  participantId: string;
  qrToken: string;
  certificateCode: string;
  checkedInAt: string | null;
  createdAt: string;
};

export type RegistroAsistencia = {
  id: string;
  eventId: string;
  registrationId: string;
  scannedBy: string;
  status: EstadoAsistencia;
  checkedInAt: string;
};

export type EstadoEquipoLaboratorio = string;

export type PrioridadLaboratorio = 'baja' | 'media' | 'alta' | 'critica';

export type EstadoTrabajoLaboratorio = 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';

export type ClaseRegistroLaboratorio = 'mantenimiento' | 'incidencia';

export type EquipoLaboratorio = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  marcaModelo: string;
  serie: string;
  ubicacion: string;
  estado: EstadoEquipoLaboratorio;
  observaciones: string;
  registradoPor: string;
  createdAt: string;
  updatedAt: string;
};

export type SeccionLaboratorio = {
  id: string;
  nombre: string;
  descripcion: string;
  createdAt: string;
  updatedAt: string;
};

export type CatalogoLaboratorio = {
  id: string;
  tipo: 'categoria_equipo' | 'estado_equipo';
  nombre: string;
  descripcion: string;
  createdAt: string;
  updatedAt: string;
};

export type AplicacionFichaLaboratorio = {
  nombre: string;
  instalada: boolean;
  observacion: string;
};

export type CaracteristicaFichaLaboratorio = {
  nombre: string;
  valor: string;
};

export type InventarioFichaLaboratorio = {
  equipo: string;
  numero: string;
};

export type AccionFichaLaboratorio = {
  fecha: string;
  accion: string;
  observacion: string;
  responsable: string;
};

export type FichaTecnicaLaboratorio = {
  id: string;
  fecha: string;
  pc: string;
  direccionIp: string;
  ubicacion: string;
  responsable: string;
  usuarioAsignado: string;
  referenciaAcceso: string;
  aplicaciones: AplicacionFichaLaboratorio[];
  caracteristicas: CaracteristicaFichaLaboratorio[];
  inventario: InventarioFichaLaboratorio[];
  acciones: AccionFichaLaboratorio[];
  observacionGeneral: string;
  createdAt: string;
  updatedAt: string;
};

export type BitacoraLaboratorio = {
  id: string;
  fecha: string;
  tipoTrabajo: string;
  titulo: string;
  descripcion: string;
  responsable: string;
  prioridad: PrioridadLaboratorio;
  estado: EstadoTrabajoLaboratorio;
  clase: ClaseRegistroLaboratorio;
  equipoId: string;
  equipoOrigen: string;
  equipoDestino: string;
  ubicacion: string;
  evidenciaTitulo: string;
  evidenciaUrl: string;
  createdAt: string;
};

export type PrestamoLaboratorio = {
  id: string;
  equipo: string;
  entregadoA: string;
  tipoBeneficiario: 'estudiante' | 'docente' | 'administrativo' | 'externo';
  documento: string;
  responsableEntrega: string;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
  estado: 'activo' | 'devuelto' | 'vencido';
  observaciones: string;
  createdAt: string;
};

export type DescarteLaboratorio = {
  id: string;
  fecha: string;
  equipoId: string;
  inventario: string;
  equipo: string;
  marca: string;
  modelo: string;
  serie: string;
  detalle: string;
  ubicacion: string;
  responsable: string;
  evidenciaTitulo: string;
  evidenciaUrl: string;
  createdAt: string;
};

export type AsignacionComponenteLaboratorio = {
  id: string;
  equipoPadreId: string;
  componenteId: string;
  tipo: 'cpu' | 'monitor' | 'teclado' | 'mouse' | 'proyector' | 'otro';
  fechaAsignacion: string;
  fechaRetiro: string | null;
  detalle: string;
  responsable: string;
  createdAt: string;
  updatedAt: string;
};
