import React, { useState, useEffect, useCallback } from 'react';
import {
    Folder,
    File,
    Upload,
    Plus,
    Download,
    Trash2,
    ChevronRight,
    Search,
    Grid,
    List,
    Loader2,
    FileText,
    Image as ImageIcon,
    Video,
    Music,
    Archive
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FileItem {
    id: string;
    name: string;
    storage_path: string;
    size: number;
    mime_type: string;
    is_folder: boolean;
    parent_id: string | null;
    created_at: string;
    updated_at: string;
}

const FileManager: React.FC = () => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null, name: string }[]>([{ id: null, name: 'Root' }]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [draggingFile, setDraggingFile] = useState<FileItem | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('file_manager_files')
                .select('*')
                .order('is_folder', { ascending: false })
                .order('name', { ascending: true });

            if (currentFolder) {
                query = query.eq('parent_id', currentFolder);
            } else {
                query = query.is('parent_id', null);
            }

            const { data, error } = await query;
            if (error) throw error;
            setFiles(data || []);
        } catch (error: any) {
            console.error('Error fetching files:', error.message);
        } finally {
            setLoading(false);
        }
    }, [currentFolder]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                const fileName = `${Date.now()}-${file.name}`;
                const filePath = currentFolder ? `${currentFolder}/${fileName}` : fileName;

                // 1. Upload to Storage
                const { error: uploadError } = await supabase.storage
                    .from('file-manager')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // 2. Insert into Database
                const { error: dbError } = await supabase
                    .from('file_manager_files')
                    .insert({
                        name: file.name,
                        storage_path: filePath,
                        size: file.size,
                        mime_type: file.type,
                        is_folder: false,
                        parent_id: currentFolder,
                        uploaded_by: user.id
                    });

                if (dbError) throw dbError;
            }
            fetchFiles();
        } catch (error: any) {
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const createFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('file_manager_files')
                .insert({
                    name: newFolderName,
                    storage_path: currentFolder ? `${currentFolder}/${newFolderName}` : newFolderName,
                    size: 0,
                    is_folder: true,
                    parent_id: currentFolder,
                    uploaded_by: user?.id
                });

            if (error) throw error;
            setNewFolderName('');
            setShowNewFolderModal(false);
            fetchFiles();
        } catch (error: any) {
            alert('Failed to create folder: ' + error.message);
        }
    };

    const handleFileClick = async (file: FileItem) => {
        if (file.is_folder) {
            setCurrentFolder(file.id);
            setBreadcrumbs([...breadcrumbs, { id: file.id, name: file.name }]);
        } else {
            setLoading(true);
            try {
                const { data } = supabase.storage
                    .from('file-manager')
                    .getPublicUrl(file.storage_path);

                if (data.publicUrl) {
                    setPreviewUrl(data.publicUrl);
                    setPreviewFile(file);
                }
            } catch (err) {
                console.error("Preview error:", err);
            } finally {
                setLoading(false);
            }
        }
    };

    const deleteItem = async (item: FileItem) => {
        if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

        try {
            if (!item.is_folder) {
                const { error: storageError } = await supabase.storage
                    .from('file-manager')
                    .remove([item.storage_path]);
                if (storageError) throw storageError;
            }

            const { error: dbError } = await supabase
                .from('file_manager_files')
                .delete()
                .eq('id', item.id);

            if (dbError) throw dbError;
            fetchFiles();
        } catch (error: any) {
            alert('Delete failed: ' + error.message);
        }
    };

    const downloadFile = async (item: FileItem) => {
        try {
            const { data, error } = await supabase.storage
                .from('file-manager')
                .download(item.storage_path);

            if (error) throw error;
            const url = window.URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = item.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            alert('Download failed: ' + error.message);
        }
    };

    const navigateBack = (index: number) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        setCurrentFolder(newBreadcrumbs[newBreadcrumbs.length - 1].id);
    };

    const handleDragStart = (file: FileItem) => {
        setDraggingFile(file);
    };

    const handleDragOver = (e: React.DragEvent, item: FileItem) => {
        if (!item.is_folder) return;
        e.preventDefault();
        setDragOverFolderId(item.id);
    };

    const handleDragLeave = () => {
        setDragOverFolderId(null);
    };

    const handleDrop = async (e: React.DragEvent, targetFolder: FileItem) => {
        e.preventDefault();
        setDragOverFolderId(null);
        if (!draggingFile || !targetFolder.is_folder || draggingFile.id === targetFolder.id) return;

        try {
            const { error } = await supabase
                .from('file_manager_files')
                .update({ parent_id: targetFolder.id })
                .eq('id', draggingFile.id);

            if (error) throw error;
            fetchFiles();
        } catch (error: any) {
            alert('Failed to move file: ' + error.message);
        } finally {
            setDraggingFile(null);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (mimeType: string, isFolder: boolean) => {
        if (isFolder) return <Folder className="icon-folder" size={24} />;
        if (mimeType?.startsWith('image/')) return <ImageIcon className="icon-image" size={24} />;
        if (mimeType?.startsWith('video/')) return <Video className="icon-video" size={24} />;
        if (mimeType?.startsWith('audio/')) return <Music className="icon-audio" size={24} />;
        if (mimeType === 'application/pdf') return <FileText className="icon-pdf" size={24} />;
        if (mimeType?.includes('zip') || mimeType?.includes('tar')) return <Archive className="icon-archive" size={24} />;
        return <File className="icon-file" size={24} />;
    };

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="file-manager">
            <header className="fm-header">
                <div className="fm-header-left">
                    <h1>File Manager</h1>
                    <div className="fm-breadcrumbs">
                        {breadcrumbs.map((bc, index) => (
                            <React.Fragment key={bc.id || 'root'}>
                                <button onClick={() => navigateBack(index)} className="bc-item">
                                    {bc.name}
                                </button>
                                {index < breadcrumbs.length - 1 && <ChevronRight size={14} className="bc-sep" />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                <div className="fm-header-actions">
                    <div className="fm-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="fm-btn secondary" onClick={() => setShowNewFolderModal(true)}>
                        <Plus size={18} />
                        <span>New Folder</span>
                    </button>
                    <label className="fm-btn primary">
                        <Upload size={18} />
                        <span>Upload</span>
                        <input type="file" multiple hidden onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            </header>

            <div className="fm-toolbar">
                <div className="fm-stats">
                    <span>{files.length} items</span>
                </div>
                <div className="fm-view-toggles">
                    <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
                        <Grid size={18} />
                    </button>
                    <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                        <List size={18} />
                    </button>
                </div>
            </div>

            <main className={`fm-content ${viewMode}`}>
                {loading ? (
                    <div className="fm-loading">
                        <Loader2 className="animate-spin" size={40} />
                        <p>Loading files...</p>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="fm-empty">
                        <Folder size={64} />
                        <p>{searchQuery ? 'No items match your search' : 'This folder is empty'}</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="fm-grid">
                        {filteredFiles.map(file => (
                            <div
                                key={file.id}
                                className={`fm-item grid glass ${draggingFile?.id === file.id ? 'dragging' : ''} ${dragOverFolderId === file.id ? 'drag-over' : ''}`}
                                onClick={() => handleFileClick(file)}
                                draggable
                                onDragStart={() => handleDragStart(file)}
                                onDragEnd={() => setDraggingFile(null)}
                                onDragOver={(e) => handleDragOver(e, file)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, file)}
                            >
                                <div className="fm-item-icon">
                                    {getFileIcon(file.mime_type, file.is_folder)}
                                </div>
                                <div className="fm-item-info">
                                    <span className="name" title={file.name}>{file.name}</span>
                                    <span className="meta">{file.is_folder ? 'Folder' : formatSize(file.size)}</span>
                                </div>
                                <div className="fm-item-actions">
                                    {!file.is_folder && (
                                        <button onClick={(e) => { e.stopPropagation(); downloadFile(file); }} title="Download"><Download size={16} /></button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); deleteItem(file); }} className="delete" title="Delete"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <table className="fm-list">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Size</th>
                                <th>Type</th>
                                <th>Modified</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFiles.map(file => (
                                <tr
                                    key={file.id}
                                    className={`fm-item-row ${dragOverFolderId === file.id ? 'drag-over' : ''}`}
                                    onClick={() => handleFileClick(file)}
                                    draggable
                                    onDragStart={() => handleDragStart(file)}
                                    onDragEnd={() => setDraggingFile(null)}
                                    onDragOver={(e) => handleDragOver(e, file)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, file)}
                                >
                                    <td>
                                        <div className="fm-name-cell">
                                            {getFileIcon(file.mime_type, file.is_folder)}
                                            <span>{file.name}</span>
                                        </div>
                                    </td>
                                    <td>{file.is_folder ? '--' : formatSize(file.size)}</td>
                                    <td>{file.is_folder ? 'Folder' : file.mime_type?.split('/').pop() || 'File'}</td>
                                    <td>{new Date(file.updated_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="fm-row-actions">
                                            {!file.is_folder && (
                                                <button onClick={(e) => { e.stopPropagation(); downloadFile(file); }}><Download size={16} /></button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); deleteItem(file); }} className="delete"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </main>

            {/* File Preview Modal */}
            {previewFile && previewUrl && (
                <div className="fm-modal-overlay" onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}>
                    <div className="fm-preview-container" onClick={e => e.stopPropagation()}>
                        <div className="fm-preview-content">
                            {previewFile.mime_type.startsWith('image/') ? (
                                <img src={previewUrl} alt={previewFile.name} />
                            ) : previewFile.mime_type === 'application/pdf' ? (
                                <iframe src={previewUrl} title={previewFile.name} />
                            ) : (
                                <div className="fm-no-preview">
                                    <File size={64} />
                                    <p>No preview available for this file type</p>
                                </div>
                            )}
                        </div>
                        <div className="fm-preview-sidebar">
                            <div className="sidebar-header">
                                <h3>File Details</h3>
                                <button className="close-btn" onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
                            </div>
                            <div className="sidebar-info">
                                <div className="info-group">
                                    <label>Name</label>
                                    <span>{previewFile.name}</span>
                                </div>
                                <div className="info-group">
                                    <label>Type</label>
                                    <span>{previewFile.mime_type}</span>
                                </div>
                                <div className="info-group">
                                    <label>Size</label>
                                    <span>{(previewFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                                <div className="info-group">
                                    <label>Modified</label>
                                    <span>{new Date(previewFile.updated_at).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="sidebar-actions">
                                <button className="fm-btn primary" onClick={() => downloadFile(previewFile)}>
                                    <Download size={16} /> Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* New Folder Modal */}
            {showNewFolderModal && (
                <div className="fm-modal-overlay" onClick={() => setShowNewFolderModal(false)}>
                    <div className="fm-modal glass" onClick={e => e.stopPropagation()}>
                        <h3>Create New Folder</h3>
                        <input
                            type="text"
                            placeholder="Folder Name"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                        />
                        <div className="fm-modal-actions">
                            <button className="fm-btn secondary" onClick={() => setShowNewFolderModal(false)}>Cancel</button>
                            <button className="fm-btn primary" onClick={createFolder}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {uploading && (
                <div className="fm-upload-indicator">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Uploading files...</span>
                </div>
            )}

            <style>{`
                .file-manager {
                    animation: fadeIn 0.4s ease-out;
                    color: var(--text-primary);
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .fm-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 32px;
                }

                .fm-header h1 {
                    font-size: 28px;
                    font-weight: 800;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.5px;
                }

                .fm-breadcrumbs {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-muted);
                    font-size: 14px;
                }

                .bc-item {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font-weight: 600;
                    padding: 4px 8px;
                    border-radius: 6px;
                    transition: 0.2s;
                }

                .bc-item:hover {
                    color: var(--color-primary);
                    background: var(--color-primary-light);
                }

                .bc-item:last-child {
                    color: var(--text-primary);
                    cursor: default;
                }

                .bc-item:last-child:hover {
                    background: none;
                }

                .fm-header-actions {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .fm-search {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                    border-radius: 12px;
                    padding: 0 16px;
                    height: 44px;
                    width: 260px;
                }

                .fm-search input {
                    background: none;
                    border: none;
                    outline: none;
                    flex: 1;
                    font-size: 14px;
                    font-family: inherit;
                    color: var(--text-primary);
                }

                .fm-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0 20px;
                    height: 44px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: 0.2s;
                    border: none;
                    white-space: nowrap;
                }

                .fm-btn.primary {
                    background: var(--color-primary);
                    color: white;
                    box-shadow: 0 4px 12px rgba(110,64,255,0.2);
                }

                .fm-btn.primary:hover {
                    background: #5c32e5;
                    transform: translateY(-2px);
                }

                .fm-btn.secondary {
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                    color: var(--text-secondary);
                }

                .fm-btn.secondary:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                }

                .fm-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding: 12px 0;
                    border-bottom: 1px solid var(--border-color);
                }

                .fm-stats {
                    font-size: 14px;
                    color: var(--text-muted);
                    font-weight: 600;
                }

                .fm-view-toggles {
                    display: flex;
                    background: var(--bg-card);
                    padding: 4px;
                    border-radius: 10px;
                    border: 1.5px solid var(--border-color);
                }

                .fm-view-toggles button {
                    background: none;
                    border: none;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: 0.2s;
                }

                .fm-view-toggles button.active {
                    background: var(--color-primary);
                    color: white;
                    box-shadow: 0 4px 8px rgba(110,64,255,0.2);
                }

                .fm-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 20px;
                }

                .fm-item.grid {
                    padding: 24px;
                    border-radius: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 16px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }

                .fm-item.grid:hover {
                    transform: translateY(-4px);
                    border-color: var(--color-primary);
                    background: rgba(var(--color-primary-rgb), 0.05);
                }

                .fm-item.grid.drag-over {
                    background: rgba(var(--color-primary-rgb), 0.1);
                    border-color: var(--color-primary);
                    transform: scale(1.05);
                }

                .fm-item-icon {
                    width: 64px;
                    height: 64px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-main);
                    border-radius: 16px;
                    color: var(--color-primary);
                }

                .icon-folder { color: #FFB300; fill: rgba(255, 179, 0, 0.1); }
                .icon-image { color: #00BFA5; }
                .icon-video { color: #FF5252; }
                .icon-pdf { color: #E53935; }
                .icon-archive { color: #7E57C2; }

                .fm-item-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    width: 100%;
                }

                .fm-item-info .name {
                    font-weight: 700;
                    font-size: 14px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .fm-item-info .meta {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .fm-item-actions {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    display: flex;
                    gap: 4px;
                    opacity: 0;
                    transition: 0.2s;
                }

                .fm-item.grid:hover .fm-item-actions {
                    opacity: 1;
                }

                .fm-item-actions button {
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: 0.2s;
                }

                .fm-item-actions button:hover {
                    color: var(--color-primary);
                    border-color: var(--color-primary);
                }

                .fm-item-actions button.delete:hover {
                    color: #FF5252;
                    border-color: #FF5252;
                }

                .fm-list {
                    width: 100%;
                    border-collapse: collapse;
                }

                .fm-list th {
                    text-align: left;
                    padding: 12px 16px;
                    font-size: 12px;
                    text-transform: uppercase;
                    color: var(--text-muted);
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }

                .fm-item-row {
                    transition: 0.2s;
                    cursor: pointer;
                }

                .fm-item-row:hover {
                    background: var(--bg-card);
                }

                .fm-item-row.drag-over {
                    background: rgba(var(--color-primary-rgb), 0.1);
                    color: var(--color-primary);
                }

                .fm-item-row td {
                    padding: 14px 16px;
                    border-bottom: 1px solid var(--border-color);
                    font-size: 14px;
                    font-weight: 600;
                }

                .fm-name-cell {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .fm-row-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }

                .fm-row-actions button {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: 0.2s;
                    padding: 4px;
                }

                .fm-row-actions button:hover {
                    color: var(--color-primary);
                }

                .fm-row-actions button.delete:hover {
                    color: #FF5252;
                }

                .fm-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(9, 9, 11, 0.7);
                    backdrop-filter: blur(15px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .fm-modal {
                    width: 100%;
                    max-width: 400px;
                    padding: 32px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    box-shadow: var(--shadow-lg);
                }

                .fm-modal h3 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 800;
                }

                .fm-modal input {
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                    padding: 12px 16px;
                    border-radius: 12px;
                    outline: none;
                    font-size: 15px;
                    color: var(--text-primary);
                }

                .fm-modal input:focus {
                    border-color: var(--color-primary);
                }

                .fm-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .fm-loading, .fm-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 100px;
                    color: var(--text-muted);
                    gap: 16px;
                }

                .fm-loading p, .fm-empty p {
                    font-weight: 600;
                }

                .fm-upload-indicator {
                    position: fixed;
                    bottom: 32px;
                    right: 32px;
                    background: var(--color-primary);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 99px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 10px 30px rgba(110,64,255,0.3);
                    z-index: 100;
                    font-weight: 700;
                    animation: slideUp 0.3s ease-out;
                }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                [draggable="true"] {
                    cursor: grab;
                }

                .fm-preview-container {
                    width: 90vw;
                    height: 85vh;
                    background: var(--bg-card);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--border-color);
                    border-radius: 24px;
                    display: flex;
                    overflow: hidden;
                    box-shadow: 0 50px 100px rgba(0,0,0,0.4);
                }

                .fm-preview-content {
                    flex: 1;
                    background: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .fm-preview-content img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }

                .fm-preview-content iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                    background: white;
                }

                .fm-preview-sidebar {
                    width: 320px;
                    background: var(--bg-card);
                    border-left: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                }

                .fm-preview-sidebar .sidebar-header {
                    padding: 24px;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .fm-preview-sidebar .sidebar-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 800;
                }

                .fm-preview-sidebar .sidebar-info {
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    flex: 1;
                }

                .fm-preview-sidebar .info-group label {
                    display: block;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: var(--text-muted);
                    margin-bottom: 6px;
                    letter-spacing: 0.5px;
                }

                .fm-preview-sidebar .info-group span {
                    font-size: 14px;
                    font-weight: 600;
                    word-break: break-all;
                }

                .fm-preview-sidebar .sidebar-actions {
                    padding: 24px;
                    border-top: 1px solid var(--border-color);
                }

                .fm-preview-sidebar .sidebar-actions button {
                    width: 100%;
                    justify-content: center;
                }

                .fm-no-preview {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    color: #52525b;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    display: flex;
                    padding: 4px;
                }
            `}</style>
        </div>
    );
};

export default FileManager;
