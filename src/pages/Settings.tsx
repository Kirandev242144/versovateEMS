import React, { useState, useEffect } from 'react';
import {
    Shield,
    Plus,
    Save,
    Trash2,
    CheckSquare,
    Square,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    X,
    Lock,
    Users,
    Settings as SettingsIcon,
    LayoutDashboard,
    Users2,
    Clock,
    Fingerprint,
    CreditCard,
    FileText,
    ArrowRight,
    Mail,
    Key
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface Role {
    id: string;
    name: string;
    permissions: Record<string, boolean>;
}

interface StaffUser {
    id: string;
    full_name: string;
    email: string;
    role: string;
    role_id: string;
}

const moduleIcons: Record<string, any> = {
    dashboard: LayoutDashboard,
    employees: Users2,
    attendance: Clock,
    leaves: FileText,
    departments: Users,
    payroll: CreditCard,
    'payroll-settings': SettingsIcon,
    billing: Fingerprint,
    settings: Lock
};

const modules = [
    { id: 'dashboard', name: 'Dashboard', description: 'Access to main admin dashboard and analytics' },
    { id: 'employees', name: 'Employees', description: 'Manage employee records and onboarding' },
    { id: 'attendance', name: 'Attendance', description: 'Track and manage employee attendance' },
    { id: 'leaves', name: 'Leaves', description: 'Review and approve/reject leave requests' },
    { id: 'departments', name: 'Departments', description: 'Manage organization departments' },
    { id: 'payroll', name: 'Payroll', description: 'Process salary and generate payslips' },
    { id: 'payroll-settings', name: 'Payroll Settings', description: 'Configure global payroll calculation rules' },
    { id: 'billing', name: 'Billing', description: 'Manage clients, invoices and payments' },
    { id: 'settings', name: 'Settings', description: 'Global organization and role management' }
];

const Settings = () => {
    const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
    const [roles, setRoles] = useState<Role[]>([]);
    const [staff, setStaff] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeRole, setActiveRole] = useState<Role | null>(null);
    const [showAddRoleModal, setShowAddRoleModal] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // New Role State
    const [newRoleName, setNewRoleName] = useState('');

    // New User State
    const [newUser, setNewUser] = useState({
        fullName: '',
        email: '',
        password: '',
        roleId: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([fetchRoles(), fetchStaff()]);
        setLoading(false);
    };

    const fetchRoles = async () => {
        try {
            const { data, error } = await supabase
                .from('roles')
                .select('*')
                .order('name');

            if (error) throw error;

            const customRoles = (data || []).filter(r => r.name !== 'admin' && r.name !== 'employee');
            setRoles(customRoles);

            if (customRoles.length > 0 && !activeRole) {
                setActiveRole(customRoles[0]);
            }
        } catch (error: any) {
            console.error('Error fetching roles:', error);
        }
    };

    const fetchStaff = async () => {
        try {
            // First fetch all profiles that are NOT strictly 'employee' or 'admin' 
            // We use ilike to be case-insensitive just in case
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, role, role_id')
                .order('full_name');

            if (error) throw error;

            // Filter out default roles on the client side to be safe against casing issues
            const staffMembers = (data || []).filter(profile => {
                const normalizedRole = (profile.role || '').toLowerCase().trim();
                return normalizedRole !== 'employee' && normalizedRole !== 'admin';
            });

            setStaff(staffMembers);
        } catch (error: any) {
            console.error('Error fetching staff:', error);
        }
    };

    const handleTabChange = (tab: 'roles' | 'users') => {
        setActiveTab(tab);
        if (tab === 'users') {
            fetchStaff();
        }
    };

    const handleTogglePermission = (moduleId: string) => {
        if (!activeRole) return;

        const updatedPermissions = { ...activeRole.permissions };
        updatedPermissions[moduleId] = !updatedPermissions[moduleId];

        setActiveRole({
            ...activeRole,
            permissions: updatedPermissions
        });
    };

    const handleSaveRole = async () => {
        if (!activeRole) return;
        setSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('roles')
                .update({
                    permissions: activeRole.permissions,
                    updated_at: new Date().toISOString()
                })
                .eq('id', activeRole.id);

            if (error) throw error;

            setMessage({ text: 'Role permissions updated successfully!', type: 'success' });
            setRoles(roles.map(r => r.id === activeRole.id ? activeRole : r));
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            setMessage({ text: 'Failed to save: ' + error.message, type: 'error' });
        }
        setSaving(false);
    };

    const handleAddRole = async () => {
        if (!newRoleName.trim()) {
            setMessage({ text: 'Please enter a role name', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('roles')
                .insert([{
                    name: newRoleName.trim(),
                    permissions: { dashboard: true }
                }])
                .select()
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setRoles([...roles, data].sort((a, b) => a.name.localeCompare(b.name)));
                setActiveRole(data);
                setShowAddRoleModal(false);
                setNewRoleName('');
                setMessage({ text: `Role "${data.name}" created successfully!`, type: 'success' });
            }
        } catch (error: any) {
            setMessage({ text: 'Failed to add role: ' + error.message, type: 'error' });
        }
        setSaving(false);
    };

    const handleAddUser = async () => {
        if (!newUser.email || !newUser.password || !newUser.roleId) {
            setMessage({ text: 'Please fill all required fields', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            // Use temporary client to create user without persisting session
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            const selectedRole = roles.find(r => r.id === newUser.roleId);

            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: newUser.email,
                password: newUser.password,
                options: {
                    data: {
                        full_name: newUser.fullName,
                        role: 'employee' // Use 'employee' temporarily to pass through Auth trigger
                    }
                }
            });

            if (authError) throw authError;

            // 3. Force-update the profile with the CORRECT custom role and ID
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        role: selectedRole?.name || 'staff',
                        role_id: newUser.roleId,
                        full_name: newUser.fullName,
                        status: 'Active'
                    })
                    .eq('id', authData.user.id);

                if (profileError) throw profileError;

                setMessage({ text: 'Staff user created successfully!', type: 'success' });
                fetchStaff(); // Refresh list
                setShowAddUserModal(false);
                setNewUser({ fullName: '', email: '', password: '', roleId: '' });
            }
        } catch (error: any) {
            setMessage({ text: 'Error creating user: ' + error.message, type: 'error' });
        }
        setSaving(false);
    };

    const handleDeleteRole = async (roleId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Delete this role? This might affect assigned users.')) return;

        try {
            const { error } = await supabase.from('roles').delete().eq('id', roleId);
            if (error) throw error;
            const updated = roles.filter(r => r.id !== roleId);
            setRoles(updated);
            if (activeRole?.id === roleId) setActiveRole(updated[0] || null);
            setMessage({ text: 'Role deleted', type: 'success' });
        } catch (error: any) {
            setMessage({ text: 'Error: ' + error.message, type: 'error' });
        }
    };

    return (
        <div className="settings-container">
            <div className="settings-header-glass">
                <div className="header-info">
                    <div className="icon-badge">
                        <Lock className="vibrant-icon" strokeWidth={2.5} size={20} />
                    </div>
                    <div>
                        <h1>Organization Settings</h1>
                        <p>Manage system roles, staff access, and security permissions</p>
                    </div>
                </div>

                <div className="tab-switcher">
                    <button
                        className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
                        onClick={() => handleTabChange('roles')}
                    >
                        <Shield size={16} />
                        <span>Role Permissions</span>
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => handleTabChange('users')}
                    >
                        <Users size={16} />
                        <span>Staff Management</span>
                    </button>
                </div>
            </div>

            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="settings-content-wrapper">
                {activeTab === 'roles' ? (
                    <div className="settings-grid">
                        <div className="roles-panel card-glass">
                            <div className="panel-header">
                                <h2>Access Roles</h2>
                                <button className="add-btn-circle" onClick={() => setShowAddRoleModal(true)}>
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="roles-scroller">
                                {loading ? (
                                    <div className="skeleton-item" />
                                ) : roles.length === 0 ? (
                                    <div className="empty-mini">No custom roles created.</div>
                                ) : roles.map(role => (
                                    <div
                                        key={role.id}
                                        className={`role-card-item ${activeRole?.id === role.id ? 'active' : ''}`}
                                        onClick={() => setActiveRole(role)}
                                    >
                                        <div className="role-avatar"><Shield size={16} /></div>
                                        <div className="role-meta">
                                            <span className="role-title">{role.name}</span>
                                            <span className="role-type">Staff Role</span>
                                        </div>
                                        <button className="del-btn" onClick={(e) => handleDeleteRole(role.id, e)}>
                                            <Trash2 size={14} />
                                        </button>
                                        <ChevronRight className="indicator" size={14} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="permissions-panel card-glass">
                            {activeRole ? (
                                <>
                                    <div className="perm-header">
                                        <div className="perm-title-group">
                                            <span className="label-tag">Configuring Permissions</span>
                                            <h3>{activeRole.name} Management</h3>
                                        </div>
                                        <button
                                            className={`save-btn-premium ${saving ? 'loading' : ''}`}
                                            onClick={handleSaveRole}
                                            disabled={saving}
                                        >
                                            <Save size={18} />
                                            <span>{saving ? 'Saving...' : 'Sync Permissions'}</span>
                                        </button>
                                    </div>
                                    <div className="modules-list-container">
                                        {modules.map(module => {
                                            const isChecked = activeRole.permissions[module.id];
                                            const Icon = moduleIcons[module.id] || FileText;
                                            return (
                                                <div
                                                    key={module.id}
                                                    className={`module-perm-item ${isChecked ? 'granted' : ''}`}
                                                    onClick={() => handleTogglePermission(module.id)}
                                                >
                                                    <div className="module-icon-box"><Icon size={20} /></div>
                                                    <div className="module-details">
                                                        <h4>{module.name}</h4>
                                                        <p>{module.description}</p>
                                                    </div>
                                                    <div className="module-status">
                                                        {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state">
                                    <Shield size={60} />
                                    <h3>Select a Role</h3>
                                    <p>Permissions define what staff can do in the admin portal.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="staff-management-view card-glass">
                        <div className="view-header">
                            <div>
                                <h2>Staff Users</h2>
                                <p>Admin-lite users with custom organizational roles</p>
                            </div>
                            <button className="add-btn-premium" onClick={() => setShowAddUserModal(true)}>
                                <Plus size={18} />
                                <span>Create Staff User</span>
                            </button>
                        </div>

                        <div className="staff-table-container">
                            <table className="staff-table">
                                <thead>
                                    <tr>
                                        <th>Full Name</th>
                                        <th>Mail Address</th>
                                        <th>Current Role</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staff.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="no-data">No custom staff users found. Create one to get started.</td>
                                        </tr>
                                    ) : staff.map(user => (
                                        <tr key={user.id}>
                                            <td><div className="name-cell"><strong>{user.full_name}</strong></div></td>
                                            <td><div className="mail-cell"><Mail size={14} /> {user.email}</div></td>
                                            <td><span className="role-tag">{user.role}</span></td>
                                            <td><span className="status-badge active">Active</span></td>
                                            <td><button className="icon-btn-del"><Trash2 size={16} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddRoleModal && (
                <div className="modal-backdrop" onClick={() => setShowAddRoleModal(false)}>
                    <div className="premium-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>New System Role</h3>
                            <button onClick={() => setShowAddRoleModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label>Internal Name</label>
                                <input
                                    type="text"
                                    value={newRoleName}
                                    onChange={e => setNewRoleName(e.target.value)}
                                    placeholder="e.g. HR Representative"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-create" onClick={handleAddRole} disabled={saving}>
                                {saving ? 'Creating...' : 'Create Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddUserModal && (
                <div className="modal-backdrop" onClick={() => setShowAddUserModal(false)}>
                    <div className="premium-modal wide" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="header-badge"><Users size={16} /></div>
                            <h3>Create New Staff Member</h3>
                            <button className="close" onClick={() => setShowAddUserModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-grid">
                                <div className="input-field">
                                    <label>Full Name</label>
                                    <div className="input-wrap">
                                        <Users2 size={18} />
                                        <input type="text" placeholder="John Doe" value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} />
                                    </div>
                                </div>
                                <div className="input-field">
                                    <label>Email Address</label>
                                    <div className="input-wrap">
                                        <Mail size={18} />
                                        <input type="email" placeholder="john@company.com" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                                    </div>
                                </div>
                                <div className="input-field">
                                    <label>Login Password</label>
                                    <div className="input-wrap">
                                        <Key size={18} />
                                        <input type="text" placeholder="Set password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                                    </div>
                                </div>
                                <div className="input-field">
                                    <label>Assigned Role</label>
                                    <div className="input-wrap">
                                        <Shield size={18} />
                                        <select value={newUser.roleId} onChange={e => setNewUser({ ...newUser, roleId: e.target.value })}>
                                            <option value="">Select Role</option>
                                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAddUser} disabled={saving}>
                                {saving ? <span className="spin">⌛</span> : <ArrowRight size={18} />}
                                <span>{saving ? 'Creating Account...' : 'Confirm & Create'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .settings-container { padding: 40px; max-width: 1400px; margin: 0 auto; animation: fadeIn 0.5s ease; }
                .settings-header-glass {
                    background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px);
                    padding: 24px 32px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.5);
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;
                }
                .icon-badge { width: 50px; height: 50px; background: var(--color-primary-light); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 20px; }
                .header-info { display: flex; align-items: center; }
                .header-info h1 { margin: 0; font-size: 24px; font-weight: 850; letter-spacing: -0.5px; }
                .header-info p { margin: 4px 0 0; color: #6B7280; font-size: 14px; }

                .tab-switcher { display: flex; background: #F3F4F6; padding: 4px; border-radius: 12px; gap: 4px; }
                .tab-btn {
                    padding: 8px 16px; border: none; background: transparent; color: #4B5563;
                    font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px;
                    border-radius: 8px; cursor: pointer; transition: 0.2s;
                }
                .tab-btn.active { background: white; color: var(--color-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

                .settings-grid { display: grid; grid-template-columns: 340px 1fr; gap: 24px; }
                .card-glass { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px); border: 1px solid white; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); overflow: hidden; }

                .panel-header { padding: 20px; border-bottom: 1px solid #F3F4F6; display: flex; justify-content: space-between; align-items: center; }
                .panel-header h2 { font-size: 16px; font-weight: 800; margin: 0; }
                .add-btn-circle { width: 32px; height: 32px; border: none; background: var(--color-primary); color: white; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }

                .roles-scroller { padding: 8px; }
                .role-card-item {
                    display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 14px;
                    cursor: pointer; transition: 0.2s; margin-bottom: 4px; position: relative;
                }
                .role-card-item:hover { background: rgba(0,0,0,0.03); }
                .role-card-item.active { background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
                .role-avatar { width: 36px; height: 36px; background: #F3F4F6; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #9CA3AF; }
                .role-card-item.active .role-avatar { background: var(--color-primary); color: white; }
                .role-meta { flex: 1; }
                .role-title { display: block; font-weight: 700; font-size: 14px; }
                .role-type { font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 600; }
                .del-btn { opacity: 0; background: #FEE2E2; color: #EF4444; border: none; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; }
                .role-card-item:hover .del-btn { opacity: 1; }

                .permissions-panel { padding: 32px; }
                .perm-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
                .perm-header h3 { font-size: 22px; margin: 0; font-weight: 850; }
                .label-tag { font-size: 10px; font-weight: 800; color: var(--color-primary); display: block; margin-bottom: 4px; }
                
                .save-btn-premium {
                    background: var(--color-primary); color: white; border: none; padding: 10px 20px;
                    border-radius: 10px; font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s;
                }
                .save-btn-premium:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(98, 50, 255, 0.2); }

                .modules-list-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
                .module-perm-item {
                    display: flex; align-items: center; gap: 16px; padding: 20px; background: white;
                    border-radius: 18px; cursor: pointer; transition: 0.2s; border: 2px solid transparent;
                }
                .module-perm-item.granted { border-color: var(--color-primary); background: rgba(98,50,255,0.02); }
                .module-icon-box { width: 44px; height: 44px; background: #F9FAFB; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #6B7280; }
                .module-perm-item.granted .module-icon-box { background: var(--color-primary-light); color: var(--color-primary); }
                .module-details h4 { margin: 0 0 4px; font-size: 15px; font-weight: 800; }
                .module-details p { margin: 0; font-size: 11px; color: #9CA3AF; }

                .view-header { padding: 32px; border-bottom: 1px solid #F3F4F6; display: flex; justify-content: space-between; align-items: center; }
                .view-header h2 { margin: 0; font-size: 20px; font-weight: 850; }
                .view-header p { margin: 4px 0 0; color: #9CA3AF; font-size: 13px; }
                .add-btn-premium {
                    background: #111827; color: white; border: none; padding: 12px 20px; border-radius: 10px;
                    font-weight: 700; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s;
                }
                .add-btn-premium:hover { background: #000; transform: translateY(-2px); }

                .staff-table-container { padding: 0 16px 16px; }
                .staff-table { width: 100%; border-collapse: collapse; }
                .staff-table th { text-align: left; padding: 16px; font-size: 12px; color: #9CA3AF; font-weight: 800; text-transform: uppercase; }
                .staff-table td { padding: 16px; border-top: 1px solid #F3F4F6; }
                .name-cell strong { font-size: 15px; color: #111827; }
                .mail-cell { color: #6B7280; font-size: 13px; display: flex; align-items: center; gap: 6px; }
                .role-tag { padding: 4px 10px; background: #F3F4F6; border-radius: 6px; font-size: 11px; font-weight: 700; color: #4B5563; }
                .status-badge { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
                .status-badge.active { background: #ECFDF5; color: #059669; }
                .icon-btn-del { border: none; background: #FEE2E2; color: #EF4444; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; }

                .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
                .premium-modal { background: white; border-radius: 24px; padding: 32px; width: 400px; box-shadow: 0 40px 80px rgba(0,0,0,0.2); animation: slideUp 0.3s ease; }
                .premium-modal.wide { width: 600px; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .modal-header h3 { margin: 0; font-size: 20px; font-weight: 850; }
                .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .input-field label { display: block; font-size: 12px; font-weight: 800; margin-bottom: 8px; color: #374151; }
                .input-wrap { display: flex; align-items: center; gap: 10px; background: #F9FAFB; border: 2px solid #F3F4F6; padding: 12px 16px; border-radius: 12px; }
                .input-wrap:focus-within { border-color: var(--color-primary); background: white; }
                .input-wrap input, .input-wrap select { border: none; background: transparent; flex: 1; outline: none; font-weight: 600; font-size: 14px; }
                
                .modal-footer { display: flex; gap: 12px; margin-top: 32px; }
                .btn-cancel { flex: 1; background: #F3F4F6; border: none; padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; }
                .btn-primary { flex: 2; background: var(--color-primary); color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; }

                .toast-message { position: fixed; top: 30px; right: 30px; padding: 16px 24px; border-radius: 14px; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 12px; z-index: 2000; font-weight: 700; animation: slideIn 0.3s ease; }
                .toast-message.success { border-left: 6px solid #10B981; }
                .toast-message.error { border-left: 6px solid #EF4444; }

                .empty-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #D1D5DB; text-align: center; }
                .spin { animation: spin 1s linear infinite; display: inline-block; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideIn { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default Settings;
