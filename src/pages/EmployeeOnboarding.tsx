import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Mail, ShieldCheck, User, Building, Phone, MapPin,
    Upload, CheckCircle2,
    AlertCircle, Loader2, ArrowRight, ArrowLeft, Signature
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface LoginProps {
    isDarkMode: boolean;
}

const EmployeeOnboarding: React.FC<LoginProps> = ({ isDarkMode }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    // Step 1: Credentials
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userId, setUserId] = useState<string | null>(null);

    // Step 2: Personal
    const [fullName, setFullName] = useState('');
    const [fathersName, setFathersName] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('Male');
    const [phone, setPhone] = useState('');
    const [personalEmail, setPersonalEmail] = useState('');
    const [address, setAddress] = useState('');
    const [permanentAddress, setPermanentAddress] = useState('');
    const [department, setDepartment] = useState('');
    const [aadharNumber, setAadharNumber] = useState('');
    const [panNumber, setPanNumber] = useState('');
    const [qualification, setQualification] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('Single');
    const [bloodGroup, setBloodGroup] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [emergencyRelationship, setEmergencyRelationship] = useState('');

    const [departments, setDepartments] = useState<any[]>([]);

    useEffect(() => {
        const fetchDeps = async () => {
            const { data } = await supabase.from('departments').select('*').order('name');
            if (data) setDepartments(data);
        };
        fetchDeps();
    }, []);

    // Step 3: Documents
    const [aadharDoc, setAadharDoc] = useState<File | null>(null);
    const [panDoc, setPanDoc] = useState<File | null>(null);
    const [uploadingDocs, setUploadingDocs] = useState(false);

    // Step 4: Offer Letter
    const [signedName, setSignedName] = useState('');
    const [isSigned, setIsSigned] = useState(false);

    // Check for existing session and profile
    useEffect(() => {
        const checkExistingProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                setEmail(session.user.email || '');

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (profile) {
                    if (profile.offer_letter_signed) {
                        navigate('/');
                        return;
                    }

                    if (profile.full_name) setFullName(profile.full_name);
                    if (profile.fathers_name) setFathersName(profile.fathers_name);
                    if (profile.dob) setDob(profile.dob);
                    if (profile.gender) setGender(profile.gender);
                    if (profile.phone) setPhone(profile.phone);
                    if (profile.personal_email) setPersonalEmail(profile.personal_email);
                    if (profile.address) setAddress(profile.address);
                    if (profile.permanent_address) setPermanentAddress(profile.permanent_address);
                    if (profile.department) setDepartment(profile.department);
                    if (profile.aadhar_number) setAadharNumber(profile.aadhar_number);
                    if (profile.pan_number) setPanNumber(profile.pan_number);
                    if (profile.qualification) setQualification(profile.qualification);
                    if (profile.marital_status) setMaritalStatus(profile.marital_status);
                    if (profile.blood_group) setBloodGroup(profile.blood_group);
                    if (profile.emergency_contact_phone) setEmergencyPhone(profile.emergency_contact_phone);
                    if (profile.emergency_contact_relationship) setEmergencyRelationship(profile.emergency_contact_relationship);

                    if (!profile.full_name) setStep(2);
                    else if (!profile.id_proof_url) setStep(3);
                    else setStep(4);
                } else {
                    setStep(2);
                }
            }
        };

        checkExistingProfile();
    }, [navigate]);

    const handleStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { role: 'employee' }
                }
            });
            if (error) throw error;
            if (data.user) {
                setUserId(data.user.id);
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError("Please verify your email before proceeding to Step 2.");
                    return;
                }
                setStep(2);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep(step + 1);
    };

    const handleFileUpload = async (file: File, path: string) => {
        if (!userId) throw new Error("User session not found. Please log in again.");

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${path}_${Date.now()}.${fileExt}`;

        const { error } = await supabase.storage
            .from('employee-docs')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error("Storage Error:", error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('employee-docs')
            .getPublicUrl(fileName);

        return publicUrl;
    };

    const handleStep3 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aadharDoc || !panDoc) {
            setError("Please upload both Aadhar and PAN documents");
            return;
        }
        setUploadingDocs(true);
        setError(null);
        try {
            const aadharUrl = await handleFileUpload(aadharDoc, 'aadhar');
            const panUrl = await handleFileUpload(panDoc, 'pan');

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    email: email,
                    role: 'employee',
                    id_proof_url: aadharUrl,
                    aadhaar_pan_url: panUrl
                }, { onConflict: 'id' });

            if (error) throw error;
            setStep(4);
        } catch (err: any) {
            setError(`Upload Failed: ${err.message}`);
        } finally {
            setUploadingDocs(false);
        }
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSigned) {
            setError("Please sign the offer letter");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    email: email,
                    role: 'employee',
                    full_name: fullName,
                    fathers_name: fathersName,
                    dob,
                    gender,
                    phone,
                    personal_email: personalEmail,
                    address,
                    permanent_address: permanentAddress,
                    department,
                    aadhar_number: aadharNumber,
                    pan_number: panNumber,
                    qualification,
                    marital_status: maritalStatus,
                    blood_group: bloodGroup,
                    emergency_contact_phone: emergencyPhone,
                    emergency_contact_relationship: emergencyRelationship,
                    offer_letter_signed: true
                }, { onConflict: 'id' });

            if (error) throw error;
            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="onboard-page">
            {success ? (
                <div className="welcome-aboard-card">
                    <div className="wb-inner">
                        {/* Icon */}
                        <div className="wb-icon-core">
                            <CheckCircle2 size={40} strokeWidth={2.5} />
                        </div>

                        {/* Badge */}
                        <div className="wb-badge">🎉 Section Completed</div>

                        {/* Headline */}
                        <h1 className="wb-title">Welcome Aboard, {fullName.split(' ')[0]}!</h1>
                        <p className="wb-subtitle">
                            We've processed your details. You're now a part of the <strong>Versovate</strong> team.
                        </p>

                        {/* CTA */}
                        <button onClick={() => navigate('/login')} className="wb-cta">
                            <span>Proceed to Dashboard</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="onboard-card">
                    <div className="onboard-header">
                        <img
                            src={isDarkMode ? "/assets/nightmode_logo.png" : "/assets/daymode_logo.png"}
                            alt="Versovate"
                            style={{ height: '44px', marginBottom: '40px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}
                        />
                        <h1 className="emp-title">Join the Mission</h1>
                        <div className="stepper-v5">
                            {[1, 2, 3, 4].map((s) => (
                                <React.Fragment key={s}>
                                    <div className={`step-dot ${step >= s ? 'active' : ''}`}>
                                        {step > s ? <CheckCircle2 size={18} /> : s}
                                    </div>
                                    {s < 4 && <div className={`step-line ${step > s ? 'active' : ''}`}></div>}
                                </React.Fragment>
                            ))}
                        </div>
                        <p className="step-label">
                            {step === 1 && "Security & Credentials"}
                            {step === 2 && "Personal Profile"}
                            {step === 3 && "Verification Documents"}
                            {step === 4 && "Offer Agreement"}
                        </p>
                    </div>

                    {error && (
                        <div className="login-alert error">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* STEP 1: CREDENTIALS */}
                    {step === 1 && (
                        <form onSubmit={handleStep1} className="emp-form">
                            <div className="input-group-v5">
                                <label>Official Work Email</label>
                                <div className="input-field">
                                    <Mail className="field-icon" size={20} />
                                    <input
                                        type="email"
                                        placeholder="yourname@versovate.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="input-group-v5">
                                <label>Create Secure Password</label>
                                <div className="input-field">
                                    <ShieldCheck className="field-icon" size={20} />
                                    <input
                                        type="password"
                                        placeholder="Min. 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="emp-login-btn" disabled={loading} style={{ marginTop: '12px' }}>
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <>Continue <ArrowRight size={18} /></>}
                            </button>
                        </form>
                    )}

                    {/* STEP 2: PERSONAL */}
                    {step === 2 && (
                        <form onSubmit={handleProfileUpdate} className="emp-form">
                            <div className="onboard-grid">
                                <div className="input-group-v5">
                                    <label>Full Legal Name</label>
                                    <div className="input-field">
                                        <User className="field-icon" size={20} />
                                        <input
                                            type="text"
                                            placeholder="As per Aadhar"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group-v5">
                                    <label>Father's Name</label>
                                    <div className="input-field">
                                        <User className="field-icon" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Full Name"
                                            value={fathersName}
                                            onChange={(e) => setFathersName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group-v5">
                                    <label>Date of Birth</label>
                                    <div className="input-field">
                                        <input
                                            type="date"
                                            value={dob}
                                            onChange={(e) => setDob(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group-v5">
                                    <label>Gender</label>
                                    <div className="input-field">
                                        <select
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                            required
                                        >
                                            <option>Male</option>
                                            <option>Female</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="input-group-v5">
                                    <label>Mobile Number</label>
                                    <div className="input-field">
                                        <Phone className="field-icon" size={20} />
                                        <input
                                            type="tel"
                                            placeholder="+91 00000 00000"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group-v5">
                                    <label>Personal Email</label>
                                    <div className="input-field">
                                        <Mail className="field-icon" size={20} />
                                        <input
                                            type="email"
                                            placeholder="personal@gmail.com"
                                            value={personalEmail}
                                            onChange={(e) => setPersonalEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group-v5">
                                    <label>Department Position</label>
                                    <div className="input-field">
                                        <Building className="field-icon" size={20} />
                                        <select
                                            value={department}
                                            onChange={(e) => setDepartment(e.target.value)}
                                            required
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.name}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="input-group-v5">
                                    <label>Highest Qualification</label>
                                    <div className="input-field">
                                        <input
                                            type="text"
                                            placeholder="e.g. Master's in CS"
                                            value={qualification}
                                            onChange={(e) => setQualification(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group-v5">
                                    <label>Aadhar Number</label>
                                    <div className="input-field">
                                        <input
                                            type="text"
                                            placeholder="XXXX XXXX XXXX"
                                            value={aadharNumber}
                                            onChange={(e) => setAadharNumber(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group-v5">
                                    <label>PAN Number</label>
                                    <div className="input-field">
                                        <input
                                            type="text"
                                            placeholder="ABCDE1234F"
                                            value={panNumber}
                                            onChange={(e) => setPanNumber(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group-v5 full-width">
                                    <label>Current Residential Address</label>
                                    <div className="input-field">
                                        <MapPin className="field-icon" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Full address"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="onboard-actions">
                                <button type="button" onClick={() => setStep(1)} className="back-btn">
                                    <ArrowLeft size={18} />
                                </button>
                                <button type="submit" className="emp-login-btn">
                                    Continue <ArrowRight size={18} />
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 3: DOCUMENTS */}
                    {step === 3 && (
                        <form onSubmit={handleStep3} className="emp-form">
                            <div className="doc-upload-info">
                                <p>Upload your identity documents below. Each document must be uploaded separately.</p>
                            </div>
                            <div className="file-upload-stack">
                                <div className={`file-drop-zone ${aadharDoc ? 'has-file' : ''}`}>
                                    <div className="doc-drop-icon">
                                        <Upload size={22} />
                                    </div>
                                    <div className="doc-drop-text">
                                        <p className="main-txt">{aadharDoc ? aadharDoc.name : 'Aadhar Card'}</p>
                                        <p className="sub-txt">{aadharDoc ? '✓ File selected' : 'PDF or Image · Max 5MB'}</p>
                                    </div>
                                    {aadharDoc && <div className="doc-check">✓</div>}
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) => e.target.files?.[0] && setAadharDoc(e.target.files[0])}
                                        required={!aadharDoc}
                                    />
                                </div>

                                <div className={`file-drop-zone ${panDoc ? 'has-file' : ''}`}>
                                    <div className="doc-drop-icon">
                                        <Upload size={22} />
                                    </div>
                                    <div className="doc-drop-text">
                                        <p className="main-txt">{panDoc ? panDoc.name : 'PAN Card'}</p>
                                        <p className="sub-txt">{panDoc ? '✓ File selected' : 'PDF or Image · Max 5MB'}</p>
                                    </div>
                                    {panDoc && <div className="doc-check">✓</div>}
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={(e) => e.target.files?.[0] && setPanDoc(e.target.files[0])}
                                        required={!panDoc}
                                    />
                                </div>
                            </div>
                            <div className="onboard-actions">
                                <button type="button" onClick={() => setStep(2)} className="back-btn">
                                    <ArrowLeft size={18} />
                                </button>
                                <button type="submit" className="emp-login-btn" disabled={uploadingDocs}>
                                    {uploadingDocs ? <Loader2 className="animate-spin" size={24} /> : <>Upload Documents <ArrowRight size={18} /></>}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 4: OFFER LETTER */}
                    {step === 4 && (
                        <form onSubmit={handleFinalSubmit} className="emp-form">
                            <div className="offer-letter-container">
                                <h3>Terms of Employment</h3>
                                <p>Dear {fullName || 'Applicant'},</p>
                                <p>We are delighted to welcome you to Versovate. This agreement outlines the terms of your engagement as a valued member of our team.</p>
                                <p><strong>1. Role and Responsibilities:</strong> You will be joining us in the {department || '[Selected Department]'} team. You are expected to perform your duties with professional diligence.</p>
                                <p><strong>2. Confidentiality:</strong> You agree to maintain strict confidentiality regarding all company secrets, client data, and proprietary information.</p>
                                <p><strong>3. Code of Conduct:</strong> Versovate maintains a high standard of professional ethics. By signing this, you agree to abide by the Employee Handbook.</p>

                                <div className="signing-area">
                                    <div className="input-group-v5">
                                        <label>Digital Signature (Type Full Name)</label>
                                        <div className="input-field">
                                            <Signature className="field-icon" size={20} />
                                            <input
                                                type="text"
                                                placeholder="Type your name here"
                                                value={signedName}
                                                onChange={(e) => {
                                                    setSignedName(e.target.value);
                                                    setIsSigned(e.target.value.toLowerCase() === (fullName || '').toLowerCase());
                                                }}
                                                required
                                            />
                                        </div>
                                        {isSigned && (
                                            <p className="sign-match"><CheckCircle2 size={14} /> Signature matches verified records</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="onboard-actions">
                                <button type="button" onClick={() => setStep(3)} className="back-btn">
                                    <ArrowLeft size={18} />
                                </button>
                                <button type="submit" className="emp-login-btn" disabled={loading || !isSigned}>
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : <>Accept & Join Versovate</>}
                                </button>
                            </div>
                        </form>
                    )}

                    {!userId && (
                        <div className="emp-login-footer">
                            <p>Part of the old crew? <Link to="/login" className="onboard-link">Sign in here</Link></p>
                        </div>
                    )}
                </div>
            )}

            <style>{`
        .onboard-page { 
            min-height: 100vh; 
            width: 100%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: radial-gradient(circle at 0% 0%, rgba(98, 50, 255, 0.15) 0%, transparent 50%),
                        radial-gradient(circle at 100% 100%, rgba(0, 191, 165, 0.1) 0%, transparent 50%),
                        var(--bg-main); 
            padding: 60px 20px; 
            position: relative;
            overflow-x: hidden;
        }

        .onboard-page::before {
            content: '';
            position: absolute;
            width: 500px;
            height: 500px;
            background: var(--color-primary);
            filter: blur(150px);
            opacity: 0.05;
            top: -100px;
            right: -100px;
            pointer-events: none;
        }

        .onboard-card { 
            width: 100%; 
            max-width: 720px; 
            padding: 56px; 
            border-radius: 40px; 
            text-align: center; 
            box-shadow: 0 40px 100px rgba(0,0,0,0.1); 
            background: var(--bg-card);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: fadeInScale 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .dark .onboard-card {
            background: rgba(19, 21, 23, 0.7);
            border-color: rgba(255, 255, 255, 0.05);
        }

        .dark .onboard-card {
            box-shadow: 0 40px 100px rgba(0,0,0,0.5);
        }

        @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.98) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .onboard-header { margin-bottom: 48px; }
        .emp-title { 
            font-size: 36px; 
            font-weight: 900; 
            color: var(--text-primary); 
            margin-bottom: 12px; 
            letter-spacing: -1px;
            font-family: 'Outfit', sans-serif;
        }
        .emp-subtitle { color: var(--text-secondary); font-size: 16px; margin-bottom: 32px; }
        
        .stepper-v5 { 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 12px; 
            margin-bottom: 24px; 
        }
        .step-dot { 
            width: 40px; 
            height: 40px; 
            border-radius: 14px; 
            background: var(--bg-muted); 
            color: var(--text-muted); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: 800; 
            font-size: 15px; 
            border: 1px solid var(--border-color); 
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        
        .step-dot.active { 
            background: var(--color-primary); 
            color: white; 
            border-color: var(--color-primary); 
            box-shadow: 0 8px 16px var(--color-primary-light);
            transform: scale(1.1);
        }
        .step-line { width: 40px; height: 4px; background: var(--border-color); border-radius: 10px; overflow: hidden; position: relative; }
        .step-line::after {
            content: '';
            position: absolute;
            left: 0; top: 0; height: 100%; width: 0;
            background: var(--color-primary);
            transition: width 0.6s ease;
        }
        .step-line.active::after { width: 100%; }

        .step-label { 
            font-size: 12px; 
            font-weight: 800; 
            color: var(--color-primary); 
            text-transform: uppercase; 
            letter-spacing: 2px; 
            opacity: 0.8;
        }

        .emp-form { display: flex; flex-direction: column; gap: 28px; }
        .onboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align: left; }
        .input-group-v5.full-width { grid-column: span 2; }
        
        .input-group-v5 { display: flex; flex-direction: column; gap: 10px; text-align: left; }
        .input-group-v5 label { font-size: 14px; font-weight: 700; color: var(--text-secondary); margin-left: 4px; }
        .input-field { position: relative; border-radius: 18px; overflow: hidden; transition: 0.3s; display: flex; align-items: center; }
        .field-icon { position: absolute; left: 16px; color: var(--text-muted); z-index: 2; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; pointer-events: none; }
        
        .input-field input, .input-field select { 
            width: 100%; 
            padding: 16px 16px 16px 52px; 
            background: var(--bg-input); 
            border: 1.5px solid var(--border-color-input); 
            border-radius: 18px; 
            font-size: 15px; 
            color: var(--text-primary); 
            outline: none; 
            transition: all 0.3s ease;
            font-family: 'Inter', sans-serif;
        }

        /* Native select dropdown options — dark mode fix */
        .dark .input-field select option {
            background: #1A1D1F;
            color: #FCFCFC;
        }

        .input-field input:focus, .input-field select:focus { 
            border-color: var(--color-primary); 
            background: var(--bg-card); 
            box-shadow: 0 0 0 5px var(--color-primary-light); 
        }

        .onboard-actions { display: flex; gap: 16px; margin-top: 12px;}
        .back-btn { 
            width: 60px; 
            height: 56px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: var(--bg-muted); 
            border: 1.5px solid var(--border-color); 
            border-radius: 18px; 
            color: var(--text-primary); 
            cursor: pointer; 
            transition: all 0.3s ease;
        }
        .back-btn:hover { background: var(--bg-block); transform: translateX(-4px); }

        .emp-login-btn { 
            flex: 1; 
            padding: 16px; 
            background: linear-gradient(135deg, var(--color-primary), #8E6AFF); 
            color: white; 
            border: none; 
            border-radius: 18px; 
            font-size: 16px; 
            font-weight: 800; 
            cursor: pointer; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 12px; 
            transition: 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); 
            box-shadow: 0 10px 20px var(--color-primary-light);
        }
        .emp-login-btn:hover:not(:disabled) { 
            transform: translateY(-4px); 
            box-shadow: 0 20px 40px var(--color-primary-light);
            filter: brightness(1.1);
        }
        .emp-login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .doc-upload-info { text-align: left; padding: 14px 18px; background: rgba(98,50,255,0.06); border-radius: 14px; border: 1px solid rgba(98,50,255,0.12); }
        .doc-upload-info p { font-size: 13.5px; color: var(--text-secondary); margin: 0; line-height: 1.6; }

        .file-upload-stack { display: flex; flex-direction: column; gap: 16px; }
        .file-drop-zone { 
            position: relative; 
            border: 2px dashed var(--border-color); 
            border-radius: 20px; 
            padding: 20px 24px; 
            display: flex; 
            align-items: center; 
            gap: 16px; 
            cursor: pointer; 
            transition: 0.3s ease; 
            text-align: left; 
            background: var(--bg-muted); 
        }
        .file-drop-zone:hover { border-color: var(--color-primary); background: var(--color-primary-light); transform: translateY(-2px); }
        .file-drop-zone.has-file { border-style: solid; border-color: var(--color-teal); background: var(--color-teal-light); }
        .file-drop-zone input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .doc-drop-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(98,50,255,0.1); display: flex; align-items: center; justify-content: center; color: var(--color-primary); flex-shrink: 0; transition: 0.3s; }
        .file-drop-zone.has-file .doc-drop-icon { background: rgba(0,191,165,0.12); color: var(--color-teal); }
        .doc-drop-text { flex: 1; }
        .doc-check { width: 28px; height: 28px; border-radius: 50%; background: var(--color-teal); color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; }
        .main-txt { font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0; }
        .sub-txt { font-size: 13px; color: var(--text-muted); margin: 0; margin-top: 2px; }

        .offer-letter-container { 
            padding: 40px; 
            border-radius: 24px; 
            text-align: left; 
            background: var(--bg-muted); 
            border: 1px solid var(--border-color); 
            max-height: 450px; 
            overflow-y: auto; 
            margin-bottom: 24px; 
            box-shadow: inset 0 2px 10px rgba(0,0,0,0.02);
        }
        .dark .offer-letter-container { background: rgba(0, 0, 0, 0.2); border-color: rgba(255, 255, 255, 0.1); }
        .offer-letter-container h3 { 
            font-size: 22px; 
            font-weight: 900; 
            margin-bottom: 24px; 
            text-align: center; 
            background: linear-gradient(to right, var(--color-primary), var(--color-teal));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            padding-bottom: 12px; 
        }
        .offer-letter-container p { font-size: 15px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 16px; }
        .signing-area { margin-top: 40px; padding-top: 32px; border-top: 1px dashed var(--border-color); }
        .sign-match { color: var(--color-teal); font-size: 13px; font-weight: 800; margin-top: 10px; display: flex; align-items: center; gap: 6px; }

        .emp-login-footer { margin-top: 40px; font-size: 15px; color: var(--text-muted); }
        .onboard-link { color: var(--color-primary); font-weight: 900; text-decoration: none; border-bottom: 2px solid transparent; transition: 0.3s; }
        .onboard-link:hover { border-color: var(--color-primary); }

        /* ---- Welcome Aboard Screen (Minimalistic Purple) ---- */
        .welcome-aboard-card {
            width: 100%;
            max-width: 500px;
            padding: 48px;
            border-radius: 40px;
            background: var(--bg-card);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid var(--border-color);
            box-shadow: 0 40px 100px rgba(0,0,0,0.1);
            text-align: center;
            animation: fadeInScale 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .dark .welcome-aboard-card {
            background: rgba(19, 21, 23, 0.7);
            border-color: rgba(98, 50, 255, 0.2);
            box-shadow: 0 40px 100px rgba(0,0,0,0.4);
        }
        .wb-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .wb-icon-core {
            width: 84px;
            height: 84px;
            border-radius: 28px;
            background: rgba(98, 50, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-primary);
            margin-bottom: 24px;
            transform: rotate(-10deg);
        }
        .wb-badge {
            padding: 8px 16px;
            background: rgba(98, 50, 255, 0.08);
            border: 1px solid rgba(98, 50, 255, 0.15);
            border-radius: 100px;
            font-size: 13px;
            font-weight: 800;
            color: var(--color-primary);
            margin-bottom: 20px;
        }
        .wb-title {
            font-size: 36px;
            font-weight: 900;
            color: var(--text-primary);
            margin-bottom: 12px;
            letter-spacing: -1px;
        }
        .wb-subtitle {
            font-size: 15px;
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 32px;
            max-width: 340px;
        }
        .wb-subtitle strong { color: var(--color-primary); }
        .wb-cta {
            width: 100%;
            padding: 16px 24px;
            background: var(--color-primary);
            color: white;
            border: none;
            border-radius: 18px;
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
            box-shadow: 0 10px 20px var(--color-primary-light);
        }
        .wb-cta:hover { transform: translateY(-4px); box-shadow: 0 20px 40px var(--color-primary-light); filter: brightness(1.1); }
        
        @media (max-width: 640px) {
            .welcome-aboard-card { padding: 40px 24px; }
            .wb-title { font-size: 28px; }
        }

        
        .login-alert.error { 
            padding: 16px; 
            background: rgba(255, 75, 75, 0.08); 
            color: #FF4B4B; 
            border-radius: 18px; 
            margin-bottom: 32px; 
            display: flex; 
            align-items: center; 
            gap: 12px; 
            font-size: 14px; 
            text-align: left;
            border: 1px solid rgba(255, 75, 75, 0.2);
            animation: shake 0.5s ease;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Responsive Fixes */
        @media (max-width: 640px) {
            .onboard-grid { grid-template-columns: 1fr; }
            .input-group-v5.full-width { grid-column: span 1; }
            .onboard-card { padding: 32px 24px; }
            .emp-title { font-size: 28px; }
        }
      `}</style>
        </div >
    );
};

export default EmployeeOnboarding;
