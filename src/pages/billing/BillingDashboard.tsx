import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IndianRupee, Users, FileText, AlertCircle, Loader2, TrendingUp, Settings, X, Save, RefreshCw } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import DataError from '../../components/DataError';

const BillingDashboard = () => {
    const [stats, setStats] = useState({
        outstandingBalance: 0,
        monthlyRevenue: 0,
        activeClients: 0,
        overdueInvoices: 0
    });
    const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [indianBank, setIndianBank] = useState({
        bankName: '', accountHolder: '', accountNumber: '', ifsc: '', accountType: 'Current', branch: ''
    });

    const loadSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('company_settings')
                .select('*')
                .eq('settings_key', 'billing_settings')
                .single();
            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching settings:', error);
            } else if (data) {
                if (data.indian_bank_details) setIndianBank(data.indian_bank_details);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setIsSavingSettings(true);
            const { error }: any = await supabase
                .from('company_settings')
                .upsert({
                    settings_key: 'billing_settings',
                    indian_bank_details: indianBank
                }, { onConflict: 'settings_key' });

            if (error) {
                console.error('Failed to save settings:', error);
                alert("Settings Save Error: " + error.message + "\n\nPlease run the updated schema_billing.sql to apply the missing company_settings RLS policy.");
            } else {
                setIsSettingsOpen(false);
            }
        } catch (err: any) {
            console.error(err);
            alert("Error saving settings: " + (err.message || 'Unknown Error'));
        } finally {
            setIsSavingSettings(false);
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const timeoutId = setTimeout(() => {
                    if (loading) {
                        setLoading(false);
                    }
                }, 15000);

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

                const [unpaidRes, payRes, cliRes, recentRes] = await Promise.all([
                    supabase.from('invoices').select('total_amount, total_inr_amount, exchange_rate, amount_paid, status, due_date').in('status', ['Sent', 'Partially Paid', 'Overdue']),
                    supabase.from('payments').select('amount, invoices(exchange_rate)').gte('payment_date', startOfMonth),
                    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
                    supabase.from('invoices').select('id, invoice_number, total_amount, currency, status, issue_date, client:clients(name, company_name)').order('created_at', { ascending: false }).limit(5)
                ]);

                clearTimeout(timeoutId);

                if (unpaidRes.error) throw unpaidRes.error;
                if (payRes.error) throw payRes.error;
                if (cliRes.error) throw cliRes.error;
                if (recentRes.error) throw recentRes.error;

                let outstanding = 0;
                let overdueCount = 0;
                const todayStr = new Date().toISOString().split('T')[0];

                if (unpaidRes.data) {
                    unpaidRes.data.forEach((inv: any) => {
                        const rate = inv.exchange_rate || 1.0;
                        const inrTotal = inv.total_inr_amount || (inv.total_amount * rate);
                        const inrPaid = (inv.amount_paid || 0) * rate;
                        outstanding += (inrTotal - inrPaid);
                        if (inv.due_date < todayStr && inv.status !== 'Paid') overdueCount++;
                    });
                }

                const monthlyRev = payRes.data?.reduce((sum: number, p: any) => sum + (p.amount * (p.invoices?.exchange_rate || 1.0)), 0) || 0;

                setStats({
                    outstandingBalance: outstanding,
                    monthlyRevenue: monthlyRev,
                    activeClients: cliRes.count || 0,
                    overdueInvoices: overdueCount
                });
                setRecentInvoices(recentRes.data || []);
            } catch (err: any) {
                if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
                console.error('Dashboard Stats Network Error:', err);
                setError('Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        const handleFocusRefresh = () => {
            console.log('[BillingDashboard] Auto-refreshing on window focus...');
            fetchDashboardData();
        };
        window.addEventListener('versovate:refresh', handleFocusRefresh);

        // WebSocket Subscription with unique channel ID to prevent remount deadlocks
        const channel = supabase.channel(`dashboard-sync-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
                fetchDashboardData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                fetchDashboardData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        return () => {
            window.removeEventListener('versovate:refresh', handleFocusRefresh);
            supabase.removeChannel(channel);
        };
    }, []);

    if (error && stats.activeClients === 0) {
        return (
            <div className="content-area centered">
                <DataError message={error} onRetry={() => window.dispatchEvent(new CustomEvent('versovate:refresh'))} />
            </div>
        );
    }

    return (
        <div className="employees-container">
            <div className="employees-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-left">
                    <h2 className="title-bold">Billing Overview</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Your financial summary and recent billing activity.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => { setIsSettingsOpen(true); loadSettings(); }}
                        className="btn-secondary-v2"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Settings size={18} /> <span>Payment Settings</span>
                    </button>
                    <NavLink
                        to="/Admin/billing/invoices"
                        className="btn-primary-v2"
                    >
                        <FileText size={18} /> <span>Generate Invoice</span>
                    </NavLink>
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-v2" style={{ maxWidth: '800px', width: '90%' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Company Payment Settings</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="close-btn"><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '12px' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Configure your bank details that will automatically appear on generated Invoice PDFs.</p>

                            {/* Indian Bank Forms Only */}
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                                    Local Bank Details
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group grid-col-1">
                                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>Bank Name</label>
                                        <input type="text" value={indianBank.bankName} onChange={e => setIndianBank({ ...indianBank, bankName: e.target.value })} className="form-input" placeholder="HDFC Bank" />
                                    </div>
                                    <div className="form-group grid-col-1">
                                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>Account Holder Name</label>
                                        <input type="text" value={indianBank.accountHolder} onChange={e => setIndianBank({ ...indianBank, accountHolder: e.target.value })} className="form-input" placeholder="Versovate Labs Pvt Ltd" />
                                    </div>
                                    <div className="form-group grid-col-1">
                                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>Account Number</label>
                                        <input type="text" value={indianBank.accountNumber} onChange={e => setIndianBank({ ...indianBank, accountNumber: e.target.value })} className="form-input" />
                                    </div>
                                    <div className="form-group grid-col-1">
                                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>IFSC Code</label>
                                        <input type="text" value={indianBank.ifsc} onChange={e => setIndianBank({ ...indianBank, ifsc: e.target.value })} className="form-input" placeholder="HDFC0018159" />
                                    </div>
                                    <div className="form-group grid-col-2">
                                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>Branch / Address</label>
                                        <input type="text" value={indianBank.branch} onChange={e => setIndianBank({ ...indianBank, branch: e.target.value })} className="form-input" placeholder="(Full branch address)" />
                                    </div>
                                    <div className="form-group grid-col-2">
                                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>Account Type</label>
                                        <select value={indianBank.accountType} onChange={e => setIndianBank({ ...indianBank, accountType: e.target.value })} className="form-input">
                                            <option value="Current">Current</option>
                                            <option value="Savings">Savings</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn-secondary-v2" onClick={() => setIsSettingsOpen(false)}>Cancel</button>
                            <button className="btn-primary-v2" onClick={handleSaveSettings} disabled={isSavingSettings} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isSavingSettings ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                <span>Save Settings</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '256px' }}>
                    <Loader2 className="animate-spin" style={{ color: 'var(--color-primary)' }} size={32} />
                </div>
            ) : (
                <>
                    <div className="stats-cards-grid">
                        {/* Stat Card 1 */}
                        <div className="stat-card-v3">
                            <div className="stat-icon-circle orange">
                                <AlertCircle size={24} />
                            </div>
                            <div className="stat-content">
                                <p className="stat-label">Outstanding</p>
                                <h3 className="stat-value">₹{stats.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 0 })}</h3>
                            </div>
                        </div>

                        {/* Stat Card 2 */}
                        <div className="stat-card-v3">
                            <div className="stat-icon-circle green">
                                <IndianRupee size={24} />
                            </div>
                            <div className="stat-content">
                                <p className="stat-label">Collected (This Month)</p>
                                <h3 className="stat-value">₹{stats.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</h3>
                            </div>
                        </div>

                        {/* Stat Card 3 */}
                        <div className="stat-card-v3">
                            <div className="stat-icon-circle purple">
                                <FileText size={24} />
                            </div>
                            <div className="stat-content">
                                <p className="stat-label">Overdue Invoices</p>
                                <h3 className="stat-value">{stats.overdueInvoices}</h3>
                            </div>
                        </div>

                        {/* Stat Card 4 */}
                        <div className="stat-card-v3">
                            <div className="stat-icon-circle blue">
                                <Users size={24} />
                            </div>
                            <div className="stat-content">
                                <p className="stat-label">Active Clients</p>
                                <h3 className="stat-value">{stats.activeClients}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="employee-list-section card" style={{ marginTop: '24px' }}>
                        <div className="list-header-bar">
                            <h3 className="section-title">Recent Invoices</h3>
                            <NavLink to="/Admin/billing/invoices" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>
                                View All <TrendingUp size={14} />
                            </NavLink>
                        </div>
                        <div className="table-responsive">
                            <table className="employees-table">
                                <thead>
                                    <tr>
                                        <th>INVOICE #</th>
                                        <th>CLIENT</th>
                                        <th>AMOUNT</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No recent invoices.</td>
                                        </tr>
                                    ) : (
                                        recentInvoices.map(inv => (
                                            <tr key={inv.id} className="row-hover">
                                                <td><span className="id-txt">{inv.invoice_number}</span></td>
                                                <td><span style={{ fontWeight: 600 }}>{inv.client?.company_name || inv.client?.name}</span></td>
                                                <td><span style={{ fontWeight: 700 }}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: inv.currency || 'INR', maximumFractionDigits: 0 }).format(inv.total_amount)}</span></td>
                                                <td>
                                                    <span className={`status-pill-v3 ${inv.status.toLowerCase().replace(' ', '-')}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default BillingDashboard;
