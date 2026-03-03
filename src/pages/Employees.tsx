import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    UserPlus,
    UserMinus,
    TrendingUp,
    Search,
    Filter,
    ChevronDown,
    LayoutGrid,
    List,
    Loader2
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip
} from 'recharts';
import { useEmployees } from '../hooks/useEmployees';



const Employees = ({ onAddEmployee }: { onAddEmployee: () => void }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const { employees, initialLoadDone, error, stats, deptStats } = useEmployees();

    const filteredEmployees = employees.filter(emp => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            emp.full_name?.toLowerCase().includes(query) ||
            emp.email?.toLowerCase().includes(query) ||
            emp.job_title?.toLowerCase().includes(query) ||
            emp.department?.toLowerCase().includes(query)
        );
    });

    const getInitials = (name: string) => {
        return name
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase() || '?';
    };

    return (
        <div className="employees-container">
            {/* Header */}
            <div className="employees-header">
                <div className="header-left">
                    <h2 className="title-bold">Employees</h2>
                    <div className="breadcrumb">
                        <span>Dashboard</span>
                        <span className="separator">/</span>
                        <span className="current">Employees</span>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="employees-grid">
                <div className="stats-cards-grid">
                    <div className="stat-card-v3">
                        <div className="stat-icon-circle green">
                            <Users size={20} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Total Employees</p>
                            <h3 className="stat-value">{!initialLoadDone ? <Loader2 className="animate-spin" size={20} /> : stats.total}</h3>
                            <div className="stat-trend positive">
                                <TrendingUp size={12} />
                                <span>{employees.length > 0 ? '+1.6%' : '0%'}</span>
                                <span className="trend-text">from last month</span>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card-v3">
                        <div className="stat-icon-circle blue">
                            <UserPlus size={20} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">New Employees (This Month)</p>
                            <h3 className="stat-value">{!initialLoadDone ? <Loader2 className="animate-spin" size={20} /> : stats.newThisMonth}</h3>
                            <div className="stat-trend positive">
                                <TrendingUp size={12} />
                                <span>+5.8%</span>
                                <span className="trend-text">from last month</span>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card-v3">
                        <div className="stat-icon-circle purple">
                            <TrendingUp size={20} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Active Employees</p>
                            <h3 className="stat-value">{!initialLoadDone ? <Loader2 className="animate-spin" size={20} /> : stats.active}</h3>
                            <div className="stat-trend positive">
                                <TrendingUp size={12} />
                                <span>Steady</span>
                                <span className="trend-text">real-time count</span>
                            </div>
                        </div>
                    </div>

                    <div className="stat-card-v3">
                        <div className="stat-icon-circle orange">
                            <UserMinus size={20} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">On Leave</p>
                            <h3 className="stat-value">{!initialLoadDone ? <Loader2 className="animate-spin" size={20} /> : stats.onLeave}</h3>
                            <div className="stat-trend positive">
                                <TrendingUp size={12} />
                                <span>Available</span>
                                <span className="trend-text">current status</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Departments Donut Chart */}
                <div className="dept-chart-card">
                    <div className="card-header-flex">
                        <h4 className="card-title-v2">Departments</h4>
                        <div className="chart-filter">
                            <span>This Month</span>
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    <div className="chart-content">
                        <div className="donut-wrapper">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={deptStats}
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {deptStats.length > 0 ? deptStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        )) : <Cell fill="#E2E8F0" />}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="chart-legend">
                            {deptStats.map((dept) => (
                                <div key={dept.name} className="legend-item">
                                    <span className="dot" style={{ backgroundColor: dept.color }}></span>
                                    <span className="legend-name">{dept.name}</span>
                                    <span className="legend-value">
                                        <Users size={12} />
                                        {dept.value} - {stats.total > 0 ? Math.round((dept.value / stats.total) * 100) : 0}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Employee List Table Section */}
            <div className="employee-list-section card">
                <div className="list-header-bar">
                    <h4 className="section-title">Employee List</h4>
                    <div className="list-actions-flex">
                        <div className="search-bar-v2">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search employee..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="btn-outline-v2">
                            <Filter size={18} />
                            <span>Filter</span>
                            <ChevronDown size={14} />
                        </button>
                        <div className="sort-by">
                            <span className="label">Sort by:</span>
                            <button className="btn-sort">
                                <span>Name</span>
                                <ChevronDown size={14} />
                            </button>
                        </div>
                        <div className="view-toggle">
                            <button
                                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List size={18} />
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                        <button className="btn-primary-v2" onClick={onAddEmployee}>
                            <UserPlus size={18} />
                            <span>New Employee</span>
                        </button>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <div className="table-responsive">
                        <table className="employees-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}><input type="checkbox" className="custom-cb" /></th>
                                    <th>EMPLOYEE ID <ChevronDown size={12} /></th>
                                    <th>NAME <ChevronDown size={12} /></th>
                                    <th>JOB TITLE <ChevronDown size={12} /></th>
                                    <th>DEPARTMENT <ChevronDown size={12} /></th>
                                    <th>EMPLOYMENT TYPE <ChevronDown size={12} /></th>
                                    <th>WORK MODEL <ChevronDown size={12} /></th>
                                    <th>JOIN DATE <ChevronDown size={12} /></th>
                                    <th>STATUS <ChevronDown size={12} /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {!initialLoadDone && (
                                    <tr>
                                        <td colSpan={9} className="text-center p-40 color-muted">Loading employees...</td>
                                    </tr>
                                )}
                                {initialLoadDone && error && (
                                    <tr>
                                        <td colSpan={9} className="text-center p-40 text-danger">Error: {error}</td>
                                    </tr>
                                )}
                                {initialLoadDone && !error && filteredEmployees.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="text-center p-40 color-muted">No employees found.</td>
                                    </tr>
                                )}
                                {filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className="row-hover cursor-pointer" onClick={() => navigate(`/Admin/employees/${emp.id}`)}>
                                        <td><input type="checkbox" className="custom-cb" /></td>
                                        <td><span className="id-txt">{emp.custom_id || emp.id.slice(0, 8).toUpperCase()}</span></td>
                                        <td>
                                            <div className="user-profile-cell">
                                                {emp.profile_pic_url ? (
                                                    <img src={emp.profile_pic_url} alt={emp.full_name || ''} className="user-avatar" style={{ objectFit: 'cover' }} />
                                                ) : (
                                                    <div className="user-avatar">{getInitials(emp.full_name || emp.email)}</div>
                                                )}
                                                <div className="user-info-v2">
                                                    <span className="user-name">{emp.full_name || 'Unnamed'}</span>
                                                    <span className="user-email-v2">{emp.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="job-txt">{emp.job_title || '--'}</span></td>
                                        <td><span className="dept-txt">{emp.department || '--'}</span></td>
                                        <td>
                                            <span className={`type-tag ${(emp.employment_type || 'Full-Time').toLowerCase().replace('-', '')}`}>
                                                {emp.employment_type || 'Full-Time'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="work-model-cell">
                                                <span className={`model-dot ${(emp.work_model || 'On-Site').toLowerCase()}`}></span>
                                                <span className="model-txt">{emp.work_model || 'On-Site'}</span>
                                            </div>
                                        </td>
                                        <td><span className="date-txt">{emp.join_date || '--'}</span></td>
                                        <td>
                                            <span className={`status-pill-v3 ${emp.status.toLowerCase().replace(' ', '-')}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="employee-cards-grid">
                        {initialLoadDone && filteredEmployees.length === 0 && (
                            <div className="p-40 text-center color-muted w-full">No employees found.</div>
                        )}
                        {filteredEmployees.map((emp) => (
                            <div key={emp.id} className="employee-card cursor-pointer" onClick={() => navigate(`/Admin/employees/${emp.id}`)}>
                                <div className="card-top">
                                    {emp.profile_pic_url ? (
                                        <img src={emp.profile_pic_url} alt={emp.full_name || ''} className="user-avatar-lg" style={{ objectFit: 'cover' }} />
                                    ) : (
                                        <div className="user-avatar-lg">{getInitials(emp.full_name || emp.email)}</div>
                                    )}
                                    <span className="card-emp-id-badge">{emp.custom_id || emp.id.slice(0, 8).toUpperCase()}</span>
                                    <h5 className="card-user-name">{emp.full_name || 'Unnamed'}</h5>
                                    <p className="card-user-email">{emp.email}</p>
                                </div>
                                <div className="card-info-block">
                                    <div className="card-info-item">
                                        <span className="info-label">JOB TITLE</span>
                                        <span className="info-value">{emp.job_title || '--'}</span>
                                    </div>
                                    <div className="card-info-item">
                                        <span className="info-label">DEPARTMENT</span>
                                        <span className="info-value">{emp.department || '--'}</span>
                                    </div>
                                </div>
                                <div className="card-badge-row">
                                    <span className={`type-tag-v2 ${(emp.employment_type || 'Full-Time').toLowerCase().replace('-', '')}`}>
                                        {emp.employment_type || 'Full-Time'}
                                    </span>
                                    <div className="work-model-badge">
                                        <span className={`model-dot-v2 ${(emp.work_model || 'On-Site').toLowerCase()}`}></span>
                                        <span className="model-txt">{emp.work_model || 'On-Site'}</span>
                                    </div>
                                    <span className={`status-pill-v4 ${emp.status.toLowerCase().replace(' ', '-')}`}>
                                        {emp.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="table-footer">
                    <div className="footer-left">
                        <span>Show</span>
                        <select className="row-select">
                            <option>10</option>
                            <option>25</option>
                            <option>50</option>
                        </select>
                        <span>of {filteredEmployees.length} results</span>
                    </div>
                    <div className="pagination">
                        <button className="page-btn active">1</button>
                        <button className="page-btn">2</button>
                        <button className="page-btn">3</button>
                        <span className="dots">...</span>
                        <button className="page-btn">16</button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Employees;
