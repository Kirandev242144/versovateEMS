import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Building,
    Calendar,
    CreditCard,
    ShieldCheck,
    Camera,
    Loader2,
    CheckCircle2,
    Globe,
    Lock
} from 'lucide-react';
import VirtualIDCard from '../components/VirtualIDCard';
import DataError from '../components/DataError';

const MyProfile: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'bank'>('personal');
    const [showIDCard, setShowIDCard] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [idUploading, setIdUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data, error: fetchErr } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (fetchErr) throw fetchErr;
                setProfile(data);
                setEditForm(data);
            }
        } catch (err: any) {
            console.error('[MyProfile] Fetch error:', err);
            setError('Failed to load profile details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.id) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}-avatar-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('employee-docs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('employee-docs')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ profile_pic_url: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            setProfile({ ...profile, profile_pic_url: publicUrl });
            setEditForm({ ...editForm, profile_pic_url: publicUrl });
        } catch (err: any) {
            alert("Upload failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleIdPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.id) return;

        setIdUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}-idphoto-${Date.now()}.${fileExt}`;
            const filePath = `id-photos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('employee-docs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('employee-docs')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ id_photo_url: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            setProfile({ ...profile, id_photo_url: publicUrl });
            setEditForm({ ...editForm, id_photo_url: publicUrl });
            alert("ID Card Photo Updated!");
        } catch (err: any) {
            alert("ID Photo Upload failed: " + err.message);
        } finally {
            setIdUploading(false);
        }
    };

    const handleSave = async () => {
        if (!profile?.id) return;
        setIsSaving(true);
        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    phone: editForm.phone,
                    address: editForm.address,
                    permanent_address: editForm.permanent_address,
                    personal_email: editForm.personal_email,
                    marital_status: editForm.marital_status,
                    emergency_contact_name: editForm.emergency_contact_name,
                    emergency_contact_phone: editForm.emergency_contact_phone
                })
                .eq('id', profile.id);

            if (updateError) throw updateError;
            setProfile(editForm);
            setEditMode(false);
        } catch (err: any) {
            alert("Save failed: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-40 text-center"><Loader2 className="animate-spin" size={40} style={{ margin: '0 auto', color: 'var(--color-primary)' }} /></div>;
    if (error) return <div className="p-40"><DataError message={error} onRetry={fetchProfile} /></div>;

    return (
        <div className="my-profile-container">
            {/* Header / Hero */}
            <div className="profile-hero glass">
                <div className="profile-hero-main">
                    <div className="profile-avatar-wrapper">
                        {profile?.profile_pic_url ? (
                            <img src={profile.profile_pic_url} alt={profile.full_name} className="profile-avatar-img" />
                        ) : (
                            <div className="profile-avatar-placeholder">
                                {profile?.full_name?.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                        )}
                        <label className="photo-upload-badge" title="Update Profile Picture">
                            <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
                            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                        </label>
                    </div>
                    <div className="profile-hero-info">
                        <div className="name-status">
                            <h1>{profile?.full_name}</h1>
                            <span className={`status-pill ${profile?.status?.toLowerCase()}`}>
                                <CheckCircle2 size={14} />
                                {profile?.status || 'Active'}
                            </span>
                        </div>
                        <div className="hero-meta">
                            <span><Briefcase size={16} /> {profile?.job_title}</span>
                            <span><Building size={16} /> {profile?.department}</span>
                            <span><Mail size={16} /> {profile?.email}</span>
                        </div>
                    </div>
                </div>
                <div className="hero-actions">
                    <div className="id-card-actions">
                        <label className="id-photo-upload-btn">
                            <input type="file" hidden accept="image/png" onChange={handleIdPhotoUpload} />
                            {idUploading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                            <span>{profile?.id_photo_url ? 'Change ID Photo' : 'Upload ID Photo'}</span>
                        </label>
                        <button className="id-card-trigger" onClick={() => setShowIDCard(true)}>
                            <div className="trigger-icon"><Globe size={20} /></div>
                            <div className="trigger-text">
                                <span>Digital ID</span>
                                <small>Preview Card</small>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <div className="profile-content-layout">
                {/* Tabs Sidebar */}
                <div className="profile-tabs-nav glass">
                    <button className={activeTab === 'personal' ? 'active' : ''} onClick={() => setActiveTab('personal')}>
                        <User size={18} /> Personal Info
                    </button>
                    <button className={activeTab === 'professional' ? 'active' : ''} onClick={() => setActiveTab('professional')}>
                        <Briefcase size={18} /> Employment Info
                    </button>
                    <button className={activeTab === 'bank' ? 'active' : ''} onClick={() => setActiveTab('bank')}>
                        <CreditCard size={18} /> Bank & Payouts
                    </button>

                    <div className="profile-security-note">
                        <Lock size={14} />
                        <p>Sensitive professional data is managed by HR and is read-only.</p>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="profile-tab-content glass">
                    <div className="content-header">
                        <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Details</h2>
                        {activeTab === 'personal' && (
                            editMode ? (
                                <div className="edit-actions">
                                    <button onClick={() => setEditMode(false)} className="btn-secondary-v3">Cancel</button>
                                    <button onClick={handleSave} className="btn-primary-v3" disabled={isSaving}>
                                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Save Changes'}
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => setEditMode(true)} className="btn-secondary-v3">Edit Personal Info</button>
                            )
                        )}
                    </div>

                    <div className="details-grid">
                        {activeTab === 'personal' && (
                            <>
                                <InfoItem label="Phone Number" value={profile?.phone} icon={Phone} editable={editMode} onChange={v => setEditForm({ ...editForm, phone: v })} />
                                <InfoItem label="Personal Email" value={profile?.personal_email} icon={Mail} editable={editMode} onChange={v => setEditForm({ ...editForm, personal_email: v })} />
                                <InfoItem label="Current Address" value={profile?.address} icon={MapPin} fullWidth editable={editMode} onChange={v => setEditForm({ ...editForm, address: v })} />
                                <InfoItem label="Permanent Address" value={profile?.permanent_address} icon={MapPin} fullWidth editable={editMode} onChange={v => setEditForm({ ...editForm, permanent_address: v })} />
                                <InfoItem label="Date of Birth" value={profile?.dob} icon={Calendar} />
                                <InfoItem label="Gender" value={profile?.gender} icon={User} />
                                <InfoItem label="Marital Status" value={profile?.marital_status} icon={User} editable={editMode} isSelect options={['Single', 'Married', 'Divorced', 'Widowed']} onChange={v => setEditForm({ ...editForm, marital_status: v })} />
                            </>
                        )}
                        {activeTab === 'professional' && (
                            <>
                                <InfoItem label="Employee ID" value={profile?.custom_id || profile?.id?.substring(0, 8)} icon={ShieldCheck} />
                                <InfoItem label="Joined On" value={profile?.join_date} icon={Calendar} />
                                <InfoItem label="Employment Type" value={profile?.employment_type} icon={Briefcase} />
                                <InfoItem label="Work Model" value={profile?.work_model} icon={Globe} />
                                <InfoItem label="Department" value={profile?.department} icon={Building} />
                                <InfoItem label="Job Title" value={profile?.job_title} icon={Briefcase} />
                            </>
                        )}
                        {activeTab === 'bank' && (
                            <>
                                <InfoItem label="Account Holder" value={profile?.bank_account_holder} icon={User} />
                                <InfoItem label="Bank Name" value={profile?.bank_name} icon={Building} />
                                <InfoItem label="Account Number" value={profile?.bank_account_number} icon={CreditCard} isSecret />
                                <InfoItem label="IFSC Code" value={profile?.bank_ifsc} icon={ShieldCheck} />
                                <InfoItem label="Bank Branch" value={profile?.bank_branch} icon={MapPin} />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showIDCard && profile && <VirtualIDCard employee={profile} onClose={() => setShowIDCard(false)} />}

            <style>{`
                .my-profile-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    animation: fadeIn 0.4s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .profile-hero {
                    padding: 40px;
                    border-radius: 32px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(var(--color-primary-rgb), 0.05) 100%);
                }

                .profile-hero-main {
                    display: flex;
                    gap: 32px;
                    align-items: center;
                }

                .id-card-actions {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .id-photo-upload-btn {
                    padding: 12px 20px;
                    background: rgba(var(--color-primary-rgb), 0.1);
                    color: var(--color-primary);
                    border: 1.5px dashed var(--color-primary);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .id-photo-upload-btn:hover {
                    background: var(--color-primary);
                    color: white;
                    border-style: solid;
                }

                .profile-avatar-wrapper {
                    position: relative;
                    width: 120px;
                    height: 120px;
                }

                .profile-avatar-img, .profile-avatar-placeholder {
                    width: 120px;
                    height: 120px;
                    border-radius: 40px;
                    object-fit: cover;
                    border: 4px solid var(--bg-main);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }

                .profile-avatar-placeholder {
                    background: var(--color-primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 36px;
                    font-weight: 800;
                }

                .photo-upload-badge {
                    position: absolute;
                    bottom: -5px;
                    right: -5px;
                    width: 36px;
                    height: 36px;
                    background: var(--color-primary);
                    color: white;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    border: 3px solid var(--bg-main);
                    transition: transform 0.2s;
                }

                .photo-upload-badge:hover {
                    transform: scale(1.1);
                }

                .profile-hero-info h1 {
                    font-size: 32px;
                    font-weight: 800;
                    margin: 0 0 8px 0;
                    color: var(--text-primary);
                }

                .name-status {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .status-pill {
                    padding: 6px 12px;
                    border-radius: 99px;
                    font-size: 13px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .status-pill.active { background: rgba(0, 191, 165, 0.1); color: #00BFA5; }

                .hero-meta {
                    display: flex;
                    gap: 20px;
                    margin-top: 12px;
                    color: var(--text-muted);
                    font-size: 14px;
                }

                .hero-meta span {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .id-card-trigger {
                    background: var(--bg-main);
                    border: 1.5px solid var(--border-color);
                    border-radius: 20px;
                    padding: 12px 24px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .id-card-trigger:hover {
                    border-color: var(--color-primary);
                    background: var(--color-primary-light);
                    transform: translateY(-2px);
                }

                .trigger-icon {
                    width: 44px;
                    height: 44px;
                    background: var(--color-primary-light);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--color-primary);
                }

                .trigger-text {
                    display: flex;
                    flex-direction: column;
                    text-align: left;
                }

                .trigger-text span {
                    font-weight: 800;
                    font-size: 14px;
                    color: var(--text-primary);
                }

                .trigger-text small {
                    font-size: 11px;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .profile-content-layout {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 32px;
                    align-items: start;
                }

                .profile-tabs-nav {
                    padding: 12px;
                    border-radius: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .profile-tabs-nav button {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 16px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    font-weight: 600;
                    font-size: 14px;
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }

                .profile-tabs-nav button:hover {
                    background: var(--bg-main);
                    color: var(--color-primary);
                }

                .profile-tabs-nav button.active {
                    background: var(--color-primary);
                    color: white;
                    box-shadow: 0 10px 20px -5px var(--color-primary);
                }

                .profile-security-note {
                    margin-top: 20px;
                    padding: 16px;
                    background: rgba(var(--color-primary-rgb), 0.03);
                    border-radius: 16px;
                    display: flex;
                    gap: 10px;
                    color: var(--text-muted);
                }

                .profile-security-note p {
                    font-size: 11px;
                    margin: 0;
                    line-height: 1.4;
                }

                .profile-tab-content {
                    padding: 32px;
                    border-radius: 24px;
                    min-height: 500px;
                }

                .content-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                }

                .content-header h2 {
                    font-size: 20px;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .details-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                }

                .info-card.full-width {
                    grid-column: span 2;
                }

                @media (max-width: 1024px) {
                    .profile-content-layout { grid-template-columns: 1fr; }
                    .profile-hero { flex-direction: column; text-align: center; gap: 32px; }
                    .profile-hero-main { flex-direction: column; }
                    .details-grid { grid-template-columns: 1fr; }
                    .info-card.full-width { grid-column: span 1; }
                }
            `}</style>
        </div>
    );
};

const InfoItem: React.FC<{
    label: string,
    value: any,
    icon: any,
    fullWidth?: boolean,
    isSecret?: boolean,
    editable?: boolean,
    onChange?: (val: string) => void,
    isSelect?: boolean,
    options?: string[]
}> = ({ label, value, icon: Icon, fullWidth, isSecret, editable, onChange, isSelect, options }) => {
    const [hidden, setHidden] = useState(isSecret);

    return (
        <div className={`info-card ${fullWidth ? 'full-width' : ''}`}>
            <div className="info-icon"><Icon size={18} /></div>
            <div className="info-body">
                <label>{label}</label>
                {editable ? (
                    isSelect ? (
                        <select className="profile-edit-input" value={value || ''} onChange={e => onChange?.(e.target.value)}>
                            {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : (
                        <input
                            className="profile-edit-input"
                            value={value || ''}
                            onChange={e => onChange?.(e.target.value)}
                        />
                    )
                ) : (
                    <p>
                        {isSecret && hidden ? '•••• •••• •••• ' + (value?.slice(-4) || '••••') : (value || 'Not Specified')}
                        {isSecret && <button className="toggle-secret" onClick={() => setHidden(!hidden)}>{hidden ? 'Show' : 'Hide'}</button>}
                    </p>
                )}
            </div>
            <style>{`
                .info-card {
                    padding: 20px;
                    background: var(--bg-main);
                    border: 1.5px solid var(--border-color);
                    border-radius: 20px;
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                }
                .info-icon {
                    width: 40px;
                    height: 40px;
                    background: var(--bg-card);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--color-primary);
                    flex-shrink: 0;
                }
                .info-body { flex: 1; }
                .info-body label {
                    display: block;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 800;
                    color: var(--text-muted);
                    margin-bottom: 6px;
                }
                .info-body p {
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .profile-edit-input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1.5px solid var(--color-primary);
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    background: var(--bg-card);
                    color: var(--text-primary);
                    outline: none;
                }
                .toggle-secret {
                    background: none;
                    border: none;
                    color: var(--color-primary);
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default MyProfile;
