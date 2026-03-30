import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Dashboard from './pages/Dashboard.tsx';
import Payroll from './pages/Payroll.tsx';
import Employees from './pages/Employees.tsx';
import AddEmployee from './pages/AddEmployee.tsx';
import PayrollSettings from './pages/PayrollSettings.tsx';
import Attendance from './pages/Attendance.tsx';
import AdminLogin from './pages/AdminLogin.tsx';
import EmployeeLogin from './pages/EmployeeLogin.tsx';
import EmployeeOnboarding from './pages/EmployeeOnboarding.tsx';
import EmployeeAttendance from './pages/EmployeeAttendance.tsx';
import EmployeeDashboard from './pages/EmployeeDashboard.tsx';
import EmployeeDetails from './pages/EmployeeDetails.tsx';
import Departments from './pages/Departments.tsx';
import Billing from './pages/Billing.tsx';
import EmployeePayslips from './pages/EmployeePayslips.tsx';
import EmployeeLeaves from './pages/EmployeeLeaves.tsx';
import AdminLeaves from './pages/AdminLeaves.tsx';
import MyProfile from './pages/MyProfile.tsx';
import Settings from './pages/Settings.tsx';
import Inbox from './pages/Inbox.tsx';
import Recruitments from './pages/Recruitments.tsx';

// Admin Layout Wrapper
const AdminLayout = ({ isDarkMode, toggleTheme }: { isDarkMode: boolean; toggleTheme: () => void }) => {
  return (
    <div className="app-container">
      <Sidebar isDarkMode={isDarkMode} />
      <main className="main-content">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// Admin Routes Wrapper
const AdminRoutes = ({ isDarkMode, toggleTheme }: { isDarkMode: boolean; toggleTheme: () => void }) => {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route element={<AdminLayout isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Employees onAddEmployee={() => navigate('/Admin/add-employee')} />} />
        <Route path="employees/:id" element={<EmployeeDetails />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="payroll-settings" element={<PayrollSettings />} />
        <Route path="departments" element={<Departments />} />
        <Route path="billing/*" element={<Billing />} />
        <Route path="leaves" element={<AdminLeaves />} />
        <Route path="settings" element={<Settings />} />
        <Route path="add-employee" element={<AddEmployee onBack={() => navigate('/Admin/employees')} />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="recruitments" element={<Recruitments />} />
        <Route path="*" element={<Navigate to="/Admin" replace />} />
      </Route>
    </Routes>
  );
};

// Employee Layout Wrapper
const EmployeeLayout = ({ isDarkMode, toggleTheme }: { isDarkMode: boolean; toggleTheme: () => void }) => {
  return (
    <div className="app-container employee-portal">
      <Sidebar isDarkMode={isDarkMode} />
      <main className="main-content">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark'; // Default to light; only go dark if user explicitly toggled it
  });

  useEffect(() => {
    // Per Supabase docs: use onAuthStateChange instead of getSession() 
    // This fires on INITIAL_SESSION too, so no need for separate getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // IMPORTANT: Per Supabase docs, SIGNED_IN fires on EVERY tab refocus
      // NOT just actual sign-in. So we must NOT use SIGNED_IN to refresh data.
      if (event === 'SIGNED_OUT') {
        setSession(null);
      } else if (session) {
        setSession(session);
      }

      // Only dispatch refresh on actual token renewal (not on tab focus SIGNED_IN noise)
      if (event === 'TOKEN_REFRESHED') {
        console.log('[App] Token refreshed — dispatching versovate:refresh');
        window.dispatchEvent(new CustomEvent('versovate:refresh'));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const dispatchRefresh = () => {
      // Debounce to prevent double-firing from focus + visibilitychange
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        console.log('[App] Tab regained focus, dispatching versovate:refresh');
        window.dispatchEvent(new CustomEvent('versovate:refresh'));
        // Also silently refresh the session in background
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) setSession(session);
        });
      }, 300);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        dispatchRefresh();
      }
    };

    window.addEventListener('focus', dispatchRefresh);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      window.removeEventListener('focus', dispatchRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<EmployeeLogin isDarkMode={isDarkMode} />} />
        <Route path="/admin-login" element={<AdminLogin isDarkMode={isDarkMode} />} />
        <Route path="/onboarding" element={<EmployeeOnboarding isDarkMode={isDarkMode} />} />

        {/* Admin Portal */}
        <Route path="/Admin/*" element={
          <ProtectedRoute session={session} requiredRole="admin">
            <AdminRoutes isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        } />

        {/* Employee Portal */}
        <Route path="/" element={
          <ProtectedRoute session={session} requiredRole="employee">
            <EmployeeLayout isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        }>
          <Route index element={<EmployeeDashboard />} />
          <Route path="attendance" element={<EmployeeAttendance />} />
          <Route path="payslips" element={<EmployeePayslips />} />
          <Route path="leaves" element={<EmployeeLeaves />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <style>{`
        .app-container {
          display: flex;
          min-height: 100vh;
          background: var(--bg-main);
        }
        .main-content {
          margin-left: var(--sidebar-width);
          padding-top: var(--header-height);
          width: calc(100% - var(--sidebar-width));
          min-height: 100vh;
        }
        .main-content.full-width {
          margin-left: 0;
          width: 100%;
        }
        .content-area {
          padding: 24px;
        }
        .content-area.centered {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        .text-center { text-align: center; }
        .p-40 { padding: 40px; }
      `}</style>
    </BrowserRouter>
  );
}

export default App;
