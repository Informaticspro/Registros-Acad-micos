import { useEffect, useState } from 'react';
import { RefreshCw, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { listParticipants } from '@/services/participants.service';
import { Participant } from '@/types/domain';
import { getErrorMessage } from '@/utils/errors';

export function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadParticipants() {
    setIsLoading(true);
    setError(null);
    try {
      setParticipants(await listParticipants());
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los participantes'));
    } finally {
      setIsLoading(false);
    }
  }

  function getExtraData(participant: Participant) {
    const metadata = participant.metadata ?? {};
    const values = [
      metadata.sex ? `Sexo: ${metadata.sex}` : null,
      metadata.category ? `Categoria: ${metadata.category}` : null,
      metadata.personalEmail ? `Correo P.: ${metadata.personalEmail}` : null,
      metadata.nationality ? `Nacionalidad: ${metadata.nationality}` : null,
      metadata.modality ? `Modalidad: ${metadata.modality}` : null,
      metadata.participationType ? `Participacion: ${metadata.participationType}` : null,
    ].filter(Boolean);

    return values.length > 0 ? values.join(' | ') : 'Registro simple';
  }

  useEffect(() => {
    void loadParticipants();
  }, []);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="CRUD participantes"
        title="Participantes"
        description="Base central para asistentes, expositores, estudiantes, docentes e invitados."
        actions={
          <>
            <button className="secondary-button" type="button" onClick={() => void loadParticipants()}>
              <RefreshCw size={18} />
              Actualizar
            </button>
            <button className="primary-button" type="button">
              <UserPlus size={18} />
              Nuevo participante
            </button>
          </>
        }
      />
      <section className="panel">
        {error ? <p className="form-error">{error}</p> : null}
        {isLoading ? <p className="form-hint">Cargando participantes...</p> : null}
        {!isLoading && !error && participants.length === 0 ? (
          <p className="form-hint">Todavia no hay participantes registrados.</p>
        ) : null}
        <div className="data-table">
          <div className="data-table-head">
            <span>Nombre</span>
            <span>Documento</span>
            <span>Correo</span>
            <span>Datos del registro</span>
          </div>
          {participants.map((participant) => (
            <div className="data-table-row" key={participant.id}>
              <strong>
                {participant.firstName} {participant.lastName}
              </strong>
              <span>{participant.documentId}</span>
              <span>{participant.email}</span>
              <span>{getExtraData(participant)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
