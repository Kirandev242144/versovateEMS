import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  Inbox as InboxIcon,
  Send,
  Archive,
  Star,
  Trash2,
  MoreVertical,
  ArrowLeft,
  RotateCcw,
  Tag,
  Filter,
  X,
  Reply,
  CheckCircle2,
  Paperclip,
  Smile,
  ImageIcon,
  Maximize2,
  Forward
} from 'lucide-react';
import { useInbox } from '../hooks/useInbox';

// Avatar Helper: Professional UI-Avatars or Initial-based
const getAvatarUrl = (name: string) => {
  if (!name || name === 'System') return `https://ui-avatars.com/api/?name=S&background=1a1a1a&color=fff&bold=true`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true&rounded=true`;
};

// Component to render HTML email content safely in an iframe
const HTMLRenderer: React.FC<{ html: string }> = ({ html }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; }
                img { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>${html}</body>
          </html>
        `);
        doc.close();
      }
    }
  }, [html]);

  // Adjust iframe height dynamically
  const onLoad = () => {
    if (iframeRef.current) {
      iframeRef.current.style.height = (iframeRef.current.contentWindow?.document.body.scrollHeight || 400) + 'px';
    }
  };

  return (
    <iframe
      ref={iframeRef}
      onLoad={onLoad}
      title="Email Content"
      className="ibx-html-iframe"
      style={{ width: '100%', border: 'none', minHeight: '400px' }}
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
    />
  );
};

// Native Date Formatting Helper
const formatDate = (dateStr: string, style: 'short' | 'full' = 'full') => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Just now';

  if (style === 'short') {
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    if (isToday) {
      return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
    }
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

const Inbox: React.FC = () => {
  const {
    threads,
    activeTab,
    setActiveTab,
    selectedLabelId,
    setSelectedLabelId,
    labels,
    isLoading,
    isRefreshing,
    unreadCount,
    createLabel,
    deleteLabel,
    addMessageLabel,
    removeMessageLabel,
    archiveThread,
    deleteThread,
    markAsRead,
    sendReply,
    composeMessage
  } = useInbox();

  // Local state for UI
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#00D1B2');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [isReplyExpanded, setIsReplyExpanded] = useState(false);
  const [activeLabelMenu, setActiveLabelMenu] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Derived data
  const selectedThread = useMemo(() =>
    threads.find(t => t.id === selectedThreadId),
    [threads, selectedThreadId]
  );

  const filteredThreads = useMemo(() => {
    return threads.filter(t =>
      t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.messages?.some(m => m.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [threads, searchQuery]);

  // Mark as read when selecting
  useEffect(() => {
    if (selectedThreadId) {
      const thread = threads.find(t => t.id === selectedThreadId);
      if (thread && thread.messages?.some(m => !m.is_read && !m.is_sent)) {
        markAsRead(selectedThreadId);
      }
    }
  }, [selectedThreadId, markAsRead, threads]);

  // Handle auto-scroll to bottom of thread
  useEffect(() => {
    if (selectedThreadId && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedThreadId, selectedThread?.messages?.length]);

  // Handlers
  const handleSelectThread = (id: string) => {
    setSelectedThreadId(id);
    setIsReplyExpanded(false);
    setReplyBody('');
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    await createLabel(newLabelName, newLabelColor);
    setNewLabelName('');
    setIsAddingLabel(false);
  };

  const handleSendCompose = async () => {
    if (!composeTo.trim() || !composeBody.trim()) return;
    const success = await composeMessage(composeTo, composeSubject, composeBody);
    if (success) {
      setIsComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    }
  };

  const handleSendReply = async () => {
    if (!selectedThreadId || !replyBody.trim()) return;
    setIsReplying(true);
    const success = await sendReply(selectedThreadId, replyBody);
    setIsReplying(false);
    if (success) {
      setReplyBody('');
      setIsReplyExpanded(false);
    }
  };

  const handleForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedThread || !selectedThread.messages?.length) return;
    const lastMsg = selectedThread.messages[selectedThread.messages.length - 1];

    setComposeSubject(`Fwd: ${selectedThread.subject}`);
    setComposeTo('');
    setComposeBody(`\n\n---------- Forwarded message ----------\nFrom: ${lastMsg.sender_name} <${lastMsg.sender_email}>\nDate: ${formatDate(lastMsg.created_at)}\nSubject: ${selectedThread.subject}\n\n${lastMsg.body_text}`);
    setIsComposeOpen(true);
  };

  const handleDeleteLabel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this label? Messages will stay, but the label will be removed.')) {
      await deleteLabel(id);
      if (selectedLabelId === id) setSelectedLabelId(null);
    }
  };

  const toggleLabel = async (threadId: string, labelId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread || !thread.messages?.length) return;

    const hasLabel = thread.labels?.some(l => l.id === labelId);
    if (hasLabel) {
      await removeMessageLabel(thread.messages[0].id, labelId);
    } else {
      await addMessageLabel(thread.messages[0].id, labelId);
    }
  };

  const handleArchive = async (e?: React.MouseEvent, id?: string) => {
    e?.stopPropagation();
    const targetId = id || selectedThreadId;
    if (targetId) {
      await archiveThread(targetId, activeTab !== 'archive');
      if (!id) setSelectedThreadId(null);
    }
  };

  const handleDelete = async (e?: React.MouseEvent, id?: string) => {
    e?.stopPropagation();
    const targetId = id || selectedThreadId;
    if (targetId) {
      await deleteThread(targetId, activeTab !== 'trash');
      if (!id) setSelectedThreadId(null);
    }
  };

  return (
    <div className="ibx-page">
      {isRefreshing && <div className="ibx-loader-bar" />}

      <main className="ibx-main">
        {/* Sidebar */}
        <aside className="ibx-sidebar">
          <button className="ibx-btn-compose" onClick={() => { setComposeTo(''); setComposeBody(''); setComposeSubject(''); setIsComposeOpen(true); }}>
            <Plus size={20} />
            <span>Compose</span>
          </button>

          <nav className="ibx-nav">
            <div className="ibx-nav-group">
              <button
                className={`ibx-nav-item ${activeTab === 'inbox' && !selectedLabelId ? 'ibx-active' : ''}`}
                onClick={() => { setActiveTab('inbox'); setSelectedLabelId(null); }}
              >
                <InboxIcon size={18} />
                <span>Inbox</span>
                {unreadCount > 0 && <span className="ibx-badge">{unreadCount}</span>}
              </button>
              <button
                className={`ibx-nav-item ${activeTab === 'sent' ? 'ibx-active' : ''}`}
                onClick={() => { setActiveTab('sent'); setSelectedLabelId(null); }}
              >
                <Send size={18} />
                <span>Sent</span>
              </button>
              <button
                className={`ibx-nav-item ${activeTab === 'archive' ? 'ibx-active' : ''}`}
                onClick={() => { setActiveTab('archive'); setSelectedLabelId(null); }}
              >
                <Archive size={18} />
                <span>Archive</span>
              </button>
              <button
                className={`ibx-nav-item ${activeTab === 'trash' ? 'ibx-active' : ''}`}
                onClick={() => { setActiveTab('trash'); setSelectedLabelId(null); }}
              >
                <Trash2 size={18} />
                <span>Trash</span>
              </button>
            </div>

            <div className="ibx-nav-group">
              <div className="ibx-group-header">
                <h3>Labels</h3>
                <button className="ibx-btn-add" onClick={() => setIsAddingLabel(true)} title="New Label"><Plus size={14} /></button>
              </div>
              <div className="ibx-nav-scroll">
                {labels.map(l => (
                  <button
                    key={l.id}
                    className={`ibx-nav-item ${selectedLabelId === l.id ? 'ibx-active' : ''}`}
                    onClick={() => { setSelectedLabelId(l.id); setActiveTab('inbox'); }}
                  >
                    <Tag size={16} style={{ color: l.color }} />
                    <span>{l.name}</span>
                    <Trash2 size={13} className="ibx-item-delete" onClick={(e) => handleDeleteLabel(e, l.id)} />
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        {/* List Pane */}
        <section className="ibx-list">
          <header className="ibx-list-header">
            <div className="ibx-header-controls">
              <div className="ibx-search">
                <Search size={18} className="ibx-search-icon" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="ibx-btn-filter"><Filter size={18} /></button>
            </div>
          </header>

          <div className="ibx-list-content">
            {isLoading && !isRefreshing ? (
              <div className="ibx-sk-container">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="ibx-sk-item">
                    <div className="ibx-sk-circle" />
                    <div className="ibx-sk-right"><div className="ibx-sk-bar" /><div className="ibx-sk-bar sm" /></div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="ibx-empty">
                <div className="ibx-empty-icon"><CheckCircle2 size={48} /></div>
                <h3>All caught up</h3>
                <p>Enjoy your zero inbox day.</p>
              </div>
            ) : (
              filteredThreads.map(t => {
                const lastMsg = t.messages?.[t.messages.length - 1];
                const senderName = lastMsg?.sender_name || 'System';

                return (
                  <div
                    key={t.id}
                    className={`ibx-thread ${selectedThreadId === t.id ? 'ibx-sel' : ''}`}
                    onClick={() => handleSelectThread(t.id)}
                  >
                    <div className="ibx-thread-avatar">
                      <img src={getAvatarUrl(senderName)} alt="" />
                      {t.messages?.some(m => !m.is_read && !m.is_sent) && <div className="ibx-unread-dot" />}
                    </div>
                    <div className="ibx-thread-body">
                      <div className="ibx-t-top">
                        <span className={`ibx-t-from ${t.messages?.some(m => !m.is_read && !m.is_sent) ? 'unread' : ''}`}>
                          {senderName}
                        </span>
                        <span className="ibx-t-date">{formatDate(t.last_message_at, 'short')}</span>
                      </div>
                      <div className={`ibx-t-subject ${t.messages?.some(m => !m.is_read && !m.is_sent) ? 'unread' : ''}`}>
                        {t.subject || '(No Subject)'}
                      </div>
                      <div className="ibx-t-snippet">{t.snippet}</div>
                    </div>
                    <div className="ibx-t-hover">
                      <button onClick={(e) => handleArchive(e, t.id)} title="Archive"><Archive size={16} /></button>
                      <button onClick={(e) => handleDelete(e, t.id)} title="Delete"><Trash2 size={16} /></button>
                      <button><Star size={16} /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Detail Pane */}
        <section className="ibx-detail">
          {selectedThread ? (
            <div className="ibx-detail-wrapper">
              <header className="ibx-detail-header">
                <div className="ibx-dh-top">
                  <div className="ibx-dh-actions">
                    <button onClick={() => setSelectedThreadId(null)} className="ibx-btn-back"><ArrowLeft size={18} /></button>
                    <div className="ibx-sep" />
                    <button onClick={() => handleArchive()} title={activeTab === 'archive' ? "Move to Inbox" : "Archive"}>
                      {activeTab === 'archive' ? <RotateCcw size={18} /> : <Archive size={18} />}
                    </button>
                    <button onClick={() => handleDelete()} title={activeTab === 'trash' ? "Restore" : "Delete"}>
                      {activeTab === 'trash' ? <RotateCcw size={18} /> : <Trash2 size={18} />}
                    </button>
                    <button title="More"><MoreVertical size={18} /></button>
                  </div>
                  <div className="ibx-dh-right">
                    <button className="ibx-btn-action" onClick={() => setIsReplyExpanded(true)}>
                      <Reply size={16} /><span>Reply</span>
                    </button>
                    <button className="ibx-btn-action" onClick={handleForward}>
                      <Forward size={16} /><span>Forward</span>
                    </button>
                    <div className="ibx-label-trigger-container">
                      <button className="ibx-btn-tag" onClick={() => setActiveLabelMenu(activeLabelMenu === selectedThread.id ? null : selectedThread.id)}>
                        <Tag size={18} />
                      </button>
                      {activeLabelMenu === selectedThread.id && (
                        <div className="ibx-menu-glass">
                          <header>Apply Label</header>
                          <div className="ibx-menu-list">
                            {labels.map(l => (
                              <button key={l.id} className={`ibx-menu-item ${selectedThread.labels?.some(sl => sl.id === l.id) ? 'active' : ''}`} onClick={() => toggleLabel(selectedThread.id, l.id)}>
                                <div className="ibx-menu-dot" style={{ backgroundColor: l.color }} />
                                <span>{l.name}</span>
                                {selectedThread.labels?.some(sl => sl.id === l.id) && <CheckCircle2 size={14} className="ibx-menu-check" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ibx-dh-main">
                  <h2 className="ibx-dh-subject">{selectedThread.subject || '(No Subject)'}</h2>
                  <div className="ibx-dh-labels">
                    {selectedThread.labels?.map(l => (
                      <span key={l.id} className="ibx-pill" style={{ borderColor: l.color, color: l.color }}>{l.name}</span>
                    ))}
                  </div>
                </div>
              </header>

              <div className="ibx-detail-body" ref={scrollRef}>
                <div className="ibx-thread-messages">
                  {selectedThread.messages?.map((msg, idx) => (
                    <div key={msg.id} className="ibx-msg-card">
                      <div className="ibx-msg-header">
                        <img className="ibx-msg-avatar" src={getAvatarUrl(msg.sender_name)} alt="" />
                        <div className="ibx-msg-meta">
                          <div className="ibx-msg-user">
                            <strong>{msg.sender_name}</strong>
                            <span className="ibx-msg-email">{`<${msg.sender_email}>`}</span>
                          </div>
                          <div className="ibx-msg-to">to {msg.to_email}</div>
                        </div>
                        <div className="ibx-msg-time">{formatDate(msg.created_at)}</div>
                      </div>
                      <div className="ibx-msg-content">
                        {msg.body_html ? (
                          <HTMLRenderer html={msg.body_html} />
                        ) : (
                          msg.body_text?.split('\n').map((line, i) => (
                            <p key={i}>{line || '\u00A0'}</p>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="ibx-thread-end" />
                </div>
              </div>

              <div className="ibx-detail-footer">
                {!isReplyExpanded ? (
                  <div className="ibx-reply-placeholder" onClick={() => setIsReplyExpanded(true)}>
                    <img className="ibx-reply-avatar" src={getAvatarUrl('User')} alt="" />
                    <div className="ibx-reply-fake-box">Reply to {selectedThread.messages?.[selectedThread.messages.length - 1]?.sender_name || 'System'}...</div>
                  </div>
                ) : (
                  <div className="ibx-reply-active">
                    <header className="ibx-ra-header">
                      <Reply size={14} />
                      <span>To: <strong>{selectedThread.messages?.[selectedThread.messages.length - 1]?.sender_email}</strong></span>
                      <div className="ibx-ra-actions">
                        <button title="Pop out"><Maximize2 size={14} /></button>
                        <button onClick={() => setIsReplyExpanded(false)}><X size={16} /></button>
                      </div>
                    </header>
                    <textarea
                      className="ibx-ra-input"
                      placeholder="Write your message..."
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      autoFocus
                    />
                    <footer className="ibx-ra-footer">
                      <div className="ibx-ra-toolbar">
                        <button><Paperclip size={18} /></button>
                        <button><Smile size={18} /></button>
                        <button><ImageIcon size={18} /></button>
                      </div>
                      <div className="ibx-ra-send">
                        <button className="ibx-btn-cancel" onClick={() => { setReplyBody(''); setIsReplyExpanded(false); }}>Discard</button>
                        <button className="ibx-btn-submit" onClick={handleSendReply} disabled={isReplying}>
                          {isReplying ? 'Sending...' : <><Send size={18} /><span>Send</span></>}
                        </button>
                      </div>
                    </footer>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="ibx-placeholder">
              <div className="ibx-ph-circle"><InboxIcon size={64} /></div>
              <h3>Select an email to read</h3>
              <p>Your workspace is ready. Click any item on the left to start.</p>
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      {isAddingLabel && (
        <div className="ibx-overlay">
          <div className="ibx-modal md-label">
            <header><h3>New Label</h3><button onClick={() => setIsAddingLabel(false)}><X size={20} /></button></header>
            <div className="ibx-modal-body">
              <div className="ibx-input-group">
                <label>LABEL NAME</label>
                <input type="text" placeholder="e.g. Invoices" value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} autoFocus />
              </div>
              <div className="ibx-input-group">
                <label>CHOOSE COLOR</label>
                <div className="ibx-color-row">
                  <input type="color" value={newLabelColor} onChange={(e) => setNewLabelColor(e.target.value)} />
                  <div className="ibx-color-tag" style={{ backgroundColor: newLabelColor }}>{newLabelColor.toUpperCase()}</div>
                </div>
              </div>
            </div>
            <footer>
              <button className="ibx-btn-cancel" onClick={() => setIsAddingLabel(false)}>Cancel</button>
              <button className="ibx-btn-done" onClick={handleCreateLabel}>Create Label</button>
            </footer>
          </div>
        </div>
      )}

      {isComposeOpen && (
        <div className="ibx-overlay">
          <div className="ibx-modal md-compose">
            <header><h3>New Message</h3><button onClick={() => setIsComposeOpen(false)}><X size={20} /></button></header>
            <div className="ibx-modal-body">
              <div className="ibx-comp-row"><span>To</span><input type="text" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="recipient@example.com" /></div>
              <div className="ibx-comp-row"><span>Subject</span><input type="text" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="No subject" /></div>
              <textarea placeholder="Write message..." value={composeBody} onChange={(e) => setComposeBody(e.target.value)} />
            </div>
            <footer>
              <button className="ibx-btn-done" onClick={handleSendCompose}><Send size={18} /><span>Send Email</span></button>
            </footer>
          </div>
        </div>
      )}

      <style>{`
      .ibx-page {height: 100vh; width: 100%; background: var(--bg-body); display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', system-ui; }
      .ibx-loader-bar {height: 3px; width: 100%; position: absolute; top: 0; background: var(--color-primary, #00D1B2); z-index: 1000; animation: ibx-move 2s infinite linear; }
      @keyframes ibx-move {0 % { transform: translateX(-100 %); } 100% {transform: translateX(100%); } }

      .ibx-main {display: flex; flex: 1; overflow: hidden; }

      /* Sidebar */
      .ibx-sidebar {width: 250px; background: var(--bg-card); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; padding: 24px 12px; gap: 24px; flex-shrink: 0; }
      .ibx-btn-compose {background: var(--color-primary, #00D1B2); color: #fff; border: none; padding: 14px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: var(--shadow-md); }
      .ibx-btn-compose:hover {transform: translateY(-2px); box-shadow: var(--shadow-lg); filter: brightness(1.1); }

      .ibx-nav {display: flex; flex-direction: column; gap: 32px; overflow-y: auto; }
      .ibx-nav-group {display: flex; flex-direction: column; gap: 4px; }
      .ibx-group-header {display: flex; justify-content: space-between; align-items: center; padding: 0 12px; margin-bottom: 8px; }
      .ibx-group-header h3 {font - size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 800; letter-spacing: 0.05em; }
      .ibx-btn-add {background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
      .ibx-btn-add:hover {color: var(--text-primary); }

      .ibx-nav-item {display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; color: var(--text-secondary); font-size: 14px; font-weight: 501; border: none; background: transparent; cursor: pointer; transition: 0.2s; position: relative; text-align: left; }
      .ibx-nav-item:hover {background: var(--bg-surface); color: var(--text-primary); }
      .ibx-nav-item.ibx-active {background: var(--bg-surface); color: var(--text-primary); font-weight: 700; }
      .ibx-nav-item.ibx-active::before {content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; background: var(--color-primary, #00D1B2); border-radius: 0 4px 4px 0; }
      .ibx-badge {margin - left: auto; background: var(--bg-surface); color: var(--text-primary); padding: 2px 8px; border-radius: 8px; font-size: 10px; font-weight: 800; border: 1px solid var(--border-color); }
      .ibx-item-delete {opacity: 0; transition: 0.2s; margin-left: auto; color: var(--text-muted); }
      .ibx-item-delete:hover {color: #FF4B4B; }
      .ibx-nav-item:hover .ibx-item-delete {opacity: 1; }

      /* List */
      .ibx-list {width: 360px; background: var(--bg-card); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; flex-shrink: 0; }
      .ibx-list-header {padding: 16px; border-bottom: 1px solid var(--border-color); }
      .ibx-header-controls {display: flex; gap: 10px; }
      .ibx-search {flex: 1; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 10px; display: flex; align-items: center; padding: 0 12px; gap: 10px; transition: 0.2s; }
      .ibx-search:focus-within {border - color: var(--color-primary, #00D1B2); }
      .ibx-search-icon {color: var(--text-muted); }
      .ibx-search input {border: none; background: transparent; height: 38px; font-size: 14px; outline: none; width: 100%; color: var(--text-primary); }
      .ibx-btn-filter {background: var(--bg-surface); border: 1px solid var(--border-color); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; transition: 0.2s; }
      .ibx-btn-filter:hover {background: var(--bg-card); color: var(--text-primary); }

      .ibx-list-content {flex: 1; overflow-y: auto; }
      .ibx-thread {display: flex; padding: 16px; gap: 12px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: 0.2s; position: relative; }
      .ibx-thread:hover {background: var(--bg-surface); }
      .ibx-thread.ibx-sel {background: rgba(0, 209, 178, 0.05); border-left: 3px solid var(--color-primary, #00D1B2); }
      .ibx-thread-avatar {position: relative; width: 48px; height: 48px; flex-shrink: 0; }
      .ibx-thread-avatar img {width: 100%; height: 100%; border-radius: 14px; background: var(--bg-surface); }
      .ibx-unread-dot {position: absolute; right: -2px; top: -2px; width: 10px; height: 10px; background: var(--color-primary, #00D1B2); border: 2px solid var(--bg-card); border-radius: 50%; }

      .ibx-thread-body {flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .ibx-t-top {display: flex; justify-content: space-between; align-items: center; }
      .ibx-t-from {font - size: 14px; font-weight: 501; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ibx-t-from.unread {font - weight: 800; color: var(--text-primary); }
      .ibx-t-date {font - size: 11px; color: var(--text-muted); font-weight: 501; }
      .ibx-t-subject {font - size: 14px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ibx-t-subject.unread {font - weight: 800; color: var(--text-primary); }
      .ibx-t-snippet {font - size: 12px; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

      .ibx-t-hover {position: absolute; right: 12px; top: 50%; translate: 0 -50%; display: flex; gap: 4px; opacity: 0; transition: 0.2s; background: var(--bg-card); padding: 4px; border-radius: 8px; box-shadow: var(--shadow-md); }
      .ibx-thread:hover .ibx-t-hover {opacity: 1; }
      .ibx-t-hover button {background: var(--bg-surface); border: 1px solid var(--border-color); width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; transition: 0.2s; }
      .ibx-t-hover button:hover {background: var(--text-primary); color: var(--bg-card); border-color: var(--text-primary); }

      /* Detail */
      .ibx-detail {flex: 1; background: var(--bg-body); display: flex; flex-direction: column; overflow: hidden; }
      .ibx-detail-wrapper {flex: 1; display: flex; flex-direction: column; overflow: hidden; height: 100%; }

      .ibx-detail-header {padding: 20px 32px; border-bottom: 1px solid var(--border-color); background: var(--bg-card); flex-shrink: 0; }
      .ibx-dh-top {display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
      .ibx-dh-actions {display: flex; align-items: center; gap: 8px; }
      .ibx-dh-actions button {background: var(--bg-surface); border: 1px solid var(--border-color); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; transition: 0.2s; }
      .ibx-dh-actions button:hover {background: var(--text-primary); color: var(--bg-card); border-color: var(--text-primary); }
      .ibx-sep {width: 1px; height: 20px; background: var(--border-color); margin: 0 4px; }

      .ibx-dh-right {display: flex; align-items: center; gap: 12px; }
      .ibx-btn-action {display: flex; align-items: center; gap: 8px; background: var(--bg-surface); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; color: var(--text-primary); cursor: pointer; transition: 0.2s; }
      .ibx-btn-action:hover {background: var(--border-color); }
      .ibx-btn-tag {background: var(--bg-surface); border: 1px solid var(--border-color); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; }
      .ibx-btn-tag:hover {color: var(--text-primary); border-color: var(--text-primary); }

      .ibx-dh-main {display: flex; flex-direction: column; gap: 8px; }
      .ibx-dh-subject {font - size: 22px; font-weight: 800; color: var(--text-primary); margin: 0; }
      .ibx-dh-labels {display: flex; gap: 6px; flex-wrap: wrap; }
      .ibx-pill {font - size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; border: 1px solid var(--border-color); }

      /* Scrolling Area */
      .ibx-detail-body {flex: 1; overflow-y: auto; padding: 32px; background: transparent; scroll-behavior: smooth; }
      .ibx-thread-messages {max - width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }

      .ibx-msg-card {background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px; padding: 24px; box-shadow: var(--shadow-sm); }
      .ibx-msg-header {display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
      .ibx-msg-avatar {width: 42px; height: 42px; border-radius: 12px; }
      .ibx-msg-meta {flex: 1; }
      .ibx-msg-user {display: flex; align-items: baseline; gap: 8px; }
      .ibx-msg-user strong {font - size: 15px; color: var(--text-primary); }
      .ibx-msg-email {font - size: 13px; color: var(--text-muted); }
      .ibx-msg-to {font - size: 11px; color: var(--text-muted); margin-top: 2px; }
      .ibx-msg-time {font - size: 12px; color: var(--text-muted); font-weight: 501; }
      .ibx-msg-content {font - size: 15px; line-height: 1.65; color: var(--text-secondary); }
      .ibx-msg-content p {margin - bottom: 12px; }

      /* Reply Container */
      .ibx-detail-footer {padding: 24px 32px; background: var(--bg-card); border-top: 1px solid var(--border-color); flex-shrink: 0; }
      .ibx-reply-placeholder {display: flex; align-items: center; gap: 16px; background: var(--bg-surface); border: 1px solid var(--border-color); padding: 12px; border-radius: 16px; cursor: pointer; transition: 0.2s; }
      .ibx-reply-placeholder:hover {background: var(--bg-body); border-color: var(--text-muted); }
      .ibx-reply-avatar {width: 32px; height: 32px; border-radius: 50%; opacity: 0.8; }
      .ibx-reply-fake-box {font - size: 14px; color: var(--text-muted); font-weight: 501; }

      .ibx-reply-active {background: var(--bg-card); border: 1px solid var(--color-primary, #00D1B2); border-radius: 20px; overflow: hidden; box-shadow: 0 12px 32px rgba(0, 209, 178, 0.15); display: flex; flex-direction: column; }
      .ibx-ra-header {padding: 12px 20px; background: var(--bg-surface); display: flex; align-items: center; gap: 10px; font-size: 12px; border-bottom: 1px solid var(--border-color); color: var(--text-secondary); }
      .ibx-ra-actions {margin - left: auto; display: flex; gap: 8px; }
      .ibx-ra-actions button {background: none; border: none; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
      .ibx-ra-actions button:hover {color: var(--text-primary); }
      .ibx-ra-input {width: 100%; height: 160px; padding: 20px; border: none; outline: none; font-size: 15px; resize: none; font-family: inherit; background: transparent; color: var(--text-primary); }
      .ibx-ra-footer {padding: 12px 20px; background: var(--bg-surface); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
      .ibx-ra-toolbar {display: flex; gap: 12px; color: var(--text-muted); }
      .ibx-ra-toolbar button {background: none; border: none; color: inherit; cursor: pointer; transition: 0.2s; }
      .ibx-ra-toolbar button:hover {color: var(--text-primary); }
      .ibx-btn-submit {background: var(--color-primary, #00D1B2); color: #fff; border: none; padding: 10px 24px; border-radius: 10px; font-weight: 700; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; }
      .ibx-btn-submit:hover:not(:disabled) {transform: scale(1.02); filter: brightness(1.1); }
      .ibx-btn-submit:disabled {opacity: 0.5; cursor: not-allowed; }
      .ibx-btn-cancel {background: var(--bg-card); border: 1px solid var(--border-color); padding: 10px 18px; border-radius: 10px; color: var(--text-secondary); font-weight: 601; cursor: pointer; transition: 0.2s; }
      .ibx-btn-cancel:hover {color: var(--text-primary); border-color: var(--text-primary); }

      /* Labels Dropdown */
      .ibx-label-trigger-container {position: relative; }
      .ibx-menu-glass {position: absolute; top: calc(100% + 8px); right: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; width: 220px; z-index: 1000; overflow: hidden; animation: ibx-fade-up 0.2s ease-out; box-shadow: var(--shadow-lg); }
      @keyframes ibx-fade-up {from {opacity: 0; transform: translateY(4px); } to {opacity: 1; transform: translateY(0); } }
      .ibx-menu-glass header {padding: 12px 16px; font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; background: var(--bg-surface); border-bottom: 1px solid var(--border-color); }
      .ibx-menu-list {padding: 6px; display: flex; flex-direction: column; gap: 2px; }
      .ibx-menu-item {display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: none; background: transparent; cursor: pointer; transition: 0.2s; width: 100%; text-align: left; }
      .ibx-menu-item:hover {background: var(--bg-surface); }
      .ibx-menu-item.active {background: rgba(0, 209, 178, 0.1); }
      .ibx-menu-dot {width: 10px; height: 10px; border-radius: 3px; }
      .ibx-menu-item span {flex: 1; font-size: 14px; font-weight: 501; color: var(--text-primary); }
      .ibx-menu-check {color: var(--color-primary, #00D1B2); }

      /* Skeletons & Empty */
      .ibx-sk-container {padding: 16px; display: flex; flex-direction: column; gap: 16px; }
      .ibx-sk-item {display: flex; gap: 12px; align-items: center; }
      .ibx-sk-circle {width: 44px; height: 44px; border-radius: 14px; background: var(--bg-surface); animation: ibx-pulse 1.5s infinite; }
      .ibx-sk-right {flex: 1; display: flex; flex-direction: column; gap: 8px; }
      .ibx-sk-bar {height: 12px; background: var(--bg-surface); border-radius: 6px; width: 100%; animation: ibx-pulse 1.5s infinite; }
      .ibx-sk-bar.sm {width: 60%; }
      @keyframes ibx-pulse {0 %, 100 % { opacity: 0.5; } 50% {opacity: 1; } }

      .ibx-placeholder {flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); padding: 40px; }
      .ibx-ph-circle {width: 80px; height: 80px; background: var(--bg-surface); border-radius: 32px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--text-muted); }
      .ibx-placeholder h3 {font - size: 18px; color: var(--text-primary); font-weight: 800; }
      .ibx-placeholder p {font - size: 14px; max-width: 250px; line-height: 1.5; }

      /* Modals Overlay */
      .ibx-overlay {position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
      .ibx-modal {background: var(--bg-card); border-radius: 24px; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color); overflow: hidden; }
      .ibx-modal.md-label {width: 400px; }
      .ibx-modal.md-compose {width: 600px; }
      .ibx-modal header {padding: 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); }
      .ibx-modal h3 {margin: 0; font-size: 18px; font-weight: 800; }
      .ibx-modal header button {background: none; border: none; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
      .ibx-modal header button:hover {color: var(--text-primary); }
      .ibx-modal-body {padding: 24px; display: flex; flex-direction: column; gap: 20px; }
      .ibx-input-group label {font - size: 11px; font-weight: 800; color: var(--text-muted); margin-bottom: 8px; display: block; }
      .ibx-input-group input {width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 14px; outline: none; transition: 0.2s; }
      .ibx-input-group input:focus {border - color: var(--color-primary, #00D1B2); box-shadow: 0 0 0 4px rgba(0,209,178,0.1); }
      .ibx-color-row {display: flex; align-items: center; gap: 12px; }
      .ibx-color-row input[type="color"] {width: 40px; height: 40px; padding: 0; border: none; background: transparent; cursor: pointer; }
      .ibx-color-tag {padding: 4px 12px; border-radius: 8px; color: #fff; font-size: 12px; font-weight: 800; }

      .ibx-comp-row {display: flex; align-items: center; border-bottom: 1px solid var(--border-color); padding: 8px 0; }
      .ibx-comp-row span {width: 70px; font-size: 13px; font-weight: 800; color: var(--text-muted); }
      .ibx-comp-row input {flex: 1; border: none; outline: none; font-size: 14px; font-family: inherit; background: transparent; color: var(--text-primary); }
      .ibx-modal.md-compose textarea {width: 100%; height: 300px; border: none; outline: none; padding: 20px 0; font-size: 15px; resize: none; font-family: inherit; background: transparent; color: var(--text-primary); }
      .ibx-modal footer {padding: 20px 24px; background: var(--bg-surface); border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 12px; }
      .ibx-btn-done {background: var(--color-primary, #00D1B2); color: #fff; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; }
      .ibx-btn-done:hover {filter: brightness(1.1); }

      .ibx-html-iframe {background: var(--bg-card); border-radius: 8px; }

      `}</style>
    </div >
  );
};

export default Inbox;
