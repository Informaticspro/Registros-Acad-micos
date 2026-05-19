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
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/eventos', label: 'Eventos', icon: CalendarDays },
  { to: '/participantes', label: 'Participantes', icon: Users },
  { to: '/asistencia/escanear', label: 'Escanear QR', icon: QrCode },
  { to: '/certificados', label: 'Certificados', icon: ClipboardCheck },
  { to: '/exportaciones', label: 'Exportaciones', icon: FileSpreadsheet },
  { to: '/historial', label: 'Historial', icon: FileArchive },
  { to: '/dashboard', label: 'Estadísticas', icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <GraduationCap size={22} />
        </div>
        <div>
          <strong>AcadEvents</strong>
          <span>Control académico</span>
        </div>
      </div>
      <nav className="nav-list" aria-label="Navegación principal">
        {navItems.map((item) => (
          <NavLink key={`${item.to}-${item.label}`} to={item.to} className="nav-link">
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
