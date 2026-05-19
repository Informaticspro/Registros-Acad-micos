import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { env } from '@/infraestructura/entorno';

export function RedireccionRegistroEvento() {
  const { eventId } = useParams();
  const path = eventId ? `/eventos/${eventId}/registro` : '/login';
  const targetUrl = `${env.publicAppUrl}${path}`;

  useEffect(() => {
    if (!eventId) return;
    window.location.replace(targetUrl);
  }, [eventId, targetUrl]);

  if (!eventId) return <Navigate to="/login" replace />;

  return <div className="screen-loader">Redirigiendo al registro publico...</div>;
}
