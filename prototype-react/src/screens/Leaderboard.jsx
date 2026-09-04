import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Trophy, Award, TrendingUp, Share2, Download, Flame, Sparkles, ChevronRight, MessageCircle, Copy, Check, Users, Swords, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WING_COLORS = {
  'N': { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', gradient: 'linear-gradient(135deg, #EF4444, #B91C1C)' },
  'O': { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA', gradient: 'linear-gradient(135deg, #F97316, #C2410C)' },
  'P': { bg: '#FEFCE8', text: '#CA8A04', border: '#FEF08A', gradient: 'linear-gradient(135deg, #EAB308, #A16207)' },
  'Q': { bg: '#F7FEE7', text: '#65A30D', border: '#D9F99D', gradient: 'linear-gradient(135deg, #84CC16, #4D7C0F)' },
  'R': { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', gradient: 'linear-gradient(135deg, #10B981, #047857)' },
  'S': { bg: '#ECFEFF', text: '#0891B2', border: '#A5F3FC', gradient: 'linear-gradient(135deg, #06B6D4, #0E7490)' },
  'T': { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
  'U': { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE', gradient: 'linear-gradient(135deg, #6366F1, #4338CA)' },
  'V': { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE', gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
  'W': { bg: '#F0FDFA', text: '#0D9488', border: '#99F6E4', gradient: 'linear-gradient(135deg, #14B8A6, #0F766E)' }
};

export default function Leaderboard({ onShowToast }) {
  const { state } = useStore();
  const user = state.currentUser || { wing: 'Wing N', wingId: 'wing-n' };
  const [activeTab, setActiveTab] = useState('standings'); // 'standings', 'matrix', 'performers'
  const [selectedWingDrawer, setSelectedWingDrawer] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const canvasRef = useRef(null);

  // Helper to extract wing from winner text, registration records, or flat directory
  const getWingForPlayer = (playerStr) => {
    if (!playerStr || playerStr === 'BYE') return null;
    playerStr = String(playerStr);
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

  // Helper to extract winner and runner-up points configured for an event / sub-event
  const getEventPoints = (event, subEventId) => {
    if (!event) return { winnerPoints: 100, runnerUpPoints: 50 };
    
    let targetObj = event;
    if (subEventId && event.subEvents && event.subEvents.length > 0) {
      const sub = event.subEvents.find(s => s.id === subEventId);
      if (sub) targetObj = sub;
    }

    let winPts = targetObj.winnerPoints !== undefined && targetObj.winnerPoints !== '' ? parseInt(targetObj.winnerPoints, 10) : NaN;
    let runPts = targetObj.runnerUpPoints !== undefined && targetObj.runnerUpPoints !== '' ? parseInt(targetObj.runnerUpPoints, 10) : NaN;

    if (isNaN(winPts) && targetObj.points) {
      const pStr = String(targetObj.points);
      const winMatch = pStr.match(/Winner:\s*(\d+)/i) || pStr.match(/(\d+)\s*pts/i) || pStr.match(/^(\d+)$/);
      if (winMatch) winPts = parseInt(winMatch[1], 10);
    }
    if (isNaN(runPts) && targetObj.points) {
      const pStr = String(targetObj.points);
      const runMatch = pStr.match(/Runner:\s*(\d+)/i) || pStr.match(/Runner-?up:\s*(\d+)/i);
      if (runMatch) runPts = parseInt(runMatch[1], 10);
    }

    if (isNaN(winPts) || winPts <= 0) winPts = 100;
    if (isNaN(runPts) || runPts <= 0) runPts = 50;

    return { winnerPoints: winPts, runnerUpPoints: runPts };
  };

  // Compute standings & match forms dynamically from competitions fixtures
  const wingStats = {};
  const wingMatches = {}; // Recent match results [ 'W', 'L' ]
  const wingEventBreakdown = {}; // { 'U': { 'evt-1': 100, 'evt-2': 50 } }
  const playerStats = {}; // Top performers: { 'Player Name': { wing, wins: 0, points: 0, matches: 0 } }
  let totalCompletedMatches = 0;

  ['N','O','P','Q','R','S','T','U','V','W'].forEach(w => {
    wingStats[w] = { points: 0, wins: 0, matches: 0, events: new Set() };
    wingMatches[w] = [];
    wingEventBreakdown[w] = {};
  });

  (state.competitions || []).forEach(c => {
    if (c.id === 'comp-carrom-singles' || c.id === 'comp-tt-singles' || c.eventId === 'evt-carrom-2026' || c.eventId === 'evt-tt-2026') return;
    if (state.events && state.events.length > 0 && !state.events.some(e => e.id === c.eventId)) return;

    const targetEvt = (state.events || []).find(e => e.id === c.eventId);
    const { winnerPoints, runnerUpPoints } = getEventPoints(targetEvt, c.subEventId);

    (c.fixtures || []).forEach(f => {
      if (f.scoreA !== '' && f.scoreB !== '' && f.winnerId && f.winnerId !== 'BYE') {
        totalCompletedMatches++;
        const wingA = getWingForPlayer(f.playerA);
        const wingB = getWingForPlayer(f.playerB);
        const winWing = getWingForPlayer(f.winnerId);

        if (wingA && wingStats[wingA]) wingStats[wingA].matches++;
        if (wingB && wingStats[wingB] && wingB !== wingA) wingStats[wingB].matches++;

        const isFinals = f.round && (
          String(f.round).toLowerCase() === 'finals' ||
          String(f.round).toLowerCase() === 'final' ||
          String(f.round).toLowerCase().includes('finals (championship)') ||
          (String(f.round).toLowerCase().includes('final') && !String(f.round).toLowerCase().includes('semi') && !String(f.round).toLowerCase().includes('quarter'))
        );

        if (winWing && wingStats[winWing]) {
          wingStats[winWing].wins += 1;
          if (c.eventId) {
            wingStats[winWing].events.add(c.eventId);
          }
          wingMatches[winWing].push('W');

          if (isFinals) {
            wingStats[winWing].points += winnerPoints;
            if (c.eventId) {
              wingEventBreakdown[winWing][c.eventId] = (wingEventBreakdown[winWing][c.eventId] || 0) + winnerPoints;
            }
          }
        }

        const losingWing = winWing === wingA ? wingB : wingA;
        if (losingWing && losingWing !== winWing && wingMatches[losingWing]) {
          wingMatches[losingWing].push('L');

          if (isFinals) {
            wingStats[losingWing].points += runnerUpPoints;
            if (c.eventId) {
              wingStats[losingWing].events.add(c.eventId);
              wingEventBreakdown[losingWing][c.eventId] = (wingEventBreakdown[losingWing][c.eventId] || 0) + runnerUpPoints;
            }
          }
        }

        // Track player MVP points
        const pKey = f.winnerId;
        if (!playerStats[pKey]) {
          playerStats[pKey] = { name: pKey, wing: winWing || 'Wing', wins: 0, points: 0 };
        }
        playerStats[pKey].wins += 1;
        if (isFinals) {
          playerStats[pKey].points += winnerPoints;
        }

        const loserKey = f.winnerId === f.playerA ? f.playerB : f.playerA;
        if (isFinals && loserKey && loserKey !== 'BYE') {
          if (!playerStats[loserKey]) {
            playerStats[loserKey] = { name: loserKey, wing: losingWing || 'Wing', wins: 0, points: 0 };
          }
          playerStats[loserKey].points += runnerUpPoints;
        }
      }
    });
  });

  // Calculate nominations count per wing
  const wingNominationsCount = {};
  (state.registrations || []).forEach(r => {
    const w = getWingForPlayer(r.name) || (r.wing ? String(r.wing).replace(/Wing\s*/i, '').trim().toUpperCase() : null);
    if (w) {
      wingNominationsCount[w] = (wingNominationsCount[w] || 0) + 1;
    }
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
    const stats = wingStats[letter] || { points: 0, wins: 0, matches: 0, events: new Set() };
    const form = (wingMatches[letter] || []).slice(-3);
    const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;

    return {
      wingId: w.id || `wing-${letter.toLowerCase()}`,
      name: w.name || `Wing ${letter}`,
      letter,
      points: stats.points,
      wins: stats.wins,
      matches: stats.matches,
      winRate,
      form,
      events: stats.events.size || (stats.wins > 0 ? 1 : 0),
      nominations: wingNominationsCount[letter] || 0,
      breakdown: wingEventBreakdown[letter] || {}
    };
  });

  // Sort wings by points descending
  const sortedStandings = [...computedStandings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });

  const totalSeasonPoints = sortedStandings.reduce((sum, item) => sum + (item.points || 0), 0);
  const leaderWing = sortedStandings[0];
  const mostActiveWing = [...computedStandings].sort((a, b) => b.nominations - a.nominations)[0];

  // Top performers list sorted
  const topMVPs = Object.values(playerStats).sort((a, b) => b.points - a.points);

  // --- 🎨 Generate High-Resolution Scorecard Poster Image (Canvas) ---
  const generatePosterImage = () => {
    setIsGeneratingPoster(true);
    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background Gradient (Dark Festival Luxury)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0F172A');
    bgGradient.addColorStop(0.4, '#1E293B');
    bgGradient.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative Gold Accent Lines
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Header Glow
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐ TOPAZ PARK HOUSING SOCIETY ⭐', width / 2, 85);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('SCOT CHAMPIONSHIP 2026-27', width / 2, 140);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '22px sans-serif';
    ctx.fillText('Official Society Wing Standings & Points Leaderboard', width / 2, 180);

    // Podium Graphic Box (Top 3 Wings)
    const podiumY = 240;
    const podiumHeight = 270;
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(60, podiumY, width - 120, podiumHeight, 16);
    ctx.fill();
    ctx.stroke();

    // 🥇 Rank 1 (Center)
    const rank1 = sortedStandings[0];
    if (rank1) {
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 120, podiumY + 30, 240, 210, 16);
      ctx.fill();
      ctx.fillStyle = '#854D0E';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('👑 1ST PLACE', width / 2, podiumY + 75);
      ctx.font = 'bold 46px sans-serif';
      ctx.fillText(`WING ${rank1.letter}`, width / 2, podiumY + 140);
      ctx.fillStyle = '#B45309';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(`${rank1.points} PTS • ${rank1.wins} WINS`, width / 2, podiumY + 195);
    }

    // 🥈 Rank 2 (Left)
    const rank2 = sortedStandings[1];
    if (rank2) {
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.roundRect(90, podiumY + 65, 210, 175, 14);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('🥈 2ND PLACE', 195, podiumY + 105);
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(`WING ${rank2.letter}`, 195, podiumY + 160);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`${rank2.points} PTS`, 195, podiumY + 205);
    }

    // 🥉 Rank 3 (Right)
    const rank3 = sortedStandings[2];
    if (rank3) {
      ctx.fillStyle = '#FFEDD5';
      ctx.beginPath();
      ctx.roundRect(width - 300, podiumY + 65, 210, 175, 14);
      ctx.fill();
      ctx.fillStyle = '#9A3412';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('🥉 3RD PLACE', width - 195, podiumY + 105);
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(`WING ${rank3.letter}`, width - 195, podiumY + 160);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`${rank3.points} PTS`, width - 195, podiumY + 205);
    }

    // Full Standings Table Header
    const tableY = 560;
    ctx.fillStyle = '#334155';
    ctx.fillRect(60, tableY, width - 120, 50);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('RANK', 90, tableY + 33);
    ctx.fillText('WING', 220, tableY + 33);
    ctx.textAlign = 'center';
    ctx.fillText('MATCHES', 500, tableY + 33);
    ctx.fillText('WINS', 660, tableY + 33);
    ctx.fillText('WIN RATE', 800, tableY + 33);
    ctx.textAlign = 'right';
    ctx.fillText('POINTS', 980, tableY + 33);

    // Standings Rows
    let currentY = tableY + 60;
    sortedStandings.slice(0, 10).forEach((wing, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#1E293B' : '#0F172A';
      ctx.fillRect(60, currentY, width - 120, 54);

      // Rank badge
      ctx.textAlign = 'left';
      if (idx === 0) {
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('🥇 #1', 90, currentY + 35);
      } else if (idx === 1) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('🥈 #2', 90, currentY + 35);
      } else if (idx === 2) {
        ctx.fillStyle = '#D97706';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('🥉 #3', 90, currentY + 35);
      } else {
        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`   #${idx + 1}`, 90, currentY + 35);
      }

      // Wing Name
      ctx.fillStyle = idx < 3 ? '#FFFFFF' : '#E2E8F0';
      ctx.font = idx < 3 ? 'bold 24px sans-serif' : '22px sans-serif';
      ctx.fillText(wing.name, 220, currentY + 35);

      // Matches, Wins, Win Rate
      ctx.textAlign = 'center';
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(String(wing.matches), 500, currentY + 35);
      ctx.fillText(String(wing.wins), 660, currentY + 35);
      ctx.fillText(`${wing.winRate}%`, 800, currentY + 35);

      // Points
      ctx.textAlign = 'right';
      ctx.fillStyle = idx < 3 ? '#F59E0B' : '#38BDF8';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(`${wing.points} pts`, 980, currentY + 35);

      currentY += 56;
    });

    // Footer Timestamp & Branding
    const footerY = height - 90;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, footerY);
    ctx.lineTo(width - 60, footerY);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🗓️ Updated: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 70, footerY + 40);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('🔗 Live at: github.io/SCOT/wing-champions', width - 70, footerY + 40);

    const dataUrl = canvas.toDataURL('image/png');
    setPosterUrl(dataUrl);
    setIsGeneratingPoster(false);
    setIsShareModalOpen(true);
  };

  // --- Format Plain Text for Quick WhatsApp Copy ---
  const generateWhatsAppText = () => {
    let msg = `🏆 *TOPAZ PARK SCOT CHAMPIONSHIP 2026-27* 🏆\n`;
    msg += `_Official Society Wing Standings Bulletin_\n\n`;

    sortedStandings.forEach((w, idx) => {
      const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : '🔹'));
      msg += `${medal} *#${idx + 1} ${w.name}* — ${w.points} pts (${w.wins} Wins, ${w.winRate}% Win Rate)\n`;
    });

    msg += `\n📊 *Total Completed Matches:* ${totalCompletedMatches}\n`;
    if (leaderWing && leaderWing.points > 0) {
      msg += `👑 *Championship Leader:* ${leaderWing.name} (${leaderWing.points} pts)\n`;
    }
    msg += `\n📲 *View live tournament brackets & scores:* https://emailvishalgore.github.io/SCOT/wing-champions/\n`;
    return msg;
  };

  const handleCopyWhatsAppText = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
    if (onShowToast) onShowToast('Standings bulletin copied to clipboard!', 'success');
  };

  const handleDirectWhatsAppShare = () => {
    const text = generateWhatsAppText();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleDownloadPoster = () => {
    if (!posterUrl) return;
    const a = document.createElement('a');
    a.href = posterUrl;
    a.download = `Topaz_SCOT_Standings_${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (onShowToast) onShowToast('Standings poster downloaded!', 'success');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
    >
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-row" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Wing Championship Leaderboard</h1>
            <p className="page-subtitle">Track housing society wing standings, match forms, and points for Season 2026-27</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary"
              onClick={generatePosterImage}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', fontWeight: 700 }}
            >
              <Share2 size={16} /> Share on WhatsApp
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs" style={{ marginTop: '1.25rem' }}>
          <button 
            className={`tab ${activeTab === 'standings' ? 'active' : ''}`}
            onClick={() => setActiveTab('standings')}
          >
            🏆 Wing Standings
          </button>
          <button 
            className={`tab ${activeTab === 'matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('matrix')}
          >
            📊 Event-Wise Points
          </button>
          <button 
            className={`tab ${activeTab === 'performers' ? 'active' : ''}`}
            onClick={() => setActiveTab('performers')}
          >
            ⭐ Society MVPs ({topMVPs.length})
          </button>
        </div>
      </div>

      {/* 🌟 CHAMPIONSHIP STATS RIBBON */}
      <div className="grid-4 mb-lg" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className="stat-info">
            <span className="stat-label">Season Leader</span>
            <span className="stat-value" style={{ color: '#D97706', fontSize: '1.3rem' }}>
              {totalSeasonPoints > 0 ? `${leaderWing?.name} (${leaderWing?.points} pts)` : 'No matches yet'}
            </span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Trophy size={20} />
          </div>
        </div>

        <div className="stat-card green" style={{ borderLeft: '4px solid #10B981' }}>
          <div className="stat-info">
            <span className="stat-label">Completed Matches</span>
            <span className="stat-value">{totalCompletedMatches}</span>
          </div>
          <div className="stat-icon-wrapper green">
            <Swords size={20} />
          </div>
        </div>

        <div className="stat-card amber" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div className="stat-info">
            <span className="stat-label">Most Active Wing</span>
            <span className="stat-value" style={{ fontSize: '1.2rem' }}>
              {mostActiveWing && mostActiveWing.nominations > 0 ? `${mostActiveWing.name} (${mostActiveWing.nominations} regs)` : 'All Wings'}
            </span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: '#DBEAFE', color: '#2563EB' }}>
            <Users size={20} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
          <div className="stat-info">
            <span className="stat-label">Total Points Awarded</span>
            <span className="stat-value">{totalSeasonPoints} pts</span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* --- TAB 1: WING STANDINGS --- */}
      {activeTab === 'standings' && (
        <div className="flex-col gap-lg" style={{ gap: '1.75rem' }}>
          
          {/* 🥇 OLYMPIC TOP 3 PODIUM */}
          {totalSeasonPoints > 0 && (
            <div className="card" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)', border: '1px solid #E2E8F0', padding: '1.75rem 1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span className="badge badge-amber" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                  👑 TOPAZ PARK PODIUM
                </span>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, marginTop: '6px' }}>
                  Championship Leaders
                </h2>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1.2fr 1fr', 
                gap: '0.75rem', 
                alignItems: 'flex-end', 
                maxWidth: '680px', 
                margin: '0 auto', 
                padding: '0 0.5rem' 
              }}>
                
                {/* 🥈 2ND PLACE (SILVER) */}
                <div style={{ textAlign: 'center' }}>
                  {sortedStandings[1] && (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                      <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '50%', 
                        background: '#E2E8F0', 
                        border: '3px solid #94A3B8', 
                        margin: '0 auto 8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '1.4rem', 
                        fontWeight: 800, 
                        color: '#475569' 
                      }}>
                        {sortedStandings[1].letter}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sortedStandings[1].name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>{sortedStandings[1].points} pts</div>
                      <div style={{ 
                        height: '110px', 
                        background: 'linear-gradient(180deg, #CBD5E1 0%, #94A3B8 100%)', 
                        borderRadius: '12px 12px 0 0', 
                        marginTop: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#FFFFFF', 
                        fontWeight: 800, 
                        fontSize: '1.3rem', 
                        boxShadow: '0 4px 10px rgba(0,0,0,0.08)' 
                      }}>
                        🥈 2nd
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* 🥇 1ST PLACE (GOLD) */}
                <div style={{ textAlign: 'center' }}>
                  {sortedStandings[0] && (
                    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                      <div style={{ 
                        width: '72px', 
                        height: '72px', 
                        borderRadius: '50%', 
                        background: '#FEF08A', 
                        border: '4px solid #EAB308', 
                        margin: '0 auto 8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '1.8rem', 
                        fontWeight: 900, 
                        color: '#854D0E',
                        boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)'
                      }}>
                        {sortedStandings[0].letter}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#854D0E' }}>👑 {sortedStandings[0].name}</div>
                      <div style={{ fontSize: '0.9rem', color: '#B45309', fontWeight: 800 }}>{sortedStandings[0].points} pts • {sortedStandings[0].wins} W</div>
                      <div style={{ 
                        height: '150px', 
                        background: 'linear-gradient(180deg, #FCD34D 0%, #F59E0B 100%)', 
                        borderRadius: '14px 14px 0 0', 
                        marginTop: '10px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#78350F', 
                        fontWeight: 900, 
                        fontSize: '1.5rem', 
                        boxShadow: '0 6px 16px rgba(245, 158, 11, 0.3)' 
                      }}>
                        <Trophy size={28} style={{ marginBottom: '4px' }} />
                        1st
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* 🥉 3RD PLACE (BRONZE) */}
                <div style={{ textAlign: 'center' }}>
                  {sortedStandings[2] && (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
                      <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '50%', 
                        background: '#FFEDD5', 
                        border: '3px solid #F97316', 
                        margin: '0 auto 8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '1.4rem', 
                        fontWeight: 800, 
                        color: '#9A3412' 
                      }}>
                        {sortedStandings[2].letter}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sortedStandings[2].name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>{sortedStandings[2].points} pts</div>
                      <div style={{ 
                        height: '90px', 
                        background: 'linear-gradient(180deg, #FED7AA 0%, #FB923C 100%)', 
                        borderRadius: '12px 12px 0 0', 
                        marginTop: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#7C2D12', 
                        fontWeight: 800, 
                        fontSize: '1.2rem', 
                        boxShadow: '0 4px 10px rgba(0,0,0,0.08)' 
                      }}>
                        🥉 3rd
                      </div>
                    </motion.div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Full Table List with Form Guide */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '70px' }}>Rank</th>
                    <th>Wing Name</th>
                    <th style={{ textAlign: 'center' }}>Matches</th>
                    <th style={{ textAlign: 'center' }}>Wins</th>
                    <th style={{ textAlign: 'center' }}>Win Rate</th>
                    <th style={{ textAlign: 'center' }}>Recent Form</th>
                    <th style={{ textAlign: 'right' }}>Total Points</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStandings.map((row, index) => {
                    const isUserWing = row.name === user.wing || row.wingId === user.wingId;
                    const rankNum = totalSeasonPoints > 0 ? index + 1 : '-';
                    const hasMedal = totalSeasonPoints > 0 && index < 3;
                    const wingColor = WING_COLORS[row.letter] || { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };

                    return (
                      <tr 
                        key={row.wingId} 
                        style={isUserWing ? { backgroundColor: 'var(--color-primary-lighter)', fontWeight: 700 } : { cursor: 'pointer' }}
                        onClick={() => setSelectedWingDrawer(row)}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ 
                              width: '32px', 
                              height: '32px', 
                              borderRadius: '8px', 
                              background: wingColor.bg, 
                              color: wingColor.text, 
                              border: `1px solid ${wingColor.border}`, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: 800, 
                              fontSize: '0.85rem' 
                            }}>
                              {row.letter}
                            </div>
                            <div>
                              <strong style={{ color: 'var(--color-text)', fontSize: '0.95rem', display: 'block' }}>{row.name}</strong>
                              {isUserWing && <span className="badge badge-violet" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Your Wing</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{row.matches}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: row.wins > 0 ? '#059669' : 'var(--color-text-secondary)' }}>
                          {row.wins}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: row.winRate >= 50 ? '#059669' : '#64748B' }}>
                            {row.winRate}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {row.form.length > 0 ? (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              {row.form.map((res, i) => (
                                <span 
                                  key={i} 
                                  style={{ 
                                    width: '18px', 
                                    height: '18px', 
                                    borderRadius: '50%', 
                                    background: res === 'W' ? '#10B981' : '#EF4444', 
                                    color: '#FFFFFF', 
                                    fontSize: '0.65rem', 
                                    fontWeight: 800, 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center' 
                                  }}
                                >
                                  {res}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-primary-dark)', fontSize: '1.05rem' }}>
                          {row.points} pts
                        </td>
                        <td style={{ textAlign: 'right', color: '#94A3B8' }}>
                          <ChevronRight size={16} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: SPORT-WISE POINTS MATRIX --- */}
      {activeTab === 'matrix' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700 }}>
              Sport-Wise Championship Points Breakdown
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              View points earned by each wing across specific society sports and cultural tournaments.
            </p>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Wing</th>
                  {(state.events || []).map(evt => (
                    <th key={evt.id} style={{ textAlign: 'center' }}>{evt.name}</th>
                  ))}
                  <th style={{ textAlign: 'right' }}>Total Points</th>
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map(wing => (
                  <tr key={wing.wingId}>
                    <td>
                      <strong style={{ color: 'var(--color-text)' }}>{wing.name}</strong>
                    </td>
                    {(state.events || []).map(evt => {
                      const evtPts = wing.breakdown[evt.id] || 0;
                      return (
                        <td key={evt.id} style={{ textAlign: 'center' }}>
                          {evtPts > 0 ? (
                            <span className="badge badge-green" style={{ fontWeight: 700 }}>+{evtPts} pts</span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>0</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                      {wing.points} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: TOP PERFORMERS / MVPS --- */}
      {activeTab === 'performers' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700 }}>
              ⭐ Tournament MVPs & Top Performers
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Celebrating star players with the highest match victories and points contribution.
            </p>
          </div>

          {topMVPs.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rank</th>
                    <th>Player / Team Name</th>
                    <th>Wing</th>
                    <th style={{ textAlign: 'center' }}>Matches Won</th>
                    <th style={{ textAlign: 'right' }}>Points Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {topMVPs.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <span className={`rank-badge ${index === 0 ? 'rank-1' : (index === 1 ? 'rank-2' : 'rank-3')}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--color-text)' }}>{row.name}</strong>
                      </td>
                      <td>
                        <span className="badge badge-violet">{row.wing ? `Wing ${row.wing}` : 'Society'}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                        {row.wins} {row.wins === 1 ? 'Win' : 'Wins'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                        +{row.points} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-secondary)' }}>
              <Award size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700 }}>No Match Winners Recorded Yet</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', maxWidth: '420px', margin: '0.5rem auto 0' }}>
                MVP standings will populate as Champions enter scores and complete tournament brackets.
              </p>
            </div>
          )}
        </div>
      )}

      {/* --- 📱 WING DETAILS DRAWER / MODAL --- */}
      <AnimatePresence>
        {selectedWingDrawer && (
          <div className="modal-backdrop" onClick={() => setSelectedWingDrawer(null)}>
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '480px' }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '10px', 
                    background: WING_COLORS[selectedWingDrawer.letter]?.bg || '#EEF2FF', 
                    color: WING_COLORS[selectedWingDrawer.letter]?.text || '#4F46E5', 
                    border: `1.5px solid ${WING_COLORS[selectedWingDrawer.letter]?.border || '#C7D2FE'}`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 900, 
                    fontSize: '1.2rem' 
                  }}>
                    {selectedWingDrawer.letter}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedWingDrawer.name} Profile</h3>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      {selectedWingDrawer.points} Total Points • {selectedWingDrawer.wins} Match Wins
                    </span>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setSelectedWingDrawer(null)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '1rem 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '10px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Win Rate</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                      {selectedWingDrawer.winRate}%
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '10px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Matches</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                      {selectedWingDrawer.matches}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '10px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Registrations</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                      {selectedWingDrawer.nominations}
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#334155' }}>
                  Points by Tournament:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {(state.events || []).map(e => {
                    const pts = selectedWingDrawer.breakdown[e.id] || 0;
                    return (
                      <div key={e.id} className="flex-between" style={{ padding: '0.5rem 0.75rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{e.name}</span>
                        <span style={{ fontWeight: 800, color: pts > 0 ? '#059669' : '#94A3B8' }}>
                          {pts > 0 ? `+${pts} pts` : '0 pts'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => {
                    const text = `🎉 Cheer for *${selectedWingDrawer.name}* in SCOT 2026!\n🔥 Current Points: *${selectedWingDrawer.points} pts* (${selectedWingDrawer.wins} Wins, ${selectedWingDrawer.winRate}% Win Rate)\n📲 Track our wing on the live leaderboard: https://emailvishalgore.github.io/SCOT/wing-champions/`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                >
                  📣 Share {selectedWingDrawer.name} Standings on WhatsApp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- 📸 WHATSAPP POSTER SHARE MODAL (Option B) --- */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsShareModalOpen(false)}>
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>📸 Share Standings Poster</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Ready to share to WhatsApp society groups & status</span>
                </div>
                <button className="btn-icon" onClick={() => setIsShareModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '1rem 0' }}>
                {posterUrl && (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginBottom: '1.25rem' }}>
                    <img src={posterUrl} alt="SCOT Standings Poster" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={handleDownloadPoster}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Download size={16} /> Download Poster
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleDirectWhatsAppShare}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#059669', borderColor: '#10B981' }}
                  >
                    <MessageCircle size={16} /> Open WhatsApp
                  </button>
                </div>

                <button 
                  className="btn btn-secondary"
                  onClick={handleCopyWhatsAppText}
                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {copiedText ? <Check size={16} style={{ color: '#059669' }} /> : <Copy size={16} />}
                  {copiedText ? 'Bulletin Copied!' : 'Copy Formatted Text Message'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
