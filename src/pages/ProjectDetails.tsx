import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    ChevronRight,
    LayoutGrid,
    List,
    Columns as ColumnIcon,
    Rows as RowIcon,
    MessageSquare,
    X,
    User as UserIcon,
    MoreHorizontal,
    Trash2,
    ChevronDown,
    Check,
    Edit2,
    Upload,
    Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEmployees } from '../hooks/useEmployees';

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id: string;
    due_date: string;
    position: number;
    progress: number;
}

interface Project {
    id: string;
    name: string;
    description: string;
    status: string;
    cover_image?: string;
}

const ProjectDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'column' | 'grid' | 'list' | 'row'>('column');
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editingProjectName, setEditingProjectName] = useState('');
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

    const [projectMembers, setProjectMembers] = useState<any[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskProgress, setNewTaskProgress] = useState(0);

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    // Checklist / Task Detail State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
    const [taskChecklists, setTaskChecklists] = useState<any[]>([]);
    const [newChecklistTitle, setNewChecklistTitle] = useState('');

    // Edit Task State
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [editedTaskTitle, setEditedTaskTitle] = useState('');
    const [editedTaskDesc, setEditedTaskDesc] = useState('');

    const { employees } = useEmployees();

    useEffect(() => {
        if (id) {
            fetchProjectDetails();
            fetchTasks();
            fetchProjectMembers();
        }
    }, [id]);

    const fetchProjectMembers = async () => {
        const { data, error } = await supabase
            .from('project_members')
            .select(`
                employee_id,
                profiles:employee_id (*)
            `)
            .eq('project_id', id);

        if (data && !error) {
            const members = data.map((m: any) => Array.isArray(m.profiles) ? m.profiles[0] : m.profiles).filter(Boolean);
            setProjectMembers(members);
            if (members.length > 0 && !newTaskAssignee) {
                setNewTaskAssignee(members[0].id);
            }
        }
    };

    const fetchProjectDetails = async () => {
        const { data } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();
        if (data) setProject(data);
    };

    const handleAddMember = async (empId: string) => {
        try {
            const { error } = await supabase.from('project_members').insert([{ project_id: id, employee_id: empId }]);
            if (error) alert(error.message);
            fetchProjectMembers();
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemoveMember = async (empId: string) => {
        try {
            const { error } = await supabase.from('project_members').delete().eq('project_id', id).eq('employee_id', empId);
            if (error) alert(error.message);
            fetchProjectMembers();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveTitle = async () => {
        if (!editingProjectName.trim()) return;
        try {
            const { error } = await supabase
                .from('projects')
                .update({ name: editingProjectName })
                .eq('id', id);
            if (error) throw error;
            setIsEditingProject(false);
            fetchProjectDetails();
        } catch (e) {
            console.error(e);
        }
    };

    const fetchTasks = async () => {
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', id)
            .order('position', { ascending: true });
        if (data) setTasks(data);
    };

    const handleAddTask = async () => {
        if (!newTaskTitle || !id) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .insert([{
                    project_id: id,
                    title: newTaskTitle,
                    description: newTaskDesc,
                    priority: newTaskPriority,
                    assignee_id: newTaskAssignee || null,
                    due_date: newTaskDueDate || null,
                    status: 'todo',
                    position: tasks.length,
                    progress: newTaskProgress || 0
                }]);

            if (error) {
                alert(`DB Insert Error: ${error.message || JSON.stringify(error)}`);
                throw error;
            }

            setIsTaskModalOpen(false);
            resetTaskForm();
            fetchTasks();
        } catch (e: any) {
            console.error('Error adding task:', e);
            if (!e.message?.includes('DB Insert Error')) {
                alert(`Error: ${e.message || JSON.stringify(e)}`);
            }
        }
    };

    const resetTaskForm = () => {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskPriority('medium');
        setNewTaskAssignee(projectMembers[0]?.id || '');
        setNewTaskDueDate('');
        setNewTaskProgress(0);
    };

    const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status: newStatus })
                .eq('id', taskId);
            if (error) throw error;
            fetchTasks();
            setActiveDropdown(null);
        } catch (e) {
            console.error('Error updating status:', e);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);
            if (error) throw error;
            fetchTasks();
            setIsTaskDetailModalOpen(false);
            setSelectedTask(null);
        } catch (e) {
            console.error('Error deleting task:', e);
        }
    };

    const handleUpdateTask = async () => {
        if (!selectedTask || !editedTaskTitle) return;
        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    title: editedTaskTitle,
                    description: editedTaskDesc
                })
                .eq('id', selectedTask.id);
            if (error) throw error;

            setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, title: editedTaskTitle, description: editedTaskDesc } : t));
            setSelectedTask({ ...selectedTask, title: editedTaskTitle, description: editedTaskDesc });
            setIsEditingTask(false);
        } catch (e) {
            console.error('Error updating task:', e);
        }
    };

    // --- CHECKLIST LOGIC ---
    const fetchTaskChecklists = async (taskId: string) => {
        const { data } = await supabase
            .from('task_checklists')
            .select('*')
            .eq('task_id', taskId)
            .order('position', { ascending: true });
        if (data) setTaskChecklists(data);
    };

    const handleCardClick = (task: Task) => {
        setSelectedTask(task);
        setEditedTaskTitle(task.title);
        setEditedTaskDesc(task.description || '');
        setIsEditingTask(false);
        fetchTaskChecklists(task.id);
        setIsTaskDetailModalOpen(true);
    };

    const handleAddChecklist = async () => {
        if (!newChecklistTitle || !selectedTask) return;
        const { error } = await supabase.from('task_checklists').insert([{
            task_id: selectedTask.id,
            title: newChecklistTitle,
            position: taskChecklists.length
        }]);
        if (!error) {
            setNewChecklistTitle('');
            await fetchTaskChecklists(selectedTask.id);
            await recalculateTaskProgress(selectedTask.id);
        }
    };

    const toggleChecklist = async (checklistId: string, currentStatus: boolean, taskId: string) => {
        const newStatus = !currentStatus;
        const updatedChecklists = taskChecklists.map(c =>
            c.id === checklistId ? { ...c, is_completed: newStatus } : c
        );
        setTaskChecklists(updatedChecklists);
        await supabase.from('task_checklists').update({ is_completed: newStatus }).eq('id', checklistId);
        await recalculateTaskProgress(taskId, updatedChecklists);
    };

    const handleDeleteChecklist = async (checklistId: string) => {
        await supabase.from('task_checklists').delete().eq('id', checklistId);
        await fetchTaskChecklists(selectedTask?.id!);
        await recalculateTaskProgress(selectedTask?.id!);
    };

    const recalculateTaskProgress = async (taskId: string, forceChecklists?: any[]) => {
        const cl = forceChecklists || (await supabase.from('task_checklists').select('*').eq('task_id', taskId)).data || [];
        if (cl.length === 0) return;
        const completed = cl.filter((c: any) => c.is_completed).length;
        const newProgress = Math.round((completed / cl.length) * 100);
        await supabase.from('tasks').update({ progress: newProgress }).eq('id', taskId);
        fetchTasks();
    };

    const handleDeleteProject = async () => {
        if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            try {
                const { error } = await supabase.from('projects').delete().eq('id', id);
                if (error) throw error;
                navigate('/Admin/projects');
            } catch (err) {
                console.error("Error deleting project:", err);
            }
        }
    };

    // HTML5 Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            const el = document.getElementById(`task-${taskId}`);
            if (el) el.style.opacity = '0.4';
        }, 0);
    };

    const handleDragEnd = (_e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(null);
        const el = document.getElementById(`task-${taskId}`);
        if (el) el.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, statusId: Task['status']) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId && taskId !== '') {
            updateTaskStatus(taskId, statusId);
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'Important';
            case 'high': return 'High Priority';
            case 'medium': return 'Meh';
            case 'low': return 'OK';
            default: return 'Standard';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return '#8E44AD'; // Purple
            case 'high': return '#E67E22'; // Orange
            case 'medium': return '#3498DB'; // Blue
            case 'low': return '#27AE60'; // Green
            default: return '#95A5A6';
        }
    };

    const columns: { id: Task['status']; label: string; color: string }[] = [
        { id: 'todo', label: 'To Do', color: '#8E44AD' },
        { id: 'in_progress', label: 'In Progress', color: '#E67E22' },
        { id: 'review', label: 'Review', color: '#3498DB' },
        { id: 'done', label: 'Completed', color: '#27AE60' }
    ];

    const getAssignee = (empId: string) => {
        return employees.find(e => e.id === empId);
    };

    // Rendering task cards helper
    const renderTaskCard = (task: Task) => {
        const assignee = getAssignee(task.assignee_id);
        const currentCol = columns.find(c => c.id === task.status);

        return (
            <div
                key={task.id}
                id={`task-${task.id}`}
                className={`task-card-v3 ${draggedTaskId === task.id ? 'is-dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={(e) => handleDragEnd(e, task.id)}
                onClick={() => handleCardClick(task)}
            >
                <div className="card-header-v3">
                    <div className="card-priority-v3" style={{ color: getPriorityColor(task.priority), backgroundColor: `${getPriorityColor(task.priority)}15` }}>
                        {getPriorityLabel(task.priority)}
                    </div>
                    <div className="card-actions-v3 custom-dropdown-container">
                        <button
                            className="status-selector-minimal"
                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === task.id ? null : task.id); }}
                        >
                            {currentCol?.label} <ChevronDown size={12} />
                        </button>

                        {activeDropdown === task.id && (
                            <div className="custom-dropdown-menu">
                                {columns.map(c => (
                                    <button
                                        key={c.id}
                                        className={`dropdown-item ${task.status === c.id ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, c.id); }}
                                    >
                                        <div className="dot" style={{ backgroundColor: c.color }}></div>
                                        <span>{c.label}</span>
                                        {task.status === c.id && <Check size={14} className="check-icon" />}
                                    </button>
                                ))}
                                <div className="dropdown-divider"></div>
                                <button
                                    className="dropdown-item delete-item"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                >
                                    <Trash2 size={14} />
                                    <span>Delete Task</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <h4 className="card-title-v3">{task.title}</h4>

                <div className="card-progress-v3">
                    <div className="progress-info-v3">
                        <span>Progress</span>
                        <b>{task.status === 'done' ? '100' : (task.progress || 0)}%</b>
                    </div>
                    <div className="progress-track-v3">
                        <div
                            className="progress-fill-v3"
                            style={{
                                width: `${task.status === 'done' ? 100 : (task.progress || 0)}%`,
                                backgroundColor: getPriorityColor(task.priority)
                            }}
                        ></div>
                    </div>
                </div>

                <div className="card-footer-v3">
                    <div className="card-assignee-v3">
                        {assignee ? (
                            <div className="assignee-wrap">
                                {assignee.profile_pic_url ? (
                                    <img src={assignee.profile_pic_url} alt={assignee.full_name} />
                                ) : (
                                    <div className="fallback-avatar">{assignee.full_name?.[0] || '?'}</div>
                                )}
                                <span>{assignee.full_name?.split(' ')[0]}</span>
                            </div>
                        ) : (
                            <div className="assignee-wrap unassigned">
                                <div className="fallback-avatar"><UserIcon size={12} /></div>
                                <span>Nobody</span>
                            </div>
                        )}
                    </div>
                    <div className="card-meta-v3">
                        <div className="meta-item"><MessageSquare size={14} /> <span>{Math.floor(Math.random() * 5)}</span></div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="kanban-page premium" onClick={() => setActiveDropdown(null)}>
            {/* Dynamic Header */}
            <div className="kanban-top-nav">
                <div className="nav-left">
                    <div className="breadcrumb-v2">
                        <LayoutGrid size={16} />
                        <ChevronRight size={14} className="sep" />
                        <span>Dashboard</span>
                        <ChevronRight size={14} className="sep" />
                        <span>Project</span>
                        <ChevronRight size={14} className="sep" />
                        <span className="current-proj"><FolderIcon /> {project?.name}</span>
                    </div>
                </div>
                <div className="nav-right">
                    <div className="search-pill">
                        <Search size={16} />
                    </div>
                    <div className="avatar-stack-nav">
                        {projectMembers.slice(0, 5).map((emp, i) => (
                            <div key={emp.id} className="nav-avatar" style={{ zIndex: 10 - i }}>
                                {emp.profile_pic_url ? (
                                    <img src={emp.profile_pic_url} alt={emp.full_name} />
                                ) : (
                                    <span>{emp.full_name?.[0] || '?'}</span>
                                )}
                            </div>
                        ))}
                        {projectMembers.length > 5 && (
                            <div className="avatar-more">+{projectMembers.length - 5}</div>
                        )}
                    </div>
                    <button className="btn-invite" onClick={() => setIsTeamModalOpen(true)}>
                        <span>Invite Member</span>
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Facebook-style Cover Banner */}
            <div className="project-cover-banner" style={{ height: '140px', backgroundImage: project?.cover_image ? `url(${project.cover_image})` : 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}>
                <label className="banner-edit-btn" title="Change Cover Image">
                    <Upload size={14} /> {project?.cover_image ? 'Update Cover' : 'Add Cover'}
                    <input type="file" hidden accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                                const b64 = reader.result as string;
                                await supabase.from('projects').update({ cover_image: b64 }).eq('id', id);
                                fetchProjectDetails();
                            };
                            reader.readAsDataURL(file);
                        }
                    }} />
                </label>
                {project?.cover_image && (
                    <button className="banner-remove-btn" onClick={async () => {
                        await supabase.from('projects').update({ cover_image: null }).eq('id', id);
                        fetchProjectDetails();
                    }}>
                        <Trash2 size={14} /> Remove
                    </button>
                )}
            </div>

            <div className="project-sub-header">
                <div className="proj-info-block">
                    <div className="proj-icon-large">
                        <div className="gradient-circle"></div>
                    </div>
                    <div className="proj-title-area">
                        <div className="badge-status">Active Project</div>
                        {isEditingProject ? (
                            <div className="title-edit-form" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input autoFocus className="title-input-v3" value={editingProjectName} onChange={e => setEditingProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveTitle()} style={{ fontSize: '20px', fontWeight: 800, padding: '4px 8px', border: '1px solid #10B981', borderRadius: '8px', outline: 'none' }} />
                                <button className="btn-save-title" onClick={handleSaveTitle} style={{ background: '#10B981', color: 'white', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                                <button className="btn-cancel-title" onClick={() => setIsEditingProject(false)} style={{ background: 'transparent', color: '#EF4444', border: '1px solid currentColor', padding: '0 12px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        ) : (
                            <div className="title-display-v3" onClick={() => { setEditingProjectName(project?.name || ''); setIsEditingProject(true); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '12px' }} title="Click to edit project name">
                                <h1 style={{ margin: 0, fontSize: '26px' }}>{project?.name || 'Loading Project...'}</h1>
                                <Edit2 size={16} className="edit-icon" style={{ color: '#94A3B8' }} />
                            </div>
                        )}
                        <div className="view-selector">
                            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><LayoutGrid size={16} /> Grid</button>
                            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><List size={16} /> List</button>
                            <button className={viewMode === 'column' ? 'active' : ''} onClick={() => setViewMode('column')}><ColumnIcon size={16} /> Board</button>
                            <button className={viewMode === 'row' ? 'active' : ''} onClick={() => setViewMode('row')}><RowIcon size={16} /> Timeline</button>
                        </div>
                    </div>
                </div>
                <div className="proj-actions">
                    <button className="btn-delete-proj" onClick={handleDeleteProject} title="Delete Project">
                        <Trash2 size={16} />
                        <span>Delete</span>
                    </button>
                    <button className="btn-add-main" onClick={() => setIsTaskModalOpen(true)}>
                        <Plus size={18} />
                        <span>New Task</span>
                    </button>
                </div>
            </div>

            {/* Dynamic View Renderer */}
            <div className="kanban-board-scroll">

                {/* 1. COLUMN (BOARD) VIEW */}
                {viewMode === 'column' && (
                    <div className="kanban-board-v2">
                        {columns.map(col => (
                            <div
                                key={col.id}
                                className={`kanban-column-v2 ${draggedTaskId ? 'drag-active' : ''}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className="column-header-v2">
                                    <div className="col-title-group">
                                        <span className="dot" style={{ backgroundColor: col.color }}></span>
                                        <h3>{col.label} <span className="count">{tasks.filter(t => t.status === col.id).length}</span></h3>
                                    </div>
                                    <button className="btn-col-more">
                                        <MoreHorizontal size={18} />
                                    </button>
                                </div>

                                <div className="column-cards-v2">
                                    {tasks.filter(t => t.status === col.id).map(task => renderTaskCard(task))}

                                    <button className="btn-add-card-inline" onClick={() => setIsTaskModalOpen(true)}>
                                        <Plus size={18} />
                                        <span>Add Task</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. GRID VIEW */}
                {viewMode === 'grid' && (
                    <div className="grid-view-v2">
                        {tasks.map(task => renderTaskCard(task))}
                        <button className="btn-add-card-inline-grid" onClick={() => setIsTaskModalOpen(true)}>
                            <Plus size={24} />
                            <span>Create New Task</span>
                        </button>
                    </div>
                )}

                {/* 3. LIST VIEW */}
                {viewMode === 'list' && (
                    <div className="list-view-v2">
                        <div className="list-header-v2">
                            <div className="lh-status">Status</div>
                            <div className="lh-title">Task Name</div>
                            <div className="lh-priority">Priority</div>
                            <div className="lh-assignee">Assignee</div>
                            <div className="lh-progress">Progress</div>
                        </div>
                        {tasks.map(task => {
                            const currentCol = columns.find(c => c.id === task.status);
                            const assignee = getAssignee(task.assignee_id);

                            return (
                                <div key={task.id} className="list-row-v2" onClick={() => { }}>
                                    <div className="lr-status">
                                        <div className="status-pill-mini" style={{ backgroundColor: `${currentCol?.color}15`, color: currentCol?.color }}>
                                            <div className="dot" style={{ backgroundColor: currentCol?.color }}></div>
                                            {currentCol?.label}
                                        </div>
                                    </div>
                                    <div className="lr-title">{task.title}</div>
                                    <div className="lr-priority">
                                        <span style={{ color: getPriorityColor(task.priority), fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                                            {getPriorityLabel(task.priority)}
                                        </span>
                                    </div>
                                    <div className="lr-assignee">
                                        {assignee ? (
                                            <div className="assignee-wrap">
                                                {assignee.profile_pic_url ? (
                                                    <img src={assignee.profile_pic_url} alt={assignee.full_name} />
                                                ) : (
                                                    <div className="fallback-avatar">{assignee.full_name?.[0] || '?'}</div>
                                                )}
                                                <span>{assignee.full_name?.split(' ')[0]}</span>
                                            </div>
                                        ) : (
                                            <div className="assignee-wrap unassigned">
                                                <div className="fallback-avatar"><UserIcon size={12} /></div>
                                                <span>Nobody</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="lr-progress">
                                        <div className="progress-track-v3">
                                            <div
                                                className="progress-fill-v3"
                                                style={{
                                                    width: `${task.status === 'done' ? 100 : (task.progress || 0)}%`,
                                                    backgroundColor: getPriorityColor(task.priority)
                                                }}
                                            ></div>
                                        </div>
                                        <span className="perc-label">{task.status === 'done' ? '100' : (task.progress || 0)}%</span>
                                    </div>
                                </div>
                            );
                        })}
                        {tasks.length === 0 && (
                            <div className="empty-state-v2">
                                <p>No tasks yet. Create one to get started!</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. TIMELINE (ROW) VIEW */}
                {viewMode === 'row' && (
                    <div className="timeline-view-v2">
                        {columns.map(col => {
                            const colTasks = tasks.filter(t => t.status === col.id);
                            return (
                                <div key={col.id} className="timeline-group-v2">
                                    <div className="timeline-group-header">
                                        <div className="dot" style={{ backgroundColor: col.color }}></div>
                                        <h3>{col.label} <span>({colTasks.length})</span></h3>
                                    </div>
                                    <div className="timeline-cards-row">
                                        {colTasks.map(task => renderTaskCard(task))}
                                        <button className="btn-add-timeline-card" onClick={() => setIsTaskModalOpen(true)}>
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Task Modal */}
            {isTaskModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass-v2">
                        <div className="modal-header-v2">
                            <h3>New Task Assignment</h3>
                            <button className="close-btn-v2" onClick={() => setIsTaskModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body-v2">
                            <div className="form-group-v2">
                                <label>Task Subject</label>
                                <input type="text" placeholder="e.g. Design System Overhaul" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
                            </div>
                            <div className="form-group-v2">
                                <label>Task Context</label>
                                <textarea placeholder="Describe what needs to be done..." value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} rows={3} />
                            </div>
                            <div className="form-row-v2">
                                <div className="form-group-v2">
                                    <label>Priority Level</label>
                                    <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as any)}>
                                        <option value="low">Standard (OK)</option>
                                        <option value="medium">Medium (Meh)</option>
                                        <option value="high">High priority</option>
                                        <option value="urgent">Urgent / Important</option>
                                    </select>
                                </div>
                                <div className="form-group-v2">
                                    <label>Initial %</label>
                                    <input type="number" min="0" max="100" value={newTaskProgress} onChange={e => setNewTaskProgress(parseInt(e.target.value))} />
                                </div>
                            </div>
                            <div className="form-group-v2">
                                <label>Owner / Assignee</label>
                                <select value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)}>
                                    {projectMembers.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.full_name || emp.email}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer-v2">
                            <button className="btn-cancel-v2" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
                            <button className="btn-create-v2" onClick={handleAddTask} disabled={!newTaskTitle}>Create Task</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Details & Checklist Modal */}
            {isTaskDetailModalOpen && selectedTask && (
                <div className="modal-overlay" onClick={() => setIsTaskDetailModalOpen(false)}>
                    <div className="modal-content glass-v2" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header-v2" style={{ alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <div className="card-priority-v3" style={{ display: 'inline-block', marginBottom: '12px', color: getPriorityColor(selectedTask.priority), backgroundColor: `${getPriorityColor(selectedTask.priority)}15`, fontWeight: 800, padding: '4px 10px', borderRadius: '6px', fontSize: '10px', textTransform: 'uppercase' }}>
                                    {getPriorityLabel(selectedTask.priority)}
                                </div>
                                {isEditingTask ? (
                                    <input
                                        className="edit-task-title-input"
                                        value={editedTaskTitle}
                                        onChange={e => setEditedTaskTitle(e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <h3 style={{ fontSize: '24px', margin: 0, fontWeight: 800 }}>{selectedTask.title}</h3>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {!isEditingTask ? (
                                    <>
                                        <button className="icon-btn-v2" onClick={() => setIsEditingTask(true)} title="Edit Task"><Edit2 size={18} /></button>
                                        <button className="icon-btn-v2 delete" onClick={() => handleDeleteTask(selectedTask.id)} title="Delete Task"><Trash2 size={18} /></button>
                                    </>
                                ) : (
                                    <button className="icon-btn-v2 save" onClick={handleUpdateTask} title="Save Changes"><Save size={18} /></button>
                                )}
                                <button className="close-btn-v2" onClick={() => setIsTaskDetailModalOpen(false)}><X size={20} /></button>
                            </div>
                        </div>
                        <div className="modal-body-v2">
                            {isEditingTask ? (
                                <textarea
                                    className="edit-task-desc-textarea"
                                    value={editedTaskDesc}
                                    onChange={e => setEditedTaskDesc(e.target.value)}
                                    placeholder="Add a description..."
                                    rows={4}
                                />
                            ) : (
                                <p style={{ color: '#64748B', fontSize: '15px', lineHeight: 1.6 }}>
                                    {selectedTask.description || "No description provided."}
                                </p>
                            )}

                            <div className="checklist-section">
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
                                    Subtasks ({taskChecklists.filter(c => c.is_completed).length}/{taskChecklists.length})
                                </h4>

                                <div className="cl-progress-bar" style={{ height: 6, background: '#F1F5F9', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${taskChecklists.length > 0 ? (taskChecklists.filter(c => c.is_completed).length / taskChecklists.length) * 100 : 0}%`,
                                        background: getPriorityColor(selectedTask.priority),
                                        transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}></div>
                                </div>

                                <div className="checklist-items" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {taskChecklists.map(cl => (
                                        <div key={cl.id} className={`cl-item ${cl.is_completed ? 'completed' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={cl.is_completed}
                                                onChange={() => toggleChecklist(cl.id, cl.is_completed, selectedTask.id)}
                                                className="cl-checkbox"
                                            />
                                            <span className="cl-text">{cl.title}</span>
                                            <button className="cl-del" onClick={() => handleDeleteChecklist(cl.id)}><X size={14} /></button>
                                        </div>
                                    ))}
                                    {taskChecklists.length === 0 && (
                                        <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic', padding: '12px 0' }}>No subtasks created yet. Break down this task below!</div>
                                    )}
                                </div>

                                <div className="add-cl-row" style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Add a new subtask..."
                                        value={newChecklistTitle}
                                        onChange={e => setNewChecklistTitle(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddChecklist()}
                                        className="cl-input"
                                    />
                                    <button onClick={handleAddChecklist} disabled={!newChecklistTitle} className="cl-add-btn">Add</button>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer-v2">
                            <button className="btn-cancel-v2" onClick={() => setIsTaskDetailModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Management Modal */}
            {isTeamModalOpen && (
                <div className="modal-overlay" onClick={() => setIsTeamModalOpen(false)}>
                    <div className="modal-content glass-v2" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: '32px' }}>
                        <div className="modal-header-v2" style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Manage Project Team</h3>
                            <button className="close-btn-v2" onClick={() => setIsTeamModalOpen(false)}><X size={20} /></button>
                        </div>

                        <div className="team-management-grid">
                            <h4 style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>Current Members ({projectMembers.length})</h4>
                            <div className="current-team-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', maxHeight: '180px', overflowY: 'auto' }}>
                                {projectMembers.map(emp => (
                                    <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99, 102, 241, 0.05)', padding: '12px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E2E8F0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', color: '#1E293B' }}>
                                                {emp.profile_pic_url ? <img src={emp.profile_pic_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : emp.full_name?.[0]}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'inherit' }}>{emp.full_name}</span>
                                        </div>
                                        <button onClick={() => handleRemoveMember(emp.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', transition: '0.2s' }} title="Remove from Project">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <h4 style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>Add New Members</h4>
                            <div className="available-team-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                {employees.filter(e => e.full_name?.trim() && !projectMembers.find(pm => pm.id === e.id)).map(emp => (
                                    <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid currentColor', borderColor: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                                {emp.profile_pic_url ? <img src={emp.profile_pic_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : emp.full_name?.[0]}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{emp.full_name}</span>
                                        </div>
                                        <button onClick={() => handleAddMember(emp.id)} style={{ background: '#10B981', border: 'none', color: 'white', cursor: 'pointer', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', transition: '0.2s' }}>
                                            Add
                                        </button>
                                    </div>
                                ))}
                                {employees.filter(e => e.full_name?.trim() && !projectMembers.find(pm => pm.id === e.id)).length === 0 && (
                                    <div style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', padding: '24px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>All valid employees are already in this project.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .kanban-page.premium {
          padding: 0;
          height: 100vh;
          background: #F8FAFC;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #1E293B;
          transition: background 0.3s ease;
        }
        .dark .kanban-page.premium { background: #09090B; color: #FAFAFA; }

        .kanban-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 32px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1.5px solid rgba(0,0,0,0.05);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .dark .kanban-top-nav { background: rgba(9, 9, 11, 0.8); border-color: rgba(255,255,255,0.05); }

        .breadcrumb-v2 { display: flex; align-items: center; gap: 8px; color: #64748B; font-size: 13px; font-weight: 600; }
        .breadcrumb-v2 .sep { color: #CBD5E1; opacity: 0.5; }
        .current-proj { color: #6232FF; font-weight: 800; display: flex; align-items: center; gap: 8px; }

        .nav-right { display: flex; align-items: center; gap: 24px; }
        .search-pill { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #64748B; cursor: pointer; border-radius: 50%; transition: 0.2s; background: #F1F5F9; }
        .dark .search-pill { background: rgba(255, 255, 255, 0.05); color: #A1A1AA; }
        .search-pill:hover { background: #E2E8F0; color: #1E293B; }
        .dark .search-pill:hover { background: rgba(255, 255, 255, 0.1); color: white; }

        .avatar-stack-nav { display: flex; align-items: center; }
        .nav-avatar { width: 34px; height: 34px; border-radius: 50%; border: 2.5px solid white; margin-left: -10px; overflow: hidden; background: #6232FF; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .dark .nav-avatar { border-color: #09090B; }
        .nav-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .nav-avatar span { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 11px; font-weight: 800; }
        .avatar-more { width: 34px; height: 34px; border-radius: 50%; border: 2.5px solid white; margin-left: -10px; background: #F8FAFB; color: #475569; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .dark .avatar-more { border-color: #09090B; background: #18181B; color: white; }

        .btn-invite { background: #F1F5F9; border: none; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 13px; color: #475569; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; }
        .dark .btn-invite { background: rgba(255, 255, 255, 0.05); color: #FAFAFA; }
        .btn-invite:hover { background: #E2E8F0; color: #1E293B; }
        .dark .btn-invite:hover { background: rgba(255, 255, 255, 0.1); }

        .project-sub-header { padding: 40px 32px 32px 32px; display: flex; justify-content: space-between; align-items: flex-end; }
        .badge-status { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #10B981; background: rgba(16, 185, 129, 0.1); padding: 6px 14px; border-radius: 20px; width: fit-content; margin-bottom: 12px; }
        
        .proj-title-area h1 { font-size: 40px; font-weight: 950; margin: 0 0 24px 0; letter-spacing: -1.5px; color: #1E293B; }
        .dark .proj-title-area h1 { color: white; }
        
        .view-selector { display: flex; background: #F1F5F9; padding: 5px; border-radius: 16px; gap: 5px; width: fit-content; border: 1.5px solid rgba(0,0,0,0.02); }
        .dark .view-selector { background: rgba(24, 24, 27, 0.6); border-color: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); }
        .view-selector button { border: none; background: transparent; padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; color: #64748B; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
        .view-selector button.active { background: white; color: #6232FF; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .dark .view-selector button.active { background: #6232FF; color: white; box-shadow: 0 4px 15px rgba(98, 50, 255, 0.3); }

        .proj-actions { display: flex; gap: 16px; align-items: center; }

        .btn-add-main { 
          background: linear-gradient(135deg, #6232FF 0%, #5D3FD3 100%); 
          color: white; border: none; padding: 14px 28px; border-radius: 16px; font-weight: 800; font-size: 14px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          box-shadow: 0 10px 25px rgba(98, 50, 255, 0.2); 
        }
        .btn-add-main:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(98, 50, 255, 0.4); }

        .btn-delete-proj { background: transparent; color: #EF4444; border: 1.5px solid rgba(239, 68, 68, 0.2); padding: 14px 24px; border-radius: 16px; font-weight: 800; font-size: 14px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; }
        .btn-delete-proj:hover { background: rgba(239, 68, 68, 0.05); border-color: #EF4444; }

        /* Checklist CSS */
        .cl-item { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: white; border: 1.5px solid #E2E8F0; border-radius: 14px; transition: 0.2s; }
        .cl-item:hover { border-color: #6232FF33; background: #F8FAFC; }
        .dark .cl-item { background: rgba(24, 24, 27, 0.45); border-color: rgba(255, 255, 255, 0.06); }
        .cl-item.completed { background: #F1F5F9; border-color: transparent; }
        .dark .cl-item.completed { background: rgba(24, 24, 27, 0.2); }
        
        .cl-checkbox { width: 20px; height: 20px; cursor: pointer; border-radius: 6px; border: 2px solid #CBD5E1; transition: 0.2s; accent-color: #6232FF; }
        .dark .cl-checkbox { border-color: rgba(255, 255, 255, 0.2); }
        .cl-text { flex: 1; font-size: 15px; font-weight: 600; color: #1E293B; transition: 0.2s; }
        .dark .cl-text { color: #FAFAFA; }
        .cl-item.completed .cl-text { color: #71717A; text-decoration: line-through; }
        
        .cl-del { background: none; border: none; color: #CBD5E1; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; transition: 0.2s; }
        .cl-del:hover { background: rgba(239, 68, 68, 0.1); color: #EF4444; }

        .cl-input { flex: 1; background: #F1F5F9; border: 1.5px solid transparent; border-radius: 14px; padding: 14px 18px; font-size: 15px; font-weight: 600; outline: none; transition: 0.2s; color: #1E293B; }
        .cl-input:focus { background: white; border-color: #6232FF; box-shadow: 0 0 0 4px rgba(98, 50, 255, 0.08); }
        .dark .cl-input { background: rgba(24, 24, 27, 0.6); border-color: rgba(255, 255, 255, 0.05); color: white; }
        .dark .cl-input:focus { background: rgba(24, 24, 27, 0.8); border-color: #6232FF; }

        .project-cover-banner { height: 180px; width: 100%; background-size: cover; background-position: center; position: relative; border-bottom: 2px solid rgba(0,0,0,0.02); }
        .banner-edit-btn { position: absolute; bottom: 20px; right: 32px; background: rgba(255,255,255,0.9); padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 800; color: #1E293B; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); transition: 0.2s; backdrop-filter: blur(10px); border: 1px solid white; }
        .banner-edit-btn:hover { background: white; transform: translateY(-2px); box-shadow: 0 15px 35px rgba(0,0,0,0.15); }
        .banner-remove-btn { position: absolute; bottom: 20px; right: 200px; background: rgba(239, 68, 68, 0.9); padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 800; color: white; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.2); transition: 0.2s; backdrop-filter: blur(10px); }
        .banner-remove-btn:hover { background: #EF4444; transform: translateY(-2px); }
        .dark .banner-edit-btn { background: rgba(24, 24, 27, 0.85); color: white; border-color: rgba(255,255,255,0.1); }
        .dark .banner-edit-btn:hover { background: rgba(24, 24, 27, 1); }

        .title-display-v3:hover h1 { color: #6232FF; }
        .title-display-v3:hover .edit-icon { color: #6232FF !important; }

        .cl-add-btn { background: #1E293B; color: white; border: none; padding: 0 24px; border-radius: 14px; font-weight: 800; font-size: 14px; cursor: pointer; transition: 0.2s; }
        .dark .cl-add-btn { background: #6232FF; }
        .cl-add-btn:hover:not(:disabled) { transform: scale(1.02); filter: brightness(1.1); }

        /* Task Card Overhaul */
        .task-card-v3 {
          background: white;
          border-radius: 20px;
          padding: 24px;
          border: 1.5px solid rgba(0,0,0,0.02);
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          cursor: grab;
          overflow: hidden;
        }
        .dark .task-card-v3 { background: rgba(24, 24, 27, 0.45); border-color: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); }
        .task-card-v3:hover:not(.is-dragging) { transform: translateY(-8px); box-shadow: 0 30px 60px rgba(0,0,0,0.1); border-color: rgba(98, 50, 255, 0.2); }
        .dark .task-card-v3:hover:not(.is-dragging) { border-color: rgba(255, 255, 255, 0.1); box-shadow: 0 30px 60px rgba(0,0,0,0.4); }

        .card-header-v3 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .card-priority-v3 { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .status-selector-minimal { background: #F1F5F9; border: none; padding: 8px 14px; border-radius: 10px; font-size: 11px; font-weight: 800; color: #64748B; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; }
        .dark .status-selector-minimal { background: rgba(255, 255, 255, 0.05); color: #A1A1AA; }
        .status-selector-minimal:hover { background: #E2E8F0; color: #1E293B; }
        .dark .status-selector-minimal:hover { background: rgba(255, 255, 255, 0.1); color: white; }

        .custom-dropdown-menu { position: absolute; top: calc(100% + 10px); right: 0; background: white; border: 1.5px solid rgba(0,0,0,0.05); border-radius: 16px; padding: 8px; box-shadow: 0 20px 50px rgba(0,0,0,0.1); width: 180px; z-index: 150; }
        .dark .custom-dropdown-menu { background: #18181B; border-color: rgba(255, 255, 255, 0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.4); }

        .dropdown-item { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; border: none; background: transparent; cursor: pointer; font-size: 13px; font-weight: 700; color: #64748B; transition: 0.2s; }
        .dark .dropdown-item { color: #A1A1AA; }
        .dropdown-item:hover { background: #F1F5F9; color: #1E293B; }
        .dark .dropdown-item:hover { background: rgba(255, 255, 255, 0.05); color: white; }

        .card-title-v3 { font-size: 17px; font-weight: 800; color: #1E293B; margin: 0 0 20px 0; line-height: 1.4; letter-spacing: -0.5px; }
        .dark .card-title-v3 { color: #FAFAFA; }

        .card-progress-v3 { margin-bottom: 24px; }
        .progress-info-v3 { display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; color: #A1A1AA; margin-bottom: 10px; }
        .progress-track-v3 { height: 6px; background: #F1F5F9; border-radius: 10px; overflow: hidden; }
        .dark .progress-track-v3 { background: rgba(255, 255, 255, 0.05); }

        .card-footer-v3 { display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 1.5px solid rgba(0,0,0,0.02); }
        .dark .card-footer-v3 { border-top-color: rgba(255, 255, 255, 0.05); }

        .assignee-wrap .fallback-avatar, .assignee-wrap img { width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .dark .assignee-wrap .fallback-avatar, .dark .assignee-wrap img { border-color: #09090B; }
        .assignee-wrap span { font-size: 13px; font-weight: 700; color: #64748B; }

        .btn-add-card-inline { border: 1.5px dashed #E2E8F0; padding: 14px; border-radius: 16px; color: #94A3B8; font-weight: 800; margin-top: 8px; }
        .dark .btn-add-card-inline { border-color: rgba(255, 255, 255, 0.1); }
        .btn-add-card-inline:hover { background: rgba(98, 50, 255, 0.05); border-color: #6232FF; color: #6232FF; }

        /* Modal Redesign */
        .modal-overlay { background: rgba(9, 9, 11, 0.7); backdrop-filter: blur(15px); }
        .modal-content.glass-v2 { max-width: 550px; background: white; border-radius: 32px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 50px 100px rgba(0,0,0,0.25); }
        .dark .modal-content.glass-v2 { background: #111114; border-color: rgba(255, 255, 255, 0.05); }

        .modal-header-v2 { padding: 40px 40px 32px 40px; border-bottom: 1.5px solid rgba(0,0,0,0.02); }
        .dark .modal-header-v2 { border-bottom-color: rgba(255, 255, 255, 0.05); }
        .modal-header-v2 h3 { font-size: 26px; font-weight: 900; letter-spacing: -1px; }

        .modal-body-v2 { padding: 40px; gap: 32px; }
        .form-group-v2 input, .form-group-v2 textarea, .form-group-v2 select { 
          background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 16px; padding: 16px 20px; font-weight: 600; 
        }
        .dark .form-group-v2 input, .dark .form-group-v2 textarea, .dark .form-group-v2 select {
          background: rgba(0, 0, 0, 0.2); border-color: rgba(255, 255, 255, 0.1); color: white;
        }

        .modal-footer-v2 { padding: 32px 40px 40px 40px; background: #F8FAFC; border-top: 1.5px solid rgba(0,0,0,0.02); }
        .dark .modal-footer-v2 { background: #111114; border-top-color: rgba(255, 255, 255, 0.05); }
        
        .btn-create-v2 { background: linear-gradient(135deg, #6232FF 0%, #5D3FD3 100%); padding: 14px 32px; border-radius: 16px; font-weight: 800; font-size: 15px; }

        .kanban-board-scroll { padding: 0 32px 64px 32px; }
      `}</style>
        </div>
    );
};

const FolderIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
);

export default ProjectDetails;
