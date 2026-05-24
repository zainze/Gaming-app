import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Play, History, TrendingUp, Sliders, Shield, Zap } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface PlinkoProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  onExit: () => void;
  minBet?: number;
  winRate?: number;
}

// Global configuration of multipliers mimicking professional casino payouts
const multipliersConfig: Record<string, Record<number, number[]>> = {
  low: {
    8: [5.6, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 5.6],
    10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    12: [10, 5.0, 2.0, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 2.0, 5.0, 10],
    14: [12, 7.0, 4.0, 1.9, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.9, 4.0, 7.0, 12],
    16: [16, 9.0, 5.0, 2.5, 1.8, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.8, 2.5, 5.0, 9.0, 16],
  },
  medium: {
    8: [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
    10: [22, 5.0, 2.0, 1.4, 0.6, 0.4, 0.6, 1.4, 2.0, 5.0, 22],
    12: [33, 11, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11, 33],
    14: [58, 15, 7.0, 4.0, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4.0, 7.0, 15, 58],
    16: [110, 41, 10, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10, 41, 110],
  },
  high: {
    8: [29, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29],
    10: [76, 10, 3.0, 0.9, 0.3, 0.2, 0.3, 0.9, 3.0, 10, 76],
    12: [170, 24, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24, 170],
    14: [280, 54, 18, 5.0, 1.9, 0.5, 0.2, 0.2, 0.2, 0.5, 1.9, 5.0, 18, 54, 280],
    16: [1000, 130, 26, 9.0, 4.0, 2.0, 0.25, 0.2, 0.2, 0.2, 0.25, 2.0, 4.0, 9.0, 26, 130, 1000],
  }
};

interface PhysicsBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  wager: number;
  completed: boolean;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
}

// Peg position coordinates type
interface Peg {
  key: string;
  x: number;
  y: number;
}

export const PlinkoPro: React.FC<PlinkoProps> = ({ 
  onWin, 
  onBet, 
  balance, 
  onExit,
  minBet = 10,
  winRate = 45
}) => {
  const [bet, setBet] = useState(minBet);
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [rows, setRows] = useState<number>(12);
  const [history, setHistory] = useState<number[]>([]);
  const [isDropping, setIsDropping] = useState(false);

  // Canvas and Animation refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<PhysicsBall[]>([]);
  const particlesRef = useRef<SparkParticle[]>([]);
  const hitPegsRef = useRef<Record<string, number>>({}); // maps peg string => flash frames (0 to 1)
  const lastPlinkTimeRef = useRef<number>(0);
  const activeBucketHitRef = useRef<{ index: number; scale: number; timer: number } | null>(null);

  // Dynamic multipliers vector
  const currentMultipliers = multipliersConfig[risk][rows] || multipliersConfig.medium[12];

  // Helper colors for dynamic multipliers
  const getBucketColorHex = (mult: number) => {
    if (mult >= 5) return { fill: '#ec4899', text: '#ffffff', glow: 'rgba(236, 72, 153, 0.6)' }; // glow pink/magenta
    if (mult >= 2) return { fill: '#ef4444', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.5)' }; // danger orange/red
    if (mult >= 1) return { fill: '#f59e0b', text: '#000000', glow: 'rgba(245, 158, 11, 0.4)' }; // warm amber
    if (mult >= 0.5) return { fill: '#10b981', text: '#000000', glow: 'rgba(16, 185, 129, 0.3)' }; // safe emerald
    return { fill: '#14532d', text: '#a7f3d0', glow: 'rgba(20, 83, 45, 0.1)' }; // dark green
  };

  const getBucketColorClass = (mult: number) => {
    if (mult >= 5) return 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]';
    if (mult >= 2) return 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]';
    if (mult >= 1) return 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]';
    return 'bg-[#34C759] text-black shadow-[0_0_10px_rgba(52,199,89,0.2)]';
  };

  // Safe callback ref to let canvas logic execute react side-effects
  const triggerBucketWin = (bucketIndex: number, ballWager: number) => {
    const mult = currentMultipliers[bucketIndex];
    if (mult === undefined) return;

    // Trigger visual pop
    activeBucketHitRef.current = {
      index: bucketIndex,
      scale: 1.45,
      timer: 15
    };

    // Calculate payout
    const winAmount = ballWager * mult;
    if (winAmount > ballWager) {
      playSound('win');
      onWin(winAmount);
    } else if (winAmount < ballWager) {
      playSound('lose');
    } else {
      playSound('success');
    }

    setHistory(prev => [mult, ...prev].slice(0, 10));

    // Spawn rich bucket fireworks sparks!
    const sparkX = 400 - (720 / 2) + (bucketIndex + 0.5) * (720 / (rows + 1));
    const sparkY = 700;
    const colors = ['#FBCB35', '#ef4444', '#10b981', '#3b82f6', '#ec4899'];
    for (let k = 0; k < 18; k++) {
      particlesRef.current.push({
        x: sparkX,
        y: sparkY,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 1.2) * 8 - 2,
        radius: Math.random() * 3.5 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        life: 50 + Math.floor(Math.random() * 20)
      });
    }
  };

  // Re-build pegs when rows count changes
  const buildPegs = (): Peg[] => {
    const pegs: Peg[] = [];
    const virtualBoardWidth = 720;
    const startY = 80;
    const endY = 640;
    const dy = (endY - startY) / rows;
    const dx = virtualBoardWidth / (rows + 1);

    for (let r = 0; r < rows; r++) {
      const pinCount = r + 3;
      // Row is centered horizontally at 400
      const rowWidth = (pinCount - 1) * dx;
      const startX = 400 - rowWidth / 2;

      for (let p = 0; p < pinCount; p++) {
        const x = startX + p * dx;
        const y = startY + r * dy;
        pegs.push({
          key: `${r}-${p}`,
          x,
          y
        });
      }
    }
    return pegs;
  };

  // Launch a physical ball from top portal
  const dropBall = async () => {
    if (balance < bet) return;

    // Perform balance withdrawal handoff
    const success = await onBet(bet);
    if (!success) return;

    playSound('click');

    // Slight dynamic drop offsets representing actual launch variations
    const startX = 400 + (Math.random() - 0.5) * 14;
    const startY = 32;

    const ball: PhysicsBall = {
      id: Date.now() + Math.random(),
      x: startX,
      y: startY,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 1.0,
      radius: 7.5,
      color: risk === 'high' ? '#f43f5e' : (risk === 'medium' ? '#fbbf24' : '#10b981'),
      wager: bet,
      completed: false
    };

    ballsRef.current.push(ball);
  };

  // Continuous physics update loop
  useEffect(() => {
    let animationId: number;
    const pegs = buildPegs();

    const updatePhysics = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(updatePhysics);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Keep canvas coordinates responsive to Retina and resized browser bounds
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationId = requestAnimationFrame(updatePhysics);
        return;
      }

      // Draw background styling inside canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scale drawing from 100% constant virtual coordinate system of 800 width x 740 height
      ctx.save();
      ctx.scale(canvas.width / 800, canvas.height / 740);

      // Set physics boundaries
      const startY = 80;
      const endY = 640;
      const dy = (endY - startY) / rows;
      const dx = 720 / (rows + 1);
      const bucketY = 665;

      // 1. UPDATE & DRAW BUCKETS (MULTIPLIERS)
      const numBuckets = rows + 1;
      const bucketWidth = 720 / numBuckets;
      const bucketStartX = 400 - 720 / 2;

      // Decrement bucket active scale animation
      if (activeBucketHitRef.current) {
        activeBucketHitRef.current.scale -= 0.03;
        activeBucketHitRef.current.timer--;
        if (activeBucketHitRef.current.scale < 1.0 || activeBucketHitRef.current.timer <= 0) {
          activeBucketHitRef.current = null;
        }
      }

      for (let b = 0; b < numBuckets; b++) {
        const multVal = currentMultipliers[b] || 1;
        const colSetup = getBucketColorHex(multVal);
        const bx = bucketStartX + b * bucketWidth;
        const bheight = 36;
        const isHit = activeBucketHitRef.current?.index === b;
        const currentScale = isHit ? activeBucketHitRef.current!.scale : 1.0;

        ctx.save();
        ctx.translate(bx + bucketWidth / 2, bucketY + bheight / 2);
        ctx.scale(currentScale, currentScale);

        // Draw bucket card with neon outer border
        ctx.fillStyle = colSetup.fill;
        ctx.shadowColor = colSetup.glow;
        ctx.shadowBlur = isHit ? 25 : 8;
        
        ctx.beginPath();
        ctx.roundRect(-bucketWidth / 2 + 2, -bheight / 2, bucketWidth - 4, bheight, 6);
        ctx.fill();

        // Print multiplier level label inside
        ctx.shadowBlur = 0;
        ctx.fillStyle = colSetup.text;
        ctx.font = '900 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${multVal < 1 ? multVal : multVal.toFixed(0)}x`, 0, 0);
        ctx.restore();
      }

      // 2. UPDATE PARTICLES / SPARKS
      particlesRef.current.forEach((part) => {
        part.x += part.vx;
        part.y += part.vy;
        part.vy += 0.08; // Spark gravity
        part.alpha -= 0.016;
        part.life--;

        ctx.save();
        ctx.globalAlpha = Math.max(0, part.alpha);
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0 && p.alpha > 0);

      // 3. UPDATE & DRAW PEGS WITH DYNAMIC HIT GLOW
      pegs.forEach((peg) => {
        const hitIntensity = hitPegsRef.current[peg.key] || 0;
        if (hitIntensity > 0) {
          hitPegsRef.current[peg.key] -= 0.08;
          if (hitPegsRef.current[peg.key] < 0) {
            hitPegsRef.current[peg.key] = 0;
          }
        }

        // Render circular peg node
        ctx.save();
        if (hitIntensity > 0) {
          // Glow explosion aura around hit peg
          const auraRadius = 4.5 + hitIntensity * 8;
          ctx.strokeStyle = `rgba(251, 203, 53, ${hitIntensity})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(peg.x, peg.y, auraRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Spark gradient
          ctx.fillStyle = '#fbcb35';
        } else {
          ctx.fillStyle = '#22d3ee'; // beautiful cyber turquoise peg
        }

        ctx.beginPath();
        ctx.arc(peg.x, peg.y, hitIntensity > 0 ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 4. PHYSICS RESOLUTION & COLLISION LOGIC FOR DROPPING BALLS
      ballsRef.current.forEach((ball) => {
        // Gravity thrust
        ball.vy += 0.22;

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Dynamic motion dampening
        ball.vx *= 0.99;
        ball.vy *= 0.99;

        // lateral bound collisions (outer walls)
        const outerMargin = 40;
        if (ball.x - ball.radius < outerMargin) {
          ball.x = outerMargin + ball.radius;
          ball.vx = -ball.vx * 0.45;
        } else if (ball.x + ball.radius > 800 - outerMargin) {
          ball.x = 800 - outerMargin - ball.radius;
          ball.vx = -ball.vx * 0.45;
        }

        // Ball - Peg collisions
        pegs.forEach((peg) => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.hypot(dx, dy);
          const hitDistance = ball.radius + 4.5; // sum of radii

          if (dist < hitDistance) {
            const nx = dx / dist;
            const ny = dy / dist;

            // Push ball clear out of collision frame projection
            const overlap = hitDistance - dist;
            ball.x += nx * overlap;
            ball.y += ny * overlap;

            // Compute relative speeds and bouncy physical impulses
            const velNormal = ball.vx * nx + ball.vy * ny;
            if (velNormal < 0) {
              const elasticity = 0.52; // snappy bouncy factor
              const bounceImpulse = -(1 + elasticity) * velNormal;
              ball.vx += bounceImpulse * nx;
              ball.vy += bounceImpulse * ny;

              // Introduce tiny horizontal dispersion random kick so trajectories are beautifully organic
              const noiseAmount = 0.38;
              ball.vx += (Math.random() - 0.5) * noiseAmount;

              // Mark peg hit flash and vibration
              hitPegsRef.current[peg.key] = 1.0;

              // Throttle quick pluck pitch sound effects
              const tnow = Date.now();
              if (tnow - lastPlinkTimeRef.current > 50) {
                playSound('plink');
                lastPlinkTimeRef.current = tnow;
              }

              // Drop subtle dust micro-sparks
              for (let m = 0; m < 3; m++) {
                particlesRef.current.push({
                  x: peg.x,
                  y: peg.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 2 - 0.5,
                  radius: Math.random() * 2 + 0.8,
                  color: '#22d3ee',
                  alpha: 0.8,
                  life: 20
                });
              }
            }
          }
        });

        // 5. Bucket collection check
        if (ball.y >= bucketY && !ball.completed) {
          ball.completed = true;
          // Locate landed bucket index
          const relativeX = ball.x - bucketStartX;
          let calculatedIndex = Math.floor(relativeX / bucketWidth);
          calculatedIndex = Math.max(0, Math.min(rows, calculatedIndex));

          // Run win payout balance updates on React loop
          triggerBucketWin(calculatedIndex, ball.wager);
        }

        // Draw physical glowing ball
        ctx.save();
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        // Overlay glass spherical highlight
        ctx.shadowBlur = 0;
        const sh = ctx.createRadialGradient(
          ball.x - ball.radius * 0.3, 
          ball.y - ball.radius * 0.3, 
          1, 
          ball.x, 
          ball.y, 
          ball.radius
        );
        sh.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        sh.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Filter out completed ball states
      ballsRef.current = ballsRef.current.filter(b => !b.completed && b.y < 740);

      ctx.restore();
      animationId = requestAnimationFrame(updatePhysics);
    };

    animationId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationId);
  }, [rows, risk, currentMultipliers]);

  // Quick multipliers utilities
  const doubleBet = () => {
    playSound('click');
    setBet(prev => Math.min(balance > 10 ? balance : 10000, prev * 2));
  };

  const halfBet = () => {
    playSound('click');
    setBet(prev => Math.max(minBet, Math.floor(prev / 2)));
  };

  const setMaxBet = () => {
    playSound('click');
    setBet(Math.max(minBet, Math.floor(balance)));
  };

  const setMinBet = () => {
    playSound('click');
    setBet(minBet);
  };

  return (
    <div className="flex flex-col h-full bg-[#050B14] text-white font-sans overflow-hidden relative">
      {/* Immersive Cybergrid background glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-blue-900/10 via-[#0a121e]/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_rgba(6,182,212,0.06)_0%,_transparent_65%)]" />
      </div>

      {/* HEADER EXACTLY UNTOUCHED TO MATCH SPECIFIC DIRECTIVE */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a121e] border-b border-[#1a2b45] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-[#32D74B]" size={20} />
          <span className="text-[#32D74B] font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Plinko Pro</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#1a2b45] shadow-lg">
          <div className="w-3.5 h-3.5 rounded-full bg-[#FBCB35] flex items-center justify-center shadow-[0_0_10px_rgba(251,203,53,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#14171A]" />
          </div>
          <span className="text-[#32D74B] font-black text-xs leading-none">RS {balance.toFixed(0)}</span>
        </div>

        <button 
          id="plinko-quit-btn"
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 active:scale-95 transition-all hover:bg-red-500/20 shadow-lg"
        >
          <LogOut size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Quit</span>
        </button>
      </header>

      {/* Interactive Main Arena Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative z-10 min-h-0">
        {/* Plinko Board Stage */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 relative">
          
          {/* Real-time Multiplier History Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-30 max-h-48 overflow-y-auto scrollbar-hide py-1">
            <AnimatePresence>
              {history.map((m, idx) => (
                <motion.div 
                  key={idx + '-' + m}
                  initial={{ x: 25, opacity: 0, scale: 0.8 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  exit={{ x: -25, opacity: 0 }}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-black text-center min-w-[36px] ${getBucketColorClass(m)}`}
                >
                  {m}x
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="relative w-full max-w-[540px] aspect-[4/5] bg-[#070f1a]/80 backdrop-blur-md rounded-3xl border border-[#1a2b45] p-3 shadow-2xl flex flex-col">
            {/* Physics Canvas rendering peg lines and multiplier buckets */}
            <canvas 
              ref={canvasRef}
              className="w-full flex-1 rounded-2xl cursor-pointer"
            />
          </div>
        </div>

        {/* Professional Controls sidebar panel (hidden/shown responsively, aligned next to board on desktop) */}
        <div className="w-full md:w-80 bg-[#070f1e]/90 border-t md:border-t-0 md:border-l border-[#1a2b45] flex flex-col p-5 space-y-5 shrink-0 select-none overflow-y-auto max-h-[40%] md:max-h-full">
          
          {/* Mode Adjusters */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-white/40 font-black uppercase text-[10px] tracking-widest">
              <Sliders size={13} /> Panel Adjustments
            </div>

            {/* Risk Selection */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black tracking-wider text-neutral-400">Risk Variance</label>
              <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-[#1a2b45]">
                {(['low', 'medium', 'high'] as const).map((r) => (
                  <button
                    key={r}
                    id={`risk-btn-${r}`}
                    onClick={() => { playSound('click'); setRisk(r); }}
                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                      risk === r
                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 scale-[1.02]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Peg Count (Rows) Selection */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black tracking-wider text-neutral-400">Peg Rows: {rows}</label>
              <div className="grid grid-cols-5 gap-1 bg-black/40 p-1 rounded-xl border border-[#1a2b45]">
                {[8, 10, 12, 14, 16].map((num) => (
                  <button
                    key={num}
                    id={`rows-btn-${num}`}
                    onClick={() => { playSound('click'); setRows(num); }}
                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-300 ${
                      rows === num
                        ? 'bg-[#32D74B] text-black shadow-lg shadow-[#32D74B]/20 scale-[1.02]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[#1a2b45] pt-4 space-y-2">
            <div className="flex items-center gap-2 text-white/40 font-black uppercase text-[10px] tracking-widest">
              <Zap size={13} strokeWidth={2.5} /> Active Multiplier Stats
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-black/30 p-2 rounded-xl border border-[#1a2b45]">
                <span className="block text-[8px] text-neutral-400 uppercase font-bold">Min</span>
                <span className="text-xs font-black text-teal-400">{Math.min(...currentMultipliers)}x</span>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-[#1a2b45]">
                <span className="block text-[8px] text-neutral-400 uppercase font-bold">Med</span>
                <span className="text-xs font-black text-amber-500">{currentMultipliers[Math.floor(rows / 2)]}x</span>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-[#1a2b45]">
                <span className="block text-[8px] text-neutral-400 uppercase font-bold">Max</span>
                <span className="text-xs font-black text-rose-500">{Math.max(...currentMultipliers)}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Betting Control footer panel */}
      <footer className="p-4 bg-[#0a121e] border-t border-[#1a2b45] relative z-30 shrink-0">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-4 items-stretch">
           {/* Amount Control Panel */}
           <div className="flex-1 bg-black/50 rounded-2xl border border-[#1a2b45] flex items-center p-1.5 shadow-inner gap-2">
              {/* Halve Bet Button */}
              <button 
                id="plinko-half-btn"
                onClick={halfBet}
                className="px-2.5 py-2.5 rounded-xl bg-[#14233a] hover:bg-[#1a2d48] font-bold text-[10px] text-neutral-300 active:scale-90 transition-all uppercase"
              >
                1/2
              </button>

              {/* Minus wager Button */}
              <button 
                id="plinko-minus-btn"
                onClick={() => { playSound('click'); setBet(Math.max(minBet, bet - 10)); }}
                className="w-10 h-10 rounded-xl bg-[#14233a] hover:bg-[#1a2d48] flex items-center justify-center text-white active:scale-90 transition-all"
              >
                <Minus size={16} />
              </button>
              
              <div className="flex-1 text-center min-w-0">
                <span className="block text-[8px] font-black uppercase text-white/30 tracking-widest leading-none mb-1">Bet Wager</span>
                <span className="text-xl font-black italic text-[#32D74B] block truncate">RS {bet.toLocaleString()}</span>
              </div>

              {/* Plus wager Button */}
              <button 
                id="plinko-plus-btn"
                onClick={() => { playSound('click'); setBet(bet + 10); }}
                className="w-10 h-10 rounded-xl bg-[#14233a] hover:bg-[#1a2d48] flex items-center justify-center text-white active:scale-90 transition-all"
              >
                <Plus size={16} />
              </button>

              {/* Double Bet Button */}
              <button 
                id="plinko-double-btn"
                onClick={doubleBet}
                className="px-2.5 py-2.5 rounded-xl bg-[#14233a] hover:bg-[#1a2d48] font-bold text-[10px] text-neutral-300 active:scale-90 transition-all uppercase"
              >
                2x
              </button>

              {/* Max Bet Button */}
              <button 
                id="plinko-max-btn"
                onClick={setMaxBet}
                className="px-2.5 py-2.5 rounded-xl bg-[#32d74b]/10 border border-[#32d74b]/20 hover:bg-[#32d74b]/20 font-black text-[9px] text-[#32D74B] active:scale-90 transition-all uppercase"
              >
                Max
              </button>
           </div>

           {/* Action Play Trigger Button */}
           <button 
             id="plinko-play-btn"
             onClick={dropBall}
             disabled={balance < bet}
             className="w-full md:w-56 bg-[#32D74B] hover:bg-[#2BBF40] text-black font-black py-4 px-6 rounded-2xl shadow-[0_8px_0_#1E7E34] hover:shadow-[0_6px_0_#1E7E34] active:shadow-none active:translate-y-1.5 transition-all uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 text-sm"
           >
             <Play size={20} className="fill-current" />
             Drop Ball
           </button>
        </div>
      </footer>
    </div>
  );
};
