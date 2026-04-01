import { useState, useEffect } from 'react';
import {
    Search,
    ChevronRight,
    MessageSquare,
    X,
    MoreHorizontal,
    Check,
    ChevronDown,
    LayoutGrid,
    List,
    Columns as ColumnIcon,
    Rows as RowIcon,
    FolderKanban
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEmployees } from '../hooks/useEmployees';

interface Task {
    id: string;
    project_id: string;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id: string;
    due_date: string;
    position: number;
    progress: number;
    projects?: { name: string; cover_image?: string };
}

const EmployeeTasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // Checklist / Task Detail State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
    const [taskChecklists, setTaskChecklists] = useState<any[]>([]);
    const [newChecklistTitle, setNewChecklistTitle] = useState('');

    const { employees } = useEmployees();

    useEffect(() => {
        fetchMyTasks();
    }, []);

    const fetchMyTasks = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    projects:project_id (name, cover_image)
                `)
                .eq('assignee_id', user.id)
                .order('position', { ascending: true });

            if (error) throw error;

            // Supabase joins return arrays or single objects based on the relationship. projects is a 1:1 here.
            const mappedTasks = (data || []).map((t: any) => ({
                ...t,
                projects: Array.isArray(t.projects) ? t.projects[0] : t.projects
            }));

            setTasks(mappedTasks);
        } catch (e) {
            console.error('Error fetching my tasks:', e);
        } finally {
            setLoading(false);
        }
    };

    const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status: newStatus })
                .eq('id', taskId);
            if (error) throw error;
            fetchMyTasks();
            setActiveDropdown(null);
        } catch (e) {
            console.error('Error updating status:', e);
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
        fetchMyTasks();
    };

    // HTML5 Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            const el = document.getElementById(`mytask-${taskId}`);
            if (el) el.style.opacity = '0.4';
        }, 0);
    };

    const handleDragEnd = (_e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(null);
        const el = document.getElementById(`mytask-${taskId}`);
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
            case 'urgent': return '#8E44AD';
            case 'high': return '#E67E22';
            case 'medium': return '#3498DB';
            case 'low': return '#27AE60';
            default: return '#95A5A6';
        }
    };

    const columns: { id: Task['status']; label: string; color: string }[] = [
        { id: 'todo', label: 'To Do', color: '#8E44AD' },
        { id: 'in_progress', label: 'In Progress', color: '#E67E22' },
        { id: 'review', label: 'Review', color: '#3498DB' },
        { id: 'done', label: 'Completed', color: '#27AE60' }
    ];

    const renderTaskCard = (task: Task) => {
        const currentCol = columns.find(c => c.id === task.status);

        return (
            <div
                key={task.id}
                id={`mytask-${task.id}`}
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
                    <div className="card-project-badge">
                        <FolderKanban size={12} />
                        <span>{task.projects?.name || 'Unknown Project'}</span>
                    </div>
                    <div className="card-meta-v3">
                        <div className="meta-item"><MessageSquare size={14} /> <span>{taskChecklists.length}</span></div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="kanban-page premium" onClick={() => setActiveDropdown(null)}>
            <div className="kanban-top-nav">
                <div className="nav-left">
                    <div className="breadcrumb-v2">
                        <LayoutGrid size={16} />
                        <ChevronRight size={14} className="sep" />
                        <span>My Workspace</span>
                        <ChevronRight size={14} className="sep" />
                        <span className="current-proj"><FolderKanban size={16} /> Unified Board</span>
                    </div>
                </div>
            </div>

            <div className="project-sub-header">
                <div className="proj-info-block">
                    <div className="proj-icon-large">
                        <div className="gradient-circle" style={{ background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)' }}></div>
                    </div>
                    <div className="proj-title-area">
                        <div className="badge-status" style={{ color: '#10B981', background: '#10B98115' }}>Global View</div>
                        <h1>My Tasks</h1>
                    </div>
                </div>
            </div>

            <div className="kanban-board-scroll">
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

                                {tasks.filter(t => t.status === col.id).length === 0 && !loading && (
                                    <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94A3B8', border: '1px dashed #E2E8F0', borderRadius: '12px' }}>
                                        No tasks here
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Task Details & Checklist Modal */}
            {isTaskDetailModalOpen && selectedTask && (
                <div className="modal-overlay" onClick={() => setIsTaskDetailModalOpen(false)}>
                    <div className="modal-content glass-v2" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header-v2" style={{ alignItems: 'flex-start' }}>
                            <div>
                                <div className="card-priority-v3" style={{ display: 'inline-block', marginBottom: '12px', color: getPriorityColor(selectedTask.priority), backgroundColor: `${getPriorityColor(selectedTask.priority)}15`, fontWeight: 800, padding: '4px 10px', borderRadius: '6px', fontSize: '10px', textTransform: 'uppercase' }}>
                                    {getPriorityLabel(selectedTask.priority)}
                                </div>
                                <h3 style={{ fontSize: '24px', margin: 0, fontWeight: 800 }}>{selectedTask.title}</h3>
                            </div>
                            <button className="close-btn-v2" onClick={() => setIsTaskDetailModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body-v2">
                            <p style={{ color: '#64748B', fontSize: '15px', lineHeight: 1.6 }}>
                                {selectedTask.description || "No description provided."}
                            </p>

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

            <style>{`
        .kanban-page.premium {
          padding: 0;
          height: 100vh;
          background: #F8FAFC;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #1E293B;
        }

        .dark .kanban-page.premium {
          background: #0B0E14;
          color: #F1F5F9;
        }

        .kanban-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 32px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,0,0,0.05);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .dark .kanban-top-nav { background: rgba(11, 14, 20, 0.8); border-color: rgba(255,255,255,0.05); }

        .breadcrumb-v2 { display: flex; align-items: center; gap: 8px; color: #64748B; font-size: 13px; font-weight: 500; }
        .breadcrumb-v2 .sep { color: #CBD5E1; opacity: 0.5; }
        .current-proj { color: #10B981; font-weight: 700; display: flex; align-items: center; gap: 6px; }

        .project-sub-header { padding: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
        .proj-title-area h1 { font-size: 32px; font-weight: 900; margin: 0 0 20px 0; letter-spacing: -1px; }

        .card-project-badge { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #64748B; background: #F1F5F9; padding: 4px 8px; border-radius: 6px; }
        .dark .card-project-badge { background: #334155; color: #94A3B8; }

        /* Checklist CSS */
        .cl-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; border: 1px solid #E2E8F0; border-radius: 12px; transition: 0.2s; }
        .cl-item:hover { border-color: #CBD5E1; }
        .dark .cl-item { background: #161B22; border-color: #334155; }
        .cl-item.completed { background: #F8FAFB; border-color: transparent; }
        .dark .cl-item.completed { background: #0F172A; }
        
        .cl-checkbox { width: 18px; height: 18px; cursor: pointer; border-radius: 4px; border: 2px solid #CBD5E1; transition: 0.2s; }
        .dark .cl-checkbox { border-color: #475569; }
        .cl-text { flex: 1; font-size: 14px; font-weight: 500; color: #1E293B; transition: 0.2s; padding-top: 1px; }
        .dark .cl-text { color: #F1F5F9; }
        .cl-item.completed .cl-text { color: #94A3B8; text-decoration: line-through; }
        
        .cl-del { background: none; border: none; color: #CBD5E1; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; transition: 0.2s; padding: 0; }
        .cl-del:hover { background: #FEE2E2; color: #EF4444; }
        .dark .cl-del:hover { background: #7F1D1D; color: #FCA5A5; }

        .cl-input { flex: 1; background: #F8FAFB; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 16px; font-size: 14px; outline: none; transition: 0.2s; color: #1E293B; }
        .cl-input:focus { background: white; border-color: #10B981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }
        .dark .cl-input { background: #0F172A; border-color: #334155; color: white; }
        .dark .cl-input:focus { background: #161B22; border-color: #34D399; }

        .cl-add-btn { background: #1E293B; color: white; border: none; padding: 0 20px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .cl-add-btn:hover:not(:disabled) { background: #10B981; transform: scale(1.05); }
        .cl-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .kanban-board-scroll { flex: 1; overflow-x: auto; overflow-y: auto; padding: 0 32px 40px 32px; }

        /* Keep existing kanban card styles below */
        .kanban-board-v2 { display: flex; gap: 24px; min-width: max-content; }
        .kanban-column-v2 { width: 340px; background: rgba(0,0,0,0.02); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 20px; transition: 0.3s; }
        .dark .kanban-column-v2 { background: #161B22; }
        .kanban-column-v2.drag-active { background: rgba(99, 102, 241, 0.05); box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.3); border-radius: 20px; }
        .dark .kanban-column-v2.drag-active { background: rgba(99, 102, 241, 0.1); }
        .column-header-v2 { display: flex; justify-content: space-between; align-items: center; }
        .col-title-group { display: flex; align-items: center; gap: 10px; }
        .col-title-group .dot { width: 10px; height: 10px; border-radius: 50%; }
        .col-title-group h3 { font-size: 15px; font-weight: 800; color: #1E293B; margin: 0; display: flex; align-items: center; gap: 8px; }
        .dark .col-title-group h3 { color: #F1F5F9; }
        .col-title-group h3 .count { background: white; color: #64748B; padding: 2px 8px; border-radius: 20px; font-size: 12px; border: 1px solid rgba(0,0,0,0.05); }
        .dark .col-title-group h3 .count { background: #0B0E14; border-color: #334155; }
        .column-cards-v2 { display: flex; flex-direction: column; gap: 16px; min-height: 150px; }
        
        .task-card-v3 { background: white; border-radius: 16px; padding: 20px; border: 1px solid rgba(0,0,0,0.04); cursor: grab; transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .dark .task-card-v3 { background: #1E293B; border-color: #334155; }
        .task-card-v3:hover { transform: translateY(-4px); box-shadow: 0 12px 20px rgba(0,0,0,0.06); }
        .task-card-v3:active { cursor: grabbing; transform: scale(0.98); }
        .task-card-v3.is-dragging { opacity: 0.5; transform: scale(0.95); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        
        .card-header-v3 { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .card-priority-v3 { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .card-title-v3 { font-size: 15px; font-weight: 700; color: #1E293B; margin: 0 0 16px 0; line-height: 1.4; }
        .dark .card-title-v3 { color: white; }
        
        .card-progress-v3 { margin-bottom: 20px; }
        .progress-info-v3 { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 8px; }
        .progress-track-v3 { height: 6px; background: #F1F5F9; border-radius: 10px; overflow: hidden; }
        .dark .progress-track-v3 { background: #334155; }
        .progress-fill-v3 { height: 100%; border-radius: 10px; transition: 0.5s ease-out; }
        
        .card-footer-v3 { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 16px; }
        .dark .card-footer-v3 { border-top-color: #334155; }
        
        .card-meta-v3 { display: flex; gap: 12px; }
        .meta-item { display: flex; align-items: center; gap: 4px; color: #94A3B8; font-size: 12px; font-weight: 700; }
        
        .custom-dropdown-container { position: relative; }
        .status-selector-minimal { background: transparent; border: 1px solid #E2E8F0; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; color: #64748B; display: flex; align-items: center; gap: 4px; cursor: pointer; transition: 0.2s; }
        .dark .status-selector-minimal { border-color: #334155; }
        .status-selector-minimal:hover { background: #F1F5F9; color: #1E293B; }
        .dark .status-selector-minimal:hover { background: #334155; color: white; }
        
        .custom-dropdown-menu { position: absolute; top: calc(100% + 4px); right: 0; background: white; border: 1px solid #F1F5F9; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); padding: 8px; z-index: 50; min-width: 140px; display: flex; flex-direction: column; gap: 4px; }
        .dark .custom-dropdown-menu { background: #1E293B; border-color: #334155; }
        .dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; background: transparent; border: none; padding: 8px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; transition: 0.2s; text-align: left; }
        .dark .dropdown-item { color: #CBD5E1; }
        .dropdown-item:hover { background: #F8FAFB; color: #1E293B; }
        .dark .dropdown-item:hover { background: #0F172A; color: white; }
        .dropdown-item.active { background: #F1F5F9; color: #1E293B; }
        .dark .dropdown-item.active { background: #334155; color: white; }
        .dropdown-item .dot { width: 8px; height: 8px; border-radius: 50%; }
        .check-icon { margin-left: auto; color: #10B981; }

        .btn-col-more { background: transparent; border: none; color: #94A3B8; cursor: pointer; padding: 4px; border-radius: 6px; transition: 0.2s; }
        .btn-col-more:hover { background: white; color: #1E293B; }
        .dark .btn-col-more:hover { background: #334155; color: white; }
      `}</style>
        </div>
    );
};

export default EmployeeTasks;
