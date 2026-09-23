import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Trophy, Award, Medal, Share2, Download, Sparkles, ChevronRight, MessageCircle, Copy, Check, Users, X } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('standings'); // 'standings', 'matrix', 'honor_roll'
  const [selectedWingDrawer, setSelectedWingDrawer] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [posterUrl, setPosterUrl] = useState(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

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

    if (isNaN(winPts)) winPts = 100;
    if (isNaN(runPts)) runPts = 50;

    return { winnerPoints: winPts, runnerUpPoints: runPts };
  };

  // Compute standings directly from completed events/sub-events
  const wingStats = {};
  const wingEventBreakdown = {}; // { 'U': { 'evt-1': 100, 'evt-2': 50 } }
  const completedResultsList = []; // List of all completed tournament podiums
  let totalDeclaredPodiums = 0;

  ['N','O','P','Q','R','S','T','U','V','W'].forEach(w => {
    wingStats[w] = { points: 0, wins: 0, gold: 0, silver: 0, events: new Set() };
    wingEventBreakdown[w] = {};
  });

  (state.events || []).forEach(evt => {
    const processResult = (item, subId, subTitle) => {
      if (item && item.status === 'COMPLETED' && (item.winner || item.runnerUp)) {
        totalDeclaredPodiums++;
        const { winnerPoints, runnerUpPoints } = getEventPoints(evt, subId);

        let winWingLetter = null;
        let runWingLetter = null;

        if (item.winner && item.winner.wing) {
          winWingLetter = String(item.winner.wing).replace(/Wing\s*/i, '').trim().toUpperCase();
          if (wingStats[winWingLetter]) {
            wingStats[winWingLetter].points += winnerPoints;
            wingStats[winWingLetter].wins += 1;
            wingStats[winWingLetter].gold += 1;
            wingStats[winWingLetter].events.add(evt.id);
            wingEventBreakdown[winWingLetter][evt.id] = (wingEventBreakdown[winWingLetter][evt.id] || 0) + winnerPoints;
          }
        }

        if (item.runnerUp && item.runnerUp.wing) {
          runWingLetter = String(item.runnerUp.wing).replace(/Wing\s*/i, '').trim().toUpperCase();
          if (wingStats[runWingLetter]) {
            wingStats[runWingLetter].points += runnerUpPoints;
            wingStats[runWingLetter].silver += 1;
            wingStats[runWingLetter].events.add(evt.id);
            wingEventBreakdown[runWingLetter][evt.id] = (wingEventBreakdown[runWingLetter][evt.id] || 0) + runnerUpPoints;
          }
        }

        completedResultsList.push({
          eventId: evt.id,
          eventName: evt.name,
          category: evt.category || 'Sports',
          subId,
          subName: subTitle || evt.name,
          winner: item.winner,
          runnerUp: item.runnerUp,
          winnerPoints,
          runnerUpPoints,
          completedAt: item.completedAt
        });
      }
    };

    if (evt.subEvents && evt.subEvents.length > 0) {
      evt.subEvents.forEach(sub => processResult(sub, sub.id, sub.name));
    } else {
      processResult(evt, null, evt.name);
    }
  });

  // Calculate nominations count per wing
  const wingNominationsCount = {};
  (state.registrations || []).forEach(r => {
    let w = null;
    if (r.wing) {
      w = String(r.wing).replace(/Wing\s*/i, '').trim().toUpperCase();
    } else {
      const wm = String(r.name || '').match(/Wing\s*([A-Za-z0-9]+)/i);
      if (wm) w = wm[1].toUpperCase();
    }
    if (w && wingStats[w]) {
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
    const stats = wingStats[letter] || { points: 0, wins: 0, gold: 0, silver: 0, events: new Set() };

    return {
      wingId: w.id || `wing-${letter.toLowerCase()}`,
      name: w.name || `Wing ${letter}`,
      letter,
      points: stats.points,
      wins: stats.wins,
      gold: stats.gold,
      silver: stats.silver,
      events: stats.events.size,
      nominations: wingNominationsCount[letter] || 0,
      breakdown: wingEventBreakdown[letter] || {}
    };
  });

  // Sort wings by points descending, then gold medals, then silver medals
  const sortedStandings = [...computedStandings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return a.name.localeCompare(b.name);
  });

  // Compute standard competition rank (1224 ranking) with tie detection
  let currentRank = 1;
  for (let i = 0; i < sortedStandings.length; i++) {
    if (i > 0 && sortedStandings[i].points < sortedStandings[i - 1].points) {
      currentRank = i + 1;
    }
    sortedStandings[i].rank = currentRank;
    sortedStandings[i].isTied = (i > 0 && sortedStandings[i].points === sortedStandings[i - 1].points) ||
                                (i < sortedStandings.length - 1 && sortedStandings[i].points === sortedStandings[i + 1].points);
  }

  const totalSeasonPoints = sortedStandings.reduce((sum, item) => sum + (item.points || 0), 0);
  const leaderWing = sortedStandings[0];
  const mostActiveWing = [...computedStandings].sort((a, b) => b.nominations - a.nominations)[0];

  // --- 🎨 Generate High-Resolution Scorecard Poster Image (Canvas) ---
  const generatePosterImage = () => {
    setIsGeneratingPoster(true);
    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background Gradient (Ultra-Luxury Deep Midnight & Indigo)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#090D16');
    bgGradient.addColorStop(0.3, '#111827');
    bgGradient.addColorStop(0.7, '#1E1B4B');
    bgGradient.addColorStop(1, '#090D16');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative Gold Accent Inlay Borders
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, width - 72, height - 72);

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(44, 44, width - 88, height - 88);

    // Header Crest & Title
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐ TOPAZ PARK HOUSING SOCIETY ⭐', width / 2, 92);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 44px sans-serif';
    ctx.fillText('WING CHAMPIONSHIP 2026-27', width / 2, 146);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '600 20px sans-serif';
    ctx.fillText('Official Society Points & Medals Leaderboard', width / 2, 184);

    // Top 3 Olympic Podium Graphic Box
    const podiumY = 230;
    const podiumHeight = 280;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(60, podiumY, width - 120, podiumHeight, 18);
    ctx.fill();
    ctx.stroke();

    // Helper to draw podium cards on canvas supporting tied ranks
    const drawPodiumCard = (wing, x, y, w, h, defaultRankNum, isCenter = false) => {
      if (!wing) return;
      const rankNum = wing.rank || defaultRankNum;
      const isGold = rankNum === 1;
      const isSilver = rankNum === 2;
      const isBronze = rankNum === 3;

      let cardBg = '#E2E8F0';
      let titleText = `🥈 2ND PLACE`;
      let titleColor = '#475569';
      let wingColor = '#334155';
      let ptsColor = '#334155';
      let subColor = '#475569';

      if (isGold) {
        cardBg = '#FEF08A';
        titleText = wing.isTied ? '👑 1ST (TIED)' : '👑 1ST PLACE';
        titleColor = '#854D0E';
        wingColor = '#854D0E';
        ptsColor = '#B45309';
        subColor = '#78350F';
      } else if (isSilver) {
        cardBg = '#E2E8F0';
        titleText = wing.isTied ? '🥈 2ND (TIED)' : '🥈 2ND PLACE';
        titleColor = '#475569';
        wingColor = '#334155';
        ptsColor = '#334155';
        subColor = '#475569';
      } else if (isBronze) {
        cardBg = '#FFEDD5';
        titleText = wing.isTied ? '🥉 3RD (TIED)' : '🥉 3RD PLACE';
        titleColor = '#9A3412';
        wingColor = '#9A3412';
        ptsColor = '#9A3412';
        subColor = '#7C2D12';
      } else {
        cardBg = '#F1F5F9';
        titleText = `#${rankNum} PLACE`;
        titleColor = '#64748B';
        wingColor = '#1E293B';
        ptsColor = '#64748B';
        subColor = '#64748B';
      }

      ctx.fillStyle = cardBg;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 14);
      ctx.fill();

      const centerX = x + w / 2;
      ctx.fillStyle = titleColor;
      ctx.font = isCenter ? '900 24px sans-serif' : 'bold 20px sans-serif';
      ctx.fillText(titleText, centerX, y + 42);

      ctx.fillStyle = wingColor;
      ctx.font = isCenter ? '900 46px sans-serif' : '900 36px sans-serif';
      ctx.fillText(`WING ${wing.letter}`, centerX, y + (isCenter ? 105 : 95));

      ctx.fillStyle = ptsColor;
      ctx.font = isCenter ? 'bold 28px sans-serif' : 'bold 24px sans-serif';
      ctx.fillText(`${wing.points} PTS`, centerX, y + (isCenter ? 155 : 138));

      ctx.fillStyle = subColor;
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`🥇 ${wing.gold} Gold  🥈 ${wing.silver} Silver`, centerX, y + (isCenter ? 192 : 172));
    };

    // 🥇 Rank 1 (Center)
    drawPodiumCard(sortedStandings[0], width / 2 - 130, podiumY + 25, 260, 230, 1, true);

    // 🥈 Rank 2 (Left)
    drawPodiumCard(sortedStandings[1], 85, podiumY + 55, 220, 200, 2, false);

    // 🥉 Rank 3 (Right)
    drawPodiumCard(sortedStandings[2], width - 305, podiumY + 55, 220, 200, 3, false);

    // Full Standings Table Header
    const tableY = 550;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(60, tableY, width - 120, 52);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('RANK', 90, tableY + 34);
    ctx.fillText('WING', 230, tableY + 34);
    ctx.textAlign = 'center';
    ctx.fillText('GOLD 🥇', 540, tableY + 34);
    ctx.fillText('SILVER 🥈', 720, tableY + 34);
    ctx.textAlign = 'right';
    ctx.fillText('POINTS', 980, tableY + 34);

    // Standings Rows
    let currentY = tableY + 62;
    sortedStandings.slice(0, 10).forEach((wing, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(60, currentY, width - 120, 56);

      // Rank badge
      ctx.textAlign = 'left';
      if (wing.rank === 1) {
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(wing.isTied ? '🥇 #1 (T)' : '🥇 #1', 90, currentY + 36);
      } else if (wing.rank === 2) {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(wing.isTied ? '🥈 #2 (T)' : '🥈 #2', 90, currentY + 36);
      } else if (wing.rank === 3) {
        ctx.fillStyle = '#F97316';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(wing.isTied ? '🥉 #3 (T)' : '🥉 #3', 90, currentY + 36);
      } else {
        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`   #${wing.rank}`, 90, currentY + 36);
      }

      // Wing Name
      ctx.fillStyle = idx < 3 ? '#FFFFFF' : '#E2E8F0';
      ctx.font = idx < 3 ? 'bold 24px sans-serif' : '22px sans-serif';
      ctx.fillText(wing.name, 230, currentY + 36);

      // Gold & Silver Medals
      ctx.textAlign = 'center';
      ctx.fillStyle = wing.gold > 0 ? '#F59E0B' : '#64748B';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`${wing.gold}`, 540, currentY + 36);

      ctx.fillStyle = wing.silver > 0 ? '#CBD5E1' : '#64748B';
      ctx.fillText(`${wing.silver}`, 720, currentY + 36);

      // Total Points
      ctx.textAlign = 'right';
      ctx.fillStyle = idx === 0 ? '#F59E0B' : (idx < 3 ? '#38BDF8' : '#FFFFFF');
      ctx.font = '900 26px sans-serif';
      ctx.fillText(`${wing.points} pts`, 980, currentY + 36);

      currentY += 58;
    });

    // Summary Ribbon Above Footer
    const summaryY = height - 145;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.fillRect(60, summaryY, width - 120, 42);
    ctx.fillStyle = '#FCD34D';
    ctx.font = '600 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🏆 Total Championship Points: ${totalSeasonPoints} pts  •  Total Events Decided: ${totalDeclaredPodiums}`, width / 2, summaryY + 27);

    // Footer Timestamp & Branding
    const footerY = height - 85;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, footerY);
    ctx.lineTo(width - 60, footerY);
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🗓️ Bulletin Generated: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 70, footerY + 38);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('🔗 Live at: emailvishalgore.github.io/SCOT/wing-champions/', width - 70, footerY + 38);

    const dataUrl = canvas.toDataURL('image/png');
    setPosterUrl(dataUrl);
    setIsGeneratingPoster(false);
    setIsShareModalOpen(true);
  };

  // --- Format Plain Text for Quick WhatsApp Copy ---
  const generateWhatsAppText = () => {
    let msg = `🏆 *TOPAZ PARK SCOT CHAMPIONSHIP 2026-27* 🏆\n`;
    msg += `_Official Society Wing Standings Bulletin_\n\n`;

    sortedStandings.forEach((w) => {
      const medal = w.rank === 1 ? '🥇' : (w.rank === 2 ? '🥈' : (w.rank === 3 ? '🥉' : '🔹'));
      const tiedTag = w.isTied ? ' (Tied)' : '';
      msg += `${medal} *#${w.rank}${tiedTag} ${w.name}* — *${w.points} pts* (🥇 ${w.gold} Gold, 🥈 ${w.silver} Silver)\n`;
    });

    msg += `\n📊 *Total Season Points:* ${totalSeasonPoints} pts\n`;
    msg += `🎯 *Decided Events:* ${totalDeclaredPodiums}\n`;
    const tiedLeaders = sortedStandings.filter(w => w.rank === 1 && w.points > 0);
    if (tiedLeaders.length > 1) {
      msg += `👑 *Championship Co-Leaders (Tied):* ${tiedLeaders.map(w => w.name).join(', ')} (${tiedLeaders[0].points} pts each)\n`;
    } else if (leaderWing && leaderWing.points > 0) {
      msg += `👑 *Championship Leader:* ${leaderWing.name} (${leaderWing.points} pts)\n`;
    }
    msg += `\n📲 *Track live scores & results:* https://emailvishalgore.github.io/SCOT/wing-champions/\n`;
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
            <h1 className="page-title">Leaderboard & Posters</h1>
            <p className="page-subtitle">Track housing society wing standings, medal tallies, and points for Season 2026-27</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary"
              onClick={generatePosterImage}
              disabled={isGeneratingPoster}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', fontWeight: 800, padding: '10px 18px', fontSize: '0.95rem' }}
            >
              <Share2 size={18} /> {isGeneratingPoster ? 'Generating Poster...' : 'Generate Shareable Poster (WhatsApp)'}
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
            className={`tab ${activeTab === 'honor_roll' ? 'active' : ''}`}
            onClick={() => setActiveTab('honor_roll')}
          >
            🎖️ Medals Honor Roll ({completedResultsList.length})
          </button>
        </div>
      </div>

      {/* 🌟 CHAMPIONSHIP STATS RIBBON */}
      <div className="grid-4 mb-lg" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className="stat-info">
            <span className="stat-label">Season Leader</span>
            <span className="stat-value" style={{ color: '#D97706', fontSize: '1.15rem' }}>
              {totalSeasonPoints > 0 ? (
                sortedStandings.filter(w => w.rank === 1).length > 1
                  ? `Wings ${sortedStandings.filter(w => w.rank === 1).map(w => w.letter).join(', ')} (${leaderWing?.points} pts - Tied)`
                  : `${leaderWing?.name} (${leaderWing?.points} pts)`
              ) : 'No events scored'}
            </span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Trophy size={20} />
          </div>
        </div>

        <div className="stat-card green" style={{ borderLeft: '4px solid #10B981' }}>
          <div className="stat-info">
            <span className="stat-label">Decided Podiums</span>
            <span className="stat-value">{totalDeclaredPodiums}</span>
          </div>
          <div className="stat-icon-wrapper green">
            <Medal size={20} />
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
                  {sortedStandings[0]?.isTied && sortedStandings[1]?.rank === 1
                    ? 'Championship Co-Leaders (Tied for 1st)'
                    : 'Championship Leaders'}
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
                
                {/* 🥈 PODIUM LEFT */}
                <div style={{ textAlign: 'center' }}>
                  {sortedStandings[1] && (() => {
                    const item = sortedStandings[1];
                    const isRank1 = item.rank === 1;
                    const isRank2 = item.rank === 2;
                    const circleBg = isRank1 ? '#FEF08A' : (isRank2 ? '#E2E8F0' : '#FFEDD5');
                    const circleBorder = isRank1 ? '#EAB308' : (isRank2 ? '#94A3B8' : '#F97316');
                    const circleColor = isRank1 ? '#854D0E' : (isRank2 ? '#475569' : '#9A3412');
                    const pedestalBg = isRank1 
                      ? 'linear-gradient(180deg, #FCD34D 0%, #F59E0B 100%)' 
                      : (isRank2 ? 'linear-gradient(180deg, #CBD5E1 0%, #94A3B8 100%)' : 'linear-gradient(180deg, #FED7AA 0%, #FB923C 100%)');
                    const pedestalColor = isRank1 ? '#78350F' : (isRank2 ? '#FFFFFF' : '#7C2D12');
                    const pedestalLabel = isRank1 
                      ? (item.isTied ? '🥇 1st (Tied)' : '🥇 1st') 
                      : (isRank2 ? (item.isTied ? '🥈 2nd (Tied)' : '🥈 2nd') : (item.isTied ? '🥉 3rd (Tied)' : '🥉 3rd'));

                    return (
                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                        <div style={{ 
                          width: '56px', 
                          height: '56px', 
                          borderRadius: '50%', 
                          background: circleBg, 
                          border: `3px solid ${circleBorder}`, 
                          margin: '0 auto 8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '1.4rem', 
                          fontWeight: 800, 
                          color: circleColor 
                        }}>
                          {item.letter}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>{item.points} pts</div>
                        <div style={{ 
                          height: '110px', 
                          background: pedestalBg, 
                          borderRadius: '12px 12px 0 0', 
                          marginTop: '10px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: pedestalColor, 
                          fontWeight: 800, 
                          fontSize: '1.15rem', 
                          boxShadow: '0 4px 10px rgba(0,0,0,0.08)' 
                        }}>
                          {pedestalLabel}
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>

                {/* 🥇 PODIUM CENTER */}
                <div style={{ textAlign: 'center' }}>
                  {sortedStandings[0] && (() => {
                    const item = sortedStandings[0];
                    return (
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
                          {item.letter}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#854D0E' }}>👑 {item.name}</div>
                        <div style={{ fontSize: '0.9rem', color: '#B45309', fontWeight: 800 }}>{item.points} pts • {item.gold} 🥇</div>
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
                          fontSize: '1.4rem', 
                          boxShadow: '0 6px 16px rgba(245, 158, 11, 0.3)' 
                        }}>
                          <Trophy size={28} style={{ marginBottom: '4px' }} />
                          {item.isTied ? '1st (Tied)' : '1st'}
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>

                {/* 🥉 PODIUM RIGHT */}
                <div style={{ textAlign: 'center' }}>
                  {sortedStandings[2] && (() => {
                    const item = sortedStandings[2];
                    const isRank1 = item.rank === 1;
                    const isRank2 = item.rank === 2;
                    const isRank3 = item.rank === 3;
                    const circleBg = isRank1 ? '#FEF08A' : (isRank2 ? '#E2E8F0' : '#FFEDD5');
                    const circleBorder = isRank1 ? '#EAB308' : (isRank2 ? '#94A3B8' : '#F97316');
                    const circleColor = isRank1 ? '#854D0E' : (isRank2 ? '#475569' : '#9A3412');
                    const pedestalBg = isRank1 
                      ? 'linear-gradient(180deg, #FCD34D 0%, #F59E0B 100%)' 
                      : (isRank2 ? 'linear-gradient(180deg, #CBD5E1 0%, #94A3B8 100%)' : 'linear-gradient(180deg, #FED7AA 0%, #FB923C 100%)');
                    const pedestalColor = isRank1 ? '#78350F' : (isRank2 ? '#FFFFFF' : '#7C2D12');
                    const pedestalLabel = isRank1 
                      ? (item.isTied ? '🥇 1st (Tied)' : '🥇 1st') 
                      : (isRank2 ? (item.isTied ? '🥈 2nd (Tied)' : '🥈 2nd') : (item.isTied ? '🥉 3rd (Tied)' : '🥉 3rd'));

                    return (
                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
                        <div style={{ 
                          width: '56px', 
                          height: '56px', 
                          borderRadius: '50%', 
                          background: circleBg, 
                          border: `3px solid ${circleBorder}`, 
                          margin: '0 auto 8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '1.4rem', 
                          fontWeight: 800, 
                          color: circleColor 
                        }}>
                          {item.letter}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>{item.points} pts</div>
                        <div style={{ 
                          height: '90px', 
                          background: pedestalBg, 
                          borderRadius: '12px 12px 0 0', 
                          marginTop: '10px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: pedestalColor, 
                          fontWeight: 800, 
                          fontSize: '1.15rem', 
                          boxShadow: '0 4px 10px rgba(0,0,0,0.08)' 
                        }}>
                          {pedestalLabel}
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>

              </div>
            </div>
          )}

          {/* Full Table List */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Rank</th>
                    <th>Wing Name</th>
                    <th style={{ textAlign: 'center' }}>Gold 🥇</th>
                    <th style={{ textAlign: 'center' }}>Silver 🥈</th>
                    <th style={{ textAlign: 'center' }}>Events Scored</th>
                    <th style={{ textAlign: 'right' }}>Total Points</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStandings.map((row) => {
                    const isUserWing = row.name === user.wing || row.wingId === user.wingId;
                    const rankNum = totalSeasonPoints > 0 ? row.rank : '-';
                    const hasMedal = totalSeasonPoints > 0 && row.rank <= 3;
                    const wingColor = WING_COLORS[row.letter] || { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };

                    return (
                      <tr 
                        key={row.wingId} 
                        style={isUserWing ? { backgroundColor: 'var(--color-primary-lighter)', fontWeight: 700 } : { cursor: 'pointer' }}
                        onClick={() => setSelectedWingDrawer(row)}
                      >
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {hasMedal ? (
                              <span className={`rank-badge rank-${row.rank}`}>
                                {row.rank}
                              </span>
                            ) : (
                              <span className="badge badge-slate" style={{ width: '28px', justifyContent: 'center' }}>
                                {rankNum}
                              </span>
                            )}
                            {row.isTied && totalSeasonPoints > 0 && (
                              <span className="badge badge-amber" style={{ fontSize: '0.62rem', padding: '1px 5px', lineHeight: 1.2 }}>
                                Tied
                              </span>
                            )}
                          </div>
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
                        <td style={{ textAlign: 'center', fontWeight: 700, color: row.gold > 0 ? '#D97706' : 'var(--color-text-secondary)' }}>
                          {row.gold > 0 ? `${row.gold} 🥇` : '0'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: row.silver > 0 ? '#64748B' : 'var(--color-text-secondary)' }}>
                          {row.silver > 0 ? `${row.silver} 🥈` : '0'}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          {row.events}
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
              Event-Wise Championship Points Breakdown
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Points earned by each wing across tournaments and cultural categories.
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

      {/* --- TAB 3: MEDALS & RESULTS HONOR ROLL --- */}
      {activeTab === 'honor_roll' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
              🎖️ Tournament Medals & Results Honor Roll
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Official Winner (Gold 🥇) and Runner-Up (Silver 🥈) podium results declared for SCOT 2026-27.
            </p>
          </div>

          {completedResultsList.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {completedResultsList.map((res, idx) => (
                <div key={idx} style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="flex-between">
                    <div>
                      <span className="badge badge-violet" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>{res.category}</span>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                        {res.subName}
                      </h3>
                      {res.subName !== res.eventName && (
                        <span style={{ fontSize: '0.75rem', color: '#6B21A8' }}>{res.eventName}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {res.winner && (
                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #FCD34D', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="flex-between">
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase' }}>🥇 Winner (Gold)</div>
                            <strong style={{ fontSize: '0.9rem', color: '#78350F' }}>{res.winner.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#92400E' }}>{res.winner.wing} {res.winner.flat ? `(Flat ${res.winner.flat})` : ''}</div>
                          </div>
                          <span style={{ fontWeight: 800, color: '#B45309', fontFamily: 'var(--font-mono)' }}>+{res.winnerPoints} pts</span>
                        </div>
                        {res.winner.members && res.winner.members.length > 0 && (
                          <div style={{ fontSize: '0.73rem', color: '#92400E', borderTop: '1px dashed #FDE68A', paddingTop: '4px', marginTop: '2px' }}>
                            👥 <strong>Team Members:</strong> {res.winner.members.map(m => `${m.name}${m.flat ? ` (${m.flat})` : ''}`).join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {res.runnerUp && (
                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="flex-between">
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>🥈 Runner-Up (Silver)</div>
                            <strong style={{ fontSize: '0.9rem', color: '#1E293B' }}>{res.runnerUp.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#475569' }}>{res.runnerUp.wing} {res.runnerUp.flat ? `(Flat ${res.runnerUp.flat})` : ''}</div>
                          </div>
                          <span style={{ fontWeight: 800, color: '#475569', fontFamily: 'var(--font-mono)' }}>+{res.runnerUpPoints} pts</span>
                        </div>
                        {res.runnerUp.members && res.runnerUp.members.length > 0 && (
                          <div style={{ fontSize: '0.73rem', color: '#475569', borderTop: '1px dashed #CBD5E1', paddingTop: '4px', marginTop: '2px' }}>
                            👥 <strong>Team Members:</strong> {res.runnerUp.members.map(m => `${m.name}${m.flat ? ` (${m.flat})` : ''}`).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-secondary)' }}>
              <Award size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700 }}>No Event Results Declared Yet</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', maxWidth: '420px', margin: '0.5rem auto 0' }}>
                Podiums will appear here as Admins and Event Champions declare Winner and Runner-Up results for competitions.
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedWingDrawer.name} Profile</h3>
                      {selectedWingDrawer.rank && (
                        <span className={`badge ${selectedWingDrawer.rank === 1 ? 'badge-amber' : 'badge-slate'}`} style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                          Rank #{selectedWingDrawer.rank}{selectedWingDrawer.isTied ? ' (Tied)' : ''}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      {selectedWingDrawer.points} Total Points • 🥇 {selectedWingDrawer.gold} Gold • 🥈 {selectedWingDrawer.silver} Silver
                    </span>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setSelectedWingDrawer(null)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '1rem 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.75rem', background: '#FEF3C7', borderRadius: '10px', textAlign: 'center', border: '1px solid #FCD34D' }}>
                    <div style={{ fontSize: '0.75rem', color: '#92400E' }}>Gold 🥇</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#B45309', marginTop: '2px' }}>
                      {selectedWingDrawer.gold}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '10px', textAlign: 'center', border: '1px solid #CBD5E1' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Silver 🥈</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#475569', marginTop: '2px' }}>
                      {selectedWingDrawer.silver}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: '#EFF6FF', borderRadius: '10px', textAlign: 'center', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '0.75rem', color: '#1E40AF' }}>Registrations</div>
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
                    const text = `🎉 Cheer for *${selectedWingDrawer.name}* in SCOT 2026!\n🔥 Current Points: *${selectedWingDrawer.points} pts* (🥇 ${selectedWingDrawer.gold} Gold, 🥈 ${selectedWingDrawer.silver} Silver)\n📲 Track our wing on the live leaderboard: https://emailvishalgore.github.io/SCOT/wing-champions/`;
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

      {/* --- 📸 WHATSAPP POSTER SHARE MODAL --- */}
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
