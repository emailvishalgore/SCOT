import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Trophy, Award, TrendingUp, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Leaderboard() {
  const { state } = useStore();
  const user = state.currentUser || { wing: 'Wing N', wingId: 'wing-n' };
  const topPerformers = state.topPerformers || [];
  const [activeTab, setActiveTab] = useState('standings'); // 'standings', 'performers'

  // Helper to extract wing from winner text, registration records, or flat directory
  const getWingForPlayer = (playerStr) => {
    if (!playerStr || playerStr === 'BYE') return null;
    const m1 = playerStr.match(/\[Wing\s*([A-Za-z0-9]+)\]/i);
    if (m1) return m1[1].toUpperCase();
    const m2 = playerStr.match(/Wing\s*([A-Za-z0-9]+)/i);
    if (m2) return m2[1].toUpperCase();
    const m3 = playerStr.match(/\(\s*([N-W])\s*[\),]/i);
    if (m3) return m3[1].toUpperCase();

    const matchedReg = (state.registrations || []).find(
      r => r.name === playerStr || String(r.name).includes(playerStr) || String(playerStr).includes(String(r.name))
    );
    if (matchedReg) {
      if (matchedReg.wing) return String(matchedReg.wing).replace(/Wing\s*/i, '').trim().toUpperCase();
      const creator = (state.users || []).find(u => u.id === matchedReg.registeredByUserId);
      if (creator && creator.wing) return String(creator.wing).replace(/Wing\s*/i, '').trim().toUpperCase();
    }

    const flatMatch = playerStr.match(/Flat\s*[:#-]?\s*(\d{3})/i) || playerStr.match(/\b(\d{3})\b/);
    if (flatMatch && state.paidFlats && state.paidFlats.length > 0) {
      const flatNum = flatMatch[1];
      const match = state.paidFlats.find(f => {
        const ff = String(f.flat || '').replace(/\D/g, '');
        return ff === flatNum || parseInt(ff, 10) === parseInt(flatNum, 10);
      });
      if (match && match.wing) {
        return String(match.wing).replace(/Wing\s*/i, '').trim().toUpperCase();
      }
    }

    const m4 = playerStr.match(/\b([N-W])\b/i);
    if (m4) return m4[1].toUpperCase();
    return null;
  };

  // Compute standings dynamically from competitions fixtures
  const wingStats = {};
  ['N','O','P','Q','R','S','T','U','V','W'].forEach(w => {
    wingStats[w] = { points: 0, wins: 0, events: new Set() };
  });

  (state.competitions || []).forEach(c => {
    // Only count active competitions for real events created in Google Sheets
    if (c.id === 'comp-carrom-singles' || c.id === 'comp-tt-singles' || c.eventId === 'evt-carrom-2026' || c.eventId === 'evt-tt-2026') return;
    if (state.events && state.events.length > 0 && !state.events.some(e => e.id === c.eventId)) return;

    (c.fixtures || []).forEach(f => {
      if (f.winnerId && f.winnerId !== 'BYE' && f.scoreA !== '' && f.scoreB !== '') {
        const wLetter = getWingForPlayer(f.winnerId);
        if (wLetter && wingStats[wLetter]) {
          wingStats[wLetter].points += 30;
          wingStats[wLetter].wins += 1;
          if (c.eventId) wingStats[wLetter].events.add(c.eventId);
        }
      }
    });
  });

  const computedStandings = (state.wings || [
    { id: 'wing-n', name: 'Wing N', letter: 'N' },
    { id: 'wing-o', name: 'Wing O', letter: 'O' },
    { id: 'wing-p', name: 'Wing P', letter: 'P' },
    { id: 'wing-q', name: 'Wing Q', letter: 'Q' },
    { id: 'wing-r', name: 'Wing R', letter: 'R' },
    { id: 'wing-s', name: 'Wing S', letter: 'S' },
    { id: 'wing-t', name: 'Wing T', letter: 'T' },
    { id: 'wing-u', name: 'Wing U', letter: 'U' },
    { id: 'wing-v', name: 'Wing V', letter: 'V' },
    { id: 'wing-w', name: 'Wing W', letter: 'W' }
  ]).map(w => {
    const letter = w.letter || w.name.replace('Wing ', '').trim().toUpperCase();
    const stats = wingStats[letter] || { points: 0, wins: 0, events: new Set() };
    return {
      wingId: w.id || `wing-${letter.toLowerCase()}`,
      name: w.name || `Wing ${letter}`,
      letter,
      points: stats.points,
      wins: stats.wins,
      events: stats.events.size || (stats.wins > 0 ? 1 : 0)
    };
  });

  // Sort wings by points descending
  const sortedStandings = [...computedStandings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });

  const totalSeasonPoints = sortedStandings.reduce((sum, item) => sum + (item.points || 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
    >
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Wing Championship Leaderboard</h1>
            <p className="page-subtitle">Track housing society wing standings and points for Season 2026-27</p>
          </div>

          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'standings' ? 'active' : ''}`}
              onClick={() => setActiveTab('standings')}
            >
              Wing Standings
            </button>
            <button 
              className={`tab ${activeTab === 'performers' ? 'active' : ''}`}
              onClick={() => setActiveTab('performers')}
            >
              Top Performers
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'standings' ? (
        <div className="flex-col gap-lg" style={{ gap: '1.5rem' }}>
          {/* Table list of all wings */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Rank</th>
                    <th>Wing Name</th>
                    <th style={{ textAlign: 'center' }}>Wins</th>
                    <th style={{ textAlign: 'center' }}>Events Completed</th>
                    <th style={{ textAlign: 'right' }}>Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStandings.map((row, index) => {
                    const isUserWing = row.name === user.wing || row.wingId === user.wingId;
                    const rankNum = totalSeasonPoints > 0 ? index + 1 : '-';
                    const hasMedal = totalSeasonPoints > 0 && index < 3;

                    return (
                      <tr 
                        key={row.wingId} 
                        style={isUserWing ? { backgroundColor: 'var(--color-primary-lighter)', fontWeight: 700 } : {}}
                      >
                        <td>
                          {hasMedal ? (
                            <span className={`rank-badge ${index === 0 ? 'rank-1' : (index === 1 ? 'rank-2' : 'rank-3')}`}>
                              {index + 1}
                            </span>
                          ) : (
                            <span className="badge badge-slate" style={{ width: '28px', justifyContent: 'center' }}>
                              {rankNum}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: 'var(--color-text)', fontSize: '1rem' }}>{row.name}</strong>
                            {isUserWing && <span className="badge badge-violet">Your Wing</span>}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{row.wins || 0}</td>
                        <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{row.events || 0}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '1.1rem' }}>
                          {row.points || 0} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Graphical points breakdown */}
          <div className="card">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Championship Point Standings Fills
            </h2>
            {totalSeasonPoints > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {sortedStandings.slice(0, 5).map(row => (
                  <div key={row.wingId}>
                    <div className="flex-between" style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' }}>
                      <span>{row.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>{row.points} pts</span>
                    </div>
                    <div className="bar-track">
                      <div 
                        className="bar-fill" 
                        style={{ width: `${Math.min(100, Math.max(5, (row.points / sortedStandings[0].points) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-secondary)' }}>
                <Trophy size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <p style={{ fontWeight: 600 }}>No points have been recorded yet.</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Championship points will update automatically when Event Champions enter match scores.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Top Performers View */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {topPerformers.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rank</th>
                    <th>Resident Name</th>
                    <th>Wing</th>
                    <th style={{ textAlign: 'center' }}>Events</th>
                    <th style={{ textAlign: 'right' }}>Points Won</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((row, index) => (
                    <tr key={index}>
                      <td><strong>#{index + 1}</strong></td>
                      <td><strong style={{ color: 'var(--color-text)' }}>{row.name}</strong></td>
                      <td><span className="badge badge-violet">{row.wing}</span></td>
                      <td style={{ textAlign: 'center' }}>{row.events}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                        {row.points} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-secondary)' }}>
              <Award size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700 }}>No Individual Rankings Yet</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', maxWidth: '420px', margin: '0.5rem auto 0' }}>
                Individual resident leaderboard points will display here once scores are recorded by Champions in badminton, carrom, or table tennis.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
