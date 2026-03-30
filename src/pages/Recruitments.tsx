import React, { useState, useEffect, useMemo } from 'react';
import {
    Briefcase,
    Users,
    Plus,
    Search,
    MapPin,
    Clock,
    MoreVertical,
    Trash2,
    Edit2,
    ExternalLink,
    FileText,
    CheckCircle2,
    XCircle,
    Filter,
    ArrowRight,
    Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface JobOpening {
    id: string;
    title: string;
    description: string;
    location: string;
    type: string;
    status: 'open' | 'closed';
    created_at: string;
}

interface JobApplication {
    id: string;
    job_id: string;
    full_name: string;
    email: string;
    phone: string;
    resume_url: string;
    portfolio_link: string;
    notes: string;
    status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected';
    created_at: string;
    job_openings?: { title: string };
}

const Recruitments: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'postings' | 'candidates'>('postings');
    const [jobs, setJobs] = useState<JobOpening[]>([]);
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
    const [isViewAppOpen, setIsViewAppOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

    // Form States
    const [jobTitle, setJobTitle] = useState('');
    const [jobDesc, setJobDesc] = useState('');
    const [jobLoc, setJobLoc] = useState('On-site');
    const [jobType, setJobType] = useState('Full-time');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const { data: jobsData } = await supabase.from('job_openings').select('*').order('created_at', { ascending: false });
        const { data: appsData } = await supabase.from('job_applications').select('*, job_openings(title)').order('created_at', { ascending: false });

        if (jobsData) setJobs(jobsData);
        if (appsData) setApplications(appsData);
        setIsLoading(false);
    };

    const handleSaveJob = async () => {
        const payload = {
            title: jobTitle,
            description: jobDesc,
            location: jobLoc,
            type: jobType,
            status: 'open'
        };

        if (editingJob) {
            await supabase.from('job_openings').update(payload).eq('id', editingJob.id);
        } else {
            await supabase.from('job_openings').insert(payload);
        }

        setIsJobModalOpen(false);
        setEditingJob(null);
        clearJobForm();
        fetchData();
    };

    const deleteJob = async (id: string) => {
        if (confirm('Delete this job opening? This will also affect associated applications.')) {
            await supabase.from('job_openings').delete().eq('id', id);
            fetchData();
        }
    };

    const updateAppStatus = async (id: string, status: string) => {
        await supabase.from('job_applications').update({ status }).eq('id', id);
        fetchData();
        if (selectedApp?.id === id) {
            setSelectedApp(prev => prev ? { ...prev, status: status as any } : null);
        }
    };

    const clearJobForm = () => {
        setJobTitle('');
        setJobDesc('');
        setJobLoc('On-site');
        setJobType('Full-time');
    };

    const openEditModal = (job: JobOpening) => {
        setEditingJob(job);
        setJobTitle(job.title);
        setJobDesc(job.description);
        setJobLoc(job.location);
        setJobType(job.type);
        setIsJobModalOpen(true);
    };

    const filteredJobs = useMemo(() =>
        jobs.filter(j => j.title.toLowerCase().includes(searchQuery.toLowerCase())),
        [jobs, searchQuery]
    );

    const filteredApps = useMemo(() =>
        applications.filter(a => a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || a.job_openings?.title.toLowerCase().includes(searchQuery.toLowerCase())),
        [applications, searchQuery]
    );

    return (
        <div className="rec-page">
            <header className="rec-header">
                <div className="rec-header-left">
                    <h1>Recruitments</h1>
                    <p>Manage job openings and track candidate applications.</p>
                </div>
                <button className="rec-btn-primary" onClick={() => { clearJobForm(); setEditingJob(null); setIsJobModalOpen(true); }}>
                    <Plus size={20} />
                    <span>New Opening</span>
                </button>
            </header>

            <div className="rec-tabs">
                <button className={`rec-tab ${activeTab === 'postings' ? 'active' : ''}`} onClick={() => setActiveTab('postings')}>
                    <Briefcase size={18} />
                    <span>Job Postings</span>
                    <span className="rec-count">{jobs.length}</span>
                </button>
                <button className={`rec-tab ${activeTab === 'candidates' ? 'active' : ''}`} onClick={() => setActiveTab('candidates')}>
                    <Users size={18} />
                    <span>Candidates</span>
                    <span className="rec-count">{applications.length}</span>
                </button>
            </div>

            <div className="rec-controls">
                <div className="rec-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder={activeTab === 'postings' ? "Search jobs..." : "Search candidates..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="rec-btn-filter"><Filter size={18} /><span>Filter</span></button>
            </div>

            <main className="rec-content">
                {isLoading ? (
                    <div className="rec-loading">
                        <div className="rec-spinner"></div>
                        <p>Loading your data...</p>
                    </div>
                ) : activeTab === 'postings' ? (
                    <div className="rec-jobs-grid">
                        {filteredJobs.map(job => (
                            <div key={job.id} className="rec-job-card">
                                <div className="rec-jc-header">
                                    <div className="rec-jc-title-row">
                                        <h3>{job.title}</h3>
                                        <div className="rec-jc-actions">
                                            <button onClick={() => openEditModal(job)} title="Edit"><Edit2 size={16} /></button>
                                            <button onClick={() => deleteJob(job.id)} title="Delete" className="delete"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <p className="rec-jc-desc">{job.description}</p>
                                </div>
                                <div className="rec-jc-meta">
                                    <div className="rec-meta-item"><MapPin size={14} /><span>{job.location}</span></div>
                                    <div className="rec-meta-item"><Clock size={14} /><span>{job.type}</span></div>
                                </div>
                                <div className="rec-jc-footer">
                                    <div className={`rec-status-pill ${job.status}`}>{job.status}</div>
                                    <button className="rec-jc-btn" onClick={() => { setActiveTab('candidates'); setSearchQuery(job.title); }}>
                                        View Applicants <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rec-table-container">
                        <table className="rec-table">
                            <thead>
                                <tr>
                                    <th>Candidate</th>
                                    <th>Applied For</th>
                                    <th>Applied Date</th>
                                    <th>Files & Links</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredApps.map(app => (
                                    <tr key={app.id}>
                                        <td>
                                            <div className="rec-cand-cell">
                                                <div className="rec-cand-avatar">{app.full_name.charAt(0)}</div>
                                                <div className="rec-cand-info">
                                                    <span className="name">{app.full_name}</span>
                                                    <span className="email">{app.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="rec-job-title">{app.job_openings?.title || 'Unknown Job'}</span></td>
                                        <td>{new Date(app.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="rec-link-group">
                                                {app.resume_url && (
                                                    <a href={app.resume_url} target="_blank" rel="noreferrer" className="rec-icon-link" title="Resume">
                                                        <FileText size={18} />
                                                    </a>
                                                )}
                                                {app.portfolio_link && (
                                                    <a href={app.portfolio_link} target="_blank" rel="noreferrer" className="rec-icon-link" title="Portfolio">
                                                        <ExternalLink size={18} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td><div className={`rec-app-status ${app.status}`}>{app.status}</div></td>
                                        <td>
                                            <button className="rec-btn-icon" onClick={() => { setSelectedApp(app); setIsViewAppOpen(true); }}><Eye size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Job Modal */}
            {isJobModalOpen && (
                <div className="rec-overlay">
                    <div className="rec-modal">
                        <header>
                            <h2>{editingJob ? 'Edit Job Opening' : 'New Job Opening'}</h2>
                            <button className="rec-modal-close" onClick={() => setIsJobModalOpen(false)}>×</button>
                        </header>
                        <div className="rec-modal-body">
                            <div className="rec-field">
                                <label>Job Title</label>
                                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Android Developer" />
                            </div>
                            <div className="rec-field">
                                <label>Description</label>
                                <textarea value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} placeholder="Describe the role responsibilities..." rows={4} />
                            </div>
                            <div className="rec-row">
                                <div className="rec-field">
                                    <label>Location</label>
                                    <select value={jobLoc} onChange={(e) => setJobLoc(e.target.value)}>
                                        <option value="On-site">On-site</option>
                                        <option value="Remote">Remote</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>
                                <div className="rec-field">
                                    <label>Job Type</label>
                                    <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Internship">Internship</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <footer>
                            <button className="rec-btn-cancel" onClick={() => setIsJobModalOpen(false)}>Cancel</button>
                            <button className="rec-btn-save" onClick={handleSaveJob}>Save Opening</button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Candidate View Modal */}
            {isViewAppOpen && selectedApp && (
                <div className="rec-overlay">
                    <div className="rec-modal app-view">
                        <header>
                            <h2>Application Details</h2>
                            <button className="rec-modal-close" onClick={() => setIsViewAppOpen(false)}>×</button>
                        </header>
                        <div className="rec-modal-body">
                            <div className="rec-app-header">
                                <div className="rec-cand-avatar lg">{selectedApp.full_name.charAt(0)}</div>
                                <div className="rec-app-info-main">
                                    <h3>{selectedApp.full_name}</h3>
                                    <p>Applied for <strong>{selectedApp.job_openings?.title}</strong> on {new Date(selectedApp.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="rec-app-details-grid">
                                <div className="rec-det-item">
                                    <label>Email</label>
                                    <span>{selectedApp.email}</span>
                                </div>
                                <div className="rec-det-item">
                                    <label>Phone</label>
                                    <span>{selectedApp.phone || 'N/A'}</span>
                                </div>
                                <div className="rec-det-item full">
                                    <label>Portfolio / Links</label>
                                    {selectedApp.portfolio_link ? (
                                        <a href={selectedApp.portfolio_link} target="_blank" rel="noreferrer" className="rec-app-link">
                                            {selectedApp.portfolio_link} <ExternalLink size={14} />
                                        </a>
                                    ) : <span>No links provided</span>}
                                </div>
                                <div className="rec-det-item full">
                                    <label>Candidate Notes</label>
                                    <p className="rec-app-notes">{selectedApp.notes || 'No notes provided.'}</p>
                                </div>
                            </div>

                            <div className="rec-app-actions-row">
                                <label>Update Status</label>
                                <div className="rec-status-btns">
                                    <button className={`status-btn shortlisted ${selectedApp.status === 'shortlisted' ? 'active' : ''}`} onClick={() => updateAppStatus(selectedApp.id, 'shortlisted')}>
                                        <CheckCircle2 size={16} /> Shortlist
                                    </button>
                                    <button className={`status-btn reviewed ${selectedApp.status === 'reviewed' ? 'active' : ''}`} onClick={() => updateAppStatus(selectedApp.id, 'reviewed')}>
                                        Reviewed
                                    </button>
                                    <button className={`status-btn rejected ${selectedApp.status === 'rejected' ? 'active' : ''}`} onClick={() => updateAppStatus(selectedApp.id, 'rejected')}>
                                        <XCircle size={16} /> Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                        <footer>
                            <button className="rec-btn-cancel" onClick={() => setIsViewAppOpen(false)}>Close</button>
                            {selectedApp.resume_url && (
                                <a href={selectedApp.resume_url} target="_blank" rel="noreferrer" className="rec-btn-save">
                                    <FileText size={18} /> View Resume
                                </a>
                            )}
                        </footer>
                    </div>
                </div>
            )}

            <style>{`
        .rec-page { min-height: 100vh; background: #f9fafb; animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .rec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .rec-header h1 { font-size: 28px; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.5px; }
        .rec-header p { color: #6b7280; margin: 4px 0 0 0; font-size: 15px; }

        .rec-btn-primary { background: #6E40FF; color: #fff; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 700; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(110,64,255,0.2); }
        .rec-btn-primary:hover { background: #5c32e5; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(110,64,255,0.3); }

        .rec-tabs { display: flex; gap: 8px; margin-bottom: 24px; background: #fff; padding: 6px; border-radius: 16px; width: fit-content; border: 1px solid #eef2f6; }
        .rec-tab { display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-radius: 12px; border: none; background: transparent; color: #64748b; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .rec-tab.active { background: #f1f5f9; color: #6E40FF; }
        .rec-count { background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; }
        .rec-tab.active .rec-count { background: #6E40FF; color: #fff; }

        .rec-controls { display: flex; gap: 16px; margin-bottom: 32px; }
        .rec-search { flex: 1; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; display: flex; align-items: center; padding: 0 16px; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .rec-search input { border: none; outline: none; flex: 1; height: 48px; font-size: 15px; font-family: inherit; }
        .rec-btn-filter { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; display: flex; align-items: center; gap: 10px; padding: 0 20px; color: #64748b; font-weight: 600; cursor: pointer; }

        /* Jobs Grid */
        .rec-jobs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 24px; }
        .rec-job-card { background: #4f46e5; border-radius: 24px; border: 1px solid #fff; padding: 32px; display: flex; flex-direction: column; gap: 20px; color: #fff; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.2); transition: 0.3s; }
        .rec-job-card:hover { transform: translateY(-4px); box-shadow: 0 15px 40px rgba(79, 70, 229, 0.3); }
        .rec-jc-title-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .rec-jc-title-row h3 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .rec-jc-actions { display: flex; gap: 8px; }
        .rec-jc-actions button { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .rec-jc-actions button:hover { background: rgba(255,255,255,0.2); }
        .rec-jc-actions button.delete:hover { background: #ef4444; }
        .rec-jc-desc { margin: 0; color: rgba(255,255,255,0.8); line-height: 1.6; font-size: 15px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .rec-jc-meta { display: flex; gap: 20px; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500; }
        .rec-meta-item { display: flex; align-items: center; gap: 8px; }
        .rec-jc-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; }
        .rec-jc-btn { background: #bef264; color: #1a1a1a; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 800; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .rec-jc-btn:hover { background: #d9f99d; transform: scale(1.05); }
        .rec-status-pill { font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.15); }

        /* Table */
        .rec-table-container { background: #fff; border-radius: 20px; border: 1px solid #eef2f6; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .rec-table { width: 100%; border-collapse: collapse; text-align: left; }
        .rec-table th { padding: 16px 24px; background: #f8fafc; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
        .rec-table td { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .rec-cand-cell { display: flex; align-items: center; gap: 12px; }
        .rec-cand-avatar { width: 40px; height: 40px; background: #6E40FF; color: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; }
        .rec-cand-avatar.lg { width: 64px; height: 64px; border-radius: 20px; font-size: 28px; }
        .rec-cand-info { display: flex; flex-direction: column; }
        .rec-cand-info .name { font-weight: 700; color: #111827; }
        .rec-cand-info .email { color: #6b7280; font-size: 13px; }
        .rec-app-status { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; width: fit-content; }
        .rec-app-status.pending { background: #fefce8; color: #a16207; }
        .rec-app-status.reviewed { background: #f0fdf4; color: #15803d; }
        .rec-app-status.shortlisted { background: #6E40FF; color: #fff; }
        .rec-app-status.rejected { background: #fef2f2; color: #b91c1c; }
        .rec-btn-icon { background: #f8fafc; border: 1px solid #e2e8f0; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #64748b; cursor: pointer; transition: 0.2s; }
        .rec-btn-icon:hover { background: #6E40FF; color: #fff; border-color: #6E40FF; }

        /* Modals */
        .rec-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .rec-modal { background: #fff; width: 100%; max-width: 600px; border-radius: 28px; overflow: hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.2); animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .rec-modal header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .rec-modal header h2 { margin: 0; font-size: 20px; font-weight: 800; color: #111827; }
        .rec-modal-close { background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .rec-modal-body { padding: 32px; display: flex; flex-direction: column; gap: 24px; }
        .rec-field { display: flex; flex-direction: column; gap: 8px; }
        .rec-field label { font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .rec-field input, .rec-field textarea, .rec-field select { padding: 14px 20px; border-radius: 14px; border: 1.5px solid #eef2f6; font-size: 15px; outline: none; transition: 0.2s; font-family: inherit; }
        .rec-field input:focus, .rec-field textarea:focus { border-color: #6E40FF; background: #fdfcff; }
        .rec-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        
        .rec-modal footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 12px; }
        .rec-btn-cancel { background: #fff; border: 1.5px solid #e2e8f0; padding: 12px 24px; border-radius: 14px; font-weight: 700; color: #64748b; cursor: pointer; }
        .rec-btn-save { background: #1a1a1a; color: #fff; border: none; padding: 12px 28px; border-radius: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; }

        /* App View Details */
        .rec-app-header { display: flex; gap: 20px; align-items: center; margin-bottom: 8px; }
        .rec-app-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
        .rec-det-item { display: flex; flex-direction: column; gap: 4px; }
        .rec-det-item.full { grid-column: span 2; }
        .rec-app-link { display: flex; align-items: center; gap: 8px; color: #6E40FF; text-decoration: none; font-weight: 600; font-size: 14px; }
        .rec-app-notes { background: #f8fafc; padding: 16px; border-radius: 14px; border: 1px solid #eef2f6; font-size: 14px; color: #475569; margin: 0; line-height: 1.6; }
        
        .rec-app-actions-row { margin-top: 24px; padding-top: 24px; border-top: 1px solid #f1f5f9; }
        .rec-status-btns { display: flex; gap: 10px; margin-top: 12px; }
        .status-btn { flex: 1; padding: 12px; border-radius: 12px; border: 1.5px solid #eef2f6; background: #fff; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; color: #64748b; }
        .status-btn.shortlisted:hover, .status-btn.shortlisted.active { background: #6E40FF; color: #fff; border-color: #6E40FF; }
        .status-btn.reviewed:hover, .status-btn.reviewed.active { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
        .status-btn.rejected:hover, .status-btn.rejected.active { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

        .rec-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px; color: #94a3b8; }
        .rec-spinner { width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top-color: #6E40FF; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};

export default Recruitments;
