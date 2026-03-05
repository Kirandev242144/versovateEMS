import React, { useState } from 'react';
import {
    ChevronLeft,
    Check,
    Loader2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const AddEmployee = ({ onBack }: { onBack: () => void }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const [formData, setFormData] = useState({
        // Step 1
        fullName: '',
        fathersName: '',
        dob: '',
        gender: 'Male',
        email: '',
        personalEmail: '',
        phone: '',
        address: '',
        permanentAddress: '',
        aadharNumber: '',
        panNumber: '',
        qualification: '',
        maritalStatus: 'Single',
        bloodGroup: '',
        emergencyName: '',
        emergencyPhone: '',
        emergencyRelationship: '',
        // Step 2
        employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        customId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        joinDate: new Date().toISOString().split('T')[0],
        exitDate: '',
        jobTitle: 'Software Engineer',
        department: '',
        employmentType: 'Full-Time',
        workModel: 'On-Site',
        salaryAmount: '0',
        salaryBasic: '0',
        salaryHra: '0',
        salarySpecialAllowance: '0',
        salaryOtherAllowance: '0',
        salaryCurrency: 'INR',
        // Step 3
        bankAccountHolder: '',
        bankName: 'HDFC Bank',
        bankAccountNumber: '',
        bankIfsc: '',
        bankPan: '',
        bankBranch: '',
        // Auth
        role_id: '',
        allowances: ['Transportation', 'Meal'],
        insurance: ['Health Insurance']
    });

    const [departments, setDepartments] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            const [depsRes, rolesRes] = await Promise.all([
                supabase.from('departments').select('*').order('name'),
                supabase.from('roles').select('id, name').order('name')
            ]);

            if (depsRes.data) {
                setDepartments(depsRes.data);
                if (depsRes.data.length > 0) {
                    setFormData(prev => ({ ...prev, department: depsRes.data[0].name }));
                }
            }

            if (rolesRes.data) {
                setRoles(rolesRes.data);
                const employeeRole = rolesRes.data.find(r => r.name === 'employee');
                if (employeeRole) {
                    setFormData(prev => ({ ...prev, role_id: employeeRole.id }));
                }
            }
        };
        fetchData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 3));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Create a specialized Supabase client that Doesn't persist session
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            // 2. Register the user in Supabase Auth
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: formData.email,
                password: 'Welcome@123',
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: roles.find(r => r.id === formData.role_id)?.name || 'employee'
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('User creation failed');

            // 3. Update the profile with remaining details
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.fullName,
                    fathers_name: formData.fathersName,
                    dob: formData.dob,
                    gender: formData.gender,
                    department: formData.department,
                    job_title: formData.jobTitle,
                    phone: formData.phone,
                    personal_email: formData.personalEmail,
                    aadhar_number: formData.aadharNumber,
                    pan_number: formData.panNumber,
                    qualification: formData.qualification,
                    marital_status: formData.maritalStatus,
                    blood_group: formData.bloodGroup,
                    emergency_contact_name: formData.emergencyName,
                    emergency_contact_phone: formData.emergencyPhone,
                    emergency_contact_relationship: formData.emergencyRelationship,
                    address: formData.address,
                    permanent_address: formData.permanentAddress,
                    employment_type: formData.employmentType,
                    work_model: formData.workModel,
                    join_date: formData.joinDate,
                    exit_date: formData.exitDate || null,
                    custom_id: formData.customId,
                    salary_basic: parseFloat(formData.salaryBasic) || 0,
                    salary_hra: parseFloat(formData.salaryHra) || 0,
                    salary_special_allowance: parseFloat(formData.salarySpecialAllowance) || 0,
                    salary_other_allowance: parseFloat(formData.salaryOtherAllowance) || 0,
                    total_ctc: (parseFloat(formData.salaryBasic) || 0) + (parseFloat(formData.salaryHra) || 0) + (parseFloat(formData.salarySpecialAllowance) || 0) + (parseFloat(formData.salaryOtherAllowance) || 0),
                    salary_amount: (parseFloat(formData.salaryBasic) || 0) + (parseFloat(formData.salaryHra) || 0) + (parseFloat(formData.salarySpecialAllowance) || 0) + (parseFloat(formData.salaryOtherAllowance) || 0),
                    salary_currency: formData.salaryCurrency,
                    bank_account_holder: formData.bankAccountHolder,
                    bank_name: formData.bankName,
                    bank_account_number: formData.bankAccountNumber,
                    bank_ifsc: formData.bankIfsc,
                    bank_pan: formData.bankPan,
                    bank_branch: formData.bankBranch,
                    role: roles.find(r => r.id === formData.role_id)?.name || 'employee',
                    role_id: formData.role_id
                })
                .eq('id', authData.user.id);

            if (profileError) throw profileError;

            setRegistrationSuccess(true);
            setTimeout(() => onBack(), 2000);
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Failed to register employee');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-employee-container">
            <div className="add-employee-header">
                <button className="back-btn" onClick={onBack}>
                    <ChevronLeft size={20} />
                    <span>Back to Employees</span>
                </button>
                <div className="header-text">
                    <h2 className="title-bold">Register New Employee</h2>
                    <p className="subtitle-muted">Enter all required details to onboard a new member to your organization.</p>
                </div>
            </div>

            <div className="registration-layout">
                {/* Stepper Sidebar */}
                <div className="stepper-sidebar">
                    <div className={`step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                        <div className="step-count">{step > 1 ? <Check size={16} /> : '01'}</div>
                        <div className="step-info">
                            <h4 className="step-title">Personal & Contact</h4>
                            <p className="step-desc">Core personal identity</p>
                        </div>
                    </div>
                    <div className={`step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                        <div className="step-count">{step > 2 ? <Check size={16} /> : '02'}</div>
                        <div className="step-info">
                            <h4 className="step-title">Employment & Salary</h4>
                            <p className="step-desc">Role and compensation</p>
                        </div>
                    </div>
                    <div className={`step-item ${step >= 3 ? 'active' : ''}`}>
                        <div className="step-count">03</div>
                        <div className="step-info">
                            <h4 className="step-title">Benefits & Documents</h4>
                            <p className="step-desc">Finalize and upload</p>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="form-column">
                    <div className="form-card card">
                        {registrationSuccess ? (
                            <div className="registration-success">
                                <div className="success-icon">
                                    <Check size={40} />
                                </div>
                                <h3 className="section-title">Registration Successful!</h3>
                                <p className="color-muted">Account created. Redirecting...</p>
                            </div>
                        ) : (
                            <>
                                {step === 1 && (
                                    <div className="step-content">
                                        <div className="section-header">
                                            <h3 className="section-title">Personal Info</h3>
                                            <span className="step-indicator">Step 1/3</span>
                                        </div>

                                        {error && <div className="error-alert">{error}</div>}

                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label>Full Name</label>
                                                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Full Name" />
                                            </div>
                                            <div className="form-group">
                                                <label>Father's Name</label>
                                                <input type="text" name="fathersName" value={formData.fathersName} onChange={handleInputChange} placeholder="Father's Name" />
                                            </div>
                                            <div className="form-group">
                                                <label>Date of Birth</label>
                                                <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Gender</label>
                                                <select name="gender" value={formData.gender} onChange={handleInputChange}>
                                                    <option>Male</option>
                                                    <option>Female</option>
                                                    <option>Other</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Official Email</label>
                                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="email@company.com" />
                                            </div>
                                            <div className="form-group">
                                                <label>Personal Email</label>
                                                <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleInputChange} placeholder="personal@gmail.com" />
                                            </div>
                                            <div className="form-group">
                                                <label>Phone</label>
                                                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+91 ..." />
                                            </div>
                                            <div className="form-group">
                                                <label>Aadhar Number</label>
                                                <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleInputChange} placeholder="1234 5678 9012" />
                                            </div>
                                            <div className="form-group">
                                                <label>PAN Number</label>
                                                <input type="text" name="panNumber" value={formData.panNumber} onChange={handleInputChange} placeholder="ABCDE1234F" />
                                            </div>
                                            <div className="form-group">
                                                <label>Qualification</label>
                                                <input type="text" name="qualification" value={formData.qualification} onChange={handleInputChange} placeholder="B.Tech, MBA, etc." />
                                            </div>
                                            <div className="form-group">
                                                <label>Marital Status</label>
                                                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange}>
                                                    <option>Single</option>
                                                    <option>Married</option>
                                                    <option>Divorced</option>
                                                    <option>Widowed</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Blood Group</label>
                                                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                                                    <option value="">Select</option>
                                                    <option>A+</option><option>A-</option>
                                                    <option>B+</option><option>B-</option>
                                                    <option>O+</option><option>O-</option>
                                                    <option>AB+</option><option>AB-</option>
                                                </select>
                                            </div>
                                            <div className="form-group full-width">
                                                <label>Current Residential Address</label>
                                                <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="House No., Street, Area, City, State, Pincode" />
                                            </div>
                                            <div className="form-group full-width">
                                                <label>Permanent Address</label>
                                                <textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleInputChange} placeholder="Same as above or different" />
                                            </div>
                                            <div className="section-divider full-width" style={{ margin: '16px 0' }}></div>
                                            <div className="form-group">
                                                <label>Emergency Contact Name</label>
                                                <input type="text" name="emergencyName" value={formData.emergencyName} onChange={handleInputChange} placeholder="Contact Name" />
                                            </div>
                                            <div className="form-group">
                                                <label>Emergency Contact Phone</label>
                                                <input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleInputChange} placeholder="Phone Number" />
                                            </div>
                                            <div className="form-group">
                                                <label>Relationship</label>
                                                <input type="text" name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleInputChange} placeholder="e.g. Spouse, Father" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="step-content">
                                        <div className="section-header">
                                            <h3 className="section-title">Employment Details</h3>
                                            <span className="step-indicator">Step 2/3</span>
                                        </div>
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label>Employee ID (Custom)</label>
                                                <input type="text" name="customId" value={formData.customId} onChange={handleInputChange} placeholder="e.g. EMP-2024-001" />
                                            </div>
                                            <div className="form-group">
                                                <label>Join Date</label>
                                                <input type="date" name="joinDate" value={formData.joinDate} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Job Title</label>
                                                <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} placeholder="Software Engineer" />
                                            </div>
                                            <div className="form-group">
                                                <label>Department</label>
                                                <select name="department" value={formData.department} onChange={handleInputChange}>
                                                    <option value="">Select Department</option>
                                                    {departments.map(d => (
                                                        <option key={d.id} value={d.name}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="section-divider full-width" style={{ gridColumn: '1 / -1', borderTop: '1px dashed var(--border-color)', margin: '12px 0' }}></div>

                                            <div className="form-group">
                                                <label>Currency</label>
                                                <select name="salaryCurrency" value={formData.salaryCurrency} onChange={handleInputChange}>
                                                    <option>INR</option>
                                                    <option>USD</option>
                                                    <option>EUR</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Basic Salary</label>
                                                <input type="number" name="salaryBasic" value={formData.salaryBasic} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>HRA</label>
                                                <input type="number" name="salaryHra" value={formData.salaryHra} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Special Allowance</label>
                                                <input type="number" name="salarySpecialAllowance" value={formData.salarySpecialAllowance} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Other Allowances</label>
                                                <input type="number" name="salaryOtherAllowance" value={formData.salaryOtherAllowance} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>User Role</label>
                                                <select name="role_id" value={formData.role_id} onChange={handleInputChange}>
                                                    {roles.map(r => (
                                                        <option key={r.id} value={r.id}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
                                                    ))}
                                                </select>
                                                <p className="field-hint" style={{ fontSize: '11px', marginTop: '4px' }}>Controls what pages this user can see in their portal.</p>
                                            </div>
                                            <div className="form-group">
                                                <label>Total Monthly CTC</label>
                                                <input
                                                    type="text"
                                                    value={(parseFloat(formData.salaryBasic) || 0) + (parseFloat(formData.salaryHra) || 0) + (parseFloat(formData.salarySpecialAllowance) || 0) + (parseFloat(formData.salaryOtherAllowance) || 0)}
                                                    disabled
                                                    className="disabled-input"
                                                    style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="step-content">
                                        <div className="section-header">
                                            <h3 className="section-title">Bank & Documents</h3>
                                            <span className="step-indicator">Step 3/3</span>
                                        </div>
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label>Account Holder</label>
                                                <input type="text" name="bankAccountHolder" value={formData.bankAccountHolder} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Bank Name</label>
                                                <input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Account Number</label>
                                                <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>IFSC Code</label>
                                                <input type="text" name="bankIfsc" value={formData.bankIfsc} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>PAN Number</label>
                                                <input type="text" name="bankPan" value={formData.bankPan} onChange={handleInputChange} />
                                            </div>
                                            <div className="form-group">
                                                <label>Branch</label>
                                                <input type="text" name="bankBranch" value={formData.bankBranch} onChange={handleInputChange} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="form-footer">
                                    <div className="footer-left">
                                        <button className="btn-discard" onClick={onBack}>Discard</button>
                                    </div>
                                    <div className="footer-right">
                                        {step > 1 && <button className="btn-prev" onClick={prevStep} disabled={loading}>Previous</button>}
                                        <button className="btn-next btn-primary-v2" onClick={step === 3 ? handleSubmit : nextStep} disabled={loading}>
                                            {loading ? <Loader2 size={18} className="rotate" /> : (step === 3 ? 'Complete Registration' : 'Next Step')}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .add-employee-container {
                    padding: 32px 40px;
                    width: 100%;
                    box-sizing: border-box;
                    animation: fadeIn 0.4s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .add-employee-header {
                    margin-bottom: 40px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .back-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 0;
                    transition: all 0.2s;
                    width: fit-content;
                }

                .back-btn:hover { color: var(--color-teal); }

                .title-bold { font-size: 28px; font-weight: 800; color: var(--text-primary); }
                .subtitle-muted { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }

                .registration-layout {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 60px;
                    align-items: start;
                }

                .stepper-sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                    position: sticky;
                    top: 40px;
                }

                .step-item {
                    display: flex;
                    gap: 16px;
                    opacity: 0.4;
                    transition: all 0.3s;
                }

                .step-item.active { opacity: 1; }

                .step-count {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--bg-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    border: 2px solid transparent;
                }

                .step-item.active .step-count {
                    background: var(--color-teal-light);
                    color: var(--color-teal);
                    border-color: var(--color-teal);
                }

                .step-item.completed .step-count {
                    background: var(--color-teal);
                    color: var(--text-on-primary);
                }

                .step-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
                .step-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }

                .form-card { padding: 40px; background: var(--bg-card); border-radius: 24px; border: 1px solid var(--border-color); }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                }

                .section-title { font-size: 18px; font-weight: 800; color: var(--text-primary); }
                .step-indicator { font-size: 12px; font-weight: 700; color: var(--color-teal); background: var(--color-teal-light); padding: 4px 12px; border-radius: 20px; }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                }

                .form-group { display: flex; flex-direction: column; gap: 8px; }
                .form-group.full-width { grid-column: span 2; }

                .form-group label { font-size: 14px; font-weight: 600; color: var(--text-primary); }
                
                .form-group input, 
                .form-group select, 
                .form-group textarea {
                    padding: 12px 16px;
                    border: 1px solid var(--border-color-input);
                    border-radius: 12px;
                    font-size: 14px;
                    outline: none;
                    transition: all 0.2s;
                    background: var(--bg-input);
                    color: var(--text-primary);
                }

                .form-group input:focus, 
                .form-group select:focus, 
                .form-group textarea:focus { border-color: var(--color-teal); box-shadow: 0 0 0 4px var(--color-teal-light); background: var(--bg-card); }

                .form-group textarea { height: 100px; resize: none; }

                .radio-group { display: flex; gap: 24px; margin-top: 4px; }
                .radio-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; cursor: pointer; color: var(--text-primary); }
                .radio-label input { width: 18px; height: 18px; accent-color: var(--color-teal); cursor: pointer; }

                .phone-wrapper { display: flex; gap: 12px; }
                .country-code {
                    padding: 12px 16px;
                    background: var(--bg-muted);
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-primary);
                }
                .phone-wrapper input { flex: 1; }

                .input-tip { font-size: 12px; color: var(--text-secondary); }
                .error-msg { font-size: 12px; color: #FF4B4B; font-weight: 500; }

                .section-divider { height: 1px; background: var(--border-color); margin: 40px 0; }

                .disabled-input { background: var(--bg-muted)!important; color: var(--text-muted); cursor: not-allowed; }

                .radio-group-blocks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
                .block-radio {
                    padding: 16px;
                    border: 1px solid var(--border-color-input);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: var(--text-primary);
                }
                .block-radio:hover { border-color: var(--color-teal); }
                .block-radio.active { background: var(--color-teal-light); border-color: var(--color-teal); color: var(--color-teal); }
                .block-radio input { display: none; }

                .currency-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .currency-symbol { position: absolute; left: 16px; font-weight: 700; color: var(--text-primary); }
                .period { position: absolute; right: 16px; font-size: 12px; color: var(--text-secondary); }
                .currency-input-wrapper input { padding-left: 32px; padding-right: 60px; width: 100%; }

                .checkbox-grid { display: flex; gap: 16px; }
                .checkbox-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 20px;
                    border: 1px solid var(--border-color-input);
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: var(--text-primary);
                }
                .checkbox-item input { width: 18px; height: 18px; accent-color: var(--color-teal); }
                .checkbox-item:hover { border-color: var(--color-teal); }

                .upload-grid { display: flex; flex-direction: column; gap: 16px; }
                .upload-card {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 24px;
                    border: 2px dashed var(--border-color-input);
                    border-radius: 16px;
                    transition: all 0.2s;
                }
                .upload-card:hover { border-color: var(--color-teal); background: var(--bg-block); }
                .upload-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: var(--text-secondary);
                }
                .upload-btn span { font-size: 14px; font-weight: 700; color: var(--text-primary); }
                .upload-cap { font-size: 11px; }
                .upload-cap { font-size: 11px; color: var(--text-muted); }

                .form-footer {
                    margin-top: 60px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 32px;
                    border-top: 1px solid var(--border-color);
                }

                .footer-left, .footer-right { display: flex; gap: 16px; }

                .btn-save-draft, .btn-discard, .btn-prev {
                    padding: 12px 20px;
                    border-radius: 12px;
                    border: 1px solid var(--border-color-input);
                    background: var(--bg-card);
                    font-size: 14px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: var(--text-primary);
                }

                .btn-save-draft:hover { background: var(--bg-muted); }
                .btn-discard { color: #FF4B4B; }
                .btn-discard:hover { background: rgba(255, 75, 75, 0.05); border-color: #FF4B4B; }
                
                .btn-next { padding: 12px 32px; }

                .rotate { animation: rotate 1s linear infinite; }
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .error-alert {
                    background: rgba(255, 75, 75, 0.1);
                    color: #FF4B4B;
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 24px;
                    border: 1px solid rgba(255, 75, 75, 0.2);
                }

                .registration-success {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    text-align: center;
                    gap: 16px;
                }

                .success-icon {
                    width: 80px;
                    height: 80px;
                    background: var(--color-teal-light);
                    color: var(--color-teal);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 8px;
                }

                @media(max-width: 1024px) {
                    .registration-layout { grid-template-columns: 1fr; gap: 40px; }
                    .stepper-sidebar { flex-direction: row; position: static; overflow-x: auto; padding-bottom: 20px; }
                    .step-item { min-width: 200px; }
                }
`}</style>
        </div >
    );
};

export default AddEmployee;
