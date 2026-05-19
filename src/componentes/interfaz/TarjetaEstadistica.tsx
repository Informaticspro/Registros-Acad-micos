import { LucideIcon } from 'lucide-react';

type TarjetaEstadisticaProps = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
};

export function TarjetaEstadistica({ label, value, trend, icon: Icon }: TarjetaEstadisticaProps) {
  return (
    <article className="stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{trend}</small>
      </div>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
    </article>
  );
}

