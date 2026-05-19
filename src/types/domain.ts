export type AppRole = 'admin' | 'organizador' | 'scanner';

export type EventStatus = 'draft' | 'published' | 'active' | 'closed' | 'archived';

export type AttendanceStatus = 'present' | 'late' | 'excused';

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  organizationId: string | null;
};

export type AcademicEvent = {
  id: string;
  title: string;
  eventType: 'seminario' | 'congreso' | 'taller' | 'capacitacion' | 'universitario';
  description: string;
  location: string;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number;
  status: EventStatus;
  organizerId: string;
  registrationUrl?: string;
};

export type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  documentId: string;
  institution: string;
  phone?: string;
};

export type Registration = {
  id: string;
  eventId: string;
  participantId: string;
  qrToken: string;
  certificateCode: string;
  checkedInAt: string | null;
  createdAt: string;
};

export type AttendanceRecord = {
  id: string;
  eventId: string;
  registrationId: string;
  scannedBy: string;
  status: AttendanceStatus;
  checkedInAt: string;
};
