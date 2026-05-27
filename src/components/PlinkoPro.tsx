import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  Plus, 
  Minus, 
  Zap, 
  Sparkles, 
  Flame, 
  Volume2, 
  VolumeX,
  Gauge,
  Layers
} from 'lucide-react';
import { playSound, stopSound, setSoundActiveGameId } from '../lib/sounds';

interface PlinkoProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  onExit: () => void;
  minBet?: number;
  winRate?: number;
}

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
  const [bet, setBet] = useState(50);
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [rows, setRows] = useState<number>(12);
  const [history, setHistory] = useState<number[]>([]);
  const [localBalance, setLocalBalance] = useState(balance);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Stats Counters
  const [stats, setStats] = useState({
    drops: 0,
    totalWagered: 0,
    peakMultiplier: 0,
    winsCount: 0
  });

  // Canvas and sizing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const ballsRef = useRef<PhysicsBall[]>([]);
  const particlesRef = useRef<SparkParticle[]>([]);
  const hitPegsRef = useRef<Record<string, number>>({});
  const activeBucketHitRef = useRef<{ index: number; scale: number; timer: number } | null>(null);
  
  const lastPlinkTimeRef = useRef<number>(0);

  // Sound triggers
  useEffect(() => {
    setSoundActiveGameId("plinko");
    return () => {
      setSoundActiveGameId(null);
    };
  }, []);

  // Soft balance updates
  useEffect(() => {
    setLocalBalance(prev => {
      if (balance > prev || ballsRef.current.length === 0) {
        return balance;
      }
      return prev;
    });
  }, [balance]);

  const currentMultipliers = multipliersConfig[risk][rows] || multipliersConfig.medium[12];

  const getBucketColorHex = (mult: number) => {
    if (mult >= 5) return { fill: '#ef4444', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.75)' };
    if (mult >= 2) return { fill: '#f97316', text: '#ffffff', glow: 'rgba(249, 115, 22, 0.6)' };
    if (mult >= 1.2) return { fill: '#eab308', text: '#000000', glow: 'rgba(234, 179, 8, 0.5)' };
    if (mult >= 0.8) return { fill: '#10b981', text: '#ffffea', glow: 'rgba(16, 185, 129, 0.35)' };
    return { fill: '#1e293b', text: '#94a3b8', glow: 'rgba(30, 41, 59, 0.1)' };
  };

  const getBucketColorClass = (mult: number) => {
    if (mult >= 5) return 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]';
    if (mult >= 2) return 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.35)]';
    if (mult >= 1.2) return 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]';
    return 'bg-[#32D74B] text-black shadow-[0_0_8px_rgba(50,215,75,0.2)]';
  };

  const playLocalSound = (name: 'click' | 'win' | 'lose' | 'spin' | 'chip' | 'coin' | 'plink' | 'success' | 'ready') => {
    if (soundEnabled) playSound(name);
  };

  const handleBucketFall = (bucketIndex: number, ballWager: number) => {
    const mult = currentMultipliers[bucketIndex];
    if (mult === undefined) return;

    activeBucketHitRef.current = {
      index: bucketIndex,
      scale: 1.4,
      timer: 14
    };

    const payout = ballWager * mult;
    if (mult >= 1.2) {
      playLocalSound('win');
    } else {
      playLocalSound('lose');
    }

    onWin(payout);

    setStats(prev => ({
      ...prev,
      peakMultiplier: Math.max(prev.peakMultiplier, mult),
      winsCount: mult >= 1.0 ? prev.winsCount + 1 : prev.winsCount
    }));

    setLocalBalance(prev => prev + payout);
    setHistory(prev => [mult, ...prev].slice(0, 8));

    // Particles glow burst
    const bucketWidth = 720 / (rows + 1);
    const bucketStartX = 400 - (720 / 2);
    const dropX = bucketStartX + (bucketIndex + 0.5) * bucketWidth;
    const dropY = 665;

    const sparkles = mult >= 2 ? 16 : 8;
    const colors = mult >= 2 ? ['#f59e0b', '#ef4444', '#ec4899', '#ffffff'] : ['#10b981', '#34d399', '#ffffff'];
    
    for (let k = 0; k < sparkles; k++) {
      const angle = (Math.random() * Math.PI) + Math.PI;
      const velocity = 3 + Math.random() * 5;
      particlesRef.current.push({
        x: dropX,
        y: dropY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 1.0,
        radius: Math.random() * 4 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        life: 40 + Math.floor(Math.random() * 15)
      });
    }
  };

  const computePegLocations = (): Peg[] => {
    const pegs: Peg[] = [];
    const boardWidth = 720;
    const startY = 85;
    const endY = 635;
    const dy = (endY - startY) / rows;
    const dx = boardWidth / (rows + 1);

    for (let r = 0; r < rows; r++) {
      const pins = r + 3;
      const rowWidth = (pins - 1) * dx;
      const startX = 400 - rowWidth / 2;

      for (let p = 0; p < pins; p++) {
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

  const launchPlinkoBall = () => {
    if (localBalance < bet) {
      playLocalSound('click');
      return;
    }

    playLocalSound('chip');

    setLocalBalance(prev => prev - bet);
    onBet(bet).catch(err => console.error(err));

    setStats(prev => ({
      ...prev,
      drops: prev.drops + 1,
      totalWagered: prev.totalWagered + bet
    }));

    const funnelOffset = (Math.random() - 0.5) * 16;
    const startX = 400 + funnelOffset;
    const startY = 32;

    const ballColor = risk === 'high' ? '#f43f5e' : (risk === 'medium' ? '#f97316' : '#10b981');

    const ball: PhysicsBall = {
      id: Date.now() + Math.random(),
      x: startX,
      y: startY,
      vx: (Math.random() - 0.5) * 2.0,
      vy: 1.5,
      radius: 12.5, // BIGGER BALLS
      color: ballColor,
      wager: bet,
      completed: false
    };

    ballsRef.current.push(ball);

    for (let k = 0; k < 5; k++) {
      particlesRef.current.push({
        x: 400,
        y: 20,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 3 + 1,
        radius: Math.random() * 3 + 1,
        color: '#fbbf24',
        alpha: 0.9,
        life: 22
      });
    }
  };

  // Canvas Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Main high-perf render loop
  useEffect(() => {
    let frameId: number;
    const pegs = computePegLocations();

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      // Projects 800x740 logic coordinates onto resized canvas cleanly
      ctx.scale(canvas.width / 800, canvas.height / 740);

      const startY = 85;
      const endY = 635;
      const dy = (endY - startY) / rows;
      const dx = 720 / (rows + 1);
      const bucketY = 665;
      const bucketStartX = 400 - (720 / 2);

      // Bounce effect update
      if (activeBucketHitRef.current) {
        activeBucketHitRef.current.scale -= 0.04;
        activeBucketHitRef.current.timer--;
        if (activeBucketHitRef.current.scale < 1.0 || activeBucketHitRef.current.timer <= 0) {
          activeBucketHitRef.current = null;
        }
      }

      // Draw Buckets (Payout target boxes at bottom)
      const numBuckets = rows + 1;
      const bucketWidth = 720 / numBuckets;

      for (let b = 0; b < numBuckets; b++) {
        const multVal = currentMultipliers[b] || 1;
        const styleSetup = getBucketColorHex(multVal);
        const bx = bucketStartX + b * bucketWidth;
        const bheight = 36;
        const isHit = activeBucketHitRef.current?.index === b;
        const scale = isHit ? activeBucketHitRef.current!.scale : 1.0;

        ctx.save();
        ctx.translate(bx + bucketWidth / 2, bucketY + bheight / 2);
        ctx.scale(scale, scale);

        ctx.fillStyle = styleSetup.fill;
        ctx.shadowColor = styleSetup.glow;
        ctx.shadowBlur = isHit ? 30 : 6;

        ctx.beginPath();
        // Give comfortable wide fit rounded rect for larger balls
        ctx.roundRect(-bucketWidth / 2 + 1.5, -bheight / 2, bucketWidth - 3, bheight, 6);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = styleSetup.text;
        // Make multiplier font size proportional to width
        const fontSize = Math.max(9, Math.min(13, Math.floor(bucketWidth * 0.38)));
        ctx.font = `900 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${multVal < 1 ? multVal : multVal.toFixed(0)}`, 0, 0);
        ctx.restore();
      }

      // Draw Sparkles/Particles
      particlesRef.current.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.15;
        s.alpha -= 0.024;
        s.life--;

        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0 && p.alpha > 0);

      // Play Top release funnel
      ctx.save();
      const nozzleGrad = ctx.createLinearGradient(360, 10, 440, 10);
      nozzleGrad.addColorStop(0, '#1e293b');
      nozzleGrad.addColorStop(0.5, '#334155');
      nozzleGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = nozzleGrad;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      
      ctx.beginPath();
      ctx.moveTo(370, 10);
      ctx.lineTo(380, 36);
      ctx.lineTo(420, 36);
      ctx.lineTo(430, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Draw shiny bigger pegs
      pegs.forEach((peg) => {
        const intensity = hitPegsRef.current[peg.key] || 0;
        if (intensity > 0) {
          hitPegsRef.current[peg.key] -= 0.07;
          if (hitPegsRef.current[peg.key] < 0) {
            hitPegsRef.current[peg.key] = 0;
          }
        }

        ctx.save();
        if (intensity > 0) {
          ctx.strokeStyle = `rgba(251, 191, 36, ${intensity})`;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(peg.x, peg.y, 5 + intensity * 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#f59e0b';
        } else {
          ctx.fillStyle = '#e2e8f0';
        }

        ctx.beginPath();
        // BIGGER PEGS FOR BETTER PHYSICS CLASH
        ctx.arc(peg.x, peg.y, intensity > 0 ? 7.0 : 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Update Balls kinetic collisions
      ballsRef.current.forEach((ball) => {
        ball.vy += 0.22; // Natural sliding down gravity
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Space resistance
        ball.vx *= 0.988;
        ball.vy *= 0.988;

        // Boundaries wall rebound
        const wallMargin = 38;
        if (ball.x - ball.radius < wallMargin) {
          ball.x = wallMargin + ball.radius;
          ball.vx = -ball.vx * 0.45;
        } else if (ball.x + ball.radius > 800 - wallMargin) {
          ball.x = 800 - wallMargin - ball.radius;
          ball.vx = -ball.vx * 0.45;
        }

        // Peg collision checkers
        pegs.forEach((peg) => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.hypot(dx, dy);
          const pinRadius = 4.8;
          const clearance = ball.radius + pinRadius;

          if (dist < clearance) {
            const nx = dx / dist;
            const ny = dy / dist;

            // Push clear
            const overlap = clearance - dist;
            ball.x += nx * overlap;
            ball.y += ny * overlap;

            const speedNormal = ball.vx * nx + ball.vy * ny;
            if (speedNormal < 0) {
              const bounceFactor = 0.55;
              const impulse = -(1 + bounceFactor) * speedNormal;
              ball.vx += impulse * nx;
              ball.vy += impulse * ny;

              // Introduce juicy kinetic sideways dispersal
              ball.vx += (Math.random() - 0.5) * 0.45;

              hitPegsRef.current[peg.key] = 1.0;

              const nowTime = Date.now();
              if (nowTime - lastPlinkTimeRef.current > 40) {
                playLocalSound('plink');
                lastPlinkTimeRef.current = nowTime;
              }

              // Sparkles cascade
              for (let i = 0; i < 3; i++) {
                particlesRef.current.push({
                  x: peg.x,
                  y: peg.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 3 - 0.5,
                  radius: Math.random() * 2.2 + 0.8,
                  color: ball.color,
                  alpha: 0.8,
                  life: 15
                });
              }
            }
          }
        });

        // Lands in buckets
        if (ball.y >= bucketY && !ball.completed) {
          ball.completed = true;
          const relativeX = ball.x - bucketStartX;
          let calculatedIndex = Math.floor(relativeX / bucketWidth);
          calculatedIndex = Math.max(0, Math.min(rows, calculatedIndex));
          handleBucketFall(calculatedIndex, ball.wager);
        }

        // 3D Glass Sphere design
        ctx.save();
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        const radialRef = ctx.createRadialGradient(
          ball.x - ball.radius * 0.35,
          ball.y - ball.radius * 0.35,
          1.0,
          ball.x,
          ball.y,
          ball.radius
        );
        radialRef.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
        radialRef.addColorStop(0.3, ball.color);
        radialRef.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        ctx.fillStyle = radialRef;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ballsRef.current = ballsRef.current.filter(b => !b.completed && b.y < 740);
      ctx.restore();
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [rows, risk, currentMultipliers, soundEnabled]);

  const doubleBet = () => {
    playLocalSound('click');
    setBet(prev => Math.min(localBalance > 10 ? localBalance : 10000, prev * 2));
  };

  const halfBet = () => {
    playLocalSound('click');
    setBet(prev => Math.max(minBet, Math.floor(prev / 2)));
  };

  const setMaxBet = () => {
    playLocalSound('click');
    setBet(Math.max(minBet, Math.floor(localBalance)));
  };

  const setMinBet = () => {
    playLocalSound('click');
    setBet(minBet);
  };

  const adjustBetValue = (amount: number) => {
    playLocalSound('chip');
    setBet(prev => {
      const next = prev + amount;
      return Math.max(minBet, Math.min(localBalance || minBet, next));
    });
  };

  return (
    <div id="plinko-arena-root" className="flex flex-col h-full bg-[#02040a] text-sky-100 font-sans overflow-hidden select-none relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1329] via-transparent to-[#02040a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,_rgba(56,189,248,0.08)_0%,_transparent_70%)]" />
      </div>

      {/* COMPACT CLEAN HEADER */}
      <header className="flex items-center justify-between px-6 h-14 bg-[#0a1122]/90 border-b border-sky-500/10 relative z-20 shrink-0 backdrop-blur-md">
        
        <button 
          id="btn-plinko-exit"
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14203a] hover:bg-[#1d2d50] text-sky-200 hover:text-white rounded-lg border border-sky-500/15 active:scale-95 transition-all text-xs font-bold leading-none"
        >
          <LogOut size={13} />
          <span>Exit</span>
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-sky-300 font-black tracking-widest text-sm uppercase leading-none">
              PLINKO ROYALE
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
        </div>

        {/* Balance Status */}
        <div className="flex items-center gap-2 bg-[#0d162a] rounded-lg px-3 py-1.5 border border-sky-400/20">
          <Zap size={12} className="text-yellow-405 text-yellow-300 fill-yellow-300 animate-pulse" />
          <span className="text-sky-300 font-mono font-black text-xs leading-none">
            RS {localBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

      </header>

      {/* QUICK INLINE CONTROL HUDBAR (REMOVED SIDEBARS & OVERLAYS ENTIRELY) */}
      <div className="shrink-0 py-2 px-6 bg-[#070d1a] border-b border-sky-500/5 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 text-xs font-bold relative z-20">
        
        {/* Risk profile inline toggle */}
        <div className="flex items-center gap-2">
          <Gauge size={13} className="text-sky-400" />
          <span className="text-sky-400/50 uppercase tracking-wider text-[10px]">Risk:</span>
          <div className="flex bg-black/40 rounded-md p-0.5 border border-sky-500/10">
            {(['low', 'medium', 'high'] as const).map((r) => (
              <button
                key={r}
                id={`btn-risk-${r}`}
                onClick={() => { playLocalSound('click'); setRisk(r); }}
                className={`px-3 py-0.5 rounded text-[10px] uppercase font-black tracking-wide transition-all ${
                  risk === r ? 'bg-sky-500 text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Rows bounds inline toggle */}
        <div className="flex items-center gap-2">
          <Layers size={13} className="text-sky-400" />
          <span className="text-sky-400/50 uppercase tracking-wider text-[10px]">Rows:</span>
          <div className="flex bg-black/40 rounded-md p-0.5 border border-sky-500/10">
            {[8, 10, 12, 14, 16].map((num) => (
              <button
                key={num}
                id={`btn-rows-${num}`}
                onClick={() => { playLocalSound('click'); setRows(num); }}
                className={`px-2.5 py-0.5 rounded text-[10px] font-black transition-all ${
                  rows === num ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic audio configuration */}
        <div className="flex items-center gap-3">
          <button 
            id="btn-toggle-sound"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playLocalSound("click");
            }}
            className="p-1 px-2 rounded bg-[#101b33] hover:bg-[#1a2d54] text-sky-300 border border-sky-500/10 transition-all text-[10px] flex items-center gap-1"
          >
            {soundEnabled ? (
              <>
                <Volume2 size={11} className="text-emerald-400" />
                <span>SOUND ON</span>
              </>
            ) : (
              <>
                <VolumeX size={11} className="text-rose-400" />
                <span>MUTED</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* IMMERSIVE BOARD VIEWSTAGE (FULL VIEW EXPANSION) */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-3">
        
        <div 
          ref={containerRef}
          className="w-full max-w-[620px] h-full relative flex items-center justify-center"
        >
          <canvas ref={canvasRef} className="block w-full h-full" />

          {/* DYNAMIC RECENT MULTIPLIERS COLUMN */}
          <div className="absolute top-4 right-2 flex flex-col gap-1 z-30 max-h-[220px] overflow-y-auto py-1 scrollbar-none pointer-events-none">
            <AnimatePresence>
              {history.map((mult, i) => (
                <motion.div
                  key={i + '-' + mult}
                  id={`history-${i}`}
                  initial={{ opacity: 0, x: 15, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                  className={`px-2.5 py-1 rounded text-[9px] font-black text-center min-w-[36px] leading-tight ${getBucketColorClass(mult)}`}
                >
                  {mult}x
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* SPEED WAGER CHIPS CONTROL FOOTER */}
      <footer className="p-4 bg-[#050914] border-t border-sky-500/10 relative z-30 shrink-0 shadow-2xl">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3 items-stretch">
          
          {/* Bet size tools */}
          <div className="flex-1 bg-black/40 rounded-xl border border-sky-500/10 flex items-center p-1.5 gap-2 min-w-0">
            
            <button
              id="btn-bet-half"
              type="button"
              onClick={halfBet}
              className="px-3 py-2 rounded-lg bg-[#14203a] hover:bg-[#1f3056] font-black text-[10px] text-sky-300"
            >
              1/2
            </button>

            <button
              id="btn-bet-down"
              type="button"
              onClick={() => adjustBetValue(-10)}
              className="w-9 h-9 shrink-0 rounded-lg bg-[#14203a] hover:bg-[#1f3056] text-sky-400 hover:text-white flex items-center justify-center"
            >
              <Minus size={13} className="stroke-[3]" />
            </button>

            <div className="flex-1 text-center min-w-0 leading-none">
              <span className="text-[9px] font-black uppercase text-sky-500/45 tracking-widest block">Coin Size</span>
              <span className="text-sm font-mono font-black text-yellow-300 block truncate mt-0.5">RS {bet.toLocaleString()}</span>
            </div>

            <button
              id="btn-bet-up"
              type="button"
              onClick={() => adjustBetValue(10)}
              className="w-9 h-9 shrink-0 rounded-lg bg-[#14203a] hover:bg-[#1f3056] text-sky-400 hover:text-white flex items-center justify-center"
            >
              <Plus size={13} className="stroke-[3]" />
            </button>

            <button
              id="btn-bet-double"
              type="button"
              onClick={doubleBet}
              className="px-3 py-2 rounded-lg bg-[#14203a] hover:bg-[#1f3056] font-black text-[10px] text-sky-300"
            >
              2X
            </button>

            <button
              id="btn-bet-max"
              type="button"
              onClick={setMaxBet}
              className="px-2.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-extrabold text-[10px]"
            >
              MAX
            </button>

          </div>

          {/* GIANT BALL RELEASE */}
          <button
            id="btn-drop-ball"
            type="button"
            disabled={localBalance < bet}
            onClick={launchPlinkoBall}
            className="sm:w-56 bg-gradient-to-r from-emerald-500 to-[#32D74B] hover:scale-[1.02] active:scale-95 transition-all text-black font-black py-4 px-6 rounded-xl shadow-lg uppercase tracking-widest flex items-center justify-center gap-2 text-xs shadow-emerald-500/10 cursor-pointer disabled:opacity-40"
          >
            <Sparkles size={13} className="fill-current animate-pulse" />
            <span>DROP BALL</span>
          </button>

        </div>
      </footer>

    </div>
  );
};
