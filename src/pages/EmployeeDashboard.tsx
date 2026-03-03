import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Clock,
    Calendar,
    Banknote,
    ChevronRight,
    ArrowUpRight,
    Activity,
    Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DataError from '../components/DataError';

const EmployeeDashboard: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        try {
            setLoading(initialLoadDone ? false : true);
            setError(null);
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data, error: fetchErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (fetchErr) throw fetchErr;
                setProfile(data);
            }
        } catch (err: any) {
            console.error('[EmployeeDashboard] Fetch error:', err);
            setError('Failed to load profile. Please try again.');
        } finally {
            setLoading(false);
            setInitialLoadDone(true);
        }
    };

    const [initialLoadDone, setInitialLoadDone] = useState(false);

    useEffect(() => {
        fetchProfile();

        const handleFocusRefresh = () => fetchProfile();
        window.addEventListener('versovate:refresh', handleFocusRefresh);

        return () => {
            window.removeEventListener('versovate:refresh', handleFocusRefresh);
        };
    }, []);

    const stats = [
        { label: 'Current Salary Cycle', value: 'Feb 10 - Mar 9', icon: Banknote, color: 'var(--color-primary)' },
        { label: 'Remaining Leaves', value: '14 Days', icon: Calendar, color: '#FFB800' },
        { label: 'Next Holiday', value: 'Holi - March 14', icon: Target, color: '#00BFA5' },
    ];

    const activities = [
        { type: 'Attendance', detail: 'Pending submission for current week', time: 'Active' },
        { type: 'Payroll', detail: 'Processing upcoming March 10th payout', time: 'Pending' },
        { type: 'Leaves', detail: '14 days of paid time off available', time: 'Updated' },
        { type: 'Profile', detail: 'Employee details fully secured and verified', time: 'Verified' }
    ];

    if (error && !profile) {
        return (
            <div className="content-area centered">
                <DataError message={error} onRetry={fetchProfile} />
            </div>
        );
    }

    if (loading && !initialLoadDone) return <div className="p-40 text-center">Loading dashboard...</div>;

    return (
        <div className="emp-dashboard">
            <header className="dash-welcome">
                <div className="welcome-text">
                    <h1>Good Morning, {profile?.full_name?.split(' ')[0] || 'Davis'}!</h1>
                    <p>It's a great day to reach your goals. Here's what's happening today.</p>
                </div>
                <Link to="/attendance" className="btn-primary-v3">
                    <Clock size={18} />
                    <span>Clock In Now</span>
                </Link>
            </header>

            <div className="stats-grid">
                {stats.map((stat, idx) => (
                    <div key={idx} className="stat-card glass">
                        <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                            <stat.icon size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">{stat.label}</span>
                            <span className="stat-value">{stat.value}</span>
                        </div>
                        <ArrowUpRight className="stat-arrow" size={16} />
                    </div>
                ))}
            </div>

            <div className="dash-content-grid">
                <section className="activities-section glass">
                    <div className="section-header">
                        <div className="title-with-icon">
                            <Activity size={20} className="header-icon" />
                            <h2>Recent Activity</h2>
                        </div>
                        <button className="view-all">View All</button>
                    </div>
                    <div className="activities-list">
                        {activities.map((act, idx) => (
                            <div key={idx} className="activity-item">
                                <div className="activity-indicator"></div>
                                <div className="activity-details">
                                    <p className="activity-text">
                                        <span className="activity-type">{act.type}:</span> {act.detail}
                                    </p>
                                    <span className="activity-time">{act.time}</span>
                                </div>
                                <ChevronRight className="item-arrow" size={16} />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="quick-actions glass">
                    <h2>Quick Shortcuts</h2>
                    <div className="shortcuts-grid">
                        <Link to="/attendance" className="shortcut-item">
                            <Clock />
                            <span>Mark Attendance</span>
                        </Link>
                        <Link to="/payslips" className="shortcut-item">
                            <Banknote />
                            <span>Download Payslips</span>
                        </Link>
                        <Link to="/leaves" className="shortcut-item">
                            <Calendar />
                            <span>Request Leave</span>
                        </Link>
                        <Link to="/profile" className="shortcut-item">
                            <Target />
                            <span>Update Profile</span>
                        </Link>
                    </div>
                </section>
            </div>

            <style>{`
                .emp-dashboard {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    animation: fadeIn 0.5s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .dash-welcome {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                }

                .welcome-text h1 {
                    font-size: 32px;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin-bottom: 8px;
                }

                .welcome-text p {
                    color: var(--text-muted);
                    font-size: 16px;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 24px;
                    margin-bottom: 32px;
                }

                .stat-card {
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    position: relative;
                    transition: transform 0.3s;
                    cursor: pointer;
                }

                .stat-card:hover {
                    transform: translateY(-5px);
                }

                .stat-icon {
                    width: 52px;
                    height: 52px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .stat-info {
                    display: flex;
                    flex-direction: column;
                }

                .stat-label {
                    font-size: 13px;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .stat-value {
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .stat-arrow {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    color: var(--text-muted);
                    opacity: 0.5;
                }

                .dash-content-grid {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 32px;
                }

                .activities-section, .quick-actions {
                    padding: 32px;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .title-with-icon {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .header-icon {
                    color: var(--color-primary);
                }

                .section-header h2, .quick-actions h2 {
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .view-all {
                    background: none;
                    border: none;
                    color: var(--color-primary);
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                }

                .activities-list {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .activity-item {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--border-color);
                    transition: all 0.2s;
                    cursor: pointer;
                }

                .activity-item:last-child {
                    border-bottom: none;
                }

                .activity-item:hover {
                    padding-left: 8px;
                }

                .activity-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--color-primary);
                    box-shadow: 0 0 10px var(--color-primary-light);
                }

                .activity-details {
                    flex: 1;
                }

                .activity-text {
                    font-size: 14px;
                    color: var(--text-primary);
                    margin-bottom: 4px;
                }

                .activity-type {
                    font-weight: 700;
                    color: var(--text-secondary);
                }

                .activity-time {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .item-arrow {
                    color: var(--text-muted);
                    opacity: 0.3;
                }

                .quick-actions h2 {
                    margin-bottom: 24px;
                }

                .shortcuts-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }

                .shortcut-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 24px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    text-decoration: none;
                    transition: all 0.3s;
                }

                .shortcut-item i, .shortcut-item svg {
                    color: var(--color-primary);
                    width: 24px;
                    height: 24px;
                }

                .shortcut-item span {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-primary);
                    text-align: center;
                }

                .shortcut-item:hover {
                    background: var(--color-primary-light);
                    border-color: var(--color-primary);
                    transform: scale(1.02);
                }

                @media (max-width: 1024px) {
                    .dash-content-grid {
                        grid-template-columns: 1fr;
                    }
                    .dash-welcome {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 20px;
                    }
                }
            `}</style>
        </div>
    );
};

export default EmployeeDashboard;
