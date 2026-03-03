import { MoreHorizontal, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'teal' | 'default';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, trend, icon: Icon, variant = 'default' }) => {
  return (
    <div className={`stat-card card ${variant}`}>
      <div className="card-header">
        <p className="card-title">{title}</p>
        <button className="more-btn"><MoreHorizontal size={18} /></button>
      </div>

      <div className="card-body">
        <h2 className="card-value">{value}</h2>
        <div className="card-icon-wrapper">
          <Icon size={24} />
        </div>
      </div>

      <div className="card-footer">
        <p className="subtitle">{subtitle}</p>
        {trend && <span className="trend-badge">{trend}</span>}
      </div>

      <style>{`
        .stat-card {
          flex: 1;
          min-width: 240px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: var(--bg-card);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-title {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .more-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .card-body {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }

        .card-value {
          font-size: 32px;
          color: var(--text-primary);
          font-weight: 700;
        }

        .card-icon-wrapper {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--border-radius-md);
          background: var(--bg-muted);
          color: var(--text-secondary);
        }

        .stat-card.primary .card-icon-wrapper {
          background: var(--color-primary-light);
          color: var(--color-primary);
        }

        .stat-card.teal .card-icon-wrapper {
          background: var(--color-teal-light);
          color: var(--color-teal);
        }

        .card-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
        }

        .subtitle {
          font-size: 12px;
          color: var(--text-muted);
        }

        .trend-badge {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-teal);
          background: var(--color-teal-light);
          padding: 2px 8px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default StatCard;
