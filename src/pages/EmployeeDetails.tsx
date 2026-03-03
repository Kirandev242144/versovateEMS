import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Mail, Building, Briefcase,
    Landmark, FileText, Download,
    User, Award, Shield, Globe, Edit,
    AlertCircle, Loader2,
    TrendingUp, Camera, Phone, Upload
} from 'lucide-react';
import { useEmployee } from '../hooks/useEmployees';
import { supabase } from '../lib/supabase';
import { usePayrollSettings, calculateSalary } from '../hooks/usePayrollSettings';

// ── Compensation Card sub-component ────────────────────────────
const CompensationCard: React.FC<{
    employee: any;
    editForm: any;
    isEditing: boolean;
    onEdit: () => void;
    handleChange: (key: string, val: any) => void;
}> = ({ employee, editForm, isEditing, onEdit, handleChange }) => {
    const { settings } = usePayrollSettings();
    const gross = Number(
        (isEditing ? editForm.salary_amount : employee.salary_amount) || 0
    );
    const bd = calculateSalary(gross, settings, 0, 30, employee.epf_employee_percent, employee.epf_employer_percent);

    // Preview for NEXT month if pending values exist
    const nextEmpPF = isEditing ? (editForm.pending_epf_employee ?? employee.epf_employee_percent) : (employee.pending_epf_employee ?? employee.epf_employee_percent);
    const nextBossPF = isEditing ? (editForm.pending_epf_employer ?? employee.epf_employer_percent) : (employee.pending_epf_employer ?? employee.epf_employer_percent);

    const nextBd = calculateSalary(gross, settings, 0, 30, nextEmpPF, nextBossPF);

    const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

    return (
        <div className="details-card card compensation-card">
            <div className="card-header compensation" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="header-icon"><TrendingUp size={20} /></div>
                    <h3>Compensation &amp; Benefits</h3>
                </div>
                {!isEditing && (
                    <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: '1.5px solid var(--color-primary)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                        <Edit size={14} /> Edit Compensation
                    </button>
                )}
            </div>
            <div className="card-body">
                {/* Gross Salary — the only direct input */}
                <div className="salary-item main" style={{ marginBottom: '20px' }}>
                    <label>Gross CTC (Monthly)</label>
                    <div className="value-boxed" style={{ marginTop: '8px' }}>
                        <span className="currency">INR</span>
                        {isEditing ? (
                            <input
                                type="number"
                                className="edit-input"
                                style={{ fontSize: '22px', fontWeight: 800, flex: 1, border: 'none', background: 'transparent', color: 'var(--color-primary)', outline: 'none' }}
                                value={editForm.salary_amount ?? ''}
                                onChange={(e) => handleChange('salary_amount', e.target.value)}
                                placeholder="e.g. 104800"
                            />
                        ) : (
                            <span className="amount">{fmt(gross)}</span>
                        )}
                    </div>
                </div>

                {/* Auto-computed breakdown (read-only preview) */}
                <div style={{ background: 'var(--bg-main)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <div style={{ padding: '10px 16px', background: 'var(--bg-block)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Earnings Breakdown</span><span>Auto-calculated from settings</span>
                    </div>
                    {[
                        { label: `Basic (${settings.basic_percent}% of Gross)`, val: bd.basic },
                        { label: `HRA (${settings.hra_percent}% of Basic)`, val: bd.hra },
                        { label: `Conveyance Allowance (Fixed)`, val: bd.conveyance },
                        { label: `Medical Allowance (Fixed)`, val: bd.medical },
                    ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                            <span style={{ fontWeight: 700 }}>{fmt(row.val)}</span>
                        </div>
                    ))}
                    {/* Other Allowances — editable */}
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                            Other Allowances
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                                Auto: {fmt(bd.other_allowances)}
                            </span>
                        </span>
                        {isEditing ? (
                            <input
                                type="number"
                                className="edit-input"
                                style={{ textAlign: 'right', width: '140px', fontWeight: 700 }}
                                value={editForm.other_allowances ?? ''}
                                onChange={(e) => handleChange('other_allowances', e.target.value)}
                                placeholder={String(bd.other_allowances)}
                            />
                        ) : (
                            <span style={{ fontWeight: 700 }}>
                                {fmt(Number(employee.other_allowances) || bd.other_allowances)}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--color-primary-light)', fontSize: '14px', fontWeight: 800 }}>
                        <span>Total Earnings</span><span style={{ color: 'var(--color-primary)' }}>{fmt(gross)}</span>
                    </div>
                </div>

                {/* Deductions preview */}
                <div style={{ background: 'var(--bg-main)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', marginTop: '16px' }}>
                    <div style={{ padding: '10px 16px', background: 'var(--bg-block)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Deductions Preview</span><span>Current Month</span>
                    </div>
                    {[
                        { label: `EPF Employee (${(employee.epf_employee_percent ?? settings.pf_percent)}% up to ₹${settings.pf_limit.toLocaleString()})`, val: bd.pf_employee },
                        { label: `EPF Employer (${(employee.epf_employer_percent ?? settings.employer_pf_percent)}%)`, val: bd.pf_employer },
                        { label: `Professional Tax (Fixed)`, val: bd.professional_tax },
                    ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                            <span style={{ fontWeight: 700, color: '#FF4B4B' }}>{fmt(row.val)}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(0,191,165,0.06)', fontSize: '15px', fontWeight: 900 }}>
                        <span>Est. Net Salary</span><span style={{ color: '#00BFA5' }}>{fmt(bd.net_salary)}</span>
                    </div>
                </div>

                {/* Next Month Preview (Deferred Impact) */}
                {(isEditing || employee.pending_epf_employee !== null) && (
                    <div style={{ background: 'var(--bg-main)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', marginTop: '16px', borderLeft: '4px solid var(--color-primary)' }}>
                        <div style={{ padding: '10px 16px', background: 'var(--color-primary-light)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Next Month Preview</span><span>Impact from {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div style={{ padding: '12px 16px', display: 'flex', gap: '20px' }}>
                            <div className="data-item" style={{ flex: 1 }}>
                                <label style={{ fontSize: '10px' }}>EPF Employee %</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        className="edit-input"
                                        style={{ marginTop: '4px' }}
                                        value={editForm.pending_epf_employee ?? employee.pending_epf_employee ?? ''}
                                        onChange={(e) => handleChange('pending_epf_employee', e.target.value)}
                                        placeholder="Default: 12"
                                    />
                                ) : (
                                    <p style={{ fontSize: '14px' }}>{employee.pending_epf_employee ?? employee.epf_employee_percent ?? 12}%</p>
                                )}
                            </div>
                            <div className="data-item" style={{ flex: 1 }}>
                                <label style={{ fontSize: '10px' }}>EPF Employer %</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        className="edit-input"
                                        style={{ marginTop: '4px' }}
                                        value={editForm.pending_epf_employer ?? employee.pending_epf_employer ?? ''}
                                        onChange={(e) => handleChange('pending_epf_employer', e.target.value)}
                                        placeholder="Default: 12"
                                    />
                                ) : (
                                    <p style={{ fontSize: '14px' }}>{employee.pending_epf_employer ?? employee.epf_employer_percent ?? 12}%</p>
                                )}
                            </div>
                        </div>
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Projected Net Salary</span>
                            <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{fmt(nextBd.net_salary)}</span>
                        </div>
                    </div>
                )}

                {/* Employment type row */}
                <div className="data-row" style={{ marginTop: '20px' }}>
                    <div className="data-item">
                        <label>Employment Type</label>
                        {isEditing ? (
                            <select value={editForm.employment_type || 'Full-Time'} onChange={(e) => handleChange('employment_type', e.target.value)} className="edit-input">
                                <option value="Full-Time">Full-Time</option>
                                <option value="Part-Time">Part-Time</option>
                                <option value="Contract">Contract</option>
                                <option value="Internship">Internship</option>
                            </select>
                        ) : <p>{employee.employment_type || 'Full-Time'}</p>}
                    </div>
                    <div className="data-item">
                        <label>PF Deduction</label>
                        <span style={{ padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: 'rgba(0,191,165,0.1)', color: '#00BFA5', display: 'inline-block' }}>Enabled</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmployeeDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { employee, loading, error, refresh } = useEmployee(id);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    const [departments, setDepartments] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchDeps = async () => {
            const { data } = await supabase.from('departments').select('*').order('name');
            if (data) setDepartments(data);
        };
        fetchDeps();
    }, []);

    React.useEffect(() => {
        if (employee) {
            setEditForm({ ...employee });
        }
    }, [employee]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}-avatar-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('employee-docs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('employee-docs')
                .getPublicUrl(filePath);

            handleChange('profile_pic_url', publicUrl);
        } catch (err: any) {
            alert('Error uploading profile picture: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}-${field}-${Date.now()}.${fileExt}`;
            const filePath = `documents/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('employee-docs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('employee-docs')
                .getPublicUrl(filePath);

            handleChange(field, publicUrl);
        } catch (err: any) {
            alert(`Error uploading ${field}: ` + err.message);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <Loader2 className="animate-spin" size={40} />
                <p>Loading employee details...</p>
            </div>
        );
    }

    const handleSave = async () => {
        if (!id || !editForm) return;
        setIsSaving(true);
        try {
            console.log('Starting profile update...', editForm);
            const updatePromise = supabase
                .from('profiles')
                .update({
                    full_name: editForm.full_name,
                    fathers_name: editForm.fathers_name,
                    dob: editForm.dob,
                    gender: editForm.gender,
                    phone: editForm.phone,
                    personal_email: editForm.personal_email,
                    aadhar_number: editForm.aadhar_number,
                    pan_number: editForm.pan_number,
                    qualification: editForm.qualification,
                    marital_status: editForm.marital_status,
                    blood_group: editForm.blood_group,
                    emergency_contact_name: editForm.emergency_contact_name,
                    emergency_contact_phone: editForm.emergency_contact_phone,
                    emergency_contact_relationship: editForm.emergency_contact_relationship,
                    profile_pic_url: editForm.profile_pic_url,
                    address: editForm.address,
                    permanent_address: editForm.permanent_address,
                    job_title: editForm.job_title,
                    department: editForm.department,
                    employment_type: editForm.employment_type,
                    join_date: editForm.join_date,
                    work_model: editForm.work_model,
                    custom_id: editForm.custom_id,
                    salary_amount: Number(editForm.salary_amount) || 0,
                    other_allowances: editForm.other_allowances !== undefined && editForm.other_allowances !== ''
                        ? Number(editForm.other_allowances)
                        : null,
                    salary_currency: editForm.salary_currency,
                    status: editForm.status,
                    bank_account_holder: editForm.bank_account_holder,
                    bank_name: editForm.bank_name,
                    bank_account_number: editForm.bank_account_number,
                    bank_ifsc: editForm.bank_ifsc,
                    bank_pan: editForm.bank_pan,
                    bank_branch: editForm.bank_branch,
                    offer_letter_url: editForm.offer_letter_url,
                    joining_letter_url: editForm.joining_letter_url,
                    contract_url: editForm.contract_url,
                    id_proof_url: editForm.id_proof_url,
                    educational_url: editForm.educational_url,
                    work_days: editForm.work_days || [1, 2, 3, 4, 5],
                    pending_epf_employee: editForm.pending_epf_employee !== undefined && editForm.pending_epf_employee !== ''
                        ? Number(editForm.pending_epf_employee)
                        : employee.pending_epf_employee,
                    pending_epf_employer: editForm.pending_epf_employer !== undefined && editForm.pending_epf_employer !== ''
                        ? Number(editForm.pending_epf_employer)
                        : employee.pending_epf_employer,
                    epf_update_month: (editForm.pending_epf_employee !== undefined || editForm.pending_epf_employer !== undefined)
                        ? new Date().toISOString().substring(0, 7) // YYYY-MM
                        : employee.epf_update_month
                })
                .eq('id', id);

            const { error: updateError } = await updatePromise;

            if (updateError) throw updateError;
            setIsEditing(false);
            if (refresh) refresh();
        } catch (err: any) {
            alert("Failed to update: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setEditForm((prev: any) => ({ ...prev, [field]: value }));
    };

    if (error || !employee) {
        return (
            <div className="error-container">
                <AlertCircle size={48} color="#FF4B4B" />
                <h2>Error Loading Data</h2>
                <p>{error || "Employee not found."}</p>
                <button onClick={() => navigate('/Admin/employees')} className="back-btn">
                    Back to List
                </button>
            </div>
        );
    }

    return (
        <div className="employee-details-v2">
            <div className="details-header">
                <button className="back-link" onClick={() => navigate('/Admin/employees')}>
                    <ChevronLeft size={20} />
                    <span>Back to Employees</span>
                </button>
                <div className="header-actions">
                    <button className="action-btn secondary">
                        <Download size={18} />
                        <span>Export PDF</span>
                    </button>
                    {isEditing ? (
                        <>
                            <button className="action-btn cancel" onClick={() => setIsEditing(false)}>
                                <span>Cancel</span>
                            </button>
                            <button className="action-btn primary" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <span>Save Changes</span>}
                            </button>
                        </>
                    ) : (
                        <button className="action-btn primary" onClick={() => setIsEditing(true)}>
                            <Edit size={18} />
                            <span>Edit Profile</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="profile-hero-section card">
                <div className="hero-content">
                    <div className="avatar-wrapper">
                        {editForm?.profile_pic_url ? (
                            <img src={editForm.profile_pic_url} alt={employee.full_name} className="hero-avatar" />
                        ) : (
                            <div className="hero-avatar-placeholder">
                                {employee.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </div>
                        )}

                        {isEditing && (
                            <label className="avatar-upload-overlay">
                                <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
                                {uploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                            </label>
                        )}

                        <div className={`status-badge ${employee.status.toLowerCase().replace(' ', '-')}`}>
                            {employee.status}
                        </div>
                    </div>
                    <div className="hero-info">
                        <h1 className="employee-name">{employee.full_name}</h1>
                        <div className="hero-meta">
                            <span className="meta-item"><Briefcase size={16} /> {employee.job_title}</span>
                            <span className="meta-divider">•</span>
                            <span className="meta-item"><Building size={16} /> {employee.department}</span>
                            <span className="meta-divider">•</span>
                            <span className="meta-item"><Mail size={16} /> {employee.email}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="details-grid">
                {/* Personal Information */}
                <div className="details-card card">
                    <div className="card-header personal">
                        <div className="header-icon"><User size={20} /></div>
                        <h3>Personal Information</h3>
                    </div>
                    <div className="card-body">
                        <div className="data-row">
                            <div className="data-item">
                                <label>Full Name</label>
                                {isEditing ? (
                                    <input value={editForm.full_name} onChange={(e) => handleChange('full_name', e.target.value)} className="edit-input" />
                                ) : <p>{employee.full_name}</p>}
                            </div>
                            <div className="data-item">
                                <label>Father's Name</label>
                                {isEditing ? (
                                    <input value={editForm.fathers_name || ''} onChange={(e) => handleChange('fathers_name', e.target.value)} className="edit-input" />
                                ) : <p>{employee.fathers_name || 'Not Provided'}</p>}
                            </div>
                        </div>
                        <div className="data-row">
                            <div className="data-item">
                                <label>Date of Birth</label>
                                {isEditing ? (
                                    <input type="date" value={editForm.dob || ''} onChange={(e) => handleChange('dob', e.target.value)} className="edit-input" />
                                ) : <p>{employee.dob || 'Not Provided'}</p>}
                            </div>
                            <div className="data-item">
                                <label>Gender</label>
                                {isEditing ? (
                                    <select value={editForm.gender || ''} onChange={(e) => handleChange('gender', e.target.value)} className="edit-input">
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                ) : <p>{employee.gender || 'Not Provided'}</p>}
                            </div>
                        </div>
                        <div className="data-row">
                            <div className="data-item">
                                <label>Phone</label>
                                {isEditing ? (
                                    <input value={editForm.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} className="edit-input" />
                                ) : <p>{employee.phone || 'Not Provided'}</p>}
                            </div>
                            <div className="data-item">
                                <label>Personal Email</label>
                                {isEditing ? (
                                    <input value={editForm.personal_email || ''} onChange={(e) => handleChange('personal_email', e.target.value)} className="edit-input" />
                                ) : <p>{employee.personal_email || 'Not Provided'}</p>}
                            </div>
                        </div>
                        <div className="data-row">
                            <div className="data-item">
                                <label>Aadhar Number</label>
                                {isEditing ? (
                                    <input value={editForm.aadhar_number || ''} onChange={(e) => handleChange('aadhar_number', e.target.value)} className="edit-input" />
                                ) : <p className="mono">{employee.aadhar_number || 'Not Provided'}</p>}
                            </div>
                            <div className="data-item">
                                <label>Blood Group</label>
                                {isEditing ? (
                                    <select value={editForm.blood_group || ''} onChange={(e) => handleChange('blood_group', e.target.value)} className="edit-input">
                                        <option value="">Select Blood Group</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                ) : <p>{employee.blood_group || 'Not Provided'}</p>}
                            </div>
                        </div>
                        <div className="data-row">
                            <div className="data-item">
                                <label>Marital Status</label>
                                {isEditing ? (
                                    <select value={editForm.marital_status || ''} onChange={(e) => handleChange('marital_status', e.target.value)} className="edit-input">
                                        <option value="">Select</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                ) : <p>{employee.marital_status || 'Not Provided'}</p>}
                            </div>
                            <div className="data-item">
                                <label>Qualification</label>
                                {isEditing ? (
                                    <input value={editForm.qualification || ''} onChange={(e) => handleChange('qualification', e.target.value)} className="edit-input" />
                                ) : <p>{employee.qualification || 'Not Provided'}</p>}
                            </div>
                        </div>
                        <div className="data-item full-width">
                            <label>Official Email</label>
                            <p>{employee.email}</p>
                        </div>
                        <div className="data-item full-width">
                            <label>Current Address</label>
                            {isEditing ? (
                                <input value={editForm.address || ''} onChange={(e) => handleChange('address', e.target.value)} className="edit-input" />
                            ) : <p>{employee.address || 'Not Provided'}</p>}
                        </div>
                        <div className="data-item full-width">
                            <label>Permanent Address</label>
                            {isEditing ? (
                                <input value={editForm.permanent_address || ''} onChange={(e) => handleChange('permanent_address', e.target.value)} className="edit-input" />
                            ) : <p>{employee.permanent_address || 'Not Provided'}</p>}
                        </div>
                    </div>
                </div>

                {/* Company Information */}
                <div className="details-card card">
                    <div className="card-header company">
                        <div className="header-icon"><Building size={20} /></div>
                        <h3>Company Information</h3>
                    </div>
                    <div className="card-body">
                        <div className="data-row">
                            <div className="data-item">
                                <label>Employee ID</label>
                                {isEditing ? (
                                    <input
                                        value={editForm.custom_id || ''}
                                        onChange={(e) => handleChange('custom_id', e.target.value)}
                                        className="edit-input"
                                        placeholder="Enter Org ID (e.g. EMP-001)"
                                    />
                                ) : (
                                    <p className="id-badge-v2">{(employee as any).custom_id || employee.id.substring(0, 8).toUpperCase()}</p>
                                )}
                            </div>
                            <div className="data-item">
                                <label>Department</label>
                                {isEditing ? (
                                    <select value={editForm.department} onChange={(e) => handleChange('department', e.target.value)} className="edit-input">
                                        <option value="">Select Department</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                ) : <p>{employee.department}</p>}
                            </div>
                        </div>
                        <div className="data-row">
                            <div className="data-item">
                                <label>Job Title</label>
                                {isEditing ? (
                                    <input value={editForm.job_title} onChange={(e) => handleChange('job_title', e.target.value)} className="edit-input" />
                                ) : <p>{employee.job_title}</p>}
                            </div>
                            <div className="data-item">
                                <label>Employment Type</label>
                                {isEditing ? (
                                    <select value={editForm.employment_type || 'Full-Time'} onChange={(e) => handleChange('employment_type', e.target.value)} className="edit-input">
                                        <option value="Full-Time">Full-Time</option>
                                        <option value="Part-Time">Part-Time</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Internship">Internship</option>
                                    </select>
                                ) : <p>{employee.employment_type || 'Full-Time'}</p>}
                            </div>
                        </div>
                        <div className="data-row">
                            <div className="data-item">
                                <label>Join Date</label>
                                {isEditing ? (
                                    <input type="date" value={editForm.join_date || ''} onChange={(e) => handleChange('join_date', e.target.value)} className="edit-input" />
                                ) : <p>{employee.join_date || 'N/A'}</p>}
                            </div>
                            <div className="data-item">
                                <label>Status</label>
                                {isEditing ? (
                                    <select value={editForm.status} onChange={(e) => handleChange('status', e.target.value)} className="edit-input">
                                        <option value="Active">Active</option>
                                        <option value="On Leave">On Leave</option>
                                        <option value="Absent">Absent</option>
                                        <option value="Terminated">Terminated</option>
                                    </select>
                                ) : <p className={`status-text ${employee.status.toLowerCase()}`}>{employee.status}</p>}
                            </div>
                        </div>
                        <div className="data-row" style={{ marginTop: '12px' }}>
                            <div className="data-item full-width">
                                <label style={{ marginBottom: '10px', display: 'block' }}>Working Days</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                                        const isSelected = (editForm?.work_days || employee.work_days || [1, 2, 3, 4, 5]).includes(idx);
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                disabled={!isEditing}
                                                onClick={() => {
                                                    const current = editForm.work_days || employee.work_days || [1, 2, 3, 4, 5];
                                                    const next = current.includes(idx)
                                                        ? current.filter((d: number) => d !== idx)
                                                        : [...current, idx].sort();
                                                    handleChange('work_days', next);
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '10px',
                                                    border: isSelected ? '1.5px solid var(--color-primary)' : '1.5px solid var(--border-color)',
                                                    background: isSelected ? 'var(--color-primary-light)' : 'var(--bg-main)',
                                                    color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                                                    fontWeight: 700,
                                                    fontSize: '12px',
                                                    cursor: isEditing ? 'pointer' : 'default',
                                                    transition: 'all 0.2s',
                                                    opacity: isEditing ? 1 : (isSelected ? 1 : 0.5)
                                                }}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                                {isEditing && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Selected days are marked as regular work days. Deselected days are treated as Holidays.</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compensation & Benefits */}
                <CompensationCard
                    employee={employee as any}
                    editForm={editForm}
                    isEditing={isEditing}
                    onEdit={() => setIsEditing(true)}
                    handleChange={handleChange}
                />

                {/* Bank Details */}
                <div className="details-card card">
                    <div className="card-header bank">
                        <div className="header-icon"><Landmark size={20} /></div>
                        <h3>Bank Details</h3>
                    </div>
                    <div className="card-body">
                        <div className="data-row">
                            <div className="data-item">
                                <label>Account Holder</label>
                                {isEditing ? (
                                    <input value={editForm.bank_account_holder || ''} onChange={(e) => handleChange('bank_account_holder', e.target.value)} className="edit-input" />
                                ) : <p>{employee.bank_account_holder || 'Not Provided'}</p>}
                            </div>
                            <div className="data-item">
                                <label>Bank Name</label>
                                {isEditing ? (
                                    <input value={editForm.bank_name || ''} onChange={(e) => handleChange('bank_name', e.target.value)} className="edit-input" />
                                ) : <p>{employee.bank_name || 'Not Provided'}</p>}
                            </div>
                        </div>
                        <div className="data-row">
                            <div className="data-item">
                                <label>Account Number</label>
                                {isEditing ? (
                                    <input value={editForm.bank_account_number || ''} onChange={(e) => handleChange('bank_account_number', e.target.value)} className="edit-input" />
                                ) : <p className="mono">{employee.bank_account_number || '•••• •••• ••••'}</p>}
                            </div>
                            <div className="data-item">
                                <label>IFSC Code</label>
                                {isEditing ? (
                                    <input value={editForm.bank_ifsc || ''} onChange={(e) => handleChange('bank_ifsc', e.target.value)} className="edit-input" />
                                ) : <p className="mono">{employee.bank_ifsc || 'Not Provided'}</p>}
                            </div>
                        </div>
                        <div className="data-row">
                            <div className="data-item">
                                <label>PAN Number</label>
                                {isEditing ? (
                                    <input value={editForm.bank_pan || ''} onChange={(e) => handleChange('bank_pan', e.target.value)} className="edit-input" />
                                ) : <p className="mono">{employee.bank_pan || 'Not Provided'}</p>}
                            </div>
                            <div className="data-item">
                                <label>Branch</label>
                                {isEditing ? (
                                    <input value={editForm.bank_branch || ''} onChange={(e) => handleChange('bank_branch', e.target.value)} className="edit-input" />
                                ) : <p>{employee.bank_branch || 'Not Provided'}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="details-card card">
                    <div className="card-header emergency">
                        <div className="header-icon"><Phone size={20} /></div>
                        <h3>Emergency Contact</h3>
                    </div>
                    <div className="card-body">
                        <div className="data-item full-width">
                            <label>Contact Name</label>
                            {isEditing ? (
                                <input value={editForm.emergency_contact_name || ''} onChange={(e) => handleChange('emergency_contact_name', e.target.value)} className="edit-input" />
                            ) : <p>{employee.emergency_contact_name || 'Not Provided'}</p>}
                        </div>
                        <div className="data-row">
                            <div className="data-item">
                                <label>Phone Number</label>
                                {isEditing ? (
                                    <input value={editForm.emergency_contact_phone || ''} onChange={(e) => handleChange('emergency_contact_phone', e.target.value)} className="edit-input" />
                                ) : <p>{employee.emergency_contact_phone || 'Not Provided'}</p>}
                            </div>
                            <div className="data-item">
                                <label>Relationship</label>
                                {isEditing ? (
                                    <input value={editForm.emergency_contact_relationship || ''} onChange={(e) => handleChange('emergency_contact_relationship', e.target.value)} className="edit-input" placeholder="e.g. Father, Spouse" />
                                ) : <p>{employee.emergency_contact_relationship || 'Not Provided'}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Documents */}
                <div className="details-card card">
                    <div className="card-header documents">
                        <div className="header-icon"><FileText size={20} /></div>
                        <h3>Employee Documents</h3>
                    </div>
                    <div className="card-body">
                        <div className="doc-list">
                            {[
                                { name: 'Offer Letter', key: 'offer_letter_url', icon: <FileText size={18} /> },
                                { name: 'Joining Letter', key: 'joining_letter_url', icon: <Award size={18} /> },
                                { name: 'Employment Contract', key: 'contract_url', icon: <Shield size={18} /> },
                                { name: 'ID Proof (Aadhaar/PAN)', key: 'id_proof_url', icon: <User size={18} /> },
                                { name: 'Educational Certificates', key: 'educational_url', icon: <Globe size={18} /> }
                            ].map((doc) => (
                                <div key={doc.key} className="doc-item">
                                    <div className="doc-info">
                                        <div className="doc-icon">{doc.icon}</div>
                                        <div className="doc-meta">
                                            <span className="doc-name">{doc.name}</span>
                                            <span className="doc-status">
                                                {editForm ? (editForm[doc.key] ? 'Available' : 'Missing') : (employee as any)[doc.key] ? 'Available' : 'Missing'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="doc-actions" style={{ display: 'flex', gap: '8px' }}>
                                        {((editForm ? editForm[doc.key] : (employee as any)[doc.key])) && (
                                            <button className="doc-download" onClick={() => window.open((editForm ? editForm[doc.key] : (employee as any)[doc.key]), '_blank')}>
                                                <Download size={16} />
                                            </button>
                                        )}
                                        {isEditing && (
                                            <label className="doc-upload-btn" style={{ cursor: 'pointer', padding: '8px', background: 'var(--bg-block)', borderRadius: '8px', color: 'var(--color-primary)' }}>
                                                <input
                                                    type="file"
                                                    hidden
                                                    onChange={(e) => handleDocumentUpload(e, doc.key)}
                                                />
                                                <Upload size={16} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .employee-details-v2 {
                    padding: 32px;
                    background: var(--bg-main);
                    min-height: 100vh;
                }

                .details-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                }

                .back-link {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-secondary);
                    font-weight: 600;
                    background: none;
                    border: none;
                    cursor: pointer;
                    transition: color 0.2s;
                    padding: 0;
                }

                .back-link:hover {
                    color: var(--color-primary);
                }

                .header-actions {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                }

                .action-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 800;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    border: none;
                    white-space: nowrap;
                    min-width: 140px;
                }

                .action-btn.primary {
                    background: var(--color-primary);
                    color: white;
                    box-shadow: 0 4px 12px rgba(110, 64, 255, 0.2);
                }

                .action-btn.primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(110, 64, 255, 0.3);
                }

                .action-btn.secondary {
                    background: var(--bg-card);
                    color: var(--text-primary);
                    border: 1.5px solid var(--border-color);
                }

                .action-btn.secondary:hover {
                    background: var(--bg-block);
                    border-color: var(--text-secondary);
                }

                .action-btn.cancel {
                    background: var(--bg-block);
                    color: var(--text-secondary);
                    border: 1.5px solid var(--border-color);
                }

                .profile-hero-section {
                    padding: 32px;
                    margin-bottom: 32px;
                    border-radius: 24px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-sm);
                }

                .hero-content {
                    display: flex;
                    align-items: center;
                    gap: 32px;
                }

                .avatar-wrapper {
                    position: relative;
                }

                .hero-avatar-placeholder {
                    width: 100px;
                    height: 100px;
                    border-radius: 24px;
                    background: #FFE082;
                    color: #4527A0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    font-weight: 800;
                    box-shadow: 0 8px 16px rgba(255, 224, 130, 0.3);
                }

                .status-badge {
                    position: absolute;
                    bottom: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    white-space: nowrap;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }

                .status-badge.active { background: #00BFA5; color: white; }
                .status-badge.on-leave { background: #FF9432; color: white; }
                .status-badge.absent { background: #FF4B4B; color: white; }

                .employee-name {
                    font-size: 32px;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin-bottom: 8px;
                }

                .hero-meta {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    color: var(--text-secondary);
                    font-size: 15px;
                }

                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .meta-divider {
                    color: var(--border-color);
                }

                .details-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 32px;
                }

                .details-card {
                    border-radius: 24px;
                    overflow: hidden;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                }

                .card-header {
                    padding: 20px 24px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .hero-avatar {
                    width: 100px;
                    height: 100px;
                    border-radius: 24px;
                    object-fit: cover;
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
                }

                .avatar-upload-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.4);
                    border-radius: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .avatar-wrapper:hover .avatar-upload-overlay {
                    opacity: 1;
                }

                .card-header.personal { background: rgba(54, 159, 255, 0.1); color: #369FFF; }
                .card-header.company { background: rgba(142, 94, 255, 0.1); color: #8E5EFF; }
                .card-header.bank { background: rgba(255, 148, 50, 0.1); color: #FF9432; }
                .card-header.emergency { background: rgba(255, 82, 82, 0.1); color: #FF5252; }
                .card-header.documents { background: rgba(0, 191, 165, 0.1); color: #00BFA5; }

                .card-header.emergency .header-icon {
                    background: var(--bg-card);
                    color: #FF5252;
                }

                .header-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    background: var(--bg-card);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--shadow-sm);
                }

                .card-header h3 {
                    font-size: 18px;
                    font-weight: 800;
                    margin: 0;
                }

                .card-body {
                    padding: 24px;
                }

                .data-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    margin-bottom: 24px;
                }

                .data-item label {
                    display: block;
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                }

                .data-item p {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0;
                }

                .data-item.full-width {
                    margin-bottom: 24px;
                }

                .salary-text {
                    color: #00BFA5 !important;
                    font-size: 18px !important;
                    font-weight: 800 !important;
                }

                .salary-period {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-left: 4px;
                }

                .mono {
                    font-family: 'JetBrains Mono', monospace;
                    letter-spacing: 1px;
                }

                .doc-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .doc-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    border-radius: 16px;
                    background: var(--bg-block);
                    border: 1.5px solid var(--border-color);
                }

                .doc-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .doc-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: var(--bg-card);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--color-primary);
                }

                .doc-name {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .doc-status {
                    font-size: 11px;
                    color: var(--text-muted);
                }

                .doc-download, .doc-upload-shortcut {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: 0.2s;
                }

                .doc-download { background: var(--color-primary-light); color: var(--color-primary); border: none; }
                .doc-upload-shortcut { background: var(--bg-card); color: var(--text-muted); border: 1px dashed var(--border-color); }

                .edit-input {
                    width: 100%;
                    padding: 8px 12px;
                    background: var(--bg-block);
                    border: 1.5px solid var(--border-color);
                    border-radius: 8px;
                    font-size: 14px;
                    color: var(--text-primary);
                    font-weight: 600;
                    outline: none;
                    transition: 0.2s;
                }

                .edit-input:focus {
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 3px var(--color-primary-light);
                }

                .salary-edit-group {
                    display: flex;
                    gap: 8px;
                }

                .edit-input.currency { width: 60px; text-align: center; }
                .edit-input.amount { flex: 1; }

                @media (max-width: 1024px) {
                    .details-grid { grid-template-columns: 1fr; }
                    .hero-content { flex-direction: column; text-align: center; }
                    .hero-meta { flex-wrap: wrap; justify-content: center; }
                }

                .loading-container, .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 80vh;
                    text-align: center;
                    gap: 20px;
                }

                .back-btn {
                    padding: 10px 24px;
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                /* Phase 33 Enhancements */
                .id-badge-v2 {
                    display: inline-block;
                    padding: 4px 12px;
                    background: var(--bg-block);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    font-family: 'JetBrains Mono', monospace;
                    font-weight: 700;
                    color: var(--color-primary);
                    font-size: 13px;
                }

                .compensation-card .card-header.compensation {
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    color: white;
                }

                .salary-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .salary-item.main {
                    padding: 20px;
                    background: var(--bg-block);
                    border-radius: 20px;
                    text-align: center;
                    border: 1px solid var(--border-color);
                }

                .salary-item.main label {
                    display: block;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 11px;
                }

                .value-boxed {
                    display: flex;
                    align-items: baseline;
                    justify-content: center;
                    gap: 8px;
                }

                .value-boxed .currency {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-muted);
                }

                .value-boxed .amount {
                    font-size: 32px;
                    font-weight: 900;
                    color: var(--color-primary);
                }

                .breakdown-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                }

                .breakdown-grid .data-item {
                    background: var(--bg-card);
                    padding: 16px;
                    border-radius: 16px;
                    border: 1px solid var(--border-color);
                }

                .breakdown-grid p {
                    font-weight: 700;
                    font-size: 16px;
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    );
};

export default EmployeeDetails;
