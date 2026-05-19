import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileArchive,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  QrCode,
  Users,
  UserCog,
} from 'lucide-react';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { NavLink } from 'react-router-dom';

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

export function BarraLateral() {
  const { profile } = useAutenticacion();
  const items =
    profile?.role === 'admin' ? [...navItems.slice(0, 3), adminNavItem, ...navItems.slice(3)] : navItems;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <GraduationCap size={22} />
        </div>
        <div>
          <strong>AcadEvents</strong>
          <span>Control academico</span>
        </div>
      </div>
      <nav className="nav-list" aria-label="Navegacion principal">
        {items.map((item) => (
          <NavLink key={`${item.to}-${item.label}`} to={item.to} className="nav-link">
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

