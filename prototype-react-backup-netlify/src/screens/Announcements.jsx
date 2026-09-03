import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Megaphone, AlertTriangle, PlusCircle, Edit3, Trash2, Share2, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Announcements({ onShowToast }) {
  const { state, postAnnouncement, editAnnouncement, deleteAnnouncement } = useStore();
  const currentUser = state.currentUser || {};
  const isAdminOrChamp = currentUser.role === 'admin' || currentUser.role === 'champion' || currentUser.isChampion;
  const isAdmin = currentUser.role === 'admin';
  
  const [currentFilter, setCurrentFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('Global');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');

  const announcements = state.announcements || [];
  const wings = state.wings || [];
  const events = state.events || [];

  const filteredAnnouncements = announcements.filter(a => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'global') return a.scope === 'Global' || a.scopeType === 'global';
    if (currentFilter === 'wing') return a.scope.includes('Wing') || a.scopeType === 'wing';
    if (currentFilter === 'event') return a.scope.includes('Event') || a.scopeType === 'event';
    return true;
  });

  const handlePostOrEdit = (e) => {
    e.preventDefault();
    if (!title || !content) {
      onShowToast('Please fill out all fields', 'error');
      return;
    }

    if (editingAnnId) {
      editAnnouncement(editingAnnId, title, scope, content, image || null);
      onShowToast('Announcement updated successfully!', 'success');
    } else {
      postAnnouncement(title, scope, content, image);
      onShowToast('Announcement posted successfully!', 'success');
    }
    
    handleCloseModal();
  };

  const handleStartEdit = (ann) => {
    setEditingAnnId(ann.id);
    setTitle(ann.title);
    setScope(ann.scope);
    setContent(ann.content);
    setImage(ann.image || '');
    setIsModalOpen(true);
  };

  const handleDelete = (annId) => {
    if (window.confirm('Are you sure you want to permanently delete this announcement?')) {
      deleteAnnouncement(annId);
      onShowToast('Announcement deleted successfully.', 'info');
    }
  };

  const handleCloseModal = () => {
    setTitle('');
    setScope('Global');
    setContent('');
    setImage('');
    setEditingAnnId(null);
    setIsModalOpen(false);
  };

  const handleWhatsAppShare = (ann) => {
    const boldTitle = `*📢 ANNOUNCEMENT: ${String(ann.title || '').toUpperCase()}*`;
    const border = `----------------------------`;
    const details = `*Audience:* ${ann.scope}\n*Date:* ${ann.date}`;
    const body = `\n${ann.content}`;
    const footer = `\n---\n_Shared from Topaz Park SCOT Platform_`;

    const text = `${boldTitle}\n${border}\n${details}\n${body}\n${footer}`;
    
    navigator.clipboard.writeText(text)
      .then(() => {
        onShowToast('Announcement copied to clipboard!', 'success');
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      })
      .catch(() => {
        onShowToast('Could not copy. Redirecting to WhatsApp...', 'info');
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
    >
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Announcements Board</h1>
            <p className="page-subtitle">Official society updates, wing notices, and event schedules</p>
          </div>
          {isAdminOrChamp && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <PlusCircle size={16} /> New Announcement
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs mb-lg" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab ${currentFilter === 'all' ? 'active' : ''}`} onClick={() => setCurrentFilter('all')}>All Updates</button>
        <button className={`tab ${currentFilter === 'global' ? 'active' : ''}`} onClick={() => setCurrentFilter('global')}>Global Notices</button>
        <button className={`tab ${currentFilter === 'wing' ? 'active' : ''}`} onClick={() => setCurrentFilter('wing')}>Wing Updates</button>
        <button className={`tab ${currentFilter === 'event' ? 'active' : ''}`} onClick={() => setCurrentFilter('event')}>Event Alerts</button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredAnnouncements.length > 0 ? filteredAnnouncements.map(ann => (
          <div 
            key={ann.id} 
            className="card" 
            style={{ borderLeft: `4px solid ${ann.scope === 'Global' ? 'var(--color-info)' : (ann.scope.includes('Wing') ? 'var(--color-cta)' : 'var(--color-primary)')}` }}
          >
            <div className="flex-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${ann.scope === 'Global' ? 'badge-blue' : (ann.scope.includes('Wing') ? 'badge-green' : 'badge-violet')}`}>
                  {ann.scope}
                </span>
                {ann.priority && (
                  <span className="badge badge-amber">
                    <AlertTriangle size={12} /> High Priority
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{ann.date}</span>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => handleStartEdit(ann)} 
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary-dark)', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.78rem', fontWeight: 700 }}
                      title="Edit"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(ann.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.78rem', fontWeight: 700 }}
                      title="Delete"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>{ann.title}</h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{ann.content}</p>

            {/* Announcement Image Attachment */}
            {ann.image && (
              <div style={{ marginTop: '0.75rem', borderRadius: '8px', overflow: 'hidden', maxWidth: '100%', maxHeight: '300px', display: 'flex', justifyContent: 'center', background: '#F1F5F9', border: '1px solid var(--color-border)' }}>
                <img src={ann.image} alt="Attachment" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />
              </div>
            )}

            {/* WhatsApp Share Action bar */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => handleWhatsAppShare(ann)} 
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px', borderColor: '#25D366', color: '#128C7E', backgroundColor: '#E8F5E9', fontWeight: 700 }}
              >
                <Share2 size={12} /> Share / Copy to WhatsApp
              </button>
            </div>
          </div>
        )) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
            <Megaphone size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <h3>No announcements found</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>No notices match the selected category filter.</p>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <form onSubmit={handlePostOrEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800 }}>
                  {editingAnnId ? 'Edit Announcement' : 'Post New Announcement'}
                </h2>
                
                <div className="form-group">
                  <label className="form-label">Announcement Title</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Table Tennis Tournament Schedule" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Scope / Audience</label>
                  <select className="select" value={scope} onChange={(e) => setScope(e.target.value)}>
                    <option value="Global">Global (All Society Residents)</option>
                    
                    <optgroup label="Wings / Blocks">
                      {wings.map(w => (
                        <option key={w.id} value={w.name}>{w.name} Residents</option>
                      ))}
                    </optgroup>

                    <optgroup label="Events (General)">
                      {events.map(e => (
                        <option key={e.id} value={`Event: ${e.name}`}>{e.name}</option>
                      ))}
                    </optgroup>

                    <optgroup label="Event Sub-Categories">
                      {events.filter(e => e.subEvents && e.subEvents.length > 0).map(e => (
                        e.subEvents.map(s => (
                          <option key={s.id} value={`Event: ${e.name} - ${s.name}`}>
                            {e.name} &rarr; {s.name}
                          </option>
                        ))
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Message Content</label>
                  <textarea 
                    className="textarea" 
                    rows="4" 
                    placeholder="Type the official announcement message here..." 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  ></textarea>
                </div>

                {/* Upload Image File attachment */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Attachment Image (Optional)</span>
                    {image && (
                      <button 
                        type="button" 
                        onClick={() => setImage('')} 
                        style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Remove Image
                      </button>
                    )}
                  </label>
                  {!image ? (
                    <div style={{ border: '2px dashed var(--color-border)', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#F8FAFC', cursor: 'pointer', position: 'relative' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setImage(event.target.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Upload size={20} style={{ color: 'var(--color-text-muted)', margin: '0 auto 4px' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>Click or Drag image file to upload</span>
                    </div>
                  ) : (
                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)', maxHeight: '120px', display: 'flex', background: '#F1F5F9', position: 'relative' }}>
                      <img src={image} alt="Upload Preview" style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    {editingAnnId ? 'Update Announcement' : 'Post Announcement'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
