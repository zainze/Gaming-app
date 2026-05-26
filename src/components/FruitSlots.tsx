import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, Plus, Minus, Play, Sparkles, Trophy, Star, HelpCircle, 
  Volume2, VolumeX, RotateCcw, Flame, Check, Coins 
} from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface FruitSlotsProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number; // legacy multiplier, we will use dynamic symbols multipliers
}

interface SlotSymbol {
  char: string;
  name: string;
  mult: number;
  color: string;
}

const SLOT_SYMBOLS: SlotSymbol[] = [
  { char: '7️⃣', name: 'Lucky Seven', mult: 25, color: '#EF4444' },
  { char: '💎', name: 'Royal Diamond', mult: 15, color: '#06B6D4' },
  { char: '🔔', name: 'Golden Bell', mult: 10, color: '#F59E0B' },
  { char: '🍉', name: 'Watermelon', mult: 7, color: '#10B981' },
  { char: '🍇', name: 'Grapes', mult: 5, color: '#8B5CF6' },
  { char: '🍊', name: 'Sweet Orange', mult: 4, color: '#F97316' },
  { char: '🍋', name: 'Tart Lemon', mult: 3, color: '#EAB308' },
  { char: '🍒', name: 'Fresh Cherry', mult: 2, color: '#EC4899' }
];

const CHIPS = [10, 50, 100, 500, 1000, 5000];

// The 5 Paylines mappings (Coordinates: [col, row])
const PAYLINES = [
  { id: 1, name: 'Middle Line', coords: [[0, 1], [1, 1], [2, 1]], color: '#FF0055' },
  { id: 2, name: 'Top Line', coords: [[0, 0], [1, 0], [2, 0]], color: '#00FFCC' },
  { id: 3, name: 'Bottom Line', coords: [[0, 2], [1, 2], [2, 2]], color: '#FFAA00' },
  { id: 4, name: 'Diagonal Down', coords: [[0, 0], [1, 1], [2, 2]], color: '#9900FF' },
  { id: 5, name: 'Diagonal Up', coords: [[0, 2], [1, 1], [2, 0]], color: '#FFFF00' }
];

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  rotation: number;
  spin: number;
}

export const FruitSlots: React.FC<FruitSlotsProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 42, minBet = 10 
}) => {
  const [bet, setBet] = useState(minBet);
  const [spinning, setSpinning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // 3-reel, 3-row layout structure representing the active view (3 elements per column/reel)
  const [reelsGrid, setReelsGrid] = useState<string[][]>([
    ['🍒', '🍋', '🍇'],  // Reel 0
    ['🍉', '7️⃣', '💎'],   // Reel 1
    ['🍊', '🔔', '🍒']   // Reel 2
  ]);

  const [activeReelSpins, setActiveReelSpins] = useState<boolean[]>([false, false, false]);
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [recentWinAmount, setRecentWinAmount] = useState<number | null>(null);
  const [leverPulled, setLeverPulled] = useState(false);

  // References to keep high performance particle simulation going
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const loopRef = useRef<number | null>(null);
  const nextParticleId = useRef(0);

  // Sound play proxy to observe toggle
  const playLocalSound = (name: 'click' | 'win' | 'lose' | 'spin' | 'chip' | 'coin') => {
    if (soundEnabled) playSound(name);
  };

  // Quick Chips Adjuster
  const addChipToBet = (val: number) => {
    if (spinning) return;
    setBet(prev => Math.min(balance, prev + val));
    playLocalSound('chip');
  };

  const doubleBet = () => {
    if (spinning) return;
    setBet(prev => Math.min(balance, prev * 2));
    playLocalSound('click');
  };

  const clearBet = () => {
    if (spinning) return;
    setBet(minBet);
    playLocalSound('click');
  };

  // Generate a random symbol character
  const getRandomSymbol = () => {
    return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].char;
  };

  // Gold dust explosion simulation
  const triggerGoldExplosion = (centerX: number, centerY: number, color: string = '#F59E0B') => {
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      particlesRef.current.push({
        id: nextParticleId.current++,
        x: centerX + (Math.random() - 0.5) * 50,
        y: centerY + (Math.random() - 0.5) * 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color,
        radius: 2 + Math.random() * 4,
        alpha: 1,
        rotation: Math.random() * Math.PI,
        spin: -0.1 + Math.random() * 0.2
      });
    }
  };

  // Check matching lines logic
  const evaluateGrid = (grid: string[][]) => {
    const hits: { lineId: number; symbol: string; mult: number }[] = [];
    
    PAYLINES.forEach(line => {
      const char0 = grid[0][line.coords[0][1]];
      const char1 = grid[1][line.coords[1][1]];
      const char2 = grid[2][line.coords[2][1]];

      if (char0 === char1 && char1 === char2) {
        const symbolObj = SLOT_SYMBOLS.find(s => s.char === char0);
        if (symbolObj) {
          hits.push({
            lineId: line.id,
            symbol: char0,
            mult: symbolObj.mult
          });
        }
      }
    });

    return hits;
  };

  // Spin Reels flow
  const handleSpinReels = async () => {
    if (spinning || balance < bet) return;

    setSpinning(true);
    setWinningLines([]);
    setRecentWinAmount(null);
    setLeverPulled(true);
    
    // Deduct wager
    onBet(bet);
    playLocalSound('spin');

    // Lever animation timeout back to center
    setTimeout(() => setLeverPulled(false), 600);

    // Determine target win status
    const isWinOutcome = Math.random() * 100 < winRate;
    let targetGrid: string[][] = [
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ];

    if (isWinOutcome) {
      // Choose 1 or 2 paylines to trigger
      const triggerLineIdx = Math.floor(Math.random() * PAYLINES.length);
      const activeLine = PAYLINES[triggerLineIdx];
      
      const winningSymbol = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];

      // Inject matching icons onto targeted payline
      activeLine.coords.forEach(([col, row]) => {
        targetGrid[col][row] = winningSymbol.char;
      });

      // Fill remaining spots randomly
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
          if (!targetGrid[c][r]) {
            targetGrid[c][r] = getRandomSymbol();
          }
        }
      }
    } else {
      // Must produce standard non-matching grid
      let valid = false;
      let securityGuard = 0;
      while (!valid && securityGuard < 15) {
        securityGuard++;
        const testGrid = [
          [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
          [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
          [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]
        ];
        const evaluated = evaluateGrid(testGrid);
        if (evaluated.length === 0) {
          targetGrid = testGrid;
          valid = true;
        }
      }

      // Safeguard override check
      if (!valid) {
        targetGrid = [
          ['🍒', '🍇', '🍋'],
          ['7️⃣', '💎', '🍉'],
          ['🍊', '🔔', '🍒']
        ];
      }
    }

    // Set rolling statuses
    setActiveReelSpins([true, true, true]);

    // Fast cycling mock arrays for realistic rolling look
    const cycleIntervals = [120, 160, 200];
    const reelCycleTimers: NodeJS.Timeout[] = [];

    for (let c = 0; c < 3; c++) {
      const t = setInterval(() => {
        setReelsGrid(prev => {
          const nextGrid = [...prev];
          nextGrid[c] = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
          return nextGrid;
        });
      }, 70);
      reelCycleTimers.push(t);
    }

    // Cascade stopping timeline
    // Reel 1 stop
    setTimeout(() => {
      clearInterval(reelCycleTimers[0]);
      setReelsGrid(prev => {
        const nextGrid = [...prev];
        nextGrid[0] = [...targetGrid[0]];
        return nextGrid;
      });
      setActiveReelSpins(prev => [false, prev[1], prev[2]]);
      playLocalSound('click');
    }, 1200);

    // Reel 2 stop
    setTimeout(() => {
      clearInterval(reelCycleTimers[1]);
      setReelsGrid(prev => {
        const nextGrid = [...prev];
        nextGrid[1] = [...targetGrid[1]];
        return nextGrid;
      });
      setActiveReelSpins(prev => [prev[0], false, prev[2]]);
      playLocalSound('click');
    }, 1700);

    // Reel 3 stop
    setTimeout(() => {
      clearInterval(reelCycleTimers[2]);
      setReelsGrid(prev => {
        const nextGrid = [...prev];
        nextGrid[2] = [...targetGrid[2]];
        return nextGrid;
      });
      setActiveReelSpins([false, false, false]);
      stopSound('spin');
      playLocalSound('click');

      // Final match outcome calculation
      const matches = evaluateGrid(targetGrid);
      
      if (matches.length > 0) {
        // Collect sum of multipliers
        let totalMultiplier = 0;
        const prizeLines: number[] = [];

        matches.forEach(m => {
          totalMultiplier += m.mult;
          prizeLines.push(m.lineId);
        });

        const cashPayout = bet * totalMultiplier;
        setWinningLines(prizeLines);
        setRecentWinAmount(cashPayout);

        onWin(cashPayout);
        playLocalSound('win');

        // Trigger gorgeous particle stream cascade
        const canvas = canvasRef.current;
        if (canvas) {
          triggerGoldExplosion(canvas.width / 2, canvas.height / 3, '#FBCB35');
          triggerGoldExplosion(canvas.width / 3, canvas.height / 2, '#FF00A2');
          triggerGoldExplosion(canvas.width * 0.66, canvas.height / 2, '#00F3FF');
        }
      } else {
        playLocalSound('lose');
      }

      setSpinning(false);
    }, 2300);
  };

  // Canvas particle loop initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fluid resize observer inside container
    const fitGrid = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const b = parent.getBoundingClientRect();
        canvas.width = b.width;
        canvas.height = b.height;
      }
    };
    fitGrid();
    window.addEventListener('resize', fitGrid);

    const updateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;

        // Draw elegant diamond sparkling flakes
        ctx.beginPath();
        ctx.moveTo(0, -p.radius);
        ctx.lineTo(p.radius * 0.7, 0);
        ctx.lineTo(0, p.radius);
        ctx.lineTo(-p.radius * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity fall
        p.rotation += p.spin;
        p.alpha -= 0.015;
      });

      // Filter and delete dead nodes
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
      loopRef.current = requestAnimationFrame(updateParticles);
    };

    updateParticles();

    return () => {
      window.removeEventListener('resize', fitGrid);
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0a0512] text-zinc-100 font-sans overflow-hidden select-none relative">
      
      {/* City Neon Lights Backdrop */}
      <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#10031a]/95 via-transparent to-[#05010a]/95" />

      {/* Header bar */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0e071c] border-b border-purple-500/15 relative z-20 shrink-0 shadow-lg">
        
        {/* Leave option */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1035] hover:bg-[#2e184f] text-zinc-400 hover:text-white rounded-lg border border-purple-500/20 active:scale-95 transition-all text-[11px] font-black uppercase tracking-wider shadow"
          >
            <LogOut size={11} className="stroke-[3]" />
            <span>Leave Lobby</span>
          </button>
          
          <div className="hidden xxs:block h-4 w-[1px] bg-purple-500/20" />

          {/* Title tag */}
          <div className="hidden xxs:flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <span className="text-xs animate-pulse">🎰</span>
            </div>
            <span className="text-purple-400 font-black italic tracking-tighter text-xs uppercase">Premium Reels</span>
          </div>
        </div>

        {/* Dynamic central capital currency pill */}
        <div className="flex items-center gap-2 bg-[#040207]/80 rounded-full px-3,5 py-1.5 border border-[#2a123f] shadow-inner-lg">
          <div className="w-3 px-0.5 aspect-square rounded-full bg-[#EAB308] flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.4)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0a0512]" />
          </div>
          <span className="text-[#10B981] font-black text-xs leading-none">RS {balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
        </div>

        {/* Visual Settings Controls */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => {
              if (soundEnabled) {
                setSoundEnabled(false);
              } else {
                setSoundEnabled(true);
                playSound('click');
              }
            }} 
            className="p-1.5 rounded-lg bg-[#140b24] border border-purple-500/20 text-zinc-400 hover:text-white transition-all active:scale-95 shadow"
            title="Toggle Sfx"
          >
            {soundEnabled ? <Volume2 size={13} className="text-purple-400 animate-pulse" /> : <VolumeX size={13} />}
          </button>

          <button 
            onClick={() => {
              playLocalSound('click');
              setShowHelp(true);
            }} 
            className="p-1.5 rounded-lg bg-[#140b24] border border-purple-500/20 text-zinc-400 hover:text-white transition-all active:scale-95 shadow"
            title="Win Multipliers"
          >
            <HelpCircle size={13} />
          </button>
        </div>
      </header>

      {/* Pay Table Modal Manual overlay */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md z-40 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#120524] border border-purple-500/20 max-w-sm w-full rounded-[2rem] p-5 shadow-2xl relative overflow-hidden"
            >
              <h3 className="text-lg font-black italic tracking-tight text-purple-400 flex items-center gap-1.5 uppercase border-b border-purple-500/10 pb-3">
                <Star size={18} fill="currentColor" /> Symbol Multipliers & Paylines
              </h3>
              
              {/* Pay Grid */}
              <div className="grid grid-cols-2 gap-2 pt-3">
                {SLOT_SYMBOLS.map((sym, idx) => (
                  <div key={idx} className="bg-black/40 border border-purple-500/5 rounded-xl p-2 flex items-center justify-between text-xs font-mono font-bold leading-none">
                    <span className="text-2xl">{sym.char}</span>
                    <div className="text-right">
                      <p className="text-[9px] text-zinc-400 font-sans uppercase font-black">{sym.name}</p>
                      <p className="text-purple-400 text-xs font-extrabold mt-0.5">{sym.mult}X bet</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paylines visual checklist */}
              <div className="mt-4 pt-3 border-t border-purple-500/10">
                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2">5 Winning Paylines:</h4>
                <div className="flex flex-wrap gap-1.5 text-[8px] font-bold tracking-tight">
                  {PAYLINES.map(line => (
                    <span key={line.id} className="px-2 py-1 rounded bg-[#1f0b3b] border border-purple-500/15 text-zinc-300">
                      Line {line.id}: <span style={{ color: line.color }}>{line.name}</span>
                    </span>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => {
                  playLocalSound('click');
                  setShowHelp(false);
                }}
                className="w-full mt-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all text-center"
              >
                Close Paytable
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Reels content container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 px-3 py-2 justify-between space-y-2.5 sm:space-y-3">
        
        {/* PAYLINES MINI SCHEMATICS WRAPPER */}
        <div className="shrink-0 w-full bg-[#110524]/85 border border-purple-500/15 rounded-xl p-2 flex items-center justify-between gap-1.5 shadow-lg relative overflow-hidden">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Active Lines</span>
          <div className="flex items-center gap-1">
            {PAYLINES.map(line => {
              const active = winningLines.includes(line.id);
              return (
                <div 
                  key={line.id}
                  className={`px-2 py-0.5 rounded text-[8px] font-extrabold font-mono transition-all border ${
                    active 
                      ? 'bg-purple-600 border-purple-400 text-white animate-pulse shadow-[0_0_6px_rgba(168,85,247,0.4)]' 
                      : 'bg-black/30 border-purple-500/10 text-zinc-500'
                  }`}
                  style={active ? { borderColor: line.color } : {}}
                >
                  Line {line.id}
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTRAL THREE-REEL VIDEO SLOTS GRAPHICS MACHINE */}
        <div className="relative flex-1 min-h-[190px] bg-gradient-to-b from-[#1c0d29] via-[#090212] to-[#120521] border border-purple-500/20 rounded-2xl p-4 flex flex-col justify-center items-center shadow-[0_10px_35px_rgba(0,0,0,0.85)] overflow-hidden">
          
          {/* Ambient Glowing Backlight */}
          <div className="absolute w-[400px] h-[250px] bg-purple-600/5 rounded-full blur-[90px] pointer-events-none" />

          {/* Interactive Particle canvas floating wrapper */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

          {/* Golden Frame of the Video Slot machine */}
          <div className="w-full max-w-sm bg-[#160b24] rounded-2xl p-2 border-2 border-[#EAB308] relative shadow-2xl flex flex-col items-stretch">
            
            {/* Visual Header Deco */}
            <div className="flex justify-between items-center px-2 py-1 border-b border-purple-500/10 text-[9px] font-sans font-black tracking-widest text-[#EAB308] uppercase mb-1.5">
              <span>★ High Limit ★</span>
              <span>Fruit Vegas 777</span>
              <span>★ Max Win ★</span>
            </div>

            {/* REEL GRID WINDOW VIEW - 3 Columns */}
            <div className="grid grid-cols-3 gap-1.5 bg-black/80 rounded-xl p-1.5 shadow-inner border border-purple-950 relative overflow-hidden">
              
              {/* Dynamic Overlay Payline Vectors if won */}
              {winningLines.map(lineId => {
                const line = PAYLINES.find(l => l.id === lineId);
                if (!line) return null;
                
                // Construct coordinate overlay mapping to draw beautiful connecting laser lines
                const colW = 33.33;
                const rowH = 33.33;
                
                const pt1_x = line.coords[0][0] * colW + colW / 2;
                const pt1_y = line.coords[0][1] * rowH + rowH / 2;
                
                const pt2_x = line.coords[1][0] * colW + colW / 2;
                const pt2_y = line.coords[1][1] * rowH + rowH / 2;
                
                const pt3_x = line.coords[2][0] * colW + colW / 2;
                const pt3_y = line.coords[2][1] * rowH + rowH / 2;

                return (
                  <svg 
                    key={lineId} 
                    className="absolute inset-x-2 inset-y-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none z-15 active:duration-100"
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                  >
                    {/* Animated Neon Laser Payline paths */}
                    <line 
                      x1={pt1_x} y1={pt1_y} 
                      x2={pt2_x} y2={pt2_y} 
                      stroke={line.color} 
                      strokeWidth="2" 
                      strokeLinecap="round"
                      className="animate-pulse shadow-lg"
                      style={{ filter: `drop-shadow(0 0 4px ${line.color})` }}
                    />
                    <line 
                      x1={pt2_x} y1={pt2_y} 
                      x2={pt3_x} y2={pt3_y} 
                      stroke={line.color} 
                      strokeWidth="2" 
                      strokeLinecap="round"
                      className="animate-pulse"
                      style={{ filter: `drop-shadow(0 0 4px ${line.color})` }}
                    />
                  </svg>
                );
              })}

              {reelsGrid.map((columnSymbols, colIndex) => (
                <div 
                  key={colIndex} 
                  className="bg-gradient-to-b from-[#1c0f2f] to-[#120821] rounded-lg p-1.5 flex flex-col justify-between items-center gap-1 border border-purple-500/10 h-[220px] relative overflow-hidden"
                >
                  
                  {/* Vertical dividers within glass */}
                  <div className="absolute inset-0 bg-white/[0.02] pointer-events-none rounded" />
                  
                  {columnSymbols.map((sym, rowIndex) => {
                    const symbolObj = SLOT_SYMBOLS.find(s => s.char === sym);
                    const spinActive = activeReelSpins[colIndex];
                    
                    return (
                      <div 
                        key={rowIndex} 
                        className="flex-1 w-full bg-black/40 rounded-md border border-purple-500/5 flex items-center justify-center relative overflow-hidden"
                      >
                        <AnimatePresence mode="popLayout">
                          <motion.div
                            key={sym + spinActive}
                            initial={spinActive ? { y: -25, opacity: 0.5, scaleY: 1.3 } : { y: 0, opacity: 1, scaleY: 1 }}
                            animate={{ y: 0, opacity: 1, scaleY: 1 }}
                            exit={spinActive ? { y: 25, opacity: 0.5, scaleY: 1.3 } : { opacity: 0 }}
                            transition={{ duration: 0.08, ease: 'linear' }}
                            className={`text-3xl select-none filter transition-all ${
                              spinActive ? 'blur-[1.5px] scale-y-110' : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] hover:scale-105'
                            }`}
                          >
                            {sym}
                          </motion.div>
                        </AnimatePresence>

                        {/* Special glowing badge border on winning matched cell */}
                        {winningLines.some(lineId => {
                          const line = PAYLINES.find(p => p.id === lineId);
                          return line?.coords.some(([c, r]) => c === colIndex && r === rowIndex);
                        }) && (
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: [1, 1.08, 1], opacity: 1 }}
                            className="absolute inset-0 border-2 border-[#EAB308] rounded-md shadow-[0_0_8px_rgba(234,179,8,0.55)] pointer-events-none z-12 animate-pulse"
                            style={symbolObj ? { borderColor: symbolObj.color } : {}}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Visual Bottom Tray deco */}
            <div className="flex justify-between items-center px-4 py-1.5 border-t border-purple-500/10 text-[8px] font-mono uppercase tracking-[0.2em] text-purple-400">
              <span>Lines: 5 active</span>
              <span className="text-[#EAB308]">RTP: 96%</span>
            </div>
          </div>

          {/* Interactive Pull-Reel Lever (Right side decor item!) */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center pointer-events-none">
            {/* Slot Arm base mount */}
            <div className="w-4 h-8 bg-zinc-800 border border-zinc-700 rounded-l shadow" />
            
            {/* Lever rod animates turning downward when clicked */}
            <motion.div 
              animate={{ 
                rotate: leverPulled ? 95 : 0,
                y: leverPulled ? 12 : 0
              }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="origin-bottom w-3 h-14 bg-gradient-to-b from-zinc-400 to-zinc-600 rounded-full flex flex-col items-center relative -mt-3 shadow-lg"
            >
              {/* Colored lever knob knob */}
              <div className="w-5 h-5 rounded-full bg-red-650 bg-radial-gradient from-red-500 to-red-700 absolute -top-4 shadow-[0_2px_4px_rgba(0,0,0,0.4)] border border-red-500" />
            </motion.div>
          </div>

          {/* Winning Celebration Banner overlay */}
          <AnimatePresence>
            {recentWinAmount && (
              <motion.div 
                initial={{ scale: 0.7, opacity: 0, y: 15 }}
                animate={{ scale: [1, 1.1, 1], opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 bg-yellow-400/95 text-zinc-950 shadow-2xl px-5 py-2.5 rounded-2xl text-center z-18 select-none border border-yellow-300 flex flex-col items-center"
              >
                <div className="flex items-center gap-1.5">
                  <Trophy size={14} className="animate-bounce" />
                  <span className="font-serif font-black tracking-widest uppercase italic text-xs">
                    GRAND JACKPOT WIN!
                  </span>
                </div>
                <span className="font-mono font-black text-lg mt-0.5 tracking-tighter">
                  +RS {recentWinAmount.toLocaleString('en-US')}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CONTROLS & CHIPS WAGER MODULE */}
        <div className="shrink-0 w-full bg-zinc-950/80 border border-zinc-900 rounded-2xl p-3 flex flex-col space-y-2.5 relative z-10">
          
          <div className="flex justify-between items-center text-[9px] uppercase font-bold text-zinc-400 leading-none">
            <span>Select Bet Stake</span>
            <span className="text-yellow-400 font-extrabold tracking-tight font-mono text-xs">Total Bet: RS {bet}</span>
          </div>

          {/* Quick Chip Wagers Bar */}
          <div className="flex items-center justify-between gap-1.5 bg-black/40 p-1 rounded-xl border border-[#22103f] overflow-x-auto no-scrollbar">
            {CHIPS.map((chipVal) => {
              const chipColors: Record<number, string> = {
                10: 'from-zinc-500 to-zinc-700 text-zinc-100 border-zinc-400/40 shadow-zinc-500/10',
                50: 'from-blue-600 to-blue-800 text-blue-100 border-blue-400/40 shadow-blue-500/10',
                100: 'from-red-650 to-red-800 text-red-100 border-red-500/40 shadow-red-500/10',
                500: 'from-emerald-600 to-emerald-800 text-emerald-100 border-emerald-500/40 shadow-emerald-500/10',
                1000: 'from-purple-650 to-purple-800 text-purple-100 border-purple-500/40 shadow-purple-500/10',
                5000: 'from-amber-600 to-amber-700 text-amber-100 border-yellow-500/40 shadow-yellow-500/15'
              };
              
              return (
                <button
                  key={chipVal}
                  disabled={spinning}
                  onClick={() => addChipToBet(chipVal)}
                  className={`flex-1 min-w-[50px] aspect-[9/6] p-0.5 rounded-lg bg-gradient-to-br border flex flex-col items-center justify-center font-mono font-black shadow transition-all text-[10px] disabled:opacity-45 select-none hover:scale-102 active:scale-95 active:duration-75 ${
                    chipColors[chipVal] || 'from-zinc-800 to-zinc-950 border-zinc-700'
                  }`}
                >
                  <span className="text-[6.5px] uppercase opacity-60 leading-none scale-90">CHIP</span>
                  <span className="text-xs leading-none font-extrabold mt-0.5">{chipVal}</span>
                </button>
              );
            })}
          </div>

          {/* Action Call Controls row */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-5 grid grid-cols-2 gap-1.5">
              <button 
                disabled={spinning}
                onClick={doubleBet}
                className="py-2.5 bg-zinc-900 border border-zinc-800 text-[9px] font-bold rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 shadow"
              >
                2X DOUBLE
              </button>
              <button 
                disabled={spinning}
                onClick={clearBet}
                className="py-2.5 bg-zinc-900 border border-zinc-800 text-[9px] font-bold rounded-xl text-zinc-350 hover:text-white hover:bg-[#12071c] hover:border-purple-950/40 transition-all active:scale-95 shadow flex items-center justify-center gap-1"
              >
                <RotateCcw size={9} />
                <span>RESET</span>
              </button>
            </div>

            <button 
              onClick={handleSpinReels}
              disabled={spinning || balance < bet}
              className={`col-span-7 h-10.5 rounded-xl font-serif font-black italic uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 select-none active:scale-[0.98] border-b-2 ${
                spinning 
                  ? 'bg-zinc-800 text-zinc-500 border-zinc-700/20 cursor-not-allowed' 
                  : balance < bet 
                  ? 'bg-red-950/20 text-red-500 border-red-500/20 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white hover:shadow-purple-500/10 cursor-pointer border-purple-850'
              }`}
            >
              <Flame size={13} className="animate-pulse" />
              <span className="text-xs font-serif font-black tracking-wide">
                {spinning ? 'SPINNING...' : `SPIN REELS: RS ${bet}`}
              </span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
