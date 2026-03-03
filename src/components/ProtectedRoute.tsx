import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRole } from '../hooks/useRole';

interface ProtectedRouteProps {
    children: React.ReactNode;
    session: any;
    requiredRole?: 'admin' | 'employee';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, session, requiredRole }) => {
    const { role, isOnboarded, loading } = useRole(session?.user?.id);
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

    // Role check
    if (requiredRole && role !== requiredRole) {
        console.log(`[Auth] Role mismatch: have ${role}, need ${requiredRole}. Path: ${location.pathname}`);

        if (!role) {
            if (location.pathname === '/onboarding') return <>{children}</>;
            if (location.pathname.startsWith('/Admin')) return <Navigate to="/admin-login" replace />;
            return <Navigate to="/onboarding" replace />;
        }

        const target = role === 'admin' ? "/Admin" : "/";
        return <Navigate to={target} replace />;
    }

    // Onboarding check for employees
    if (role === 'employee' && !isOnboarded && location.pathname !== '/onboarding') {
        console.log(`[Auth] Employee not onboarded. Redirecting to /onboarding from ${location.pathname}`);
        return <Navigate to="/onboarding" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
