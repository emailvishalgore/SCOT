import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight, Upload, Plus, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Gallery({ onShowToast }) {
  const { state, addPhotoToAlbum, updateAlbumCover, createNewAlbum } = useStore();
  const user = state.currentUser || { role: 'resident' };
  const isAdmin = user.role === 'admin';
  const isChamp = user.role === 'champion' || user.isChampion;
  const isAllowedToUpload = isAdmin || isChamp;

  const albums = state.galleryAlbums || [];

  const [activeAlbumId, setActiveAlbumId] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // New album creator state
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumCover, setNewAlbumCover] = useState('');

  const activeAlbum = albums.find(a => a.id === activeAlbumId);
  const activePhotos = activeAlbum ? (activeAlbum.photos || []) : [];

  const handleAlbumClick = (album) => {
    setActiveAlbumId(album.id);
    setPhotoIndex(0);
  };

  const handlePrev = () => {
    setPhotoIndex(prev => (prev - 1 + activePhotos.length) % activePhotos.length);
  };

  const handleNext = () => {
    setPhotoIndex(prev => (prev + 1) % activePhotos.length);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeAlbumId) return;
      if (e.key === 'Escape') setActiveAlbumId(null);
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAlbumId, activePhotos]);

  // Handle Photo Upload into Open Album
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      addPhotoToAlbum(activeAlbumId, base64);
      setPhotoIndex(activePhotos.length); // View the newly uploaded photo
      if (onShowToast) onShowToast('Photo uploaded successfully into album!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Handle Changing Album Cover from Main Screen
  const handleCoverChange = (e, albumId) => {
    e.stopPropagation(); // Avoid triggering open album
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      updateAlbumCover(albumId, base64);
      if (onShowToast) onShowToast('Album cover image updated!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Handle Create Album Cover selection
  const handleNewAlbumCoverSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewAlbumCover(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAlbumSubmit = (e) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) {
      if (onShowToast) onShowToast('Please enter album name', 'error');
      return;
    }
    createNewAlbum(newAlbumTitle.trim(), newAlbumCover);
    if (onShowToast) onShowToast(`Created new album "${newAlbumTitle.trim()}"!`, 'success');
    setNewAlbumTitle('');
    setNewAlbumCover('');
    setShowCreateAlbum(false);
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
            <h1 className="page-title">Media Gallery</h1>
            <p className="page-subtitle">Visual memories and highlights of Topaz Park community events</p>
          </div>

          {isAdmin && (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowCreateAlbum(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FolderPlus size={16} /> Add Album
            </button>
          )}
        </div>
      </div>

      {/* Grid of Albums */}
      <div className="grid-3" style={{ marginTop: '1.5rem' }}>
        {albums.map(album => (
          <div 
            key={album.id} 
            className="album-card"
            style={{ position: 'relative' }}
          >
            {/* Album card image */}
            <div 
              style={{ width: '100%', height: '100%', cursor: 'pointer' }}
              onClick={() => handleAlbumClick(album)}
            >
              <img 
                className="album-cover" 
                src={album.coverUrl} 
                alt={album.title} 
              />
              <div className="album-overlay">
                <span className="badge badge-slate" style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none' }}>
                  <ImageIcon size={12} style={{ display: 'inline', marginRight: '4px' }} /> {album.count}
                </span>
                <h3 className="album-title">{album.title}</h3>
              </div>
            </div>

            {/* Change Cover Uploader Button (Visible to Admin only) */}
            {isAdmin && (
              <label 
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  backdropFilter: 'blur(4px)',
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  zIndex: 20
                }}
                title="Change Cover Image"
                onClick={(e) => e.stopPropagation()} // Stop bubbling
              >
                <Upload size={10} /> Change Cover
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleCoverChange(e, album.id)}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      {/* Create Album Modal */}
      <AnimatePresence>
        {showCreateAlbum && (
          <div className="modal-overlay">
            <motion.div 
              className="modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ maxWidth: '440px' }}
            >
              <form onSubmit={handleCreateAlbumSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
                  Create New Media Album
                </h2>

                <div className="form-group">
                  <label className="form-label">Album Title</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Independence Day 2026"
                    value={newAlbumTitle}
                    onChange={(e) => setNewAlbumTitle(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cover Image (Optional)</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {newAlbumCover && (
                      <img 
                        src={newAlbumCover} 
                        alt="Preview" 
                        style={{ width: '80px', height: '60px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                      />
                    )}
                    <label className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: 'pointer' }}>
                      <Upload size={14} /> {newAlbumCover ? 'Change Image' : 'Select Image'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleNewAlbumCoverSelect}
                      />
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateAlbum(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Album</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Player Modal */}
      <AnimatePresence>
        {activeAlbumId && activeAlbum && (
          <div className="modal-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)', zIndex: 9999 }}>
            <motion.div 
              style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header Info & Actions */}
              <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'white', zIndex: 10 }}>
                {isAllowedToUpload && (
                  <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} /> Add Image
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handlePhotoUpload}
                    />
                  </label>
                )}

                {activePhotos.length > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600 }}>
                    {photoIndex + 1} / {activePhotos.length}
                  </span>
                )}
                <button 
                  className="btn btn-secondary btn-icon" 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
                  onClick={() => setActiveAlbumId(null)}
                  title="Close Gallery"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Prev Arrow */}
              {activePhotos.length > 1 && (
                <button 
                  className="btn btn-secondary btn-icon"
                  style={{ position: 'absolute', left: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '48px', height: '48px', padding: 0 }}
                  onClick={handlePrev}
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              {/* Central Image */}
              {activePhotos.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={photoIndex}
                    src={activePhotos[photoIndex]}
                    alt={`${activeAlbum.title} Highlight`}
                    style={{ maxWidth: '90%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 12px 48px rgba(0,0,0,0.8)' }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  />
                </AnimatePresence>
              ) : (
                <div style={{ textAlign: 'center', color: 'white' }}>
                  <ImageIcon size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <p>No photos in this album yet.</p>
                </div>
              )}

              {/* Next Arrow */}
              {activePhotos.length > 1 && (
                <button 
                  className="btn btn-secondary btn-icon"
                  style={{ position: 'absolute', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '48px', height: '48px', padding: 0 }}
                  onClick={handleNext}
                >
                  <ChevronRight size={28} />
                </button>
              )}

              {/* Subtext info */}
              <div style={{ position: 'absolute', bottom: '24px', color: 'white', fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                {activeAlbum.title}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
