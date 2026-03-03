import React from 'react';
import {
    Banknote,
    Calendar,
    User,
    Construction,
    ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlaceholderProps {
    icon: any;
    title: string;
    subtitle: string;
    children?: React.ReactNode;
}

const PlaceholderLayout: React.FC<PlaceholderProps> = ({ icon: Icon, title, subtitle, children }) => (
    <div className="p-40 text-center glass animate-fadeIn" style={{ maxWidth: '800px', margin: '40px auto', borderRadius: '32px' }}>
        <div style={{
            width: '80px',
            height: '80px',
            background: 'var(--color-primary-light)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: 'var(--color-primary)'
        }}>
            <Icon size={40} />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>{title}</h1>
        <p style={{ fontSize: '18px', color: 'var(--text-muted)', marginBottom: '32px' }}>{subtitle}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '40px' }}>
            <div className="status-badge" style={{ padding: '8px 16px', background: 'rgba(255, 184, 0, 0.1)', color: '#FFB800', borderRadius: '12px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Construction size={16} />
                <span>Feature in Development</span>
            </div>
        </div>

        {children || (
            <Link to="/" className="btn-primary-v3" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px' }}>
                <ArrowLeft size={18} />
                Back to Dashboard
            </Link>
        )}

        <style>{`
            .animate-fadeIn {
                animation: fadeIn 0.5s ease-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `}</style>
    </div>
);

export const PayslipsPage: React.FC = () => (
    <PlaceholderLayout
        icon={Banknote}
        title="My Payslips"
        subtitle="View and download your monthly salary statements here. We're currently integrating with the payroll system."
    />
);

export const LeavesPage: React.FC = () => (
    <PlaceholderLayout
        icon={Calendar}
        title="Leaves & Time Off"
        subtitle="Check your leave balance and submit time-off requests. This module is arriving in the next update."
    />
);

export const ProfilePage: React.FC = () => (
    <PlaceholderLayout
        icon={User}
        title="Employee Profile"
        subtitle="Manage your personal information, bank details, and documents. View your professional records here."
    />
);
