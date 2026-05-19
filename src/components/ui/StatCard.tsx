import { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, trend, icon: Icon }: StatCardProps) {
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
