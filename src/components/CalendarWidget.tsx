import { ChevronLeft, ChevronRight } from 'lucide-react';

const CalendarWidget = () => {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dates = Array.from({ length: 30 }, (_, i) => i + 1);
  const activeDate = 21;

  return (
    <div className="calendar-widget">
      <div className="calendar-header">
        <h4 className="month-year">June 2035</h4>
        <div className="calendar-controls">
          <button className="ctrl-btn"><ChevronLeft size={16} /></button>
          <button className="ctrl-btn"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="calendar-grid">
        {days.map(day => (
          <div key={day} className="calendar-day-label">{day}</div>
        ))}
        {dates.map(date => (
          <div
            key={date}
            className={`calendar-date ${date === activeDate ? 'active' : ''}`}
          >
            {date}
          </div>
        ))}
      </div>

      <style>{`
        .calendar-widget {
          padding: 16px 0;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .month-year {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .calendar-controls {
          display: flex;
          gap: 8px;
        }

        .ctrl-btn {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .ctrl-btn:hover {
           border-color: var(--color-primary);
           color: var(--color-primary);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          text-align: center;
        }

        .calendar-day-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 8px;
        }

        .calendar-date {
          font-size: 13px;
          color: var(--text-secondary);
          padding: 8px 0;
          border-radius: 10px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .calendar-date:hover {
          background: var(--color-primary-light);
          color: var(--color-primary);
        }

        .calendar-date.active {
          background: var(--color-teal);
          color: var(--text-on-primary);
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(0, 191, 165, 0.3);
        }
      `}</style>
    </div>
  );
};

export default CalendarWidget;
