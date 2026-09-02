import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Search, Calendar, MapPin, Layers, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const GRADIENTS = [
  'linear-gradient(135deg, #4C1D95 0%, #8B5CF6 100%)', // Neon Violet
  'linear-gradient(135deg, #065F46 0%, #10B981 100%)', // Emerald Mint
  'linear-gradient(135deg, #7C2D12 0%, #F97316 100%)', // Sunset Orange
  'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)', // Sapphire Blue
  'linear-gradient(135deg, #701A75 0%, #D946EF 100%)', // Dusk Plum
  'linear-gradient(135deg, #115E59 0%, #14B8A6 100%)'  // Teal Breeze
];

const getEventGradient = (evt, index, isPast) => {
  if (isPast) {
    return 'linear-gradient(135deg, #334155 0%, #64748B 100%)'; // Slate/Completed
  }
  const hash = String(evt.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradIndex = (hash + index) % GRADIENTS.length;
  return GRADIENTS[gradIndex];
};

export default function Events({ onViewScreen }) {
  const { state } = useStore();
  const allEvents = state.events || [];

  const [currentCategory, setCurrentCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineTab, setTimelineTab] = useState('upcoming'); // 'upcoming' or 'past'

  // Sort events by date: earliest first
  const sortedEvents = [...allEvents].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // Partition events into upcoming and past
  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = sortedEvents.filter(evt => evt.endDate >= today);
  const pastEvents = sortedEvents.filter(evt => evt.endDate < today);

  const timelineEvents = timelineTab === 'upcoming' ? upcomingEvents : pastEvents;

  const filteredEvents = timelineEvents.filter(evt => {
    const matchesCat = currentCategory === 'All' || evt.category === currentCategory;
    const matchesSearch = String(evt.name || '').toLowerCase().includes(String(searchQuery || '').toLowerCase()) || 
                          String(evt.description || '').toLowerCase().includes(String(searchQuery || '').toLowerCase()) ||
                          String(evt.venue || '').toLowerCase().includes(String(searchQuery || '').toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
    >
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Events Hub</h1>
            <p className="page-subtitle">Browse and self-register for Topaz Park 2026 sports & cultural competitions</p>
          </div>

          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              className="input" 
              placeholder="Search events or venues..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Timeline Toggle & Category Filters */}
      <div className="flex-between mb-lg" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="tabs">
            <button 
              className={`tab ${currentCategory === 'All' ? 'active' : ''}`}
              onClick={() => setCurrentCategory('All')}
            >
              All Categories
            </button>
            <button 
              className={`tab ${currentCategory === 'Sports' ? 'active' : ''}`}
              onClick={() => setCurrentCategory('Sports')}
            >
              Sports
            </button>
            <button 
              className={`tab ${currentCategory === 'Cultural' ? 'active' : ''}`}
              onClick={() => setCurrentCategory('Cultural')}
            >
              Cultural
            </button>
          </div>

          {/* Timeline tab: Upcoming vs Past */}
          <div className="tabs" style={{ background: '#E2E8F0' }}>
            <button 
              className={`tab ${timelineTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setTimelineTab('upcoming')}
              style={{ fontWeight: 700 }}
            >
              Upcoming ({upcomingEvents.length})
            </button>
            <button 
              className={`tab ${timelineTab === 'past' ? 'active' : ''}`}
              onClick={() => setTimelineTab('past')}
              style={{ fontWeight: 700 }}
            >
              Past Completed ({pastEvents.length})
            </button>
          </div>
        </div>

        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          Showing {filteredEvents.length} events
        </span>
      </div>

      {/* Events Grid */}
      <div className="grid-3">
        {filteredEvents.length > 0 ? filteredEvents.map((evt, idx) => {
          const isPast = timelineTab === 'past';
          const headerBackground = getEventGradient(evt, idx, isPast);
          return (
            <div 
              key={evt.id} 
              className="event-card card-interactive"
              onClick={() => onViewScreen(`events/${evt.id}`)}
              style={{ borderTop: isPast ? '4px solid var(--color-text-muted)' : 'none' }}
            >
              <div className="event-card-header" style={{ background: headerBackground }}>
                <div className="flex-between mb-xs" style={{ marginBottom: '8px' }}>
                  <span className={`badge ${evt.category === 'Sports' ? 'badge-green' : 'badge-violet'}`}>{evt.category}</span>
                  <span className="badge badge-slate" style={{ opacity: 0.9 }}>{evt.type}</span>
                </div>
                <h3 className="event-card-title">{evt.name}</h3>
                <p style={{ fontSize: '0.8125rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} /> {evt.startDate} {evt.endDate !== evt.startDate ? 'to ' + evt.endDate : ''}
                </p>
              </div>

              <div className="event-card-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  {evt.description}
                </p>

                <div className="event-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  <MapPin size={14} style={{ color: 'var(--color-primary)' }} />
                  <span>{evt.venue} ({evt.time})</span>
                </div>

                <div className="event-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  <Layers size={14} style={{ color: 'var(--color-cta)' }} />
                  <span>{evt.subEvents && evt.subEvents.length > 0 ? `${evt.subEvents.length} Categories` : 'Standalone Event'}</span>
                </div>

                <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  <span className={`badge ${isPast ? 'badge-slate' : 'badge-green'}`}>
                    {isPast ? 'COMPLETED' : evt.status}
                  </span>
                  <button className="btn btn-primary btn-sm">
                    {isPast ? 'View Details' : 'View & Register'} &rarr;
                  </button>
                </div>
              </div>
            </div>
          );
        }) : (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <h3>No events match your criteria</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Try adjusting your search query or filters.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
