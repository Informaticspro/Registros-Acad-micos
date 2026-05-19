import { Bell, Menu, Search } from 'lucide-react';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';

type EncabezadoProps = {
  onToggleMenu: () => void;
};

export function Encabezado({ onToggleMenu }: EncabezadoProps) {
  const { profile } = useAutenticacion();

  return (
    <header className="topbar">
      <button className="icon-button menu-button" type="button" aria-label="Mostrar u ocultar menu" onClick={onToggleMenu}>
        <Menu size={19} />
      </button>
      <div className="search-box">
        <Search size={18} />
        <input aria-label="Buscar" placeholder="Buscar evento, participante o asistencia" />
      </div>
      <div className="topbar-actions">
        <button className="icon-button" aria-label="Notificaciones">
          <Bell size={18} />
        </button>
        <div className="user-chip">
          <span>{profile?.fullName ?? 'Usuario'}</span>
          <strong>{profile?.role ?? 'admin'}</strong>
        </div>
      </div>
    </header>
  );
}
