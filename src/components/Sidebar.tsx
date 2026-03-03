import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  FileText,
  Banknote,
  UserPlus,
  Mail,
  Building,
  Settings,
  LogOut,
  User,
  ChevronDown,
  CreditCard
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRole } from '../hooks/useRole';
import React, { useEffect, useState } from 'react';

interface SidebarProps {
  isDarkMode?: boolean;
}

interface SubItem {
  icon: any;
  label: string;
  path: string;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
  end?: boolean;
  subItems?: SubItem[];
}

const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/Admin', end: true },
  { icon: Mail, label: 'Inbox', path: '/Admin/inbox' },
  { icon: Calendar, label: 'Calendar', path: '/Admin/calendar' },
  { icon: Users, label: 'Employees', path: '/Admin/employees' },
  { icon: Building, label: 'Departments', path: '/Admin/departments' },
  { icon: Clock, label: 'Attendance', path: '/Admin/attendance' },
  { icon: Calendar, label: 'Leaves', path: '/Admin/leaves' },
  {
    icon: FileText, label: 'Billing', path: '/Admin/billing',
    subItems: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/Admin/billing' },
      { icon: Users, label: 'Clients', path: '/Admin/billing/clients' },
      { icon: FileText, label: 'Invoices', path: '/Admin/billing/invoices' },
      { icon: CreditCard, label: 'Payments', path: '/Admin/billing/payments' },
    ]
  },
  { icon: Banknote, label: 'Payroll', path: '/Admin/payroll' },
  { icon: Settings, label: 'Payroll Settings', path: '/Admin/payroll-settings' },
  { icon: UserPlus, label: 'Recruitments', path: '/Admin/recruitments' },
];

const employeeNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'My Dashboard', path: '/', end: true },
  { icon: Clock, label: 'Attendance', path: '/attendance' },
  { icon: Banknote, label: 'My Payslips', path: '/payslips' },
  { icon: Calendar, label: 'Leaves', path: '/leaves' },
  { icon: User, label: 'My Profile', path: '/profile' },
];

const Sidebar: React.FC<SidebarProps> = ({ isDarkMode }) => {
  const [userId, setUserId] = useState<string | undefined>();
  const { role } = useRole(userId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = role === 'admin' ? adminNavItems : employeeNavItems;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={isDarkMode ? "/assets/nightmode_logo.png" : "/assets/daymode_logo.png"} alt="Versovate" />
        <span className="logo-text">Versovate</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          // If the item has subItems, we need a custom render branch to support expansion
          if (item.subItems) {
            return (
              <div key={item.path} className="nav-group">
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => `nav-item has-submenu ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={20} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <ChevronDown size={14} className="submenu-icon" />
                </NavLink>
                <div className="submenu">
                  {item.subItems.map((sub) => (
                    <NavLink
                      key={sub.path}
                      to={sub.path}
                      end={sub.path === '/Admin/billing'} // Exact matching for dashboard root
                      className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                    >
                      <sub.icon size={16} />
                      <span>{sub.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {role === 'admin' ? (
          <NavLink to="/Admin/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        ) : (
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <User size={20} />
            <span>Profile</span>
          </NavLink>
        )}
        <button className="nav-item logout" onClick={handleLogout} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          padding: 32px 16px;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
          margin-bottom: 40px;
        }

        .sidebar-logo img {
          height: 32px;
          width: auto;
        }

        .logo-text {
          font-size: 22px;
          font-weight: 800;
          color: #000000;
          letter-spacing: -0.5px;
        }

        .sidebar-nav {
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--border-radius-md);
          transition: var(--transition-smooth);
          margin-bottom: 6px;
          font-weight: 600;
          font-size: 15px;
        }

        .nav-item:hover {
          color: var(--color-primary);
          background: var(--color-primary-light);
        }

        .nav-item.active {
          background: var(--color-primary);
          color: var(--text-on-primary);
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(110, 64, 255, 0.2);
        }
        
        /* Submenu Styles */
        .nav-group {
          margin-bottom: 6px;
        }
        
        .submenu {
          display: flex;
          flex-direction: column;
          margin-left: 24px;
          margin-top: 4px;
          padding-left: 14px;
          border-left: 1px dashed var(--border-color);
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .submenu-icon {
           transition: transform 0.2s ease;
        }
        
        .nav-item.active .submenu-icon {
           transform: rotate(-180deg);
        }
        
        .nav-item:not(.active) + .submenu {
           display: none;
        }

        .sub-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--border-radius-md);
          transition: var(--transition-smooth);
          font-weight: 500;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .sub-nav-item:hover {
          color: var(--color-primary);
          background: var(--color-primary-light);
        }

        .sub-nav-item.active {
          color: var(--color-primary);
          font-weight: 700;
          background: rgba(98, 50, 255, 0.05);
        }

        .sidebar-footer {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }

        .nav-item.logout:hover {
          color: #FF4B4B;
          background: rgba(255, 75, 75, 0.05);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
