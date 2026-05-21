import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

type TarjetaEstadisticaProps = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  to: string;
};

export function TarjetaEstadistica({ label, value, trend, icon: Icon, to }: TarjetaEstadisticaProps) {
  return (
    <Link className="stat-card" to={to}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{trend}</small>
      </div>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
    </Link>
  );
}
