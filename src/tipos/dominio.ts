export type RolAplicacion = 'propietario' | 'admin' | 'organizador' | 'scanner';

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

export type EventoAcademico = {
  id: string;
  title: string;
  eventType: 'seminario' | 'congreso' | 'taller' | 'capacitacion' | 'universitario';
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
