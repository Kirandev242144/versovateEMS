import React, { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, Search, Users, Loader2, X } from 'lucide-react';
import { useLeaveRequests, updateLeaveStatus } from '../hooks/useLeaves';
import type { LeaveRequest } from '../hooks/useLeaves';
import DataError from '../components/DataError';


const statusConfig: Record<string, { label: string; cls: string }> = {
    Pending: { label: 'Pending', cls: 'orange' },
    Approved: { label: 'Approved', cls: 'green' },
    Rejected: { label: 'Rejected', cls: 'red' },
};

const AdminLeaves: React.FC = () => {
    const { requests, loading, error, refresh } = useLeaveRequests('admin');
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [processing, setProcessing] = useState<string | null>(null);
    const [reviewModal, setReviewModal] = useState<LeaveRequest | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected'>('Approved');

    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const approvedThisMonth = useMemo(() => {
        const now = new Date();
        return requests.filter(r => {
            if (r.status !== 'Approved') return false;
            const d = new Date(r.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
    }, [requests]);

    const filtered = useMemo(() => {
        let list = requests;
        if (activeTab === 'pending') list = list.filter(r => r.status === 'Pending');
        if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
        if (search.trim()) {
            const s = search.toLowerCase();
            list = list.filter(r =>
                r.employee?.full_name?.toLowerCase().includes(s) ||
                r.leave_type?.name?.toLowerCase().includes(s) ||
                r.reason?.toLowerCase().includes(s)
            );
        }
        return list;
    }, [requests, activeTab, filterStatus, search]);


    const handleReviewSubmit = async () => {
        if (!reviewModal) return;
        setProcessing(reviewModal.id);
        try {
            await updateLeaveStatus(reviewModal.id, reviewAction, adminNote, reviewModal.employee_id, reviewModal.leave_type_id, reviewModal.total_days);
            setReviewModal(null);
            setAdminNote('');
            refresh();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setProcessing(null);
        }
    };

    const openReview = (req: LeaveRequest, action: 'Approved' | 'Rejected') => {
        setReviewModal(req);
        setReviewAction(action);
        setAdminNote('');
    };

    if (error) return <div className="content-area centered"><DataError message={error} onRetry={refresh} /></div>;

    return (
        <div className="employees-container">
            {/* Header */}
            <div className="employees-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-left">
                    <h2 className="title-bold">Leave Management</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Review and manage employee leave requests.</p>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-cards-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card-v3">
                    <div className="stat-icon-circle orange"><Clock size={22} /></div>
                    <div className="stat-content">
                        <p className="stat-label">Pending Requests</p>
                        <h3 className="stat-value">{loading ? '—' : pendingCount}</h3>
                    </div>
                </div>
                <div className="stat-card-v3">
                    <div className="stat-icon-circle green"><CheckCircle2 size={22} /></div>
                    <div className="stat-content">
                        <p className="stat-label">Approved This Month</p>
                        <h3 className="stat-value">{loading ? '—' : approvedThisMonth}</h3>
                    </div>
                </div>
                <div className="stat-card-v3">
                    <div className="stat-icon-circle blue"><Users size={22} /></div>
                    <div className="stat-content">
                        <p className="stat-label">Total Requests</p>
                        <h3 className="stat-value">{loading ? '—' : requests.length}</h3>
                    </div>
                </div>
            </div>

            {/* Tabs + Filters */}
            <div className="employee-list-section card">
                <div className="list-header-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {(['pending', 'all'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                                    background: activeTab === tab ? 'var(--color-primary)' : 'var(--bg-main)',
                                    color: activeTab === tab ? '#fff' : 'var(--text-secondary)', position: 'relative'
                                }}>
                                {tab === 'pending' ? 'Pending' : 'All Requests'}
                                {tab === 'pending' && pendingCount > 0 && (
                                    <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#FF4B4B', color: '#fff', borderRadius: '99px', fontSize: '11px', fontWeight: 800, minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{pendingCount}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                        {activeTab === 'all' && (
                            <select className="form-input" style={{ minWidth: '140px', fontSize: '13px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="all">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        )}
                        <div className="search-bar" style={{ minWidth: '220px' }}>
                            <Search size={16} />
                            <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="employees-table">
                        <thead>
                            <tr>
                                <th>EMPLOYEE</th>
                                <th>LEAVE TYPE</th>
                                <th>DATES</th>
                                <th>DAYS</th>
                                <th>REASON</th>
                                <th>STATUS</th>
                                <th style={{ textAlign: 'center' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px' }}><Loader2 className="animate-spin" size={28} style={{ color: 'var(--color-primary)' }} /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                    {activeTab === 'pending' ? '✅ No pending leave requests.' : 'No leave requests found.'}
                                </td></tr>
                            ) : filtered.map(req => (
                                <tr key={req.id} className="row-hover">
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {req.employee?.profile_pic_url ? (
                                                <img src={req.employee.profile_pic_url} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                            ) : (
                                                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--color-primary)', fontSize: '14px' }}>
                                                    {req.employee?.full_name?.[0] || '?'}
                                                </div>
                                            )}
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{req.employee?.full_name || 'Unknown'}</p>
                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.employee?.department}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: req.leave_type?.color, flexShrink: 0 }} />
                                            <span style={{ fontWeight: 600, fontSize: '13px' }}>{req.leave_type?.name}</span>
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '13px' }}>
                                        {new Date(req.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        {req.start_date !== req.end_date && ` – ${new Date(req.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                                        {req.is_half_day && <span style={{ marginLeft: '6px', fontSize: '11px', background: 'var(--bg-main)', padding: '1px 5px', borderRadius: '4px' }}>Half</span>}
                                    </td>
                                    <td><span style={{ fontWeight: 700 }}>{req.total_days}d</span></td>
                                    <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {req.reason}
                                        {req.admin_note && <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Note: {req.admin_note}</span>}
                                    </td>
                                    <td><span className={`status-pill-v3 ${statusConfig[req.status]?.cls}`}>{req.status}</span></td>
                                    <td>
                                        {req.status === 'Pending' ? (
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                <button onClick={() => openReview(req, 'Approved')} disabled={processing === req.id}
                                                    style={{ background: 'rgba(0,191,165,0.1)', border: '1px solid rgba(0,191,165,0.3)', color: '#00BFA5', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <CheckCircle2 size={14} /> Approve
                                                </button>
                                                <button onClick={() => openReview(req, 'Rejected')} disabled={processing === req.id}
                                                    style={{ background: 'rgba(255,75,75,0.08)', border: '1px solid rgba(255,75,75,0.2)', color: '#FF4B4B', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', display: 'block' }}>
                                                {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Review Modal */}
            {reviewModal && (
                <div className="modal-overlay">
                    <div className="modal-content-v2" style={{ maxWidth: '480px', width: '90%' }}>
                        <div className="modal-header">
                            <h2 className="modal-title" style={{ color: reviewAction === 'Approved' ? '#00BFA5' : '#FF4B4B' }}>
                                {reviewAction === 'Approved' ? '✅ Approve' : '❌ Reject'} Leave Request
                            </h2>
                            <button onClick={() => setReviewModal(null)} className="close-btn"><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ background: 'var(--bg-main)', borderRadius: '10px', padding: '14px 16px', fontSize: '14px', lineHeight: 1.7 }}>
                                <p><strong>{reviewModal.employee?.full_name}</strong> — {reviewModal.leave_type?.name}</p>
                                <p style={{ color: 'var(--text-muted)' }}>
                                    {new Date(reviewModal.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    {reviewModal.start_date !== reviewModal.end_date && ` to ${new Date(reviewModal.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                                    {' — '}<strong>{reviewModal.total_days} day{reviewModal.total_days !== 1 ? 's' : ''}</strong>
                                </p>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>"{reviewModal.reason}"</p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Admin Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                <textarea className="form-input" rows={3} placeholder="Add a note for the employee..." value={adminNote} onChange={e => setAdminNote(e.target.value)} style={{ resize: 'vertical' }} />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                            <button className="btn-secondary-v2" onClick={() => setReviewModal(null)}>Cancel</button>
                            <button
                                onClick={handleReviewSubmit}
                                disabled={processing === reviewModal.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                                    background: reviewAction === 'Approved' ? '#00BFA5' : '#FF4B4B', color: '#fff'
                                }}>
                                {processing === reviewModal.id ? <Loader2 size={16} className="animate-spin" /> : reviewAction === 'Approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                Confirm {reviewAction}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLeaves;
