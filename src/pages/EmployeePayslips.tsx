import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Download, Printer, X, DownloadCloud } from 'lucide-react';
import PayslipTemplate, { defaultPayslipData } from '../components/PayslipTemplate';

const EmployeePayslips: React.FC = () => {
    const [payslips, setPayslips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

    useEffect(() => {
        const fetchPayslips = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data, error } = await supabase
                    .from('payroll_records')
                    .select(`
                        id, month_year, basic_salary, total_lop_days, lop_deduction_amount, net_salary, status, processed_date,
                        profile:profiles(full_name, custom_id, department, bank_account_number, bank_ifsc)
                    `)
                    .eq('employee_id', session.user.id)
                    .order('month_year', { ascending: false });

                if (error) throw error;
                setPayslips(data || []);
            } catch (err: any) {
                console.error('Error fetching payslips', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPayslips();
    }, []);

    const handleViewPayslip = (slip: any) => {
        setSelectedPayslip(slip);
    };

    const getMonthLabel = (monthYear: string) => {
        const [year, month] = monthYear.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="my-payslips-container">
            <div className="page-header mb-30">
                <h1 className="page-title">My Payslips</h1>
                <p className="page-subtitle">View and download your monthly salary statements.</p>
            </div>

            <div className="payslips-grid">
                {loading ? (
                    <div className="center-loader">Loading your salary records...</div>
                ) : payslips.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={48} opacity={0.3} />
                        <p>No payslips generated for you yet.</p>
                    </div>
                ) : (
                    payslips.map(slip => (
                        <div key={slip.id} className="payslip-card glass">
                            <div className="pc-top flex-between">
                                <div className="pc-month text-primary font-bold">
                                    {getMonthLabel(slip.month_year)}
                                </div>
                                <span className={`status-badge ${slip.status.toLowerCase()}`}>
                                    {slip.status}
                                </span>
                            </div>

                            <div className="pc-body">
                                <div className="pc-stat">
                                    <span className="pc-label">Basic Salary</span>
                                    <span className="pc-val">₹{Number(slip.basic_salary).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="pc-stat">
                                    <span className="pc-label">LOP Ded. ({slip.total_lop_days} days)</span>
                                    <span className="pc-val text-danger">-₹{Number(slip.lop_deduction_amount).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="break-line"></div>
                                <div className="pc-stat highlight">
                                    <span className="pc-label">Net Salary</span>
                                    <span className="pc-val text-primary">₹{Number(slip.net_salary).toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            <div className="pc-footer">
                                <button className="btn-view" onClick={() => handleViewPayslip(slip)}>
                                    <FileText size={16} /> View
                                </button>
                                <button className="btn-download" onClick={() => handleViewPayslip(slip)}>
                                    <DownloadCloud size={16} /> Download
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Payslip Modal */}
            {selectedPayslip && (
                <div className="payslip-modal" onClick={() => setSelectedPayslip(null)}>
                    <div className="modal-content animate-zoom" onClick={e => e.stopPropagation()}>
                        <div className="modal-top-bar flex-between" style={{ padding: '16px 24px', background: '#F8FAFB', borderBottom: '1px solid var(--border-color)' }}>
                            <div className="bar-actions flex gap-10">
                                <button className="bar-btn" onClick={() => window.print()}>
                                    <Printer size={18} /> Print
                                </button>
                                <button className="bar-btn primary">
                                    <Download size={18} /> Download
                                </button>
                            </div>
                            <button className="close-bar-btn" onClick={() => setSelectedPayslip(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="payslip-scroll-area" id="payslip-printable">
                            <PayslipTemplate
                                data={{
                                    ...defaultPayslipData,
                                    employeeName: selectedPayslip.profile?.full_name || 'N/A',
                                    employeeId: selectedPayslip.profile?.custom_id || 'N/A',
                                    department: selectedPayslip.profile?.department || 'N/A',
                                    accountNo: selectedPayslip.profile?.bank_account_number || '',
                                    ifscCode: selectedPayslip.profile?.bank_ifsc || '',
                                    date: new Date(selectedPayslip.processed_date).toLocaleDateString('en-GB'),
                                    payPeriod: getMonthLabel(selectedPayslip.month_year),
                                    grossWages: Number(selectedPayslip.basic_salary),
                                    lopDays: Number(selectedPayslip.total_lop_days),
                                    totalWorkingDays: new Date(parseInt(selectedPayslip.month_year.split('-')[0]), parseInt(selectedPayslip.month_year.split('-')[1]), 0).getDate(),
                                    leaves: 0,
                                    paidDays: new Date(parseInt(selectedPayslip.month_year.split('-')[0]), parseInt(selectedPayslip.month_year.split('-')[1]), 0).getDate() - Number(selectedPayslip.total_lop_days),
                                    earnings: {
                                        basic: Number(selectedPayslip.basic_salary),
                                        hra: 0, conveyance: 0, medical: 0, other: 0
                                    },
                                    deductions: {
                                        epf: 0, esi: 0, profTax: 0,
                                        ...((Number(selectedPayslip.lop_deduction_amount) > 0) ? { other: Number(selectedPayslip.lop_deduction_amount) } : {})
                                    }
                                }}
                                hideActions={true}
                            />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .my-payslips-container { padding: 0 10px; max-width: 1400px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }
                .mb-30 { margin-bottom: 30px; }
                .flex-between { display: flex; justify-content: space-between; align-items: center; }
                .flex { display: flex; }
                .gap-10 { gap: 10px; }
                .page-title { font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
                .page-subtitle { color: var(--text-muted); font-size: 15px; }
                .text-danger { color: #FF4B4B; }
                .text-primary { color: var(--color-primary); }
                .font-bold { font-weight: 800; }
                
                .payslips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
                
                .payslip-card { padding: 24px; border-radius: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 20px; transition: transform 0.2s; }
                .payslip-card:hover { transform: translateY(-3px); border-color: var(--color-primary-light); }
                
                .pc-month { font-size: 18px; }
                
                .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
                .status-badge.paid { background: #E6FFF6; color: #00BFA5; }
                .status-badge.processed { background: rgba(98, 50, 255, 0.1); color: #6C5DD3; }
                .status-badge.draft { background: #FFE6E6; color: #FF4B4B; }
                
                .pc-body { display: flex; flex-direction: column; gap: 12px; }
                .pc-stat { display: flex; justify-content: space-between; align-items: center; }
                .pc-label { font-size: 13px; color: var(--text-secondary); font-weight: 600; }
                .pc-val { font-size: 14px; font-weight: 700; color: var(--text-primary); }
                
                .break-line { height: 1px; width: 100%; background: var(--border-color); margin: 4px 0; }
                .pc-stat.highlight .pc-label { font-size: 16px; color: var(--text-primary); font-weight: 800; }
                .pc-stat.highlight .pc-val { font-size: 18px; font-weight: 800; }
                
                .pc-footer { display: flex; gap: 12px; margin-top: auto; padding-top: 10px; }
                
                .pc-footer button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; border: none; }
                .btn-view { background: var(--bg-block); color: var(--text-primary); }
                .btn-view:hover { background: #e0e4e7; }
                
                .btn-download { background: var(--color-primary-light); color: var(--color-primary); }
                .btn-download:hover { background: var(--color-primary); color: white; }
                
                .center-loader, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--text-muted); font-size: 15px; font-weight: 500; gap: 12px; grid-column: 1 / -1; }
                
                /* Modal Styles Reused from Payroll Dashboard */
                .payslip-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 40px; }
                .modal-content { background: var(--bg-card); border-radius: 20px; max-width: 1000px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color); }
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

export default EmployeePayslips;
