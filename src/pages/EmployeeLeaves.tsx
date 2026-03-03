import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Clock, CheckCircle2, ChevronRight, Loader2, X, AlertTriangle } from 'lucide-react';
import { useLeaveBalance, useLeaveRequests, useLeaveTypes, submitLeaveRequest, cancelLeaveRequest } from '../hooks/useLeaves';
import DataError from '../components/DataError';

const statusConfig: Record<string, { label: string; cls: string }> = {
    Pending: { label: 'Pending', cls: 'orange' },
    Approved: { label: 'Approved', cls: 'green' },
    Rejected: { label: 'Rejected', cls: 'red' },
};

const EmployeeLeaves: React.FC = () => {
    const { balances, loading: balLoading, error: balError, refresh: refreshBal } = useLeaveBalance();
    const { requests, loading: reqLoading, error: reqError, refresh: refreshReq } = useLeaveRequests('employee');
    const { leaveTypes } = useLeaveTypes();
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [cancelling, setCancelling] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [form, setForm] = useState({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        is_half_day: false,
        half_day_period: 'morning' as 'morning' | 'afternoon',
        reason: '',
    });

    const calculateDays = () => {
        if (!form.start_date || !form.end_date) return 0;
        if (form.is_half_day) return 0.5;
        const start = new Date(form.start_date);
        const end = new Date(form.end_date);
        if (end < start) return 0;
        let days = 0;
        const cur = new Date(start);
        while (cur <= end) {
            const dow = cur.getDay();
            if (dow !== 0 && dow !== 6) days++;
            cur.setDate(cur.getDate() + 1);
        }
        return days;
    };

    const totalDays = calculateDays();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!form.leave_type_id) return setFormError('Please select a leave type.');
        if (!form.start_date) return setFormError('Please select a start date.');
        if (!form.end_date && !form.is_half_day) return setFormError('Please select an end date.');
        if (!form.reason.trim()) return setFormError('Please provide a reason.');
        if (totalDays <= 0) return setFormError('Invalid date range selected.');

        setSubmitting(true);
        try {
            await submitLeaveRequest({
                ...form,
                end_date: form.is_half_day ? form.start_date : form.end_date,
                total_days: totalDays,
                half_day_period: form.is_half_day ? form.half_day_period : undefined,
            });
            setShowForm(false);
            setForm({ leave_type_id: '', start_date: '', end_date: '', is_half_day: false, half_day_period: 'morning', reason: '' });
            refreshReq();
            refreshBal();
        } catch (err: any) {
            setFormError(err.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Cancel this leave request?')) return;
        setCancelling(id);
        try {
            await cancelLeaveRequest(id);
            refreshReq();
            refreshBal();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setCancelling(null);
        }
    };

    const filteredRequests = useMemo(() => {
        if (activeTab === 'all') return requests;
        return requests.filter(r => r.status === activeTab.charAt(0).toUpperCase() + activeTab.slice(1));
    }, [requests, activeTab]);

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="employees-container">
            {/* Header */}
            <div className="employees-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-left">
                    <h2 className="title-bold">My Leaves</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Apply for time off and track your leave history.</p>
                </div>
                <button className="btn-primary-v2" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} /> Apply for Leave
                </button>
            </div>

            {/* Balance Cards */}
            {balError ? (
                <DataError message={balError} onRetry={refreshBal} />
            ) : balLoading ? (
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    {[1, 2, 3].map(i => <div key={i} className="stat-card-v3" style={{ flex: 1, height: '100px', background: 'var(--bg-card)', borderRadius: '12px' }} />)}
                </div>
            ) : (
                <div className="stats-cards-grid" style={{ marginBottom: '24px' }}>
                    {balances.map(bal => (
                        <div key={bal.id} className="stat-card-v3" style={{ borderLeft: `4px solid ${bal.leave_type?.color || 'var(--color-primary)'}` }}>
                            <div className="stat-content" style={{ width: '100%' }}>
                                <p className="stat-label">{bal.leave_type?.name}</p>
                                <h3 className="stat-value">{bal.remaining_days} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-muted)' }}>/ {bal.total_days} days</span></h3>
                                <div style={{ marginTop: '8px', background: 'var(--bg-main)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: '99px', width: `${Math.min(100, (bal.used_days / bal.total_days) * 100)}%`, background: bal.leave_type?.color || 'var(--color-primary)', transition: 'width 0.6s ease' }} />
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{bal.used_days} used</p>
                            </div>
                        </div>
                    ))}
                    {balances.length === 0 && !balLoading && (
                        <div style={{ gridColumn: '1/-1', padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Leave balances not initialized yet. Ask your admin to set them up.
                        </div>
                    )}
                </div>
            )}

            {/* Requests Table */}
            <div className="employee-list-section card">
                <div className="list-header-bar">
                    <h3 className="section-title">Leave Requests</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                                    background: activeTab === tab ? 'var(--color-primary)' : 'var(--bg-main)',
                                    color: activeTab === tab ? '#fff' : 'var(--text-secondary)'
                                }}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {reqError ? <DataError message={reqError} onRetry={refreshReq} /> : (
                    <div className="table-responsive">
                        <table className="employees-table">
                            <thead><tr><th>LEAVE TYPE</th><th>DATES</th><th>DAYS</th><th>REASON</th><th>STATUS</th><th>ACTION</th></tr></thead>
                            <tbody>
                                {reqLoading ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-primary)' }} /></td></tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No leave requests found.</td></tr>
                                ) : filteredRequests.map(req => (
                                    <tr key={req.id} className="row-hover">
                                        <td>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: req.leave_type?.color, flexShrink: 0 }} />
                                                <span style={{ fontWeight: 600 }}>{req.leave_type?.name}</span>
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                                <Calendar size={14} />
                                                {new Date(req.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                {req.start_date !== req.end_date && <><ChevronRight size={12} />{new Date(req.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</>}
                                                {req.is_half_day && <span style={{ fontSize: '11px', background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '6px' }}>Half day</span>}
                                            </span>
                                        </td>
                                        <td>{req.total_days}d</td>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.reason}</td>
                                        <td>
                                            <span className={`status-pill-v3 ${statusConfig[req.status]?.cls}`}>{req.status}</span>
                                        </td>
                                        <td>
                                            {req.status === 'Pending' && (
                                                <button onClick={() => handleCancel(req.id)} disabled={cancelling === req.id}
                                                    style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {cancelling === req.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Cancel
                                                </button>
                                            )}
                                            {req.admin_note && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }} title={req.admin_note}>Note ⓘ</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Apply Leave Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content-v2" style={{ maxWidth: '520px', width: '90%' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Apply for Leave</h2>
                            <button onClick={() => setShowForm(false)} className="close-btn"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {formError && (
                                    <div style={{ background: 'rgba(255,75,75,0.1)', border: '1px solid rgba(255,75,75,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#FF4B4B', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
                                        <AlertTriangle size={16} /> {formError}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Leave Type</label>
                                    <select className="form-input" value={form.leave_type_id} onChange={e => setForm(f => ({ ...f, leave_type_id: e.target.value }))} required>
                                        <option value="">Select leave type...</option>
                                        {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                        <input type="checkbox" checked={form.is_half_day} onChange={e => setForm(f => ({ ...f, is_half_day: e.target.checked }))} />
                                        Half Day
                                    </label>
                                    {form.is_half_day && (
                                        <select className="form-input" style={{ flex: 1 }} value={form.half_day_period} onChange={e => setForm(f => ({ ...f, half_day_period: e.target.value as any }))}>
                                            <option value="morning">Morning</option>
                                            <option value="afternoon">Afternoon</option>
                                        </select>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: form.is_half_day ? '1fr' : '1fr 1fr', gap: '12px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Start Date</label>
                                        <input type="date" className="form-input" min={today} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: form.is_half_day ? e.target.value : f.end_date }))} required />
                                    </div>
                                    {!form.is_half_day && (
                                        <div className="form-group">
                                            <label className="form-label">End Date</label>
                                            <input type="date" className="form-input" min={form.start_date || today} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
                                        </div>
                                    )}
                                </div>

                                {totalDays > 0 && (
                                    <div style={{ background: 'var(--color-primary-light)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={16} /> {totalDays} working day{totalDays !== 1 ? 's' : ''} selected
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Reason</label>
                                    <textarea className="form-input" rows={3} placeholder="Briefly explain the reason for your leave..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required style={{ resize: 'vertical' }} />
                                </div>
                            </div>

                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                                <button type="button" className="btn-secondary-v2" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn-primary-v2" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeLeaves;
