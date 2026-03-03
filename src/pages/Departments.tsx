import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Building, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const Departments: React.FC = () => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDepName, setNewDepName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const fetchDepartments = async () => {
        console.log('[Departments] Fetching departments...');
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name');

            console.log('[Departments] Fetch result:', { data_len: data?.length, error });

            if (error) throw error;
            setDepartments(data || []);
        } catch (err: any) {
            console.error('[Departments] Fetch error:', err);
            setError(err.message);
        } finally {
            console.log('[Departments] Setting loading to false');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepName.trim()) return;
        setCreating(true);
        setError(null);
        setSuccess(null);
        try {
            const { error } = await supabase
                .from('departments')
                .insert([{ name: newDepName.trim() }]);
            if (error) throw error;
            setNewDepName('');
            setSuccess('Department created successfully!');
            fetchDepartments();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this department?')) return;
        try {
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchDepartments();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="departments-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Departments</h1>
                    <p className="page-subtitle">Manage company departments and organization structure</p>
                </div>
            </div>

            <div className="departments-grid">
                <div className="add-dep-card card">
                    <div className="card-header primary">
                        <Plus size={20} />
                        <h3>Create New Department</h3>
                    </div>
                    <form onSubmit={handleCreate} className="card-body">
                        <div className="form-group">
                            <label>Department Name</label>
                            <input
                                type="text"
                                value={newDepName}
                                onChange={(e) => setNewDepName(e.target.value)}
                                placeholder="Enter department name..."
                                className="edit-input-v2"
                            />
                            <p className="input-hint">e.g. Engineering, Product Design, Marketing</p>
                        </div>
                        {error && <div className="alert-v2 error"><AlertCircle size={16} /> {error}</div>}
                        {success && <div className="alert-v2 success"><CheckCircle2 size={16} /> {success}</div>}
                        <button type="submit" className="btn-primary-v2 w-full" disabled={creating || !newDepName.trim()}>
                            {creating ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <Plus size={18} />
                                    <span>Create Department</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="list-card card">
                    <div className="card-header">
                        <Building size={20} />
                        <h3>Existing Departments</h3>
                    </div>
                    <div className="card-body">
                        {loading ? (
                            <div className="loading-state">
                                <Loader2 className="animate-spin" size={32} />
                                <p>Loading departments...</p>
                            </div>
                        ) : departments.length === 0 ? (
                            <div className="empty-state">
                                <Building size={48} />
                                <p>No departments found. Create your first one!</p>
                            </div>
                        ) : (
                            <div className="dep-list">
                                {departments.map((dep) => (
                                    <div key={dep.id} className="dep-item">
                                        <div className="dep-info">
                                            <div className="dep-icon"><Building size={16} /></div>
                                            <span className="dep-name">{dep.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(dep.id)}
                                            className="delete-btn"
                                            title="Delete Department"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .departments-page {
                    padding: 32px;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .departments-grid {
                    display: grid;
                    grid-template-columns: 400px 1fr;
                    gap: 32px;
                    margin-top: 32px;
                }

                .card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 24px;
                    overflow: hidden;
                }

                .card-header {
                    padding: 20px 24px;
                    background: rgba(var(--color-primary-rgb), 0.05);
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: var(--color-primary);
                }
                .card-header.primary {
                    background: var(--color-primary);
                    color: white;
                }
                .card-header.primary svg { color: white; }

                .card-header h3 {
                    font-size: 16px;
                    font-weight: 700;
                    margin: 0;
                }

                .card-body {
                    padding: 24px;
                }

                .dep-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .dep-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: var(--bg-block);
                    border-radius: 16px;
                    border: 1px solid var(--border-color);
                    transition: all 0.2s ease;
                }

                .dep-item:hover {
                    border-color: var(--color-primary);
                    background: var(--bg-card);
                    transform: translateX(4px);
                    box-shadow: var(--shadow-sm);
                }

                .dep-info { display: flex; align-items: center; gap: 16px; }
                .dep-icon {
                    width: 40px;
                    height: 40px;
                    background: var(--bg-card);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--color-primary);
                    border: 1px solid var(--border-color);
                }

                .dep-name { font-weight: 700; color: var(--text-primary); font-size: 15px; }

                .delete-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    border: none;
                    background: transparent;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .alert-v2 {
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 20px;
                }
                .alert-v2.error { background: rgba(255, 75, 75, 0.1); color: #FF4B4B; }
                .alert-v2.success { background: rgba(0, 191, 165, 0.1); color: #00BFA5; }

                .loading-state, .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 48px;
                    color: var(--text-muted);
                    gap: 16px;
                }

                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                .edit-input-v2 {
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-block);
                    color: var(--text-primary);
                    font-size: 14px;
                    transition: all 0.2s ease;
                    outline: none;
                }
                .edit-input-v2:focus {
                    border-color: var(--color-primary);
                    background: var(--bg-card);
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 20px;
                }
                .form-group label {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .input-hint {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                .btn-primary-v2 {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 14px;
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .btn-primary-v2:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(110, 64, 255, 0.2);
                }
                .btn-primary-v2:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .w-full { width: 100%; }
            `}</style>
        </div>
    );
};

export default Departments;
