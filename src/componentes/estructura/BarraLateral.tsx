import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileArchive,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  QrCode,
  Users,
  UserCog,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';

type BarraLateralProps = {
  isCollapsed: boolean;
  onNavigate: () => void;
  onToggle: () => void;
};

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/eventos', label: 'Eventos', icon: CalendarDays },
  { to: '/participantes', label: 'Participantes', icon: Users },
  { to: '/asistencia/escanear', label: 'Escanear QR', icon: QrCode },
  { to: '/certificados', label: 'Certificados', icon: ClipboardCheck },
  { to: '/exportaciones', label: 'Exportaciones', icon: FileSpreadsheet },
  { to: '/historial', label: 'Historial', icon: FileArchive },
  { to: '/dashboard', label: 'Estadisticas', icon: BarChart3 },
];

const adminNavItem = { to: '/usuarios', label: 'Usuarios', icon: UserCog };

export function BarraLateral({ isCollapsed, onNavigate, onToggle }: BarraLateralProps) {
  const { profile } = useAutenticacion();
  const items =
    profile?.role === 'scanner'
      ? navItems.filter((item) => item.to === '/asistencia/escanear')
      : profile?.role === 'admin'
        ? [...navItems.slice(0, 3), adminNavItem, ...navItems.slice(3)]
        : navItems;

  return (
    <aside className="sidebar" aria-label="Menu principal">
      <div className="brand">
        <div className="brand-mark">
          <GraduationCap size={22} />
        </div>
        <div className="brand-copy">
          <strong>AcadEvents</strong>
          <span>Control academico</span>
        </div>
      </div>
      <button
        className="sidebar-toggle"
        type="button"
        aria-label={isCollapsed ? 'Mostrar menu' : 'Ocultar menu'}
        onClick={onToggle}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
      <nav className="nav-list" aria-label="Navegacion principal">
        {items.map((item) => (
          <NavLink
            key={`${item.to}-${item.label}`}
            to={item.to}
            className="nav-link"
            title={item.label}
            onClick={onNavigate}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
