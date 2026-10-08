import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PortalSolicitudes, type SolicitudEquipo } from '../componentes/PortalSolicitudes';
import { registrarSolicitud } from '../solicitudes.servicio';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function PaginaSolicitudPublica() {
  const { organizationId } = useParams();
  const pendingReceipt = useRef<string | null>(null);
  if (!organizationId || !uuidPattern.test(organizationId)) return <main className="borrow-portal"><h1>Enlace de préstamos no válido</h1><p>Solicite al personal del laboratorio el enlace correcto.</p></main>;
  async function submit(solicitud: SolicitudEquipo) {
    if (!organizationId) return;
    if (!pendingReceipt.current) pendingReceipt.current = crypto.randomUUID();
    await registrarSolicitud(organizationId, solicitud, pendingReceipt.current);
    pendingReceipt.current = null;
  }
  return <div className="borrow-page" data-theme="light"><PortalSolicitudes onSubmit={submit} /></div>;
}
