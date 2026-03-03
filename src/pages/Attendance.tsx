import React, { useState, useMemo, useEffect } from 'react';
import { useAttendance, type WeeklyAttendance } from '../hooks/useAttendance';
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Search,
    Calendar,
    RefreshCw,
    History,
    ChevronLeft,
    ChevronRight,
    Clock
} from 'lucide-react';

const AdminAttendance: React.FC = () => {
    const { records, loading, error, updateAttendanceStatus, refresh } = useAttendance();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
    const [selectedEmployee, setSelectedEmployee] = useState<string>(''); // employee_id filter

    // Build unique employee list from loaded records for the filter dropdown
    const uniqueEmployees = useMemo(() => {
        const seen = new Map<string, string>();
        records.forEach(r => {
            if (r.employee_id && r.profile?.full_name && !seen.has(r.employee_id)) {
                seen.set(r.employee_id, r.profile.full_name);
            }
        });
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [records]);

    // Modal State
    const [selectedRecord, setSelectedRecord] = useState<WeeklyAttendance | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [updating, setUpdating] = useState(false);

    // Editable Daily Breakdown
    const [editableBreakdown, setEditableBreakdown] = useState<any[]>([]);

    // Admin Month History Modal State
    const [historyEmployee, setHistoryEmployee] = useState<any | null>(null);
    const [currentHistoryMonth, setCurrentHistoryMonth] = useState(new Date());

    const filteredRecords = useMemo(() => {
        let result = records.filter(record => {
            const matchesSearch = record.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                record.profile?.custom_id?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
            const matchesEmployee = !selectedEmployee || record.employee_id === selectedEmployee;
            return matchesSearch && matchesStatus && matchesEmployee;
        });

        // Cleanly sort: Newest weeks first, then alphabetically by employee name
        return result.sort((a, b) => {
            const dateDiff = new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime();
            if (dateDiff !== 0) return dateDiff;
            const nameA = a.profile?.full_name || '';
            const nameB = b.profile?.full_name || '';
            return nameA.localeCompare(nameB);
        });
    }, [records, searchQuery, statusFilter, selectedEmployee]);

    // Check if a record is frozen from editing (Payroll Cutoff: 10th of the following month)
    const isEditingFrozen = (record: WeeklyAttendance) => {
        const today = new Date();
        const recordDate = new Date(record.week_start_date);

        // Has the year/month actually advanced past the record's week?
        const isNextMonthOrLater = (today.getFullYear() > recordDate.getFullYear()) ||
            (today.getFullYear() === recordDate.getFullYear() && today.getMonth() > recordDate.getMonth());

        // If we crossed into a new month, lock edits strictly on or after the 10th day
        if (isNextMonthOrLater && today.getDate() >= 10) {
            return true;
        }
        return false;
    };

    const openActionModal = (record: WeeklyAttendance) => {
        setSelectedRecord(record);
        setAdminNotes(record.admin_notes || '');
        if (record.daily_breakdown && Array.isArray(record.daily_breakdown)) {
            setEditableBreakdown(JSON.parse(JSON.stringify(record.daily_breakdown)));
        } else {
            setEditableBreakdown([]);
        }
    };

    const cycleDailyStatus = (index: number) => {
        const statuses = ['Present', 'Absent', 'Leave', 'Holiday'];
        setEditableBreakdown(prev => {
            const next = [...prev];
            const currentStatus = next[index].status;
            let nextIndex = statuses.indexOf(currentStatus) + 1;
            if (nextIndex >= statuses.length) nextIndex = 0;

            next[index] = { ...next[index], status: statuses[nextIndex] };
            return next;
        });
    };

    const currentStats = useMemo(() => {
        return editableBreakdown.reduce((acc, curr) => {
            if (curr.status === 'Present') acc.present++;
            if (curr.status === 'Absent') acc.absent++;
            if (curr.status === 'Leave') acc.leave++;
            if (curr.status === 'Holiday') acc.holiday++;
            return acc;
        }, { present: 0, absent: 0, leave: 0, holiday: 0 });
    }, [editableBreakdown]);

    const handleUpdate = async (newStatus: 'Approved' | 'Rejected') => {
        if (!selectedRecord) return;
        try {
            setUpdating(true);
            const updatedStats = {
                daily_breakdown: editableBreakdown,
                days_present: currentStats.present,
                days_lop: currentStats.absent,
                days_paid_leave: currentStats.leave,
                days_holiday: currentStats.holiday
            };
            await updateAttendanceStatus(selectedRecord.id, newStatus, adminNotes, updatedStats);
            setSelectedRecord(null);
        } catch (err: any) {
            alert(err.message || 'Failed to update status.');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusStyles = (status: string) => {
        if (status === 'Approved') return 'bg-success text-success border-success';
        if (status === 'Rejected') return 'bg-danger text-danger border-danger';
        return 'bg-warning text-warning border-warning';
    };

    // --- ADMIN HISTORY LOGIC ---

    const openHistoryModal = (record: WeeklyAttendance) => {
        setHistoryEmployee({
            id: record.employee_id,
            name: record.profile?.full_name || 'Unknown User',
            custom_id: record.profile?.custom_id || record.employee_id.substring(0, 8),
            pic: record.profile?.profile_pic_url
        });
        setCurrentHistoryMonth(new Date());
    };

    const historyDayMap = useMemo(() => {
        if (!historyEmployee) return new Map();
        const map = new Map<string, any>();
        records.filter(r => r.employee_id === historyEmployee.id).forEach(r => {
            if (r.daily_breakdown && Array.isArray(r.daily_breakdown)) {
                r.daily_breakdown.forEach(d => {
                    map.set(d.date, { status: d.status, recordStatus: r.status });
                });
            }
        });
        return map;
    }, [records, historyEmployee]);

    const handlePrevMonth = () => setCurrentHistoryMonth(new Date(currentHistoryMonth.getFullYear(), currentHistoryMonth.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentHistoryMonth(new Date(currentHistoryMonth.getFullYear(), currentHistoryMonth.getMonth() + 1, 1));

    const historyCalendarGrid = useMemo(() => {
        if (!historyEmployee) return [];
        const year = currentHistoryMonth.getFullYear();
        const month = currentHistoryMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const currentMonthDays = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({ num: prevMonthLastDay - i, isCurrentMonth: false, dateStr: '' });
        }

        const todayStr = new Date().toISOString().split('T')[0];
        for (let i = 1; i <= currentMonthDays; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const data = historyDayMap.get(dateStr);
            days.push({
                num: i,
                isCurrentMonth: true,
                dateStr,
                isToday: dateStr === todayStr,
                data: data || null
            });
        }

        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({ num: i, isCurrentMonth: false, dateStr: '' });
        }
        return days;
    }, [currentHistoryMonth, historyDayMap, historyEmployee]);

    const getDayClass = (status: string) => {
        if (status === 'Present') return 'bg-present text-present';
        if (status === 'Absent') return 'bg-absent text-absent';
        if (status === 'Leave') return 'bg-leave text-leave';
        if (status === 'Holiday') return 'bg-holiday text-holiday';
        return '';
    };

    return (
        <div className="admin-attendance-container">
            <div className="page-header flex-between mb-30">
                <div>
                    <h1 className="page-title">Weekly Attendance Review</h1>
                    <p className="page-subtitle">Approve or reject employee timesheets. Approved LOP days map directly to payroll.</p>
                </div>
            </div>

            <div className="filters-bar glass mb-20" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Search input */}
                <div className="search-wrapper" style={{ flex: '1', minWidth: '200px' }}>
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search employee name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                {/* Employee Filter — custom styled dropdown */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{
                        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                        color: selectedEmployee ? 'var(--color-primary)' : 'var(--text-muted)',
                        pointerEvents: 'none', display: 'flex', alignItems: 'center'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <select
                        value={selectedEmployee}
                        onChange={e => setSelectedEmployee(e.target.value)}
                        style={{
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            paddingLeft: '36px',
                            paddingRight: '36px',
                            paddingTop: '10px',
                            paddingBottom: '10px',
                            border: selectedEmployee
                                ? '1.5px solid var(--color-primary)'
                                : '1.5px solid var(--border-color)',
                            borderRadius: '10px',
                            background: selectedEmployee
                                ? 'var(--color-primary-light)'
                                : 'var(--bg-card)',
                            color: selectedEmployee ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontWeight: selectedEmployee ? 700 : 500,
                            fontSize: '14px',
                            cursor: 'pointer',
                            minWidth: '190px',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxShadow: selectedEmployee ? '0 0 0 3px rgb(110 64 255 / 0.12)' : 'none',
                        }}
                    >
                        <option value="">All Employees</option>
                        {uniqueEmployees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </select>
                    {/* Chevron icon */}
                    <div style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        pointerEvents: 'none', color: selectedEmployee ? 'var(--color-primary)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center'
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                    {/* Clear button — only when an employee is selected */}
                    {selectedEmployee && (
                        <button
                            onClick={() => setSelectedEmployee('')}
                            title="Clear filter"
                            style={{
                                position: 'absolute', right: '-10px', top: '-8px',
                                width: '20px', height: '20px', borderRadius: '50%',
                                background: 'var(--color-primary)', color: '#fff',
                                border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 900,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                lineHeight: 1, boxShadow: '0 2px 6px rgba(110,64,255,0.4)'
                            }}
                        >×</button>
                    )}
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Refresh + Status filters */}
                <div className="flex gap-10" style={{ flexShrink: 0 }}>
                    <button className="filter-btn icon-only" onClick={refresh} title="Refresh Records">
                        <RefreshCw size={18} />
                    </button>
                    {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(filter => (
                        <button
                            key={filter}
                            className={`filter-btn ${statusFilter === filter ? 'active' : ''}`}
                            onClick={() => setStatusFilter(filter)}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="data-table-card glass">
                <div className="table-header">
                    <div className="col-emp">Employee</div>
                    <div className="col-week">Timesheet Range</div>
                    <div className="col-days">Breakdown</div>
                    <div className="col-lop">LOP / Leave</div>
                    <div className="col-status">Status</div>
                    <div className="col-actions text-right">Actions</div>
                </div>

                <div className="table-body">
                    {loading ? (
                        <div className="center-msg">Loading records...</div>
                    ) : error ? (
                        <div className="center-msg error"><AlertCircle size={20} /> {error}</div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="center-msg empty">No timesheets found matching criteria.</div>
                    ) : (
                        filteredRecords.map(record => (
                            <div key={record.id} className="table-row">
                                <div className="col-emp">
                                    <div className="emp-info">
                                        {record.profile?.profile_pic_url ? (
                                            <img src={record.profile.profile_pic_url} alt="Profile" className="avatar" />
                                        ) : (
                                            <div className="avatar text-avatar">
                                                {record.profile?.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="emp-name">{record.profile?.full_name || 'Unknown User'}</p>
                                            <p className="emp-id">{record.profile?.custom_id || record.employee_id.substring(0, 8)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-week">
                                    <div className="date-pill">
                                        <Calendar size={14} />
                                        <span>
                                            {new Date(record.week_start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            {' - '}
                                            {new Date(record.week_end_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-days">
                                    {record.daily_breakdown && Array.isArray(record.daily_breakdown) ? (
                                        <div className="mini-breakdown-track">
                                            {record.daily_breakdown.map((d: any, idx: number) => {
                                                const dayString = d.day || (d.date ? new Date(d.date).toLocaleDateString([], { weekday: 'short' }) : 'D');
                                                return (
                                                    <div key={d.date || `mini-${idx}`} className={`mini-b-day ${d.status?.toLowerCase()}`} title={`${dayString}: ${d.status}`}>
                                                        {dayString.charAt(0).toUpperCase()}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-muted text-sm">{record.days_present} Present</div>
                                    )}
                                </div>
                                <div className="col-lop flex gap-6 wrap">
                                    {record.days_lop > 0 && <span className="pill pill-danger">{record.days_lop} Absent</span>}
                                    {record.days_paid_leave > 0 && <span className="pill pill-primary">{record.days_paid_leave} Leave</span>}
                                    {record.days_holiday > 0 && <span className="pill pill-purple">{record.days_holiday} Holiday</span>}
                                    {record.days_lop === 0 && record.days_paid_leave === 0 && (record.days_holiday || 0) === 0 && <span className="text-muted text-sm">Worked Full</span>}
                                </div>
                                <div className="col-status">
                                    <span className={`status-badge ${getStatusStyles(record.status)}`}>
                                        {record.status}
                                    </span>
                                </div>
                                <div className="col-actions flex-end gap-10">
                                    <button
                                        className="btn-action secondary icon-btn"
                                        onClick={() => openHistoryModal(record)}
                                        title="View Full History"
                                    >
                                        <History size={16} /> History
                                    </button>
                                    <button
                                        className="btn-action primary"
                                        onClick={() => openActionModal(record)}
                                        disabled={isEditingFrozen(record)}
                                        title={isEditingFrozen(record) ? "Editing locked after the 10th for past months" : "Review Timesheet"}
                                    >
                                        Review
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Admin History Modal */}
            {
                historyEmployee && (
                    <div className="modal-overlay">
                        <div className="custom-modal history-modal">
                            <div className="cm-header flex-between">
                                <div className="flex align-center gap-10">
                                    {historyEmployee.pic ? (
                                        <img src={historyEmployee.pic} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                                    ) : (
                                        <div className="avatar text-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                                            {historyEmployee.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="cm-title" style={{ fontSize: 18 }}>{historyEmployee.name}'s History</h2>
                                        <p className="cm-user" style={{ fontSize: 12 }}>{historyEmployee.custom_id}</p>
                                    </div>
                                </div>
                                <button className="btn-ghost icon-btn" onClick={() => setHistoryEmployee(null)}><XCircle size={24} color="#888" /></button>
                            </div>

                            <div className="cm-body-box" style={{ padding: '20px 30px', background: '#fff' }}>
                                <div className="mc-header flex-between mb-20" style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <button className="icon-btn" onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
                                    <h3 className="mc-title" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                                        {currentHistoryMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <button className="icon-btn" onClick={handleNextMonth}><ChevronRight size={20} /></button>
                                </div>

                                <div className="mc-grid">
                                    <div className="mc-dayname">Sun</div>
                                    <div className="mc-dayname">Mon</div>
                                    <div className="mc-dayname">Tue</div>
                                    <div className="mc-dayname">Wed</div>
                                    <div className="mc-dayname">Thu</div>
                                    <div className="mc-dayname">Fri</div>
                                    <div className="mc-dayname">Sat</div>

                                    {historyCalendarGrid.map((day, idx) => (
                                        <div key={idx} className={`mc-cell ${day.isCurrentMonth ? '' : 'faded'} ${day.isToday ? 'today' : ''}`}>
                                            <div className="mc-num">{day.num}</div>
                                            {day.data && (
                                                <div className={`mc-data ${getDayClass(day.data.status)}`}>
                                                    <span className="mc-status-txt">{day.data.status.substring(0, 3)}</span>
                                                    {day.data.recordStatus === 'Pending' && <Clock size={10} className="mc-badge-ico" />}
                                                    {day.data.recordStatus === 'Approved' && <CheckCircle2 size={10} className="mc-badge-ico text-success" />}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mc-legend mt-20" style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                                    <div className="lg-item"><span className="lg-dot bg-present"></span> Present</div>
                                    <div className="lg-item"><span className="lg-dot bg-absent"></span> Absent</div>
                                    <div className="lg-item"><span className="lg-dot bg-leave"></span> Leave</div>
                                    <div className="lg-item"><span className="lg-dot bg-holiday"></span> Holiday</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Premium Action Modal (Review Edit) */}
            {
                selectedRecord && (
                    <div className="modal-overlay">
                        <div className="custom-modal">
                            <div className="cm-header">
                                <h2 className="cm-title">Review Timesheet</h2>
                                <p className="cm-user">
                                    {selectedRecord.profile?.full_name} <span className="text-muted">({selectedRecord.profile?.custom_id})</span>
                                </p>
                            </div>

                            <div className="cm-body-box">
                                <div className="cm-dates-row">
                                    <div className="cm-date-card">
                                        <div className="cm-label">WEEK START</div>
                                        <div className="cm-date-val">{new Date(selectedRecord.week_start_date).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' })}</div>
                                    </div>
                                    <div className="cm-date-card">
                                        <div className="cm-label">WEEK END</div>
                                        <div className="cm-date-val">{new Date(selectedRecord.week_end_date).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' })}</div>
                                    </div>
                                </div>

                                <div className="cm-stats-row">
                                    <div className="cm-stat-pill c-present">
                                        <span className="cm-stat-num">{currentStats.present}</span>
                                        <span className="cm-stat-txt">Present</span>
                                    </div>
                                    <div className="cm-stat-pill c-absent">
                                        <span className="cm-stat-num">{currentStats.absent}</span>
                                        <span className="cm-stat-txt">Absent (LOP)</span>
                                    </div>
                                    <div className="cm-stat-pill c-leave">
                                        <span className="cm-stat-num">{currentStats.leave}</span>
                                        <span className="cm-stat-txt">Paid Leave</span>
                                    </div>
                                    <div className="cm-stat-pill c-holiday">
                                        <span className="cm-stat-num">{currentStats.holiday}</span>
                                        <span className="cm-stat-txt">Holiday</span>
                                    </div>
                                </div>

                                <div className="cm-breakdown-card">
                                    <div className="cm-label text-left mb-8">DAILY BREAKDOWN <span style={{ fontSize: '10px', textTransform: 'none', opacity: 0.6 }}>(Click to correct)</span></div>
                                    <div className="cm-db-track">
                                        {editableBreakdown.length > 0 ? editableBreakdown.map((d: any, idx: number) => {
                                            const dayString = d.day || (d.date ? new Date(d.date).toLocaleDateString([], { weekday: 'short' }) : 'DAY');
                                            return (
                                                <button
                                                    key={d.date || `mod-${idx}`}
                                                    className={`cm-db-day ${d.status?.toLowerCase()}`}
                                                    onClick={() => cycleDailyStatus(idx)}
                                                    title="Click to change status"
                                                    type="button"
                                                >
                                                    <span className="cm-db-dayname">{dayString.substring(0, 3).toUpperCase()}</span>
                                                    <span className="cm-db-status">{d.status}</span>
                                                </button>
                                            )
                                        }) : (
                                            <div className="text-muted text-center w-100" style={{ fontSize: '13px', padding: '10px' }}>
                                                No daily breakdown data for this older record.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="cm-notes-group">
                                    <label className="flex align-center gap-8">
                                        <input type="checkbox" checked={true} readOnly className="cm-checkbox" />
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>Optional Admin Notes</span>
                                    </label>
                                    <textarea
                                        className="cm-textarea"
                                        placeholder="Leave a note for the employee explaining rejection or modifications..."
                                        rows={3}
                                        value={adminNotes}
                                        onChange={e => setAdminNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="cm-footer">
                                <button className="cm-btn btn-ghost" onClick={() => setSelectedRecord(null)}>Cancel</button>
                                <div className="flex gap-10">
                                    <button
                                        className="cm-btn btn-reject"
                                        onClick={() => handleUpdate('Rejected')}
                                        disabled={updating}
                                    >
                                        Reject
                                    </button>
                                    <button
                                        className="cm-btn btn-approve"
                                        onClick={() => handleUpdate('Approved')}
                                        disabled={updating}
                                    >
                                        Approve
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <style>{`
                .admin-attendance-container { padding: 0 10px; max-width: 1400px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }
                .flex { display: flex; }
                .flex-between { display: flex; justify-content: space-between; align-items: center; }
                .flex-end { display: flex; justify-content: flex-end; align-items: center; }
                .align-center { align-items: center; }
                .wrap { flex-wrap: wrap; }
                .gap-6 { gap: 6px; }
                .gap-8 { gap: 8px; }
                .gap-10 { gap: 10px; }
                .mb-8 { margin-bottom: 8px; }
                .mb-20 { margin-bottom: 20px; }
                .mb-30 { margin-bottom: 30px; }
                .mt-20 { margin-top: 20px; }
                .w-100 { width: 100%; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                
                .page-title { font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
                .page-subtitle { color: var(--text-muted); font-size: 15px; }

                /* Filters UI */
                .filters-bar { padding: 16px; border-radius: 16px; border: 1px solid var(--border-color); }
                .search-wrapper { position: relative; width: 300px; }
                .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
                .search-input { width: 100%; padding: 12px 16px 12px 42px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-primary); }
                .search-input:focus { border-color: var(--color-primary); outline: none; }
                
                .filter-btn { padding: 10px 16px; border-radius: 10px; border: 1px solid transparent; background: transparent; color: var(--text-secondary); font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
                .filter-btn:hover { background: var(--bg-main); }
                .filter-btn.active { background: var(--bg-main); border-color: var(--border-color); color: var(--text-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .filter-btn.icon-only { padding: 10px; }

                /* Table UI */
                .data-table-card { border-radius: 20px; border: 1px solid var(--border-color); overflow: hidden; }
                .table-header { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.5fr 1.5fr; padding: 18px 24px; background: var(--bg-block); border-bottom: 1px solid var(--border-color); font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); }
                .table-row { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.5fr 1.5fr; padding: 20px 24px; align-items: center; border-bottom: 1px solid var(--border-color); transition: background 0.2s; }
                .table-row:hover { background: var(--bg-block); }
                .table-row:last-child { border-bottom: none; }

                /* Avatars */
                .emp-info { display: flex; align-items: center; gap: 14px; }
                .avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
                .text-avatar { background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; }
                .emp-name { font-weight: 700; color: var(--text-primary); font-size: 15px; margin-bottom: 2px; }
                .emp-id { font-size: 12px; color: var(--text-muted); font-family: monospace; }
                
                /* Badges and Pills */
                .date-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 50px; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
                .text-sm { font-size: 13px; }
                .text-muted { color: var(--text-muted); }
                
                .pill { padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; border: 1px solid transparent; white-space: nowrap; }
                .pill-danger { background: rgba(255, 75, 75, 0.1); color: #FF4B4B; border-color: rgba(255, 75, 75, 0.3); }
                .pill-primary { background: rgba(0, 173, 239, 0.1); color: #00ADEF; border-color: rgba(0, 173, 239, 0.3); }
                .pill-purple { background: rgba(108, 93, 211, 0.1); color: #6C5DD3; border-color: rgba(108, 93, 211, 0.3); }
                
                .status-badge { padding: 6px 14px; border-radius: 50px; font-size: 12px; font-weight: 800; text-transform: uppercase; border: 1px solid transparent; display: inline-block; }
                .bg-success { background: rgba(0, 191, 165, 0.1); } .text-success { color: #00BFA5; } .border-success { border-color: rgba(0, 191, 165, 0.3); }
                .bg-danger { background: rgba(255, 75, 75, 0.1); } .text-danger { color: #FF4B4B; } .border-danger { border-color: rgba(255, 75, 75, 0.3); }
                .bg-warning { background: rgba(255, 159, 28, 0.1); } .text-warning { color: #FF9F1C; } .border-warning { border-color: rgba(255, 159, 28, 0.3); }

                /* Buttons */
                .btn-action { padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
                .btn-action.primary { background: var(--color-primary-light); color: var(--color-primary); border-color: rgba(98, 50, 255, 0.2); }
                .btn-action.primary:hover { background: var(--color-primary); color: white; }
                
                .btn-action.secondary { background: var(--bg-main); color: var(--text-secondary); border-color: var(--border-color); }
                .btn-action.secondary:hover { background: var(--bg-block); color: var(--text-primary); }

                .icon-btn { display: flex; align-items: center; gap: 6px; }

                /* Mini Breakdown Track */
                .mini-breakdown-track { display: flex; gap: 3px; max-width: 150px; overflow: hidden; border-radius: 6px; }
                .mini-b-day { flex: 1; text-align: center; color: white; font-size: 10px; font-weight: 800; padding: 4px 0; border-radius: 4px; }
                .mini-b-day.present { background: #00BFA5; }
                .mini-b-day.absent { background: #FF4B4B; }
                .mini-b-day.leave { background: #00ADEF; }
                .mini-b-day.holiday { background: #6C5DD3; }

                /* Premium Custom Modals */
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s; }
                
                .custom-modal { width: 100%; max-width: 500px; background: #ffffff; border-radius: 20px; box-shadow: 0 30px 60px rgba(0,0,0,0.15); overflow: hidden; display: flex; flex-direction: column; }
                .custom-modal.history-modal { max-width: 600px; }
                
                .cm-header { display: flex; justify-content: space-between; align-items: center; padding: 24px 30px; border-bottom: 1px solid #f0f0f0; }
                .cm-title { font-size: 20px; font-weight: 800; color: #111; margin: 0; }
                .cm-user { font-size: 14px; font-weight: 600; color: #555; margin: 0; }
                
                .cm-body-box { padding: 24px 30px; background: #f4f5f7; display: flex; flex-direction: column; gap: 16px; }
                
                .cm-dates-row { display: flex; gap: 16px; }
                .cm-date-card { flex: 1; background: #fff; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
                .cm-label { font-size: 11px; font-weight: 800; color: #888; text-transform: uppercase; margin-bottom: 6px; }
                .cm-date-val { font-size: 15px; font-weight: 800; color: #333; }
                
                .cm-stats-row { display: flex; gap: 10px; }
                .cm-stat-pill { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 0; border-radius: 12px; gap: 4px; }
                .cm-stat-num { font-size: 20px; font-weight: 800; }
                .cm-stat-txt { font-size: 11px; font-weight: 600; }
                
                .c-present { background: rgba(0, 191, 165, 0.15); color: #009681; } .c-present .cm-stat-num { color: #00BFA5; }
                .c-absent { background: rgba(255, 75, 75, 0.15); color: #cc3c3c; } .c-absent .cm-stat-num { color: #FF4B4B; }
                .c-leave { background: rgba(0, 173, 239, 0.15); color: #008abf; } .c-leave .cm-stat-num { color: #00ADEF; }
                .c-holiday { background: rgba(108, 93, 211, 0.15); color: #564aa8; } .c-holiday .cm-stat-num { color: #6C5DD3; }
                
                .cm-breakdown-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
                .cm-db-track { display: flex; gap: 6px; width: 100%; }
                .cm-db-day { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 0; border-radius: 8px; border: none; color: white; gap: 2px; cursor: pointer; transition: transform 0.1s; }
                .cm-db-day:hover { transform: scale(1.05); } .cm-db-day:active { transform: scale(0.95); }
                .cm-db-dayname { font-size: 11px; font-weight: 800; text-transform: uppercase; }
                .cm-db-status { font-size: 9px; font-weight: 700; opacity: 0.9; }
                .cm-db-day.present { background: #00BFA5; } .cm-db-day.absent { background: #FF4B4B; } .cm-db-day.leave { background: #00ADEF; } .cm-db-day.holiday { background: #6C5DD3; }
                
                .cm-notes-group { margin-top: 4px; display: flex; flex-direction: column; gap: 8px; }
                .cm-checkbox { width: 14px; height: 14px; accent-color: #6C5DD3; }
                .cm-textarea { width: 100%; padding: 16px; border-radius: 12px; border: 1px solid #e0e0e0; background: #fff; color: #333; font-family: inherit; font-size: 13px; resize: vertical; }
                .cm-textarea:focus { border-color: #6C5DD3; outline: none; }
                
                .cm-footer { display: flex; justify-content: space-between; align-items: center; padding: 20px 30px; background: #fff; border-top: 1px solid #f0f0f0; }
                .cm-btn { padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; transition: all 0.2s; }
                .cm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-ghost { background: transparent; color: #555; } .btn-ghost:hover { background: #f0f0f0; }
                .btn-reject { background: #FF4B4B; color: white; box-shadow: 0 4px 12px rgba(255, 75, 75, 0.2); } .btn-reject:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(255, 75, 75, 0.3); }
                .btn-approve { background: #00BFA5; color: white; box-shadow: 0 4px 12px rgba(0, 191, 165, 0.2); } .btn-approve:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 191, 165, 0.3); }

                /* Month Calendar UI (Admin) */
                .mc-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
                .mc-dayname { text-align: center; font-size: 13px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; padding: 10px 0; }
                
                .mc-cell { aspect-ratio: 1; background: #f8f9fa; border: 1px solid #eee; border-radius: 10px; padding: 6px; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
                .mc-cell.faded { opacity: 0.3; background: transparent; border-color: transparent; }
                .mc-cell.today { border: 2px solid var(--color-primary); }
                
                .mc-num { font-size: 13px; font-weight: 700; color: #333; }
                
                .mc-data { padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; margin-top: auto; }
                
                .bg-present { background: rgba(0, 191, 165, 0.15); } .text-present { color: #00BFA5; }
                .bg-absent { background: rgba(255, 75, 75, 0.15); } .text-absent { color: #FF4B4B; }
                .bg-leave { background: rgba(0, 173, 239, 0.15); } .text-leave { color: #00ADEF; }
                .bg-holiday { background: rgba(108, 93, 211, 0.15); } .text-holiday { color: #6C5DD3; }
                
                .lg-item { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #555; }
                .lg-dot { width: 12px; height: 12px; border-radius: 50%; opacity: 0.8; }
                .lg-dot.bg-present { background: #00BFA5; } .lg-dot.bg-absent { background: #FF4B4B; } .lg-dot.bg-leave { background: #00ADEF; } .lg-dot.bg-holiday { background: #6C5DD3; }

                .center-msg { display: flex; align-items: center; justify-content: center; height: 300px; color: var(--text-muted); font-size: 15px; font-weight: 500; }
                .center-msg.error { color: #FF4B4B; gap: 8px; }

                @media (max-width: 1200px) {
                    .table-header, .table-row { grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.5fr; }
                    .col-actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
                }
            `}</style>
        </div >
    );
};

export default AdminAttendance;
