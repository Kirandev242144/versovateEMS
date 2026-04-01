import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FolderKanban,
    Search,
    Users,
    CheckCircle2,
    Clock,
    LayoutGrid,
    List as ListIcon,
    Loader2,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Project {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'completed' | 'on_hold' | 'archived';
    created_at: string;
    start_date: string;
    end_date: string;
    progress: number;
    members_count: number;
    members?: any[];
    cover_image?: string;
}

const EmployeeProjects = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        fetchMyProjects();
    }, []);

    const fetchMyProjects = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Find projects this employee belongs to
            const { data: myMemberships } = await supabase
                .from('project_members')
                .select('project_id')
                .eq('employee_id', user.id);

            const projectIds = myMemberships?.map(m => m.project_id) || [];
            if (projectIds.length === 0) {
                setProjects([]);
                setLoading(false);
                return;
            }

            // 1. Fetch Projects
            const { data: projectsData, error } = await supabase.from('projects').select('*').in('id', projectIds);
            if (error) throw error;

            // 2. Fetch Members explicitly mapping profiles (for avatars)
            const { data: membersData } = await supabase
                .from('project_members')
                .select('project_id, employee_id, profiles:employee_id (*)')
                .in('project_id', projectIds);

            // 3. Fetch Tasks to calculate progress
            const { data: tasksData } = await supabase
                .from('tasks')
                .select('project_id, status, progress')
                .in('project_id', projectIds);

            const pData = projectsData || [];
            const mData = membersData || [];
            const tData = tasksData || [];

            const projectsWithMeta = pData.map((p: any) => {
                const projectMembersRows = mData.filter((m: any) => m.project_id === p.id);

                const members = projectMembersRows
                    .map((pm: any) => Array.isArray(pm.profiles) ? pm.profiles[0] : pm.profiles)
                    .filter(Boolean);

                const tasks = tData.filter((t: any) => t.project_id === p.id);

                let calculatedProgress = 0;
                if (tasks.length > 0) {
                    const total = tasks.reduce((sum: number, t: any) => sum + (t.status === 'done' ? 100 : (t.progress || 0)), 0);
                    calculatedProgress = Math.round(total / tasks.length);
                }

                return {
                    ...p,
                    members,
                    members_count: members.length,
                    progress: calculatedProgress
                };
            });

            setProjects(projectsWithMeta);
        } catch (e) {
            console.error('Error fetching projects:', e);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return '#6366F1';
            case 'completed': return '#10B981';
            case 'on_hold': return '#F59E0B';
            default: return '#94A3B8';
        }
    };

    return (
        <div className="projects-page premium">
            <div className="projects-header-v2">
                <div className="header-left-v2">
                    <div className="breadcrumb-mini">
                        <span>My Workspace</span> <ChevronRight size={12} /> <span>Projects</span>
                    </div>
                    <h2 className="title-v3">Project Assignments</h2>
                </div>
            </div>

            <div className="projects-stats-row">
                <div className="mini-stat-card">
                    <div className="stat-icon purple"><FolderKanban size={20} /></div>
                    <div className="stat-info">
                        <span className="val">{projects.length}</span>
                        <span className="lab">My Projects</span>
                    </div>
                </div>
                <div className="mini-stat-card">
                    <div className="stat-icon green"><CheckCircle2 size={20} /></div>
                    <div className="stat-info">
                        <span className="val">{projects.filter(p => p.status === 'completed').length}</span>
                        <span className="lab">Completed</span>
                    </div>
                </div>
                <div className="mini-stat-card">
                    <div className="stat-icon orange"><AlertCircle size={20} /></div>
                    <div className="stat-info">
                        <span className="val">{projects.filter(p => p.status === 'active').length}</span>
                        <span className="lab">Active</span>
                    </div>
                </div>
            </div>

            <div className="projects-toolbar-v2">
                <div className="search-v3">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search assigned projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="toolbar-right">
                    <div className="view-mode-v2">
                        <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><LayoutGrid size={18} /></button>
                        <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><ListIcon size={18} /></button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-v2">
                    <Loader2 className="animate-spin" size={32} />
                    <span>Syncing Workspace...</span>
                </div>
            ) : projects.length === 0 ? (
                <div className="empty-state-card" style={{ padding: '80px', textAlign: 'center', background: 'white', borderRadius: '24px', border: '1px dashed #E2E8F0' }}>
                    <FolderKanban size={48} color="#94A3B8" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>No Assigned Projects</h3>
                    <p style={{ color: '#64748B' }}>You have not been assigned to any projects yet. When administration adds you to a team, it will appear here.</p>
                </div>
            ) : (
                <div className={`projects-container-${viewMode}`}>
                    {filteredProjects.map(project => (
                        <div key={project.id} className="project-card-v3" onClick={() => navigate(`/projects/${project.id}`)}>
                            {/* Optional Cover Image */}
                            {project.cover_image && (
                                <div className="p-cover-image" style={{ backgroundImage: `url(${project.cover_image})` }}></div>
                            )}

                            <div className="p-card-header">
                                <div className="p-badge" style={{ backgroundColor: `${getStatusColor(project.status)}15`, color: getStatusColor(project.status) }}>
                                    {project.status.toUpperCase()}
                                </div>
                            </div>

                            <h3 className="p-name">{project.name}</h3>
                            <p className="p-description">{project.description || 'Modern project execution and tracking.'}</p>

                            <div className="p-progress-section">
                                <div className="prog-text">
                                    <span>Overall Progress</span>
                                    <span>{project.progress}%</span>
                                </div>
                                <div className="prog-bar-v3">
                                    <div className="prog-fill-v3" style={{ width: `${project.progress}%`, backgroundColor: getStatusColor(project.status) }}></div>
                                </div>
                            </div>

                            <div className="p-footer">
                                <div className="p-team">
                                    {project.members && project.members.length > 0 ? (
                                        project.members.slice(0, 3).map((member: any, i: number) => (
                                            <div key={member.id} className="t-avatar" style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}>
                                                {member.profile_pic_url ? (
                                                    <img src={member.profile_pic_url} alt={member.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span>{member.full_name?.[0] || '?'}</span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="t-avatar"><Users size={12} /></div>
                                    )}
                                    {project.members && project.members.length > 3 && (
                                        <span className="t-count">+{project.members.length - 3}</span>
                                    )}
                                </div>
                                <div className="p-due">
                                    <Clock size={14} />
                                    <span>{project.end_date ? new Date(project.end_date).toLocaleDateString() : 'TBD'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
        .projects-page.premium {
          padding: 32px;
          background: #F8FAFB;
          min-height: 100vh;
        }
        .dark .projects-page.premium { background: #0F172A; }

        .projects-header-v2 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .breadcrumb-mini { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 8px; }
        .title-v3 { font-size: 32px; font-weight: 800; color: #1E293B; margin: 0; letter-spacing: -1px; }
        .dark .title-v3 { color: #F1F5F9; }

        .projects-stats-row { display: flex; gap: 24px; margin-bottom: 40px; }
        .mini-stat-card { flex: 1; background: white; padding: 24px; border-radius: 20px; display: flex; align-items: center; gap: 20px; border: 1px solid rgba(0,0,0,0.03); }
        .dark .mini-stat-card { background: #1E293B; border-color: #334155; }
        
        .stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .stat-icon.purple { background: rgba(93, 63, 211, 0.1); color: #5D3FD3; }
        .stat-icon.green { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .stat-icon.orange { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }

        .stat-info .val { display: block; font-size: 24px; font-weight: 800; color: #1E293B; }
        .stat-info .lab { font-size: 13px; font-weight: 600; color: #94A3B8; }
        .dark .stat-info .val { color: white; }

        .projects-toolbar-v2 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .search-v3 { flex: 1; max-width: 500px; display: flex; align-items: center; gap: 12px; padding: 0 20px; background: white; border-radius: 14px; border: 1px solid #E2E8F0; }
        .dark .search-v3 { background: #1E293B; border-color: #334155; }
        .search-v3 input { height: 50px; border: none; background: transparent; outline: none; width: 100%; color: #1E293B; font-weight: 500; }
        .dark .search-v3 input { color: white; }

        .view-mode-v2 { display: flex; background: #E2E8F0; padding: 4px; border-radius: 12px; gap: 4px; width: fit-content; }
        .dark .view-mode-v2 { background: #1E293B; }
        .view-mode-v2 button { border: none; background: transparent; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; color: #64748B; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .view-mode-v2 button.active { background: white; color: #1E293B; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .dark .view-mode-v2 button.active { background: #334155; color: white; }

        .projects-container-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 24px; }
        
        .project-card-v3 { background: white; border-radius: 24px; padding: 32px; border: 1px solid rgba(0,0,0,0.04); transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; display: flex; flex-direction: column; }
        .dark .project-card-v3 { background: #1E293B; border-color: #334155; }
        .project-card-v3:hover { transform: translateY(-10px); box-shadow: 0 30px 60px rgba(0,0,0,0.06); border-color: #5D3FD344; }

        .p-cover-image { width: calc(100% + 64px); height: 160px; margin: -32px -32px 24px -32px; background-size: cover; background-position: center; border-radius: 24px 24px 0 0; border-bottom: 1px solid rgba(0,0,0,0.05); }

        .p-card-header { display: flex; justify-content: space-between; margin-bottom: 24px; align-items: center; }
        .p-badge { padding: 4px 12px; border-radius: 30px; font-size: 10px; font-weight: 800; }

        .p-name { font-size: 22px; font-weight: 800; color: #1E293B; margin: 0 0 12px 0; letter-spacing: -0.5px; }
        .dark .p-name { color: #F1F5F9; }
        .p-description { font-size: 14px; color: #64748B; margin: 0 0 32px 0; line-height: 1.6; height: 44px; overflow: hidden; flex: 1; }

        .p-progress-section { margin-bottom: 32px; }
        .prog-text { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; color: #94A3B8; margin-bottom: 10px; }
        .prog-bar-v3 { height: 8px; background: #F1F5F9; border-radius: 10px; overflow: hidden; }
        .dark .prog-bar-v3 { background: #334155; }
        .prog-fill-v3 { height: 100%; border-radius: 10px; transition: 1s ease; }

        .p-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 24px; }
        .dark .p-footer { border-top-color: #334155; }

        .p-team { display: flex; align-items: center; }
        .t-avatar { width: 32px; height: 32px; border-radius: 50%; background: #94A3B8; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; border: 2px solid white; overflow: hidden; }
        .dark .t-avatar { border-color: #1E293B; }
        .t-count { margin-left: 8px; font-size: 12px; font-weight: 700; color: #94A3B8; }

        .p-due { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #94A3B8; }
      `}</style>
        </div>
    );
};

export default EmployeeProjects;
