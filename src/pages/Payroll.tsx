import React, { useState, useMemo } from 'react';
import StatCardINR from '../components/StatCardINR.tsx';
import { usePayroll, type PayrollRecord } from '../hooks/usePayroll';
import {
    IndianRupee,
    CreditCard,
    TrendingDown,
    Download,
    Search,
    X,
    Mail,
    FileText,
    Printer,
    AlertTriangle,
    RefreshCw,
    CheckCircle2
} from 'lucide-react';
import PayslipTemplate, { buildPayslipData } from '../components/PayslipTemplate';
import DataError from '../components/DataError';

const Payroll: React.FC = () => {
    const today = new Date();
    // Default to prior month (if it's March, show Feb default)
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // YYYY-MM formatted state
    const [selectedMonthYear, setSelectedMonthYear] = useState(
        `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`
    );

    // Get array of last 12 months for dropdown
    const availableMonths = useMemo(() => {
        const arr = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            arr.push({ val, label });
        }
        return arr;
    }, []);

    const { records, loading, error, generating, generatePayroll, markAsPaid, fetchRecords } = usePayroll(selectedMonthYear);

    const [showPayslip, setShowPayslip] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handlePreview = (record: PayrollRecord) => {
        setSelectedRecord(record);
        setShowPayslip(true);
    };

    const handleGenerate = () => {
        const monthLabel = availableMonths.find(m => m.val === selectedMonthYear)?.label;
        if (confirm(`SIMULATION MODE: Simulate it being the 10th of the month and process payroll for ${monthLabel}?`)) {
            generatePayroll(selectedMonthYear);
        }
    };

    const handleMarkAllPaid = async () => {
        alert("Bulk pay features depend on bank integration. Please pay individuals.");
    };

    const filteredRecords = useMemo(() => {
        if (!records) return [];
        return records.filter(r =>
            r.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.profile?.custom_id?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [records, searchQuery]);

    // Calculate dynamic stats
    const stats = useMemo(() => {
        let netPayout = 0;
        let totalLopDed = 0;
        records.forEach(r => {
            netPayout += Number(r.net_salary) || 0;
            totalLopDed += Number(r.lop_deduction_amount) || 0;
        });
        return { netPayout, totalLopDed };
    }, [records]);

    return (
        <div className="payroll-container">
            {/* ALERT BANNER */}
            <div className="system-alert-banner">
                <AlertTriangle size={18} className="sab-icon" />
                <div className="sab-text">
                    <strong>Payroll Cutoff Reminder:</strong> Attendance editing locks at 11:59 PM on the 9th of every month. Payroll dispersal occurs on the 10th. Generate payroll only after attendance is finalized.
                </div>
            </div>

            <div className="payroll-header-flex">
                <div className="header-main-text">
                    <h2 className="title-bold">Payroll & Salary Calculation</h2>
                    <p className="subtitle-muted">Manage monthly salary processing and attendance deductions natively.</p>
                </div>
                <div className="month-picker-container">
                    <span className="picker-label">Payroll Cycle:</span>
                    <select
                        className="month-dropdown"
                        value={selectedMonthYear}
                        onChange={(e) => setSelectedMonthYear(e.target.value)}
                    >
                        {availableMonths.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="payroll-stats-row">
                <StatCardINR
                    title="Total Net Payout"
                    value={stats.netPayout.toLocaleString('en-IN')}
                    subtitle={`For ${availableMonths.find(m => m.val === selectedMonthYear)?.label}`}
                    trend="System Calulated"
                    icon={IndianRupee}
                    variant="default"
                />
                <StatCardINR
                    title="Total LOP Deducted"
                    value={stats.totalLopDed.toLocaleString('en-IN')}
                    subtitle="Saved via Attendance"
                    trend="Automated"
                    icon={TrendingDown}
                    variant="red"
                />
                <StatCardINR
                    title="Processed Employees"
                    value={records.length.toString()}
                    subtitle="Headcount this cycle"
                    trend="Active"
                    icon={CreditCard}
                    variant="teal"
                    hideSymbol={true}
                />
            </div>

            <div className="payroll-list-card card">
                <div className="list-filters-bar">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-actions">
                        <button className="btn-filter-icon" onClick={() => fetchRecords(selectedMonthYear)} title="Refresh Data">
                            <RefreshCw size={18} />
                        </button>
                        <div className="v-divider"></div>

                        {records.length > 0 ? (
                            <button
                                className="btn-generate bg-success"
                                onClick={handleMarkAllPaid}
                            >
                                <CheckCircle2 size={16} /> Mark Run Complete
                            </button>
                        ) : (
                            <button
                                className="btn-generate"
                                onClick={handleGenerate}
                                disabled={generating}
                            >
                                {generating ? 'Generating Data...' : `Generate Payroll for ${availableMonths.find(m => m.val === selectedMonthYear)?.label}`}
                            </button>
                        )}
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="payroll-table">
                        <thead>
                            <tr>
                                <th className="text-left">EMPLOYEE</th>
                                <th className="text-left">DEPARTMENT</th>
                                <th className="text-right">BASIC SALARY</th>
                                <th className="text-right">LOP DAYS</th>
                                <th className="text-right text-danger">LOP DEDUCTION</th>
                                <th className="text-right">NET PAYOUT</th>
                                <th className="text-center">STATUS</th>
                                <th className="text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={8} className="text-center py-40">Loading details...</td></tr>}
                            {error && !loading && (
                                <tr>
                                    <td colSpan={8} className="text-center py-40">
                                        <DataError message={error} onRetry={() => fetchRecords(selectedMonthYear)} />
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-40">
                                        <div style={{ color: "var(--text-muted)" }}>No payroll records generated for this cycle. Click "Generate Payroll" to compute salaries.</div>
                                    </td>
                                </tr>
                            )}
                            {filteredRecords.map((r) => (
                                <tr key={r.id} className="row-hover">
                                    <td>
                                        <div className="emp-info-cell">
                                            {r.profile?.profile_pic_url ? (
                                                <img src={r.profile.profile_pic_url} alt="" className="emp-avatar-sm" style={{ objectFit: 'cover' }} />
                                            ) : (
                                                <div className="emp-avatar-sm">{r.profile?.full_name?.charAt(0) || '?'}</div>
                                            )}
                                            <div className="emp-text">
                                                <span className="emp-name">{r.profile?.full_name || 'Unknown'}</span>
                                                <span className="emp-id-tag">{r.profile?.custom_id || r.employee_id.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="dept-tag">{r.profile?.department || '-'}</div>
                                    </td>
                                    <td className="text-right font-bold">₹{Number(r.basic_salary).toLocaleString('en-IN')}</td>
                                    <td className="text-right font-semibold text-danger">{r.total_lop_days}</td>
                                    <td className="text-right text-danger">-₹{Number(r.lop_deduction_amount).toLocaleString('en-IN')}</td>
                                    <td className="text-right font-bold text-primary" style={{ fontSize: '16px' }}>₹{Number(r.net_salary).toLocaleString('en-IN')}</td>
                                    <td className="text-center">
                                        <span className={`status-pill-v2 ${r.status.toLowerCase().replace(' ', '-')}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="row-actions">
                                            {r.status !== 'Paid' && (
                                                <button className="row-btn-primary mini" onClick={() => markAsPaid(r.id)}>Mark Paid</button>
                                            )}
                                            <button className="row-icon-btn" onClick={() => handlePreview(r)} title="View Payslip">
                                                <FileText size={16} />
                                            </button>
                                            <button className="row-icon-btn" title="Email Payslip">
                                                <Mail size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showPayslip && selectedRecord && (
                <div className="payslip-modal" onClick={() => setShowPayslip(false)}>
                    <div className="modal-content animate-zoom" onClick={e => e.stopPropagation()}>
                        <div className="modal-top-bar" style={{ padding: '16px 24px', background: '#F8FAFB', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="bar-actions">
                                <button className="bar-btn" onClick={() => window.print()}>
                                    <Printer size={18} /> Print
                                </button>
                                <button className="bar-btn primary">
                                    <Download size={18} /> Download PDF
                                </button>
                                <button className="bar-btn">
                                    <Mail size={18} /> Send to Email
                                </button>
                            </div>
                            <button className="close-bar-btn" onClick={() => setShowPayslip(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="payslip-scroll-area" id="payslip-printable">
                            <PayslipTemplate
                                data={buildPayslipData(
                                    selectedRecord,
                                    availableMonths.find(m => m.val === selectedMonthYear)?.label || selectedMonthYear
                                )}
                                hideActions={true}
                            />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .payroll-container {
           padding: 24px 32px;
           width: 100%;
           display: flex;
           flex-direction: column;
           gap: 24px;
           box-sizing: border-box;
           animation: fadeIn 0.4s ease-out;
        }

        .system-alert-banner {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(255, 159, 28, 0.1);
            border: 1px solid rgba(255, 159, 28, 0.3);
            padding: 14px 20px;
            border-radius: 12px;
            color: #d68100;
        }
        .sab-icon { color: #FF9F1C; }
        .sab-text { font-size: 13.5px; line-height: 1.5; }
        .sab-text strong { font-weight: 800; color: #b36a00; }

        .payroll-header-flex {
           display: flex;
           justify-content: space-between;
           align-items: center;
           width: 100%;
        }

        .title-bold { font-size: 26px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px; }
        .subtitle-muted { font-size: 14px; color: var(--text-muted); margin-top: 4px; }

        .month-picker-container {
           display: flex;
           flex-direction: column;
           gap: 8px;
           align-items: flex-end;
           text-align: right;
        }

        .picker-label { font-size: 11px; font-weight: 800; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.5px; }

        .month-dropdown {
           padding: 12px 20px;
           background: var(--bg-card);
           border: 1px solid var(--border-color);
           border-radius: 14px;
           font-size: 14px;
           font-weight: 700;
           color: var(--text-primary);
           cursor: pointer;
           outline: none;
           box-shadow: var(--shadow-sm);
           transition: all 0.2s;
           min-width: 220px;
        }

        .month-dropdown:hover { border-color: var(--color-primary); }

        .payroll-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .payroll-list-card {
           padding: 0;
           background: var(--bg-card);
           overflow: hidden;
           border: 1px solid var(--border-color);
           border-radius: 20px;
        }

        .list-filters-bar {
           padding: 20px 32px;
           display: flex;
           justify-content: space-between;
           align-items: center;
           border-bottom: 1px solid var(--border-color);
           background: var(--bg-card);
        }

        .search-wrapper {
           position: relative;
           width: 350px;
         }

        .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }

        .search-wrapper input {
           width: 100%;
           padding: 12px 16px 12px 48px;
           background: var(--bg-block);
           border: 1px solid var(--border-color);
           border-radius: 12px;
           font-size: 14px;
           outline: none;
           transition: all 0.2s;
           color: var(--text-primary);
        }

        .search-wrapper input:focus {
           background: var(--bg-main);
           border-color: var(--color-primary);
        }

        .filter-actions { display: flex; align-items: center; gap: 16px; }

        .btn-filter-icon {
           width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card);
           display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; transition: 0.2s;
        }
        .btn-filter-icon:hover { background: var(--bg-block); color: var(--text-primary); }

        .v-divider { width: 1px; height: 24px; background: var(--border-color); }

        .btn-generate {
           display: flex; align-items: center; gap: 8px;
           padding: 12px 24px; background: var(--color-primary); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .btn-generate.bg-success { background: #00BFA5; }
        .btn-generate:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 15px rgba(98, 50, 255, 0.25); }
        .btn-generate.bg-success:hover { box-shadow: 0 6px 15px rgba(0, 191, 165, 0.25); }
        .btn-generate:disabled { background: var(--bg-muted); color: var(--text-muted); cursor: not-allowed; }

        .table-wrapper { overflow-x: auto; }
        .payroll-table { width: 100%; border-collapse: collapse; }
        .payroll-table th { padding: 16px 24px; background: var(--bg-block); color: var(--text-muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
        .payroll-table td { padding: 18px 24px; border-bottom: 1px solid var(--border-color); font-size: 14px; vertical-align: middle; }
        .row-hover:hover { background: var(--bg-block); }

        .emp-info-cell { display: flex; align-items: center; gap: 12px; }
        .emp-avatar-sm { width: 40px; height: 40px; border-radius: 50%; background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; overflow: hidden; }
        .emp-text { display: flex; flex-direction: column; gap: 2px; }
        .emp-name { font-weight: 700; color: var(--text-primary); font-size: 14px; }
        .emp-id-tag { font-size: 12px; color: var(--text-muted); font-family: monospace; }
        .dept-tag { padding: 6px 12px; background: var(--bg-block); border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--text-secondary); display: inline-block; }

        .text-danger { color: #FF4B4B; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 800; }
        
        .status-pill-v2 { padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .status-pill-v2.paid { background: rgba(0, 191, 165, 0.1); color: #00BFA5; }
        .status-pill-v2.processed { background: rgba(98, 50, 255, 0.1); color: #6C5DD3; }
        .status-pill-v2.draft { background: rgba(255, 159, 28, 0.1); color: #FF9F1C; }

        .row-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
        .row-icon-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .row-icon-btn:hover { color: var(--color-primary); border-color: var(--color-primary); }
        .row-btn-primary.mini { padding: 6px 12px; border-radius: 8px; background: var(--color-primary-light); color: var(--color-primary); border: none; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .row-btn-primary.mini:hover { background: var(--color-primary); color: white; }

        .payslip-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 40px; }
        .modal-content { background: var(--bg-card); border-radius: 20px; max-width: 1000px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color); }
        .bar-actions { display: flex; gap: 12px; }
        .bar-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 13px; font-weight: 700; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
        .bar-btn:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }
        .bar-btn.primary { background: var(--color-primary); color: white; border: none; }
        .bar-btn.primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .close-bar-btn { width: 36px; height: 36px; border-radius: 10px; border: none; background: var(--bg-block); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .close-bar-btn:hover { background: #FF4B4B; color: white; transform: rotate(90deg); }
        
        .payslip-scroll-area { flex: 1; overflow-y: auto; background: var(--bg-main); }
        
        .animate-zoom { animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        
        @media print {
            body * { visibility: hidden; }
            #payslip-printable, #payslip-printable * { visibility: visible; }
            #payslip-printable { position: absolute; left: 0; top: 0; width: 100%; background: white; }
            .modal-top-bar { display: none !important; }
            .payslip-modal { background: white; padding: 0; }
            .modal-content { box-shadow: none; border: none; max-width: 100%; margin: 0; border-radius: 0; }
            .payslip-scroll-area { padding: 0; }
        }
      `}</style>
        </div>
    );
};

export default Payroll;
