import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Trophy, Award, TrendingUp, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Leaderboard() {
  const { state } = useStore();
  const user = state.currentUser || { wing: 'Wing N', wingId: 'wing-n' };
  const leaderboard = state.leaderboard || [];
  const topPerformers = state.topPerformers || [];

  const [activeTab, setActiveTab] = useState('standings'); // 'standings', 'performers'

  // Sort wings by points descending
  const sortedStandings = [...leaderboard].sort((a, b) => {
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
