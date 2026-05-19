import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { listParticipants } from '@/services/participants.service';
import { Participant } from '@/types/domain';

export function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    void listParticipants().then(setParticipants);
  }, []);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="CRUD participantes"
        title="Participantes"
        description="Base central para asistentes, expositores, estudiantes, docentes e invitados."
        actions={
          <button className="primary-button" type="button">
            <UserPlus size={18} />
            Nuevo participante
          </button>
        }
      />
      <section className="panel">
        <div className="data-table">
          <div className="data-table-head">
            <span>Nombre</span>
            <span>Documento</span>
            <span>Institución</span>
            <span>Correo</span>
          </div>
          {participants.map((participant) => (
            <div className="data-table-row" key={participant.id}>
              <strong>{participant.firstName} {participant.lastName}</strong>
              <span>{participant.documentId}</span>
              <span>{participant.institution}</span>
              <span>{participant.email}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
