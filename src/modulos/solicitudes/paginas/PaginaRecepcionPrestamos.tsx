import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { FormularioPrestamosOrganizacion } from './PaginaSolicitudPublica';

export function PaginaRecepcionPrestamos() {
  const { profile } = useAutenticacion();
  return <FormularioPrestamosOrganizacion organizationId={profile?.organizationId} />;
}
