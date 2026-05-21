import { useState } from 'react';
import { Bell, KeyRound, LogOut, Menu, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';

type EncabezadoProps = {
  onToggleMenu: () => void;
};

export function Encabezado({ onToggleMenu }: EncabezadoProps) {
  const { profile, signOut } = useAutenticacion();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  async function handleSignOut() {
    setIsUserMenuOpen(false);
    await signOut();
  }

  function handleAccount() {
    setIsUserMenuOpen(false);
    navigate('/mi-cuenta');
  }

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
        <div className="user-menu">
          <button
            className="user-chip"
            type="button"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsUserMenuOpen((value) => !value)}
          >
            <span>{profile?.fullName ?? 'Usuario'}</span>
            <strong>{profile?.role ?? 'admin'}</strong>
          </button>
          {isUserMenuOpen ? (
            <div className="user-menu-popover" role="menu">
              <button type="button" role="menuitem" onClick={handleAccount}>
                <KeyRound size={17} />
                Cambiar contrasena
              </button>
              <button type="button" role="menuitem" onClick={() => void handleSignOut()}>
                <LogOut size={17} />
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
