import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { Link } from 'react-router-dom';
import { FormularioPrestamosOrganizacion } from './PaginaSolicitudPublica';

export function PaginaRecepcionPrestamos() {
  const { profile } = useAutenticacion();
  return <>{profile?.role !== 'recepcion' ? <div className="page-actions"><Link className="secondary-button" to="/laboratorio#prestamos">Volver a gestionar préstamos</Link></div> : null}<FormularioPrestamosOrganizacion organizationId={profile?.organizationId} /></>;
}
