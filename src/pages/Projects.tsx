import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  MoreVertical,
  Users,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  X,
  ChevronRight,
  Download,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEmployees } from '../hooks/useEmployees';

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

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Project Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newCoverImage, setNewCoverImage] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const { employees } = useEmployees();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // 1. Fetch Projects
      const { data: projectsData, error } = await supabase.from('projects').select('*');
      if (error) throw error;

      // 2. Fetch Members explicitly mapping profiles
      const { data: membersData } = await supabase
        .from('project_members')
        .select('project_id, employee_id, profiles:employee_id (*)');

      // 3. Fetch Tasks to calculate progress
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('project_id, status, progress');

      const pData = projectsData || [];
      const mData = membersData || [];
      const tData = tasksData || [];

      const projectsWithMeta = pData.map((p: any) => {
        const projectMembersRows = mData.filter((m: any) => m.project_id === p.id);

        // Ensure profiles is properly extracted
        const members = projectMembersRows
          .map((pm: any) => Array.isArray(pm.profiles) ? pm.profiles[0] : pm.profiles)
          .filter(Boolean);

        const tasks = tData.filter((t: any) => t.project_id === p.id);

        // Calculate real progress purely based on aggregated tasks
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

  const handleCreateProject = async () => {
    if (!newName) return;

    try {
      // Create project with new Cover Image support
      const { data: project, error: pError } = await supabase
        .from('projects')
        .insert([{
          name: newName,
          description: newDesc,
          start_date: newStartDate,
          end_date: newEndDate,
          status: 'active',
          cover_image: newCoverImage || null
        }])
        .select()
        .single();

      if (pError) throw pError;

      if (selectedMembers.length > 0) {
        const memberData = selectedMembers.map(empId => ({
          project_id: project.id,
          employee_id: empId
        }));
        const { error: mError } = await supabase
          .from('project_members')
          .insert(memberData);
        if (mError) throw mError;
      }

      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (e) {
      console.error('Error creating project:', e);
      alert('Error creating project. Make sure you ran the SQL script to add cover_image column!');
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewDesc('');
    setNewStartDate('');
    setNewEndDate('');
    setNewCoverImage('');
    setSelectedMembers([]);
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
            <span>Dashboard</span> <ChevronRight size={12} /> <span>Projects</span>
          </div>
          <h2 className="title-v3">Project Management</h2>
        </div>
        <div className="header-right-v2">
          <button className="btn-secondary-v2">
            <Download size={18} /> Export
          </button>
          <button className="btn-primary-v4" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> Create Project
          </button>
        </div>
      </div>

      <div className="projects-stats-row">
        <div className="mini-stat-card">
          <div className="stat-icon purple"><FolderKanban size={20} /></div>
          <div className="stat-info">
            <span className="val">{projects.length}</span>
            <span className="lab">Total Projects</span>
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
            placeholder="Search Project Name, Description..."
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
      ) : (
        <div className={`projects-container-${viewMode}`}>
          {filteredProjects.map(project => (
            <div key={project.id} className="project-card-v3" onClick={() => navigate(`/Admin/projects/${project.id}`)}>
              {/* Optional Cover Image */}
              {project.cover_image && (
                <div className="p-cover-image" style={{ backgroundImage: `url(${project.cover_image})` }}></div>
              )}

              <div className="p-card-header">
                <div className="p-badge" style={{ backgroundColor: `${getStatusColor(project.status)}15`, color: getStatusColor(project.status) }}>
                  {project.status.toUpperCase()}
                </div>
                <button className="btn-more-v2" onClick={(e) => { e.stopPropagation(); }}><MoreVertical size={16} /></button>
              </div>

              <h3 className="p-name">{project.name}</h3>
              <p className="p-description">{project.description || 'Modern project execution and tracking.'}</p>

              <div className="p-progress-section">
                <div className="prog-text">
                  <span>Progress</span>
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

      {/* Modal is same as ProjectDetails with updated styles */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <div className="modal-header">
              <h3>Initialize New Project</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body-scroll">
              <div className="form-group">
                <label>PROJECT IDENTITY</label>
                <input type="text" placeholder="Project PlanetX" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>PROJECT SCOPE</label>
                <textarea placeholder="Describe the mission objectives..." value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} />
              </div>
              <div className="form-group">
                <label>COVER IMAGE (OPTIONAL)</label>
                {newCoverImage ? (
                  <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                    <img src={newCoverImage} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button className="btn-cancel-v2" style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', fontSize: '12px', background: 'white' }} onClick={() => setNewCoverImage('')}>Remove</button>
                  </div>
                ) : (
                  <label className="image-upload-dropzone" style={{ border: '2px dashed #CBD5E1', padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer', transition: '0.2s', background: '#F8FAFB' }}>
                    <input type="file" accept="image/*" hidden onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setNewCoverImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <span>Click to browse for a local image</span>
                  </label>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>LAUNCH DATE</label>
                  <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>DEADLINE</label>
                  <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>SELECT TEAM MEMBERS ({selectedMembers.length})</label>
                <div className="member-grid-v2">
                  {employees.filter(e => e.full_name?.trim()).map(emp => (
                    <div
                      key={emp.id}
                      className={`member-pick ${selectedMembers.includes(emp.id) ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedMembers(prev =>
                          prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                        );
                      }}
                    >
                      <div className="m-avatar">
                        {emp.profile_pic_url ? (
                          <img src={emp.profile_pic_url} alt={emp.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          emp.full_name?.[0] || '?'
                        )}
                      </div>
                      <div className="m-info">
                        <strong>{emp.full_name}</strong>
                        <small>{emp.job_title}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-v2" onClick={() => setIsModalOpen(false)}>Abort</button>
              <button className="btn-primary-v4" onClick={handleCreateProject} disabled={!newName}>Create Project</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .projects-page.premium {
          padding: 32px 40px;
          background: #F8FAFB;
          min-height: 100vh;
          transition: background 0.3s ease;
        }
        .dark .projects-page.premium { background: #020617; }

        .projects-header-v2 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .breadcrumb-mini { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 10px; }
        .title-v3 { font-size: 36px; font-weight: 800; color: #1E293B; margin: 0; letter-spacing: -1.5px; }
        .dark .title-v3 { color: #F8FAFB; }

        .header-right-v2 { display: flex; gap: 16px; }
        
        .btn-primary-v4 { 
          background: linear-gradient(135deg, #6232FF 0%, #5D3FD3 100%); 
          color: white; 
          border: none; 
          padding: 14px 28px; 
          border-radius: 14px; 
          font-weight: 700; 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(98, 50, 255, 0.2);
        }
        .btn-primary-v4:hover:not(:disabled) { 
          transform: translateY(-2px); 
          box-shadow: 0 12px 25px rgba(98, 50, 255, 0.4); 
        }
        .btn-primary-v4:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-secondary-v2 { 
          background: white; 
          border: 1.5px solid #E2E8F0; 
          padding: 14px 28px; 
          border-radius: 14px; 
          font-weight: 700; 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          cursor: pointer;
          transition: 0.2s;
        }
        .dark .btn-secondary-v2 { 
            background: rgba(30, 41, 59, 0.5); 
            border-color: rgba(255, 255, 255, 0.1); 
            color: #F8FAFB; 
            backdrop-filter: blur(10px);
        }
        .btn-secondary-v2:hover { border-color: #6232FF; color: #6232FF; }
        .dark .btn-secondary-v2:hover { background: rgba(30, 41, 59, 0.8); color: white; border-color: rgba(255, 255, 255, 0.2); }

        .projects-stats-row { display: flex; gap: 24px; margin-bottom: 48px; }
        .mini-stat-card { 
            flex: 1; 
            background: white; 
            padding: 28px; 
            border-radius: 24px; 
            display: flex; 
            align-items: center; 
            gap: 24px; 
            border: 1.5px solid rgba(0,0,0,0.02);
            box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .dark .mini-stat-card { 
            background: rgba(15, 23, 42, 0.6); 
            border-color: rgba(255, 255, 255, 0.05); 
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        
        .stat-icon { width: 56px; height: 56px; border-radius: 18px; display: flex; align-items: center; justify-content: center; }
        .stat-icon.purple { background: rgba(98, 50, 255, 0.1); color: #6232FF; }
        .stat-icon.green { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .stat-icon.orange { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }

        .stat-info .val { display: block; font-size: 32px; font-weight: 800; color: #1E293B; letter-spacing: -1px; }
        .stat-info .lab { font-size: 14px; font-weight: 600; color: #94A3B8; }
        .dark .stat-info .val { color: #F8FAFB; }

        .projects-toolbar-v2 { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 32px; }
        .search-v3 { flex: 1; max-width: 500px; display: flex; align-items: center; gap: 14px; padding: 0 24px; background: white; border-radius: 16px; border: 1.5px solid #E2E8F0; transition: 0.2s; }
        .dark .search-v3 { background: rgba(15, 23, 42, 0.6); border-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); }
        .search-v3:focus-within { border-color: #6232FF; box-shadow: 0 0 0 4px rgba(98, 50, 255, 0.08); }
        .search-v3 input { height: 52px; border: none; background: transparent; outline: none; width: 100%; color: #1E293B; font-weight: 600; font-size: 15px; }
        .dark .search-v3 input { color: #F8FAFB; }
        .search-v3 input::placeholder { color: #94A3B8; }

        .view-mode-v2 { display: flex; background: #E2E8F0; padding: 4px; border-radius: 14px; gap: 4px; }
        .dark .view-mode-v2 { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.05); }
        .view-mode-v2 button { border: none; background: transparent; padding: 10px 16px; border-radius: 10px; color: #64748B; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .view-mode-v2 button.active { background: white; color: #6232FF; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .dark .view-mode-v2 button.active { background: #6232FF; color: white; box-shadow: 0 4px 15px rgba(98, 50, 255, 0.3); }

        .projects-container-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 32px; }
        
        .project-card-v3 { 
            background: white; 
            border-radius: 28px; 
            padding: 32px; 
            border: 1.5px solid rgba(0,0,0,0.02); 
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
            cursor: pointer; 
            display: flex; 
            flex-direction: column; 
            position: relative;
            overflow: hidden;
        }
        .dark .project-card-v3 { 
            background: rgba(24, 24, 27, 0.45); 
            border-color: rgba(255, 255, 255, 0.06); 
            backdrop-filter: blur(15px);
        }
        .project-card-v3::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 4px;
            background: linear-gradient(90deg, #6232FF, #CEFF1C);
            opacity: 0;
            transition: 0.3s;
        }
        .project-card-v3:hover::before { opacity: 1; }
        .project-card-v3:hover { transform: translateY(-12px); box-shadow: 0 40px 80px rgba(0,0,0,0.08); border-color: rgba(98, 50, 255, 0.2); }
        .dark .project-card-v3:hover { box-shadow: 0 40px 80px rgba(0,0,0,0.4); border-color: rgba(255, 255, 255, 0.1); }

        .p-cover-image { width: calc(100% + 64px); height: 180px; margin: -32px -32px 28px -32px; background-size: cover; background-position: center; border-radius: 28px 28px 0 0; }

        .p-card-header { display: flex; justify-content: space-between; margin-bottom: 28px; align-items: center; }
        .p-badge { padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; }
        
        .btn-more-v2 { background: #F8FAFB; border: none; color: #94A3B8; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; transition: 0.2s; }
        .dark .btn-more-v2 { background: rgba(255, 255, 255, 0.05); }
        .btn-more-v2:hover { background: #E2E8F0; color: #1E293B; }
        .dark .btn-more-v2:hover { background: rgba(255, 255, 255, 0.1); color: white; }

        .p-name { font-size: 24px; font-weight: 800; color: #1E293B; margin: 0 0 12px 0; letter-spacing: -0.8px; }
        .dark .p-name { color: #FAFAFA; }
        .p-description { font-size: 14px; color: #64748B; margin: 0 0 36px 0; line-height: 1.6; height: 44px; overflow: hidden; flex: 1; opacity: 0.8; }
        .dark .p-description { color: #A1A1AA; }

        .p-progress-section { margin-bottom: 36px; }
        .prog-text { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: #94A3B8; margin-bottom: 12px; }
        .prog-bar-v3 { height: 10px; background: #F1F5F9; border-radius: 12px; overflow: hidden; }
        .dark .prog-bar-v3 { background: rgba(255, 255, 255, 0.05); }
        .prog-fill-v3 { height: 100%; border-radius: 12px; transition: 1s cubic-bezier(0.4, 0, 0.2, 1); }

        .p-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #F1F5F9; padding-top: 28px; margin-top: auto; }
        .dark .p-footer { border-top-color: rgba(255, 255, 255, 0.05); }

        .p-team { display: flex; align-items: center; }
        .t-avatar { width: 34px; height: 34px; border-radius: 50%; background: #6232FF; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; border: 2.5px solid white; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .dark .t-avatar { border-color: #09090B; }
        .t-count { margin-left: 10px; font-size: 13px; font-weight: 700; color: #94A3B8; }

        .p-due { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #94A3B8; }

        /* Modal Enhancements */
        .modal-overlay { 
          position: fixed; inset: 0; background: rgba(9, 9, 11, 0.7); backdrop-filter: blur(15px); display: flex; align-items: center; justify-content: center; z-index: 1000;
        }

        .modal-content.glass { 
          width: 95%; max-width: 650px; background: white; border-radius: 32px; border: 1.5px solid rgba(255, 255, 255, 0.1); box-shadow: 0 50px 100px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column; max-height: 92vh;
        }
        .dark .modal-content.glass { background: #111114; border-color: rgba(255, 255, 255, 0.05); }

        .modal-header { padding: 40px 40px 32px 40px; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { font-size: 28px; font-weight: 800; color: #1E293B; letter-spacing: -1px; }
        .dark .modal-header h3 { color: white; }

        .close-btn { width: 44px; height: 44px; background: #F8FAFB; border: none; border-radius: 50%; color: #64748B; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; }
        .dark .close-btn { background: rgba(255,255,255,0.05); }
        .close-btn:hover { background: #6232FF; color: white; transform: rotate(90deg); }

        .modal-body-scroll { padding: 0 40px 12px 40px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }
        
        .form-group label { font-size: 12px; font-weight: 800; color: #94A3B8; margin-bottom: 12px; display: block; letter-spacing: 0.8px; text-transform: uppercase; }
        .form-group input, .form-group textarea { width: 100%; background: #F8FAFB; border: 1.5px solid #E2E8F0; border-radius: 16px; padding: 16px 20px; font-size: 15px; font-weight: 600; color: #1E293B; outline: none; transition: all 0.3s; }
        .dark .form-group input, .dark .form-group textarea { background: rgba(0, 0, 0, 0.2); border-color: rgba(255,255,255,0.1); color: white; }
        .form-group input:focus { border-color: #6232FF; box-shadow: 0 0 0 5px rgba(98, 50, 255, 0.1); background: white; }
        .dark .form-group input:focus { background: rgba(2, 6, 23, 0.6); }

        .member-pick { 
            background: #F8FAFB; border: 1.5px solid #E2E8F0; border-radius: 18px; padding: 16px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: 0.2s;
        }
        .dark .member-pick { background: rgba(2, 6, 23, 0.4); border-color: rgba(255,255,255,0.1); }
        .member-pick.active { background: rgba(98, 50, 255, 0.05); border-color: #6232FF; }

        .modal-footer { padding: 32px 40px 40px 40px; background: #F8FAFB; border-top: 1.5px solid #F1F5F9; display: flex; justify-content: flex-end; gap: 20px; }
        .dark .modal-footer { background: #0F172A; border-top-color: rgba(255,255,255,0.05); }

        .btn-cancel-v2 { font-weight: 800; padding: 14px 24px; color: #64748B; background: transparent; border: none; cursor: pointer; border-radius: 14px; transition: 0.2s; }
        .btn-cancel-v2:hover { background: #E2E8F0; color: #1E293B; }
        .dark .btn-cancel-v2:hover { background: rgba(255,255,255,0.05); color: white; }
      `}</style>
    </div>
  );
};

export default Projects;
