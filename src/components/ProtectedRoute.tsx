import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRole } from '../hooks/useRole';

interface ProtectedRouteProps {
    children: React.ReactNode;
    session: any;
    requiredRole?: 'admin' | 'employee';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, session, requiredRole }) => {
    const { role, permissions, isOnboarded, loading } = useRole(session?.user?.id);
    const location = useLocation();

    if (!session) {
        // Redirect to respective login based on path
        const isAdminPath = location.pathname.startsWith('/Admin');
        return <Navigate to={isAdminPath ? "/admin-login" : "/login"} replace />;
    }

    if (loading) {
        return (
            <div className="flex-center h-screen bg-main" style={{ height: '100vh', background: 'var(--bg-main)' }}>
                <div className="loader"></div>
                <style>{`
          .loader { 
            width: 40px; 
            height: 40px; 
            border: 3px solid var(--border-color); 
            border-top-color: var(--color-primary); 
            border-radius: 50%; 
            animation: spin 1s linear infinite; 
          }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
            </div>
        );
    }

    // Role & Permission check
    const isAdminPath = location.pathname.startsWith('/Admin');
    const isCustomAdmin = role !== 'employee' && role !== null;
    const pathKey = location.pathname.split('/').filter(Boolean).pop()?.toLowerCase() || (isAdminPath ? 'dashboard' : 'dashboard');

    const hasPermission = () => {
        if (!permissions) return false;
        if (permissions.all) return true;

        // Map common paths to standard permission keys
        const permKey = pathKey === 'admin' ? 'dashboard' : pathKey;
        const mapping: Record<string, string> = { 'payslips': 'payroll' };
        const keyToCheck = mapping[permKey] || permKey;

        return !!permissions[keyToCheck];
    };

    // Enforce portal boundaries
    if (requiredRole === 'admin' && role === 'employee') {
        return <Navigate to="/" replace />;
    }

    if (requiredRole === 'employee' && isCustomAdmin) {
        return <Navigate to="/Admin" replace />;
    }

    // specific handling for landing on root paths
    if (location.pathname === '/' && isCustomAdmin) return <Navigate to="/Admin" replace />;
    if (location.pathname === '/Admin' && role === 'employee') return <Navigate to="/" replace />;

    // Specific permission check for admin routes
    if (isAdminPath && !hasPermission() && location.pathname !== '/Admin' && location.pathname !== '/Admin/') {
        console.log(`[Auth] No permission for ${location.pathname}. Keys checked: ${pathKey}`);
        return <Navigate to="/Admin" replace />;
    }

    // Onboarding check for employees
    if (role === 'employee' && !isOnboarded && location.pathname !== '/onboarding') {
        console.log(`[Auth] Employee not onboarded. Redirecting to /onboarding from ${location.pathname}`);
        return <Navigate to="/onboarding" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
