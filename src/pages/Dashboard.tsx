import StatCard from '../components/StatCard';
import AttendanceChart from '../components/AttendanceChart';
import CalendarWidget from '../components/CalendarWidget';
import { Users, UserCheck, Loader2, IndianRupee, FileText } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { useAdminDashboardStats } from '../hooks/useAdminDashboardStats';
import DataError from '../components/DataError';

const Dashboard = () => {
  const { stats: employeeStats, initialLoadDone: empLoadDone, error: empError, refresh: refreshEmp } = useEmployees();
  const {
    invoicedAmount,
    revenueAmount,
    newEmployees,
    attendanceRate,
    attendanceData,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useAdminDashboardStats();

  const handleRefresh = () => {
    refreshEmp();
    refreshStats();
  };

  if ((empError || statsError) && !empLoadDone) {
    return (
      <div className="content-area centered">
        <DataError message={empError || statsError || 'Error loading dashboard'} onRetry={handleRefresh} />
      </div>
    );
  }

  if (!empLoadDone || statsLoading) {
    return (
      <div className="content-area centered">
        <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading dashboard statistics...</p>
      </div>
    );
  }

  return (
    <div className="content-area">
      <div className="stats-grid">
        <StatCard
          title="Total Employees"
          value={employeeStats.total.toString()}
          subtitle="Overall workforce strength"
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Weekly Revenue"
          value={`₹${revenueAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtitle="Payments collected this week"
          icon={IndianRupee}
          variant="teal"
        />
        <StatCard
          title="Weekly Invoiced"
          value={`₹${invoicedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtitle="Invoices generated this week"
          icon={FileText}
          variant="primary"
        />
        <StatCard
          title="New Onboardings"
          value={`+${newEmployees}`}
          subtitle="Employees joined this week"
          icon={UserCheck}
          variant="default"
        />
      </div>

      <div className="dashboard-grid">
        <div className="column-left">
          <div className="grid-item card">
            <div className="card-header">
              <div className="title-group">
                <h3>Attendance Report</h3>
                <p className="subtitle">Average Weekly Rate</p>
              </div>
              <div className="header-meta">
                <span className="badge">This Week</span>
              </div>
            </div>
            <div className="attendance-summary">
              <div className="summary-item">
                <span className="sum-value">{attendanceRate}%</span>
                <span className="trend-badge lime">Live</span>
              </div>
            </div>
            <AttendanceChart data={attendanceData} />
          </div>
        </div>

        <div className="column-right">
          <div className="grid-item card">
            <CalendarWidget />
          </div>

          <div className="grid-item card">
            <div className="card-header">
              <h3>Employment Status</h3>
            </div>
            <div className="status-bars">
              <div className="status-item">
                <div className="status-info">
                  <span>Full-Time</span>
                  <span>{Math.round((employeeStats.active / employeeStats.total) * 100) || 0}% - {employeeStats.active} Employees</span>
                </div>
                <div className="progress-bg"><div className="progress-fill" style={{ width: `${(employeeStats.active / employeeStats.total) * 100}%`, background: 'var(--color-teal)' }}></div></div>
              </div>
              <div className="status-item">
                <div className="status-info">
                  <span>On Leave</span>
                  <span>{Math.round((employeeStats.onLeave / employeeStats.total) * 100) || 0}% - {employeeStats.onLeave} Employees</span>
                </div>
                <div className="progress-bg"><div className="progress-fill" style={{ width: `${(employeeStats.onLeave / employeeStats.total) * 100}%`, background: 'var(--color-primary)' }}></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .content-area {
          padding: 32px 40px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          align-items: start;
        }

        .column-left, .column-right {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .grid-item.no-padding {
          padding-bottom: 0;
        }

        .padded-header {
          padding: 24px;
          padding-bottom: 0;
          border-bottom: 1px solid var(--border-color);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .title-group h3 {
           font-size: 18px;
           margin-bottom: 4px;
        }

        .title-group .subtitle {
           font-size: 12px;
           color: var(--text-muted);
        }

        .attendance-summary, .perf-summary {
           margin-bottom: 24px;
           display: flex;
           align-items: center;
           gap: 12px;
        }

        .sum-value {
           font-size: 28px;
           font-weight: 700;
           color: var(--text-primary);
        }

        .perf-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .badge, .date-badge {
          background: var(--bg-muted);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }

        .schedule-section {
          padding: 24px;
        }

        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .schedule-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .schedule-item {
          padding: 16px;
          border-radius: var(--border-radius-md);
          background: var(--bg-block);
          border-left: 4px solid transparent;
        }

        .schedule-item.primary { border-color: var(--color-primary); }
        .schedule-item.teal { border-color: var(--color-teal); }

        .item-category {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .item-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .item-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .satisfaction-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: center;
        }

        .sat-value {
          font-size: 36px;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .sat-label {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .stars {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .sat-score {
          margin-left: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .sat-trend {
          font-size: 13px;
          color: var(--text-muted);
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }

        .status-bars {
           display: flex;
           flex-direction: column;
           gap: 16px;
        }

        .status-item {
           display: flex;
           flex-direction: column;
           gap: 8px;
        }

        .status-info {
           display: flex;
           justify-content: space-between;
           font-size: 12px;
           color: var(--text-secondary);
        }

        .progress-bg {
           height: 8px;
           background: var(--bg-muted);
           border-radius: 4px;
           overflow: hidden;
        }

        .progress-fill {
           height: 100%;
           border-radius: 4px;
        }

        .trend-badge {
           font-size: 11px;
           font-weight: 600;
           padding: 4px 8px;
           border-radius: 6px;
        }

        .trend-badge.lime {
           background: var(--color-teal-light);
           color: var(--color-teal);
        }

        @media (max-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div >
  );
};

export default Dashboard;
