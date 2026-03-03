import React from 'react';
import { type LucideIcon, MoreHorizontal } from 'lucide-react';

interface StatCardINRProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'teal' | 'default' | 'red';
  hideSymbol?: boolean;
}

const StatCardINR: React.FC<StatCardINRProps> = ({ title, value, subtitle, trend, icon: Icon, variant = 'default', hideSymbol }) => {
  return (
    <div className={`stat-card card ${variant}`}>
      <div className="card-header">
        <p className="card-title">{title}</p>
        <button className="more-btn"><MoreHorizontal size={18} /></button>
      </div>

      <div className="card-body">
        <div className="value-group">
          {!hideSymbol && <span className="currency-symbol">₹</span>}
          <h2 className="card-value">{value}</h2>
        </div>
        <div className="card-icon-wrapper">
          <Icon size={24} />
        </div>
      </div>

      <div className="card-footer">
        {trend && <span className="trend-badge">{trend}</span>}
        <p className="subtitle">{subtitle}</p>
      </div>

      <style>{`
        .stat-card {
          flex: 1;
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
          align-items: center;
          justify-content: space-between;
        }

        .value-group {
           display: flex;
           align-items: flex-start;
           gap: 4px;
        }

        .currency-symbol {
           font-size: 18px;
           font-weight: 700;
           color: var(--text-primary);
           margin-top: 4px;
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
          border-radius: 50%;
          background: var(--bg-muted);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }

        .stat-card.primary .card-icon-wrapper {
          background: var(--color-primary-light);
          color: var(--color-primary);
          border-color: transparent;
        }

        .stat-card.teal .card-icon-wrapper {
          background: var(--color-teal-light);
          color: var(--color-teal);
          border-color: transparent;
        }

        .stat-card.red .card-icon-wrapper {
          background: #FFE6E6;
          color: #FF4B4B;
          border-color: transparent;
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

export default StatCardINR;
