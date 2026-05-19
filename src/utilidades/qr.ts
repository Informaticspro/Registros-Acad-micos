const PREFIX = 'ACAD';

export type ParticipanteQrPayload = {
  eventId: string;
  qrToken: string;
  documentId: string;
};

export function buildParticipanteQrPayload(payload: ParticipanteQrPayload): string {
  return [PREFIX, payload.eventId, payload.qrToken, payload.documentId].join('|');
}

export function parseParticipanteQrPayload(raw: string): ParticipanteQrPayload | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(`${PREFIX}|`)) return null;

  const parts = trimmed.split('|');
  if (parts.length !== 4) return null;

  const [, eventId, qrToken, documentId] = parts;
  if (!eventId || !qrToken || !documentId) return null;

  return { eventId, qrToken, documentId };
}

export function extractQrLookupValue(raw: string): string {
  const parsed = parseParticipanteQrPayload(raw);
  if (parsed) return parsed.qrToken;
  return raw.trim();
}

