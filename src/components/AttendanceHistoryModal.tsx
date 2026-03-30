import React, { useMemo, useState } from 'react';
import { XCircle, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface AttendanceHistoryModalProps {
    employee: {
        id: string;
        name: string;
        custom_id: string;
        pic?: string;
    } | null;
    records: any[];
    onClose: () => void;
    initialMonthYear?: string; // YYYY-MM
}

const AttendanceHistoryModal: React.FC<AttendanceHistoryModalProps> = ({
    employee,
    records,
    onClose,
    initialMonthYear
}) => {
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (initialMonthYear) {
            const [y, m] = initialMonthYear.split('-').map(Number);
            return new Date(y, m - 1, 1);
        }
        return new Date();
    });

    const historyDayMap = useMemo(() => {
        if (!employee) return new Map();
        const map = new Map<string, any>();
        records.filter(r => r.employee_id === employee.id).forEach(r => {
            if (r.daily_breakdown && Array.isArray(r.daily_breakdown)) {
                r.daily_breakdown.forEach((d: any) => {
                    map.set(d.date, { status: d.status, recordStatus: r.status });
                });
            }
        });
        return map;
    }, [records, employee]);

    const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const calendarGrid = useMemo(() => {
        if (!employee) return [];
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
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
    }, [currentMonth, historyDayMap, employee]);

    const getDayClass = (status: string) => {
        if (status === 'Present') return 'bg-present text-present';
        if (status === 'Absent') return 'bg-absent text-absent';
        if (status === 'Leave') return 'bg-leave text-leave';
        if (status === 'Holiday') return 'bg-holiday text-holiday';
        return '';
    };

    if (!employee) return null;

    return (
        <div className="modal-overlay">
            <div className="custom-modal history-modal">
                <div className="cm-header flex-between">
                    <div className="flex align-center gap-10">
                        {employee.pic ? (
                            <img src={employee.pic} alt="" className="avatar" style={{ width: 36, height: 36 }} />
                        ) : (
                            <div className="avatar text-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                                {employee.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h2 className="cm-title" style={{ fontSize: 18 }}>{employee.name}'s Attendance</h2>
                            <p className="cm-user" style={{ fontSize: 12 }}>{employee.custom_id}</p>
                        </div>
                    </div>
                    <button className="btn-ghost icon-btn" onClick={onClose}><XCircle size={24} color="#888" /></button>
                </div>

                <div className="cm-body-box" style={{ padding: '20px 30px', background: '#fff' }}>
                    <div className="mc-header flex-between mb-20" style={{ background: 'var(--bg-main)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <button className="icon-btn" onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
                        <h3 className="mc-title" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                        </h3>
                        <button className="icon-btn" onClick={handleNextMonth}><ChevronRight size={20} /></button>
                    </div>

                    <div className="mc-grid">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="mc-dayname">{d}</div>
                        ))}

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

                    <div className="mc-legend mt-20" style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                        <div className="lg-item"><span className="lg-dot bg-present"></span> Present</div>
                        <div className="lg-item"><span className="lg-dot bg-absent"></span> Absent</div>
                        <div className="lg-item"><span className="lg-dot bg-leave"></span> Leave</div>
                        <div className="lg-item"><span className="lg-dot bg-holiday"></span> Holiday</div>
                    </div>
                </div>
            </div>

            <style>{`
                .flex { display: flex; }
                .flex-between { display: flex; justify-content: space-between; align-items: center; }
                .align-center { align-items: center; }
                .gap-10 { gap: 10px; }
                .mb-20 { margin-bottom: 20px; }
                .mt-20 { margin-top: 20px; }
                
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .custom-modal { width: 100%; max-width: 500px; background: #ffffff; border-radius: 20px; box-shadow: 0 30px 60px rgba(0,0,0,0.15); overflow: hidden; display: flex; flex-direction: column; }
                .custom-modal.history-modal { max-width: 550px; }
                
                .cm-header { padding: 20px 30px; border-bottom: 1px solid #f0f0f0; }
                .cm-title { margin: 0; color: #111; }
                .cm-user { margin: 0; color: #666; font-family: monospace; }
                
                .avatar { border-radius: 50%; object-fit: cover; }
                .text-avatar { background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 800; }
                
                .btn-ghost { background: transparent; border: none; cursor: pointer; padding: 4px; border-radius: 50%; transition: background 0.2s; }
                .btn-ghost:hover { background: #f5f5f5; }
                
                .icon-btn { display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: var(--text-secondary); }
                .icon-btn:hover { color: var(--color-primary); }

                .mc-header { display: flex; align-items: center; justify-content: space-between; }
                .mc-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
                .mc-dayname { text-align: center; font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; padding: 8px 0; }
                
                .mc-cell { aspect-ratio: 1; background: #f8f9fa; border: 1px solid #eee; border-radius: 8px; padding: 5px; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
                .mc-cell.faded { opacity: 0.2; background: transparent; border-color: transparent; }
                .mc-cell.today { border: 2px solid var(--color-primary); }
                
                .mc-num { font-size: 12px; font-weight: 700; color: #333; }
                .mc-data { padding: 3px; border-radius: 5px; display: flex; align-items: center; justify-content: center; gap: 3px; font-size: 8px; font-weight: 800; text-transform: uppercase; margin-top: auto; }
                
                .bg-present { background: rgba(0, 191, 165, 0.15); color: #00BFA5; }
                .bg-absent { background: rgba(255, 75, 75, 0.15); color: #FF4B4B; }
                .bg-leave { background: rgba(0, 173, 239, 0.15); color: #00ADEF; }
                .bg-holiday { background: rgba(108, 93, 211, 0.15); color: #6C5DD3; }
                
                .lg-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #555; }
                .lg-dot { width: 10px; height: 10px; border-radius: 50%; }
                .lg-dot.bg-present { background: #00BFA5; }
                .lg-dot.bg-absent { background: #FF4B4B; }
                .lg-dot.bg-leave { background: #00ADEF; }
                .lg-dot.bg-holiday { background: #6C5DD3; }
            `}</style>
        </div>
    );
};

export default AttendanceHistoryModal;
