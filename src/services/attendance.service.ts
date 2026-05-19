import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/env';
import { mockAttendance, mockRegistrations } from '@/data/mockData';
import { AttendanceRecord } from '@/types/domain';

type RegistrationRow = {
  id: string;
  event_id: string;
  participant_id: string;
  qr_token: string;
  certificate_code: string;
  checked_in_at: string | null;
  created_at: string;
};

type AttendanceRow = {
  id: string;
  event_id: string;
  registration_id: string;
  scanned_by: string;
  status: string;
  checked_in_at: string;
};

export async function verifyQrToken(qrToken: string) {
  if (!supabase && isDemoMode()) {
    const registration = mockRegistrations.find((item) => item.qrToken === qrToken);
    return registration ? { valid: true, registration } : { valid: false, registration: null };
  }
  if (!supabase) return { valid: false, registration: null };

  const { data, error } = await supabase
    .from('registrations')
    .select('id,event_id,participant_id,qr_token,certificate_code,checked_in_at,created_at')
    .eq('qr_token', qrToken)
    .single<RegistrationRow>();

  if (error) return { valid: false, registration: null };

  return {
    valid: true,
    registration: {
      id: data.id,
      eventId: data.event_id,
      participantId: data.participant_id,
      qrToken: data.qr_token,
      certificateCode: data.certificate_code,
      checkedInAt: data.checked_in_at,
      createdAt: data.created_at,
    },
  };
}

export async function listAttendance(): Promise<AttendanceRecord[]> {
  if (!supabase && isDemoMode()) return mockAttendance;
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('attendance_records')
    .select('id,event_id,registration_id,scanned_by,status,checked_in_at')
    .order('checked_in_at', { ascending: false })
    .returns<AttendanceRow[]>();

  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    registrationId: row.registration_id,
    scannedBy: row.scanned_by,
    status: row.status as AttendanceRecord['status'],
    checkedInAt: row.checked_in_at,
  }));
}
