import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  FileText,
  Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  category: string;
  color: string;
  all_day: boolean;
}

const CATEGORIES = [
  { name: 'Meeting', color: '#6232FF' },
  { name: 'Task', color: '#00BFA5' },
  { name: 'Reminder', color: '#FF9F1C' },
  { name: 'Holiday', color: '#FF4B4B' },
  { name: 'Other', color: '#6C5DD3' }
];

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<string[]>(CATEGORIES.map(c => c.name));
  const [view, setView] = useState<'Month' | 'Week' | 'Day'>('Month');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*');

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextPeriod = () => {
    if (view === 'Month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    else if (view === 'Week') setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    else if (view === 'Day') setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
  };

  const prevPeriod = () => {
    if (view === 'Month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    else if (view === 'Week') setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    else if (view === 'Day') setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];

    // Previous month days
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: month - 1,
        year,
        currentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        currentMonth: true
      });
    }

    // Next month days
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        day: i,
        month: month + 1,
        year,
        currentMonth: false
      });
    }

    return days;
  };

  const getWeekDays = () => {
    const day = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - day);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push({
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        currentMonth: date.getMonth() === currentDate.getMonth(),
        date: date
      });
    }
    return week;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    category: 'Meeting',
    color: '#6232FF'
  });

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startTimeISO = newEvent.start_time ? new Date(newEvent.start_time).toISOString() : new Date().toISOString();
      const endTimeISO = newEvent.end_time ? new Date(newEvent.end_time).toISOString() : new Date(Date.now() + 3600000).toISOString();

      const { data, error } = await supabase
        .from('calendar_events')
        .insert([{
          title: newEvent.title,
          description: newEvent.description,
          start_time: startTimeISO,
          end_time: endTimeISO,
          category: newEvent.category,
          color: newEvent.color
        }])
        .select();

      if (error) {
        alert('Database Error: ' + error.message);
        throw error;
      };

      if (data) {
        setEvents([...events, data[0]]);
        setIsModalOpen(false);
        setNewEvent({
          title: '',
          description: '',
          start_time: '',
          end_time: '',
          category: 'Meeting',
          color: '#6232FF'
        });
      }
    } catch (err: any) {
      console.error('Error saving event:', err);
      // alert already shown above for supabase, but fallback just in case
      if (!err.message?.includes('Database Error')) {
        alert('Error: ' + err.message);
      }
    }
  };

  const filteredEvents = events.filter(e => filters.includes(e.category));

  return (
    <div className="calendar-page">
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <div className="modal-header">
              <h3>New Event</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveEvent} className="event-form">
              <div className="form-group">
                <label>Title</label>
                <input type="text" required value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event title" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input type="datetime-local" required value={newEvent.start_time} onChange={e => setNewEvent({ ...newEvent, start_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input type="datetime-local" required value={newEvent.end_time} onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={newEvent.category} onChange={e => { const cat = CATEGORIES.find(c => c.name === e.target.value); setNewEvent({ ...newEvent, category: e.target.value, color: cat?.color || '#FF9F1C' }); }}>
                  {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Note</label>
                <textarea value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Add details..." rows={3}></textarea>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-save">Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="calendar-layout-wrapper">
        <aside className="calendar-sidebar-left">
          <div className="filter-header">
            <h3>Filter</h3>
            <button className="add-btn" onClick={() => setIsModalOpen(true)}><Plus size={18} /></button>
          </div>
          <div className="sidebar-section">
            <h4 className="sidebar-label">EVENTS</h4>
            <div className="filter-list">
              {CATEGORIES.map(cat => (
                <label key={cat.name} className="filter-chip">
                  <input type="checkbox" checked={filters.includes(cat.name)} onChange={() => { if (filters.includes(cat.name)) setFilters(filters.filter(f => f !== cat.name)); else setFilters([...filters, cat.name]); }} />
                  <span className="chip-dot" style={{ backgroundColor: cat.color }}></span>
                  <span className="chip-text">{cat.name}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <main className="calendar-main-area">
          <div className="calendar-content-container">
            {loading ? (
              <div className="calendar-loading">
                <CalendarIcon className="animate-bounce" size={48} color="var(--color-primary)" />
                <p>Loading Schedule...</p>
              </div>
            ) : (
              <>
                <header className="calendar-header">
                  <div className="header-left">
                    <h2>
                      {view === 'Month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                      {view === 'Week' && `Week of ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}`}
                      {view === 'Day' && `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`}
                    </h2>
                    <div className="month-nav">
                      <button onClick={prevPeriod} className="icon-nav-btn"><ChevronLeft size={20} /></button>
                      <button onClick={nextPeriod} className="icon-nav-btn"><ChevronRight size={20} /></button>
                    </div>
                  </div>
                  <div className="header-right">
                    <div className="view-selector">
                      <button className={`selector-btn ${view === 'Month' ? 'active' : ''}`} onClick={() => setView('Month')}>Month</button>
                      <button className={`selector-btn ${view === 'Week' ? 'active' : ''}`} onClick={() => setView('Week')}>Week</button>
                      <button className={`selector-btn ${view === 'Day' ? 'active' : ''}`} onClick={() => setView('Day')}>Day</button>
                    </div>
                    <div className="action-group">
                      <button className="btn-secondary"><Filter size={18} /> <span>Filter</span></button>
                      <button className="btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={18} /> <span>New Event</span></button>
                    </div>
                  </div>
                </header>
                <div className={`calendar-grid-container view-${view.toLowerCase()}`}>
                  {view !== 'Day' ? (
                    <div className="grid-weekdays">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="weekday-label">{day}</div>)}
                    </div>
                  ) : (
                    <div className="grid-weekdays day-view-header">
                      <div className="weekday-label">{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()]}</div>
                    </div>
                  )}

                  <div className={`grid-days grid-${view.toLowerCase()}`}>
                    {view === 'Month' && renderCalendar().map((dateObj, idx) => {
                      const dateStr = `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
                      const dayEvents = filteredEvents.filter(e => e.start_time.startsWith(dateStr));
                      const isToday = dateObj.day === new Date().getDate() && dateObj.month === new Date().getMonth() && dateObj.year === new Date().getFullYear();
                      const isSelected = dateObj.day === currentDate.getDate() && dateObj.month === currentDate.getMonth() && dateObj.year === currentDate.getFullYear();
                      return (
                        <div key={idx} className={`grid-cell ${!dateObj.currentMonth ? 'cell-inactive' : ''} ${isToday ? 'cell-today' : ''} ${isSelected ? 'cell-selected' : ''}`} onClick={() => setCurrentDate(new Date(dateObj.year, dateObj.month, dateObj.day))}>
                          <span className="cell-number">{dateObj.day}</span>
                          <div className="cell-events">
                            {dayEvents.map(event => (
                              <div key={event.id} className="event-item" style={{ borderLeft: `4px solid ${event.color}`, backgroundColor: `${event.color}15` }} onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}>
                                <span className="event-item-title">{event.title}</span>
                                <span className="event-item-time">{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {view === 'Week' && getWeekDays().map((dateObj, idx) => {
                      const dateStr = `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
                      const dayEvents = filteredEvents.filter(e => e.start_time.startsWith(dateStr));
                      const isToday = dateObj.day === new Date().getDate() && dateObj.month === new Date().getMonth() && dateObj.year === new Date().getFullYear();
                      const isSelected = dateObj.day === currentDate.getDate() && dateObj.month === currentDate.getMonth() && dateObj.year === currentDate.getFullYear();
                      return (
                        <div key={idx} className={`grid-cell week-cell ${!dateObj.currentMonth ? 'cell-inactive' : ''} ${isToday ? 'cell-today' : ''} ${isSelected ? 'cell-selected' : ''}`} onClick={() => setCurrentDate(new Date(dateObj.year, dateObj.month, dateObj.day))}>
                          <span className="cell-number">{dateObj.day}</span>
                          <div className="cell-events view-week-events">
                            {dayEvents.map(event => (
                              <div key={event.id} className="event-item" style={{ borderLeft: `4px solid ${event.color}`, backgroundColor: `${event.color}15` }} onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}>
                                <span className="event-item-title">{event.title}</span>
                                <span className="event-item-time">{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {view === 'Day' && (() => {
                      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                      const dayEvents = filteredEvents.filter(e => e.start_time.startsWith(dateStr));
                      return (
                        <div className="grid-cell day-cell-full cell-selected">
                          <div className="cell-events view-day-events">
                            {dayEvents.length === 0 ? (
                              <div className="no-events-day">No events scheduled for this day.</div>
                            ) : dayEvents.map(event => (
                              <div key={event.id} className="event-item day-event-item" style={{ borderLeft: `6px solid ${event.color}`, backgroundColor: `${event.color}10` }} onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}>
                                <div className="day-event-header">
                                  <span className="event-item-title">{event.title}</span>
                                  <span className="event-item-time">{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <span className="event-item-desc">{event.description}</span>
                                <div className="event-category-badge" style={{ color: event.color, backgroundColor: `${event.color}20` }}>{event.category}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {selectedEvent && (
          <aside className="calendar-sidebar-right">
            <div className="details-top">
              <div className="details-title-row">
                <h3>Event Details</h3>
                <button className="close-details-btn" onClick={() => setSelectedEvent(null)}>×</button>
              </div>
              <p className="details-subtitle">{currentDate.getDate()} {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
            </div>
            <div className="details-card">
              <div className="details-tag">{selectedEvent.category}</div>
              <h2 className="details-event-name">{selectedEvent.title}</h2>
              <div className="details-list">
                <div className="details-item">
                  <Clock size={18} />
                  <div><label>TIME</label><p>{new Date(selectedEvent.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                </div>
                <div className="details-item">
                  <MapPin size={18} />
                  <div><label>LOCATION</label><p>Virtual / TBD</p></div>
                </div>
                <div className="details-item">
                  <FileText size={18} />
                  <div><label>NOTE</label><p>{selectedEvent.description || 'No additional notes'}</p></div>
                </div>
              </div>
              <div className="details-actions">
                <button className="edit-agenda-btn">Edit Event</button>
                <button className="more-btn" onClick={async () => {
                  try {
                    await supabase.from('calendar_events').delete().eq('id', selectedEvent.id);
                    setEvents(events.filter(e => e.id !== selectedEvent.id));
                    setSelectedEvent(null);
                  } catch (e) { console.error('Error deleting event:', e); }
                }}><Trash2 size={18} color="#FF4B4B" /></button>
              </div>
            </div>
          </aside>
        )}
      </div>

      <style>{`
        .calendar-page {
          height: calc(100vh - var(--header-height));
          background: var(--bg-body);
          overflow: hidden;
        }

        .calendar-layout-wrapper {
          display: flex;
          height: 100%;
          width: 100%;
        }

        /* SIDEBAR LEFT */
        .calendar-sidebar-left {
          width: 280px;
          background: var(--bg-card);
          border-right: 1px solid var(--border-color);
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow-y: auto;
        }

        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .filter-header h3 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          color: var(--text-primary);
        }

        .add-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
        }

        .add-btn:hover {
          background: var(--bg-surface);
          border-color: var(--color-primary);
        }

        .sidebar-section {
          margin-bottom: 40px;
        }

        .sidebar-label {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 1.5px;
          margin-bottom: 24px;
        }

        .filter-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .filter-chip {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: 0.2s;
        }

        .filter-chip:hover {
          color: var(--text-primary);
        }

        .chip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .category-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cat-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .cat-color {
          width: 18px;
          height: 18px;
          border-radius: 6px;
        }

        /* MAIN AREA */
        .calendar-main-area {
          flex: 1;
          background: var(--bg-card);
          padding: 40px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .calendar-content-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .header-left h2 {
          font-size: 28px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -1px;
          color: var(--text-primary);
        }

        .month-nav {
          display: flex;
          gap: 12px;
        }

        .icon-nav-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
        }

        .icon-nav-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .view-selector {
          display: flex;
          background: var(--bg-surface);
          padding: 6px;
          border-radius: 12px;
        }

        .selector-btn {
          padding: 8px 16px;
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: 8px;
        }

        .selector-btn.active {
          background: var(--bg-card);
          color: var(--text-primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .action-group {
          display: flex;
          gap: 12px;
        }

        .btn-primary, .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          white-space: nowrap;
        }

        .btn-primary {
          background: var(--color-teal);
          color: #fff;
          border: none;
        }

        .btn-secondary {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
        }

        /* GRID */
        .grid-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }

        .weekday-label {
          text-align: center;
          font-size: 12px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .grid-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-template-rows: repeat(6, 120px);
        }

        .grid-cell {
          border-right: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s;
        }

        .grid-cell:nth-child(7n) { border-right: none; }
        .grid-cell:hover { background: var(--bg-surface); }

        .cell-inactive { opacity: 0.3; }
        .cell-today { background: rgba(0, 191, 165, 0.05); position: relative; }
        .cell-today::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--color-teal);
        }

        .cell-number {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .cell-events {
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
        }

        .event-item {
          padding: 6px 10px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 11px;
          transition: 0.2s;
          color: var(--text-primary);
        }

        .event-item-title { font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .event-item-time { font-weight: 600; color: var(--text-secondary); opacity: 0.8; }

        /* SIDEBAR RIGHT */
        .calendar-sidebar-right {
          width: 380px;
          background: var(--bg-card);
          border-left: 1px solid var(--border-color);
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .details-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .details-title-row h3 { font-size: 20px; font-weight: 800; margin: 0; color: var(--text-primary); }
        .close-details-btn { background: none; border: none; font-size: 24px; color: var(--text-muted); cursor: pointer; }

        .details-subtitle { font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-bottom: 32px; }

        .details-card {
          background: var(--bg-surface);
          border-radius: 24px;
          padding: 32px;
          border: 1px solid var(--border-color);
        }

        .details-tag {
          display: inline-block;
          padding: 6px 12px;
          background: var(--bg-card);
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 16px;
        }

        .details-event-name { font-size: 22px; font-weight: 800; margin-bottom: 32px; line-height: 1.2; color: var(--text-primary); }

        .details-list { display: flex; flex-direction: column; gap: 24px; margin-bottom: 40px; }
        .details-item { display: flex; gap: 16px; align-items: flex-start; color: var(--color-primary); }
        .details-item div { display: flex; flex-direction: column; gap: 4px; }
        .details-item label { font-size: 10px; font-weight: 800; color: var(--text-muted); letter-spacing: 1px; }
        .details-item p { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0; }

        .details-actions { display: flex; gap: 12px; }
        .edit-agenda-btn { flex: 1; padding: 14px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font-weight: 700; cursor: pointer; }
        .edit-agenda-btn:hover { background: var(--bg-surface); }
        .more-btn { width: 48px; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .more-btn:hover { background: var(--bg-surface); }

        /* MODAL */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { width: 100%; max-width: 500px; padding: 32px; border-radius: 24px; background: var(--bg-card); box-shadow: var(--shadow-lg); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; color: var(--text-primary); }
        .event-form { display: flex; flex-direction: column; gap: 20px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
        .form-group input, .form-group select, .form-group textarea { padding: 12px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); outline: none; }
        .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; }
        .btn-cancel { padding: 12px 24px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font-weight: 700; cursor: pointer; }
        .btn-save { padding: 12px 24px; border-radius: 12px; border: none; background: var(--color-teal); color: #fff; font-weight: 700; cursor: pointer; }

        .calendar-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px; color: var(--text-muted); }
        .animate-bounce { animation: bounce 1s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

        /* MULTI-VIEW CSS */
        .grid-week { grid-template-rows: 1fr; min-height: 500px; }
        .week-cell { min-height: 500px; }
        .view-week-events { gap: 12px; }

        .grid-day { grid-template-columns: 1fr; grid-template-rows: 1fr; min-height: 500px; }
        .day-view-header { grid-template-columns: 1fr; }
        .day-cell-full { border-right: none; border-bottom: none; min-height: 500px; }
        .view-day-events { gap: 16px; padding-top: 12px; }
        
        .day-event-item { padding: 16px; border-radius: 12px; gap: 8px; cursor: pointer; }
        .day-event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .day-event-header .event-item-title { font-size: 16px; }
        .day-event-header .event-item-time { font-size: 14px; opacity: 1; }
        .event-item-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
        .event-category-badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; margin-top: 8px; width: fit-content; }
        .no-events-day { text-align: center; color: var(--text-muted); padding: 40px; font-size: 15px; font-weight: 600; }

        @media (max-width: 1400px) {
          .calendar-sidebar-right { width: 320px; }
          .calendar-main-area { padding: 24px; }
        }
      `}</style>
    </div >
  );
};

export default Calendar;
