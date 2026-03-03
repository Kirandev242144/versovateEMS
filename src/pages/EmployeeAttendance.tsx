import React, { useState, useEffect, useMemo } from 'react';
import { useAttendance } from '../hooks/useAttendance';
import { Calendar as CalendarIcon, Save, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, List, CalendarDays } from 'lucide-react';

type DayStatus = 'Present' | 'Absent' | 'Leave' | 'Holiday';

interface DailyRecord {
    date: string;
    day: string;
    status: DayStatus;
    isFuture: boolean;
}

const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const EmployeeAttendance: React.FC = () => {
    const { records, loading, error, submitAttendance, refresh, userProfile } = useAttendance();
    const [submitting, setSubmitting] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    // WEEK FORM STATE
    const [weekOffset, setWeekOffset] = useState(0);
    const [weekStart, setWeekStart] = useState('');
    const [weekEnd, setWeekEnd] = useState('');
    const [dailyStatuses, setDailyStatuses] = useState<DailyRecord[]>([]);

    // HISTORY PANEL STATE
    const [historyView, setHistoryView] = useState<'calendar' | 'list'>('calendar');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate the Sunday of the target week (current + offset)
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + (weekOffset * 7));

        const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ...
        const targetStart = new Date(targetDate);
        targetStart.setDate(targetDate.getDate() - dayOfWeek); // Go back to Sunday

        const targetEnd = new Date(targetStart);
        targetEnd.setDate(targetStart.getDate() + 6); // End on Saturday

        setWeekStart(formatLocalDate(targetStart));
        setWeekEnd(formatLocalDate(targetEnd));

        const workingDays = userProfile?.work_days || [1, 2, 3, 4, 5]; // Default Mon-Fri

        const initialDays: DailyRecord[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(targetStart);
            d.setDate(targetStart.getDate() + i);
            d.setHours(0, 0, 0, 0);

            const isFuture = d > today;
            const isWorkingDay = workingDays.includes(d.getDay());

            initialDays.push({
                date: formatLocalDate(d),
                day: d.toLocaleDateString([], { weekday: 'short' }),
                status: !isWorkingDay ? 'Holiday' : (isFuture ? 'Absent' : 'Present'),
                isFuture
            });
        }
        setDailyStatuses(initialDays);
        setHasInteracted(false); // Reset interaction state when week changes
    }, [weekOffset, userProfile]);

    const handleNextWeek = () => { if (weekOffset < 0) setWeekOffset(prev => prev + 1); };
    const handlePrevWeek = () => { setWeekOffset(prev => prev - 1); };

    const isAlreadySubmitted = useMemo(() => {
        return records.some(r => r.week_start_date === weekStart);
    }, [records, weekStart]);

    const handleStatusChange = (index: number, newStatus: DayStatus) => {
        if (dailyStatuses[index].isFuture) return;
        setHasInteracted(true);
        setDailyStatuses(prev => {
            const updated = [...prev];
            updated[index].status = newStatus;
            return updated;
        });
    };

    const stats = useMemo(() => {
        if (!hasInteracted) return { present: 0, absent: 0, leave: 0, holiday: 0 };
        return dailyStatuses.reduce((acc, curr) => {
            if (!curr.isFuture) {
                if (curr.status === 'Present') acc.present++;
                if (curr.status === 'Absent') acc.absent++;
                if (curr.status === 'Leave') acc.leave++;
                if (curr.status === 'Holiday') acc.holiday++;
            }
            return acc;
        }, { present: 0, absent: 0, leave: 0, holiday: 0 });
    }, [dailyStatuses, hasInteracted]);

    const handleActionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isAlreadySubmitted) return;

        try {
            setSubmitting(true);
            await submitAttendance({
                week_start_date: weekStart,
                week_end_date: weekEnd,
                days_present: stats.present,
                days_paid_leave: stats.leave,
                days_lop: stats.absent,
                days_holiday: stats.holiday,
                daily_breakdown: dailyStatuses.map(d => ({ date: d.date, day: d.day, status: d.status }))
            });
            alert('Weekly timesheet submitted successfully!');
            refresh();
        } catch (err: any) {
            console.error('Submit Error:', err);
            if (err.message?.includes('duplicate key value') || err.message?.includes('unique constraint')) {
                alert("You have already submitted a timesheet for this exact week start date. Please wait for Approval.");
            } else {
                alert(err.message || 'Failed to submit timesheet.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status: string) => {
        if (status === 'Approved') return <CheckCircle2 size={16} className="status-ico approved" />;
        if (status === 'Rejected') return <XCircle size={16} className="status-ico rejected" />;
        return <Clock size={16} className="status-ico pending" />;
    };

    // --- CALENDAR HISTORY LOGIC ---

    // Map of ALL submitted days across all records for fast lookup
    const historyDayMap = useMemo(() => {
        const map = new Map<string, any>();
        records.forEach(r => {
            if (r.daily_breakdown && Array.isArray(r.daily_breakdown)) {
                r.daily_breakdown.forEach(d => {
                    map.set(d.date, { status: d.status, recordStatus: r.status });
                });
            }
        });
        return map;
    }, [records]);

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const calendarGrid = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const currentMonthDays = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

        const days = [];

        // Pad previous month
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                num: prevMonthLastDay - i,
                isCurrentMonth: false,
                dateStr: ''
            });
        }

        // Add current month days
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

        // Pad next month
        const remainingCells = 42 - days.length; // 6 rows * 7
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                num: i,
                isCurrentMonth: false,
                dateStr: ''
            });
        }

        return days;
    }, [currentMonth, historyDayMap]);

    const monthlyStats = useMemo(() => {
        let p = 0, a = 0, l = 0, h = 0;

        // Define the Payroll bounds: 10th of PREVIOUS month, to 9th of CURRENT month
        const cycleStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 10);
        const cycleEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 9);

        // Iterate through all historical days we've fetched
        historyDayMap.forEach((data, dateStr) => {
            const d = new Date(dateStr);
            // In JavaScript, Date comparisons work cleanly with operators if both are Date objects.
            // Reset hours to ensure clean comparisons
            d.setHours(0, 0, 0, 0);
            cycleStart.setHours(0, 0, 0, 0);
            cycleEnd.setHours(0, 0, 0, 0);

            if (d >= cycleStart && d <= cycleEnd) {
                if (data.status === 'Present') p++;
                if (data.status === 'Absent') a++;
                if (data.status === 'Leave') l++;
                if (data.status === 'Holiday') h++;
            }
        });

        return { present: p, absent: a, leave: l, holiday: h };
    }, [currentMonth, historyDayMap]);

    const getDayClass = (status: string) => {
        if (status === 'Present') return 'bg-present text-present';
        if (status === 'Absent') return 'bg-absent text-absent';
        if (status === 'Leave') return 'bg-leave text-leave';
        if (status === 'Holiday') return 'bg-holiday text-holiday';
        return '';
    };

    return (
        <div className="my-attendance-container">
            <div className="top-header">
                <div>
                    <h1 className="page-title">My Weekly Attendance</h1>
                    <p className="page-subtitle">Submit your schedule for the rolling 7-day period ending today.</p>
                </div>
            </div>

            <div className="split-layout">
                {/* Left Side: Submission Form */}
                <div className="form-panel glass">
                    <div className="panel-header flex-between flex-wrap">
                        <div className="ph-left flex align-center gap-10">
                            <CalendarIcon size={22} className="color-primary" />
                            <h2>Weekly Timesheet</h2>
                        </div>

                        <div className="week-navigator">
                            <button className="nav-btn" onClick={handlePrevWeek}><ChevronLeft size={18} /></button>
                            <span className="week-badge">
                                {new Date(weekStart).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                {' - '}
                                {new Date(weekEnd).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                            <button className="nav-btn" onClick={handleNextWeek} disabled={weekOffset >= 0}><ChevronRight size={18} /></button>
                        </div>
                    </div>

                    <form className="timesheet-form" onSubmit={handleActionSubmit}>
                        {new Date().getDay() === 5 && !isAlreadySubmitted && (
                            <div className="friday-reminder-banner mb-20">
                                <AlertCircle size={20} />
                                <div className="fr-content">
                                    <strong>It's Friday!</strong>
                                    <p>Please remember to review and submit your weekly timesheet before you head out.</p>
                                </div>
                                <button type="button" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="fr-btn">
                                    Submit Now
                                </button>
                            </div>
                        )}
                        <div className="calendar-ui mb-30">
                            {dailyStatuses.map((dayObj, i) => {
                                const isHoliday = dayObj.status === 'Holiday';
                                return (
                                    <div key={dayObj.date} className={`cal-day-col ${dayObj.isFuture ? 'future-day' : ''} ${isHoliday ? 'holiday-col' : ''}`}>
                                        <div className="cal-header">
                                            <div className="cd-name">{dayObj.day}</div>
                                            <div className={`cd-num ${dayObj.date === new Date().toISOString().split('T')[0] ? 'today' : ''}`}>
                                                {new Date(dayObj.date).getDate()}
                                            </div>
                                        </div>
                                        <div className="cal-body">
                                            {dayObj.isFuture ? (
                                                <div className="future-blocker">Future<br />Date</div>
                                            ) : (
                                                <div className="status-radio-group">
                                                    {(['Present', 'Absent', 'Leave', 'Holiday'] as DayStatus[]).map(s => (
                                                        <label
                                                            key={s}
                                                            className={`radio-label ${s.toLowerCase()} ${dayObj.status === s ? 'selected' : ''}`}
                                                            style={{
                                                                opacity: (isHoliday && s !== 'Holiday' && !hasInteracted) ? 0.3 : 1,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`status-${i}`}
                                                                checked={dayObj.status === s}
                                                                onChange={() => handleStatusChange(i, s)}
                                                            />
                                                            <span>{s}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="stats-summary-box mb-30">
                            <div className="stats-row">
                                <div className="stat-item">
                                    <span className="s-val text-primary">{stats.present}</span>
                                    <span className="s-lbl">Worked Days</span>
                                </div>
                                <div className="stat-item">
                                    <span className="s-val text-danger">{stats.absent}</span>
                                    <span className="s-lbl">Absent (LOP)</span>
                                </div>
                                <div className="stat-item">
                                    <span className="s-val text-info">{stats.leave}</span>
                                    <span className="s-lbl">Leave Days</span>
                                </div>
                                <div className="stat-item">
                                    <span className="s-val text-purple">{stats.holiday}</span>
                                    <span className="s-lbl">Holidays</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`btn-submit ${isAlreadySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={submitting || isAlreadySubmitted}
                            title={isAlreadySubmitted ? "Timesheet already submitted for this exact week" : ""}
                        >
                            {submitting ? <RefreshCw className="spin" size={20} /> : <Save size={20} />}
                            <span>{submitting ? 'Submitting...' : isAlreadySubmitted ? 'Already Submitted' : 'Submit Week to Admin'}</span>
                        </button>
                    </form>
                </div>

                {/* Right Side: History Data (Month Calendar or List) */}
                <div className={`history-panel glass ${historyView === 'calendar' ? 'full-height' : ''}`}>
                    <div className="panel-header border-b flex-between flex-wrap">
                        <h2>My History</h2>
                        <div className="flex gap-10">
                            <div className="view-toggles">
                                <button className={`vt-btn ${historyView === 'calendar' ? 'active' : ''}`} onClick={() => setHistoryView('calendar')} title="Month Calendar"><CalendarDays size={16} /></button>
                                <button className={`vt-btn ${historyView === 'list' ? 'active' : ''}`} onClick={() => setHistoryView('list')} title="List View"><List size={16} /></button>
                            </div>
                            <button className="icon-btn" onClick={refresh} title="Refresh Data">
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="list-wrapper">
                        {loading ? (
                            <div className="center-loader">Loading history...</div>
                        ) : error ? (
                            <div className="center-error"><AlertCircle size={20} /> {error}</div>
                        ) : historyView === 'calendar' ? (
                            <div className="month-calendar">
                                <div className="mc-header flex-between mb-20">
                                    <button className="icon-btn" onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
                                    <h3 className="mc-title">{currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h3>
                                    <button className="icon-btn" onClick={handleNextMonth}><ChevronRight size={20} /></button>
                                </div>

                                {/* MONTHLY STATS CARDS */}
                                <div className="monthly-stats-row mb-20">
                                    <div className="ms-card ms-present">
                                        <span className="ms-val">{monthlyStats.present}</span>
                                        <span className="ms-lbl">Present</span>
                                    </div>
                                    <div className="ms-card ms-absent">
                                        <span className="ms-val">{monthlyStats.absent}</span>
                                        <span className="ms-lbl">Absent</span>
                                    </div>
                                    <div className="ms-card ms-leave">
                                        <span className="ms-val">{monthlyStats.leave}</span>
                                        <span className="ms-lbl">Leave</span>
                                    </div>
                                    <div className="ms-card ms-holiday">
                                        <span className="ms-val">{monthlyStats.holiday}</span>
                                        <span className="ms-lbl">Holiday</span>
                                    </div>
                                </div>

                                <div className="mc-grid">
                                    <div className="mc-dayname">Sun</div>
                                    <div className="mc-dayname">Mon</div>
                                    <div className="mc-dayname">Tue</div>
                                    <div className="mc-dayname">Wed</div>
                                    <div className="mc-dayname">Thu</div>
                                    <div className="mc-dayname">Fri</div>
                                    <div className="mc-dayname">Sat</div>

                                    {calendarGrid.map((day, idx) => (
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
                                <div className="mc-legend mt-20">
                                    <div className="lg-item"><span className="lg-dot bg-present"></span> Present</div>
                                    <div className="lg-item"><span className="lg-dot bg-absent"></span> Absent</div>
                                    <div className="lg-item"><span className="lg-dot bg-leave"></span> Leave</div>
                                    <div className="lg-item"><span className="lg-dot bg-holiday"></span> Holiday</div>
                                </div>
                            </div>
                        ) : records.length === 0 ? (
                            <div className="empty-state">
                                <CalendarIcon size={40} opacity={0.3} />
                                <p>No timesheets submitted yet.</p>
                            </div>
                        ) : (
                            <div className="history-scroll">
                                {records.map(r => (
                                    <div key={r.id} className="history-card">
                                        <div className="hc-top">
                                            <div className="hc-dates">
                                                <strong>{new Date(r.week_start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</strong>
                                                {' - '}
                                                <strong>{new Date(r.week_end_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</strong>
                                            </div>
                                            <div className={`status-badge ${r.status.toLowerCase()}`}>
                                                {getStatusIcon(r.status)}
                                                <span>{r.status}</span>
                                            </div>
                                        </div>

                                        <div className="hc-stats">
                                            <div className="stat-pill"><strong>{r.days_present}</strong> Present</div>
                                            <div className={`stat-pill ${r.days_lop > 0 ? 'lop' : ''}`}><strong>{r.days_lop}</strong> Absent</div>
                                            <div className={`stat-pill ${r.days_paid_leave > 0 ? 'leave' : ''}`}><strong>{r.days_paid_leave}</strong> Leave</div>
                                        </div>

                                        {r.admin_notes && (
                                            <div className="admin-notes">
                                                <strong>Admin Note:</strong> {r.admin_notes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .my-attendance-container {
                    padding: 0 10px;
                    max-width: 1400px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 30px;
                    animation: fadeIn 0.4s ease-out;
                }
                
                .flex { display: flex; }
                .flex-between { display: flex; justify-content: space-between; align-items: center; }
                .align-center { align-items: center; }
                .flex-wrap { flex-wrap: wrap; }
                .gap-10 { gap: 10px; }
                .mb-20 { margin-bottom: 20px; }
                .mb-30 { margin-bottom: 30px; }
                .mt-20 { margin-top: 20px; }
                
                .top-header { margin-bottom: 10px; }
                .page-title { font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
                .page-subtitle { color: var(--text-muted); font-size: 15px; }

                .split-layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 30px; }

                .panel-header { margin-bottom: 24px; }
                .panel-header h2 { font-size: 18px; font-weight: 700; color: var(--text-primary); }
                
                .week-navigator { display: flex; align-items: center; gap: 12px; background: var(--bg-main); padding: 6px; border-radius: 50px; border: 1px solid var(--border-color); }
                .nav-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: var(--bg-block); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
                .nav-btn:hover:not(:disabled) { background: var(--color-primary-light); color: var(--color-primary); }
                .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
                .week-badge { font-size: 13px; font-weight: 800; color: var(--text-primary); padding: 0 8px; white-space: nowrap; }
                
                .panel-header.border-b { padding-bottom: 16px; border-bottom: 1px solid var(--border-color); margin-bottom: 16px; min-height: 48px; }

                .form-panel, .history-panel { padding: 30px; border-radius: 20px; display: flex; flex-direction: column; }
                .history-panel { padding: 24px; max-height: calc(100vh - 180px); }
                .history-panel.full-height { max-height: none; }

                .timesheet-form { display: flex; flex-direction: column; }

                /* View Toggles */
                .view-toggles { display: flex; background: var(--bg-main); border-radius: 8px; border: 1px solid var(--border-color); overflow: hidden; }
                .vt-btn { padding: 6px 12px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
                .vt-btn:hover { color: var(--text-primary); }
                .vt-btn.active { background: var(--color-primary-light); color: var(--color-primary); }

                /* Premium Calendar UI */
                .calendar-ui { display: flex; width: 100%; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; }
                .cal-day-col { flex: 1; display: flex; flex-direction: column; border-right: 1px solid var(--border-color); }
                .cal-day-col.holiday-col { background: rgba(0,0,0,0.02); }
                .holiday-col .cd-name, .holiday-col .cd-num { color: var(--text-muted); opacity: 0.7; }
                .radio-label.holiday.selected { background: #6C5DD3; color: white; border-color: #6C5DD3; }

                .cal-day-col:last-child { border-right: none; }
                .cal-day-col.future-day { background: var(--bg-block); opacity: 0.7; }

                /* Friday Reminder */
                .friday-reminder-banner { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: var(--color-primary-light); border: 1.5px solid var(--color-primary); border-radius: 14px; color: var(--color-primary); animation: slideDown 0.4s ease-out; }
                .fr-content { flex: 1; }
                .fr-content strong { display: block; font-size: 15px; margin-bottom: 2px; }
                .fr-content p { font-size: 13px; opacity: 0.8; margin: 0; line-height: 1.4; }
                .fr-btn { padding: 8px 16px; background: var(--color-primary); color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; transition: 0.2s; white-space: nowrap; }
                .fr-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(98, 50, 255, 0.2); }
                
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                
                .cal-header { padding: 16px 8px; text-align: center; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; align-items: center; gap: 4px; }
                .cd-name { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
                .cd-num { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 16px; font-weight: 800; color: var(--text-primary); }
                .cd-num.today { background: var(--color-primary); color: white; box-shadow: 0 4px 10px rgba(98, 50, 255, 0.3); }

                .cal-body { padding: 16px 8px; flex: 1; display: flex; flex-direction: column; justify-content: flex-start; }
                .future-blocker { text-align: center; font-size: 12px; font-weight: 700; color: var(--text-muted); padding: 20px 0; background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px); border-radius: 8px; }
                
                .status-radio-group { display: flex; flex-direction: column; gap: 6px; }
                .radio-label { display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; transition: 0.2s; }
                .radio-label input { display: none; }
                .radio-label span { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
                .radio-label:hover { background: var(--bg-block); }
                
                .radio-label.selected { background: var(--bg-main); border: 1px solid var(--border-color); }
                .radio-label.selected.present { background: rgba(0, 191, 165, 0.1); border-color: rgba(0, 191, 165, 0.5); }
                .radio-label.selected.present span { color: #00BFA5; }
                .radio-label.selected.absent { background: rgba(255, 75, 75, 0.1); border-color: rgba(255, 75, 75, 0.5); }
                .radio-label.selected.absent span { color: #FF4B4B; }
                .radio-label.selected.leave { background: rgba(0, 173, 239, 0.1); border-color: rgba(0, 173, 239, 0.5); }
                .radio-label.selected.leave span { color: #00ADEF; }
                .radio-label.selected.holiday { background: rgba(108, 93, 211, 0.1); border-color: rgba(108, 93, 211, 0.5); }
                .radio-label.selected.holiday span { color: #6C5DD3; }

                /* Stats Summary Box */
                .stats-summary-box { padding: 24px; border-radius: 16px; background: var(--bg-main); border: 1px solid var(--border-color); }
                .stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; }
                .stat-item { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
                .s-val { font-size: 28px; font-weight: 800; }
                .s-lbl { font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
                
                .text-primary { color: var(--text-primary); }
                .text-danger { color: #FF4B4B; }
                .text-info { color: #00ADEF; }
                .text-purple { color: #6C5DD3; }

                /* Action Button */
                .btn-submit { width: 100%; padding: 16px; border-radius: 14px; background: var(--color-primary); color: white; border: none; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(98, 50, 255, 0.25); }
                .btn-submit:hover:not(:disabled) { background: var(--color-primary-hover); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(98, 50, 255, 0.35); }
                .btn-submit:disabled { background: var(--bg-muted); color: var(--text-muted); cursor: not-allowed; box-shadow: none; }

                /* Month Calendar UI */
                .month-calendar { display: flex; flex-direction: column; height: 100%; }
                .mc-header { background: var(--bg-main); padding: 12px 20px; border-radius: 12px; border: 1px solid var(--border-color); }
                .mc-title { font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0; }
                
                .mc-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 8px;
                    flex: 1;
                }
                .mc-dayname { text-align: center; font-size: 13px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; padding: 10px 0; }
                
                .mc-cell {
                    aspect-ratio: 1;
                    background: var(--bg-main);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 8px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    position: relative;
                }
                .mc-cell.faded { opacity: 0.3; background: transparent; }
                .mc-cell.today { border: 2px solid var(--color-primary); }
                
                .mc-num { font-size: 14px; font-weight: 700; color: var(--text-primary); }
                
                .mc-data {
                    padding: 4px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                
                .bg-present { background: rgba(0, 191, 165, 0.15); } .text-present { color: #00BFA5; }
                .bg-absent { background: rgba(255, 75, 75, 0.15); } .text-absent { color: #FF4B4B; }
                .bg-leave { background: rgba(0, 173, 239, 0.15); } .text-leave { color: #00ADEF; }
                .bg-holiday { background: rgba(108, 93, 211, 0.15); } .text-holiday { color: #6C5DD3; }
                
                .mc-legend { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; padding-top: 20px; border-top: 1px solid var(--border-color); }
                .lg-item { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
                .lg-dot { width: 12px; height: 12px; border-radius: 50%; opacity: 0.8; }
                .lg-dot.bg-present { background: #00BFA5; }
                .lg-dot.bg-absent { background: #FF4B4B; }
                .lg-dot.bg-leave { background: #00ADEF; }
                .lg-dot.bg-holiday { background: #6C5DD3; }

                /* Monthly Stats Cards */
                .monthly-stats-row { display: flex; gap: 8px; }
                .ms-card { flex: 1; padding: 12px 6px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-main); border: 1px solid var(--border-color); }
                .ms-val { font-size: 18px; font-weight: 800; }
                .ms-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
                
                .ms-present { border-color: rgba(0, 191, 165, 0.3); background: rgba(0, 191, 165, 0.05); }
                .ms-present .ms-val { color: #00BFA5; } .ms-present .ms-lbl { color: #009681; }
                
                .ms-absent { border-color: rgba(255, 75, 75, 0.3); background: rgba(255, 75, 75, 0.05); }
                .ms-absent .ms-val { color: #FF4B4B; } .ms-absent .ms-lbl { color: #D32F2F; }
                
                .ms-leave { border-color: rgba(0, 173, 239, 0.3); background: rgba(0, 173, 239, 0.05); }
                .ms-leave .ms-val { color: #00ADEF; } .ms-leave .ms-lbl { color: #007BB5; }
                
                .ms-holiday { border-color: rgba(108, 93, 211, 0.3); background: rgba(108, 93, 211, 0.05); }
                .ms-holiday .ms-val { color: #6C5DD3; } .ms-holiday .ms-lbl { color: #5142B2; }

                /* Premium List View Elements */
                .list-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
                .history-scroll { overflow-y: auto; padding-right: 8px; display: flex; flex-direction: column; gap: 16px; }
                .history-scroll::-webkit-scrollbar { width: 6px; }
                .history-scroll::-webkit-scrollbar-track { background: transparent; }
                .history-scroll::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
                .history-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

                .history-card { padding: 20px; background: var(--bg-block); border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; gap: 16px; transition: transform 0.2s; }
                .history-card:hover { transform: translateY(-2px); border-color: var(--color-primary-light); }

                .hc-top { display: flex; justify-content: space-between; align-items: center; }
                .hc-dates { font-size: 15px; color: var(--text-primary); }

                .status-badge { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 50px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
                .status-badge.pending { background: rgba(255, 159, 28, 0.1); color: #FF9F1C; }
                .status-badge.approved { background: rgba(0, 191, 165, 0.1); color: #00BFA5; }
                .status-badge.rejected { background: rgba(255, 75, 75, 0.1); color: #FF4B4B; }

                .hc-stats { display: flex; gap: 8px; flex-wrap: wrap; }
                .stat-pill { padding: 4px 10px; border-radius: 8px; background: var(--bg-main); border: 1px solid var(--border-color); font-size: 12px; color: var(--text-secondary); }
                .stat-pill.lop { border-color: rgba(255, 75, 75, 0.3); color: #FF4B4B; }
                .stat-pill.leave { border-color: rgba(0, 173, 239, 0.3); color: #00ADEF; }
                .stat-pill.holiday { border-color: rgba(108, 93, 211, 0.3); color: #6C5DD3; }

                .admin-notes { padding: 12px; background: rgba(255, 159, 28, 0.05); border-left: 3px solid #FF9F1C; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }

                .icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s; }
                .icon-btn:hover { background: var(--bg-block); color: var(--text-primary); }

                .empty-state, .center-loader, .center-error {
                    display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: var(--text-muted); font-size: 15px; font-weight: 500; gap: 12px;
                }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                
                @media (max-width: 1200px) {
                    .split-layout { grid-template-columns: 1fr; }
                    .history-panel { max-height: max-content; }
                    .calendar-ui { flex-direction: column; border-radius: 12px; }
                    .cal-day-col { flex-direction: row; border-right: none; border-bottom: 1px solid var(--border-color); align-items: center; justify-content: space-between; padding: 0 16px; }
                    .cal-day-col:last-child { border-bottom: none; }
                    .cal-header { border-bottom: none; flex-direction: row; gap: 16px; text-align: left; }
                    .cal-body { align-items: flex-end; }
                    .status-radio-group { flex-direction: row; }
                    .future-blocker { padding: 8px 16px; }
                }
            `}</style>
        </div >
    );
};

export default EmployeeAttendance;
