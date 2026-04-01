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

        .header-right-v2 { display: flex; gap: 16px; }
        
        .btn-primary-v4 { background: #5D3FD3; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.3s; }
        .btn-primary-v4:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 10px 25px rgba(93, 63, 211, 0.3); }
        .btn-primary-v4:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-secondary-v2 { background: white; border: 1px solid #E2E8F0; padding: 12px 24px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .dark .btn-secondary-v2 { background: #1E293B; border-color: #334155; color: white; }

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

        /* VIEW TOGGLE STYLING FIX */
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
        
        /* BTN-MORE STYLE FIX */
        .btn-more-v2 { background: transparent; border: none; color: #94A3B8; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; transition: 0.2s; }
        .btn-more-v2:hover { background: #F1F5F9; color: #1E293B; }
        .dark .btn-more-v2:hover { background: #334155; color: white; }

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

        /* Modal Styling */
        .modal-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(15, 23, 42, 0.4); 
          backdrop-filter: blur(8px); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 1000; 
          animation: fadeIn 0.2s ease-out;
        }

        .modal-content.glass { 
          width: 100%; 
          max-width: 600px; 
          background: rgba(255, 255, 255, 0.95); 
          border-radius: 28px; 
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 40px 100px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.02); 
          overflow: hidden; 
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .dark .modal-content.glass {
          background: rgba(30, 41, 59, 0.95);
          border-color: rgba(255, 255, 255, 0.05);
          box-shadow: 0 40px 100px rgba(0,0,0,0.4);
        }

        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal-header { 
          padding: 32px 32px 24px 32px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
        }

        .modal-header h3 {
          font-size: 22px;
          font-weight: 800;
          color: #1E293B;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .dark .modal-header h3 { color: #F8FAFB; }

        .close-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #F1F5F9;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
        }
        .close-btn:hover { background: #E2E8F0; color: #1E293B; transform: rotate(90deg); }
        .dark .close-btn { background: #334155; color: #94A3B8; }

        .modal-body-scroll { padding: 0 32px 10px 32px; display: flex; flex-direction: column; gap: 24px; overflow-y: auto; }
        
        .form-group label { 
          font-size: 11px; 
          font-weight: 800; 
          color: #94A3B8; 
          margin-bottom: 10px; 
          display: block; 
          letter-spacing: 0.5px; 
          text-transform: uppercase;
        }

        .form-group input, .form-group textarea, .form-group select { 
          width: 100%; 
          background: #F8FAFB; 
          border: 1px solid #E2E8F0; 
          border-radius: 14px; 
          padding: 14px 18px; 
          color: #1E293B; 
          font-size: 15px;
          font-weight: 500;
          outline: none; 
          transition: 0.2s;
        }
        .dark .form-group input, .dark .form-group textarea, .dark .form-group select {
          background: #0F172A;
          border-color: #334155;
          color: #F1F5F9;
        }

        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          border-color: #5D3FD3;
          background: white;
          box-shadow: 0 0 0 4px rgba(93, 63, 211, 0.08);
        }
        .dark .form-group input:focus { background: #0F172A; border-color: #6366F1; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        
        .modal-footer { 
          padding: 24px 32px 32px 32px; 
          background: #F8FAFB; 
          display: flex; 
          justify-content: flex-end; 
          align-items: center;
          gap: 16px; 
          border-top: 1px solid #F1F5F9;
        }
        .dark .modal-footer { background: #1E293B; border-top-color: #334155; }

        .btn-cancel-v2 { background: transparent; border: none; font-weight: 700; font-size: 15px; color: #64748B; cursor: pointer; transition: 0.2s; padding: 12px 16px; }
        .btn-cancel-v2:hover { color: #1E293B; background: #E2E8F0; border-radius: 12px; }
        .dark .btn-cancel-v2:hover { color: white; background: #334155; }

        .member-grid-v2 { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 12px; 
          max-height: 200px; 
          overflow-y: auto; 
          padding-right: 8px;
        }
        .member-pick { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          padding: 12px; 
          border-radius: 14px; 
          border: 1px solid #E2E8F0; 
          cursor: pointer; 
          transition: 0.2s; 
        }
        .member-pick.active { background: #5D3FD308; border-color: #5D3FD3; }
        .dark .member-pick { border-color: #334155; }
        
        .m-avatar { 
          width: 32px; 
          height: 32px; 
          border-radius: 50%; 
          background: #5D3FD3; 
          color: white; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 800; 
          font-size: 14px; 
        }
        .m-info strong { display: block; font-size: 13px; color: #1E293B; }
        .dark .m-info strong { color: #F1F5F9; }
        .m-info small { font-size: 11px; color: #94A3B8; }
      `}</style>
    </div>
  );
};

export default Projects;
