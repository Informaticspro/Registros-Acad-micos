import { AcademicEvent, AttendanceRecord, Participant, Registration } from '@/types/domain';

export const mockEvents: AcademicEvent[] = [
  {
    id: 'evt-001',
    title: 'Congreso Internacional de Innovación Educativa',
    eventType: 'congreso',
    description: 'Encuentro académico sobre investigación, docencia y transformación digital.',
    location: 'Auditorio Central',
    startsAt: '2026-06-12T08:00:00-05:00',
    endsAt: '2026-06-14T17:00:00-05:00',
    capacity: 420,
    status: 'published',
    organizerId: 'demo-admin',
  },
  {
    id: 'evt-002',
    title: 'Taller de Metodologías de Investigación',
    eventType: 'taller',
    description: 'Sesión práctica para formulación de proyectos y análisis de datos.',
    location: 'Laboratorio 3B',
    startsAt: '2026-05-28T14:00:00-05:00',
    endsAt: '2026-05-28T18:00:00-05:00',
    capacity: 60,
    status: 'active',
    organizerId: 'demo-admin',
  },
  {
    id: 'evt-003',
    title: 'Seminario de Ética en Inteligencia Artificial',
    eventType: 'seminario',
    description: 'Conferencias breves y mesa de discusión con docentes invitados.',
    location: 'Salón de Postgrado',
    startsAt: '2026-07-04T09:00:00-05:00',
    endsAt: '2026-07-04T12:30:00-05:00',
    capacity: 120,
    status: 'draft',
    organizerId: 'demo-admin',
  },
];

export const mockParticipants: Participant[] = [
  {
    id: 'par-001',
    firstName: 'María',
    lastName: 'González',
    email: 'maria.gonzalez@universidad.edu',
    documentId: '8-888-111',
    institution: 'Universidad Nacional',
    phone: '+507 6000-0001',
  },
  {
    id: 'par-002',
    firstName: 'Carlos',
    lastName: 'Rivera',
    email: 'carlos.rivera@instituto.edu',
    documentId: '8-888-112',
    institution: 'Instituto Superior',
    phone: '+507 6000-0002',
  },
  {
    id: 'par-003',
    firstName: 'Ana',
    lastName: 'Torres',
    email: 'ana.torres@campus.edu',
    documentId: '8-888-113',
    institution: 'Centro Regional',
  },
];

export const mockRegistrations: Registration[] = [
  {
    id: 'reg-001',
    eventId: 'evt-001',
    participantId: 'par-001',
    qrToken: 'ACAD-EVT001-REG001',
    certificateCode: 'CERT-2026-001',
    checkedInAt: null,
    createdAt: '2026-05-10T10:00:00-05:00',
  },
  {
    id: 'reg-002',
    eventId: 'evt-002',
    participantId: 'par-002',
    qrToken: 'ACAD-EVT002-REG002',
    certificateCode: 'CERT-2026-002',
    checkedInAt: '2026-05-28T14:07:00-05:00',
    createdAt: '2026-05-11T11:00:00-05:00',
  },
];

export const mockAttendance: AttendanceRecord[] = [
  {
    id: 'att-001',
    eventId: 'evt-002',
    registrationId: 'reg-002',
    scannedBy: 'demo-admin',
    status: 'present',
    checkedInAt: '2026-05-28T14:07:00-05:00',
  },
];
