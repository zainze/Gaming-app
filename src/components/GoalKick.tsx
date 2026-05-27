import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LogOut, 
  Minus, 
  Plus, 
  Target, 
  Trophy, 
  Zap, 
  Flame,
  Volume2,
  VolumeX,
  Sparkles,
  Play
} from "lucide-react";
import { playSound, stopSound, setSoundActiveGameId } from "../lib/sounds";

interface PenaltyRoyaleProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

type GoalTarget = "left" | "center" | "right";

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  gravity: number;
  decay: number;
  rotation: number;
  spin: number;
}

export const GoalKick: React.FC<PenaltyRoyaleProps> = ({
  balance,
  onWin,
  onBet,
  onExit,
  winRate = 50,
  minBet = 10,
  multiplier = 1.9
}) => {
  const [bet, setBet] = useState(50);
  const [selectedGoal, setSelectedGoal] = useState<GoalTarget | null>(null);
  
  // Game states:
  // "idle": Pre-match lobby screen. Click "KICK OFF" / "START MATCH" to begin.
  // "ready": On-field, ready to shoot. 3 targets on the goal are active.
  // "kicking": Kicking animation running on physics loop.
  // "goal": Goal is scored outcome.
  // "saved": Saved by keeper outcome.
  const [gameState, setGameState] = useState<"idle" | "ready" | "kicking" | "goal" | "saved">("idle");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastWinAmount, setLastWinAmount] = useState<number | null>(null);

  // References for pure-canvas physics animation (0% internet lag & CPU efficient)
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const sparksRef = useRef<SparkParticle[]>([]);

  // Sound trigger helpers
  const playLocalSound = (name: 'click' | 'win' | 'lose' | 'spin' | 'chip' | 'coin' | 'sports_ready') => {
    if (soundEnabled) playSound(name);
  };

  // Ball model properties (Updated in loop)
  const ballRef = useRef({
    x: 0,       // current relative horizontal coordinate
    y: 0,       // height above turf
    z: 1.0,     // depth scale (smaller is further back in the net)
    rotation: 0
  });

  // Keeper model properties (Updated in loop)
  const keeperRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0
  });

  // Kick animation physics progress tracking (0 to 1)
  const kickProgressRef = useRef(0);
  const isSaveRef = useRef(false);
  const currentTargetRef = useRef<GoalTarget | null>(null);
  const targetCoordsRef = useRef({ x: 0, y: 0 });
  const diveCoordsRef = useRef({ x: 0, y: 0 });

  // Web net vibration force
  const netVibrationRef = useRef(0);

  useEffect(() => {
    setSoundActiveGameId("goal_kick");
    return () => {
      setSoundActiveGameId(null);
    };
  }, []);

  const bettingCoins = [10, 50, 100, 500, 1000];

  const adjustBet = (amount: number) => {
    playLocalSound("chip");
    setBet((prev) => {
      const next = prev + amount;
      return Math.max(minBet, Math.min(balance || minBet, next));
    });
  };

  // Handle high-performance dynamic Canvas resizing with zero layout shifts
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

    return () => {
      observer.disconnect();
    };
  }, []);

  // Instantly spawns fireworks & spark sparkles without network lag dependency
  const spawnCelebrationSparks = (targetX: number, targetY: number, count: number, isSaved: boolean = false) => {
    const colors = isSaved 
      ? ["#EF4444", "#F87171", "#FFFFFF"] 
      : ["#10B981", "#34D399", "#FBBF24", "#F472B6", "#A78BFA", "#FFFFFF"];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = isSaved ? (2 + Math.random() * 4) : (4 + Math.random() * 8);
      sparksRef.current.push({
        x: 400 + targetX,
        y: 300 - targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isSaved ? 0 : 4),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1.5 + Math.random() * 3.5,
        alpha: 1.0,
        gravity: 0.18,
        decay: 0.025,
        rotation: Math.random() * Math.PI,
        spin: -0.12 + Math.random() * 0.24
      });
    }
  };

  // Ultra high fidelity RequestAnimationFrame Draw & Physics Loop (Internet/CPU-lag proof)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const goalLeft = 180;
    const goalRight = 620;
    const goalTop = 110;
    const goalBottom = 330;
    const goalW = goalRight - goalLeft;
    const goalH = goalBottom - goalTop;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      // Auto scaling factor supporting any phone/tablet screen sizes
      ctx.scale(W / 800, H / 500);

      // 1. Draw Beautiful Vector Stadium Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 340);
      skyGrad.addColorStop(0, "#010804");
      skyGrad.addColorStop(0.4, "#021c0e");
      skyGrad.addColorStop(1, "#042c14");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 800, 340);

      // Stadium glow spotlight pillars
      ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
      ctx.fillRect(0, 0, 800, 340);

      // 2. Clear Vector Turf lawn
      const pitchGrad = ctx.createLinearGradient(0, 340, 0, 500);
      pitchGrad.addColorStop(0, "#052d14");
      pitchGrad.addColorStop(1, "#0b4e23");
      ctx.fillStyle = pitchGrad;
      ctx.fillRect(0, 340, 800, 160);

      // Elegant deep turf stripes
      ctx.fillStyle = "#03220f";
      for (let i = 0; i < 4; i++) {
        if (i % 2 === 0) {
          ctx.fillRect(0, 340 + i * 40, 800, 20);
        }
      }

      // Real-time animated spotlight sweepers
      const t = Date.now();
      const sweep = 0.22 * Math.sin(t / 1800);
      ctx.fillStyle = "rgba(52, 211, 153, 0.07)";
      ctx.beginPath();
      ctx.moveTo(40, 10);
      ctx.lineTo(260 + sweep * 120, 340);
      ctx.lineTo(140 + sweep * 120, 340);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(760, 10);
      ctx.lineTo(660 - sweep * 120, 340);
      ctx.lineTo(540 - sweep * 120, 340);
      ctx.closePath();
      ctx.fill();

      // 3. Penalty kick spot circle
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(400, 440, 6, 0, Math.PI * 2);
      ctx.fill();

      // Stadium boundaries & field boundary lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 340);
      ctx.lineTo(800, 340);
      ctx.stroke();

      // D-Box arc line
      ctx.beginPath();
      ctx.arc(400, 340, 130, 0, Math.PI, false);
      ctx.stroke();

      // 4. Goal Frame shadows
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalBottom);
      ctx.lineTo(goalLeft, goalTop);
      ctx.lineTo(goalRight, goalTop);
      ctx.lineTo(goalRight, goalBottom);
      ctx.stroke();

      // 5. Build dynamic Mesh Net lines with tension ripples
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1;

      const cols = 22;
      const rws = 11;
      const cellW = goalW / cols;
      const cellH = goalH / rws;

      // Vertical mesh strings
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rws; r++) {
          let nx = goalLeft + c * cellW;
          let ny = goalTop + r * cellH;

          if (netVibrationRef.current > 0.01) {
            const bx = 400 + ballRef.current.x;
            const by = 300 - targetCoordsRef.current.y;
            const dist = Math.sqrt(Math.pow(nx - bx, 2) + Math.pow(ny - by, 2));
            if (dist < 110) {
              const ripple = (110 - dist) / 110 * netVibrationRef.current * 16;
              nx += (nx > bx ? 1 : -1) * ripple * 0.4;
              ny += ripple;
            }
          }

          if (r === 0) ctx.moveTo(nx, ny);
          else ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }

      // Horizontal mesh strings
      for (let r = 0; r <= rws; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          let nx = goalLeft + c * cellW;
          let ny = goalTop + r * cellH;

          if (netVibrationRef.current > 0.01) {
            const bx = 400 + ballRef.current.x;
            const by = 300 - targetCoordsRef.current.y;
            const dist = Math.sqrt(Math.pow(nx - bx, 2) + Math.pow(ny - by, 2));
            if (dist < 110) {
              const ripple = (110 - dist) / 110 * netVibrationRef.current * 16;
              ny += ripple;
            }
          }

          if (c === 0) ctx.moveTo(nx, ny);
          else ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }

      // Ripple decay
      if (netVibrationRef.current > 0) {
        netVibrationRef.current *= 0.94;
      }

      // 6. White Goal Posts structural borders
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 9;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalBottom);
      ctx.lineTo(goalLeft, goalTop);
      ctx.lineTo(goalRight, goalTop);
      ctx.lineTo(goalRight, goalBottom);
      ctx.stroke();

      // Corner reinforcement bars
      ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
      ctx.lineWidth = 3;
      ctx.strokeRect(goalLeft, goalTop, 11, 11);
      ctx.strokeRect(goalRight - 11, goalTop, 11, 11);

      // 7. Goalkeeper rendering
      if (gameState !== "idle") {
        const gk = keeperRef.current;
        ctx.save();
        ctx.translate(400 + gk.x, 300 - gk.y);

        // Ground shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.beginPath();
        const shadowRatio = Math.max(0.2, 1.0 - gk.y / 150);
        ctx.ellipse(0, 30 + gk.y, 38 * shadowRatio, 8 * shadowRatio, 0, 0, Math.PI * 2);
        ctx.fill();

        // Diving pivot direction
        const rotationAngle = gk.x * 0.0035;
        ctx.rotate(rotationAngle);

        // Goalkeeper Core torso
        ctx.fillStyle = "#A855F7"; // neon purple jersey
        const drawGKJersey = (x: number, y: number, w: number, h: number, r: number) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fill();
        };
        drawGKJersey(-21, -44, 42, 44, 9);

        // Jersey logo sponsor
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 2;
        ctx.strokeRect(-11, -37, 22, 7);

        // Goalkeeper Number
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("1", 0, -17);

        // Goalkeeper Head
        ctx.fillStyle = "#F3E8FF";
        ctx.beginPath();
        ctx.arc(0, -57, 11, 0, Math.PI * 2);
        ctx.fill();

        // High Vis green gloves
        ctx.fillStyle = "#22C55E";
        const armStretchX = gk.x > 10 ? 32 : (gk.x < -10 ? 10 : 27);
        const armStretchY = gk.y > 10 ? -48 : -34;
        drawGKJersey(-armStretchX, armStretchY, 13, 15, 3);
        drawGKJersey(armStretchX - 13, armStretchY, 13, 15, 3);

        // Black match shorts
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(-21, 0, 42, 8);

        ctx.restore();
      }

      // 8. Particle systems drawing
      sparksRef.current.forEach((s, idx) => {
        s.vy += s.gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;
        s.rotation += s.spin;

        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.fillStyle = s.color;

        ctx.beginPath();
        if (s.size > 2) {
          ctx.moveTo(0, -s.size);
          ctx.lineTo(s.size, 0);
          ctx.lineTo(0, s.size);
          ctx.lineTo(-s.size, 0);
          ctx.closePath();
        } else {
          ctx.arc(0, 0, s.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();

        if (s.alpha <= 0.01) {
          sparksRef.current.splice(idx, 1);
        }
      });

      // 9. HIGH PERFORMANCE SHOOTING BALL PHYSICS TICK TRACING
      // Completely avoids slow setInterval lags or high battery usage!
      if (gameState === "kicking") {
        kickProgressRef.current += 0.042; // Fast, super fluid ~24 frames animation (0.4s)
        const p = Math.min(1.0, kickProgressRef.current);

        const spotX = 400;
        const spotY = 440;

        // Animate coordinates using easeOutCubic curve
        const easeOutRatio = 1 - Math.pow(1 - p, 3);
        ballRef.current.x = targetCoordsRef.current.x * easeOutRatio;
        ballRef.current.y = targetCoordsRef.current.y * easeOutRatio;
        // 3D perspective scales sizes
        ballRef.current.z = 1.0 - (0.75 * easeOutRatio); // shrinks smaller
        ballRef.current.rotation += 0.28;

        // Keepers dive start slightly after kickoff
        if (p > 0.1) {
          const gkRatio = (p - 0.1) / 0.9;
          keeperRef.current.x = diveCoordsRef.current.x * gkRatio;
          keeperRef.current.y = diveCoordsRef.current.y * gkRatio * 0.9;
        }

        if (p >= 1.0) {
          // Resolve score or saved outcome instantly
          const distance = Math.sqrt(
            Math.pow(ballRef.current.x - keeperRef.current.x, 2) + 
            Math.pow(ballRef.current.y - keeperRef.current.y, 2)
          );

          const gloveInterceptBlockRange = 60;

          if (isSaveRef.current || distance < gloveInterceptBlockRange) {
            // SAVED Outcome
            setGameState("saved");
            playLocalSound("lose");

            // Ball deflection effect
            ballRef.current.x = keeperRef.current.x + (ballRef.current.x > keeperRef.current.x ? 18 : -18);
            ballRef.current.y = keeperRef.current.y - 12;
            ballRef.current.z = 0.45;

            spawnCelebrationSparks(ballRef.current.x, ballRef.current.y, 16, true);
            setStreak(0);

            // Instant auto-recovery cooldown
            setTimeout(() => {
              setGameState("ready");
              resetFieldPosition();
            }, 1600);
          } else {
            // GOAL Outcome
            setGameState("goal");
            playLocalSound("win");

            netVibrationRef.current = 1.0;
            const payout = bet * multiplier;

            spawnCelebrationSparks(ballRef.current.x, ballRef.current.y, 40, false);
            onWin(payout);
            setLastWinAmount(payout);

            const nextStreak = streak + 1;
            setStreak(nextStreak);
            setBestStreak(prev => Math.max(prev, nextStreak));

            // Instant auto-recovery cooldown
            setTimeout(() => {
              setGameState("ready");
              resetFieldPosition();
            }, 1600);
          }
        }
      }

      // 10. Render standard soccer ball in actual layout position
      const spotX = 400;
      const spotY = 440;
      const ball = ballRef.current;
      
      const ballRadius = 23 * ball.z;
      const shadowY = spotY + (100 * (1.0 - ball.z));

      // Ball turf shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.beginPath();
      ctx.ellipse(spotX + ball.x, shadowY, ballRadius, ballRadius * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Render pentagon-pattern graphics
      ctx.save();
      ctx.translate(spotX + ball.x, spotY - ball.y - (145 * (1.0 - ball.z)));
      ctx.rotate(ball.rotation);

      // Sphere Base
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = "#041e0d";
      ctx.lineWidth = Math.max(1.2, ballRadius * 0.09);
      ctx.stroke();

      // Standard soccer pentagon patterns drawn dynamically
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = Math.max(1, ballRadius * 0.08);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const theta = (i * Math.PI * 2) / 5;
        const px = Math.cos(theta) * (ballRadius * 0.58);
        const py = Math.sin(theta) * (ballRadius * 0.58);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const theta = (i * Math.PI * 2) / 5;
        const ox = Math.cos(theta) * ballRadius;
        const oy = Math.sin(theta) * ballRadius;
        const ix = Math.cos(theta) * (ballRadius * 0.58);
        const iy = Math.sin(theta) * (ballRadius * 0.58);
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ox, oy);
        ctx.stroke();
      }

      ctx.restore();

      ctx.restore();
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, bet, streak, winRate, multiplier]);

  // Performs ball layout reset
  const resetFieldPosition = () => {
    setSelectedGoal(null);
    keeperRef.current = { x: 0, y: 0, targetX: 0, targetY: 0 };
    ballRef.current = { x: 0, y: 0, z: 1.0, rotation: 0 };
    kickProgressRef.current = 0;
  };

  // Shoots toward the chosen target sector
  const shootBall = (target: GoalTarget) => {
    if (gameState !== "ready" || balance < bet) {
      if (balance < bet) {
        setGameState("idle");
      }
      return;
    }

    onBet(bet);
    setGameState("kicking");
    setSelectedGoal(target);
    setLastWinAmount(null);

    playLocalSound("sports_ready");

    kickProgressRef.current = 0;
    currentTargetRef.current = target;

    // Define target shot coordinates
    let targetX = 0;
    const targetY = 135 + Math.random() * 55; // elevation height

    if (target === "left") {
      targetX = -135 - Math.random() * 45;
    } else if (target === "right") {
      targetX = 135 + Math.random() * 45;
    } else {
      targetX = (Math.random() - 0.5) * 45; // center
    }

    targetCoordsRef.current = { x: targetX, y: targetY };

    // Mathematics of goalie dive blocking probability based on user's winRate config
    const isSave = Math.random() * 100 > winRate;
    isSaveRef.current = isSave;

    let diveX = 0;
    let diveY = 0;

    if (isSave) {
      diveX = targetX;
      diveY = targetY;
    } else {
      // Divert keeper to wrong corners
      const targets: GoalTarget[] = ["left", "center", "right"];
      const incorrectSectors = targets.filter(t => t !== target);
      const chosenIncorrect = incorrectSectors[Math.floor(Math.random() * incorrectSectors.length)];

      if (chosenIncorrect === "left") {
        diveX = -135 - Math.random() * 30;
        diveY = 110 + Math.random() * 40;
      } else if (chosenIncorrect === "right") {
        diveX = 135 + Math.random() * 30;
        diveY = 110 + Math.random() * 40;
      } else {
        diveX = (Math.random() - 0.5) * 35;
        diveY = 30 + Math.random() * 30;
      }
    }

    diveCoordsRef.current = { x: diveX, y: diveY };
  };

  const handleStartGame = () => {
    playLocalSound("sports_ready");
    setGameState("ready");
    resetFieldPosition();
  };

  return (
    <div className="flex flex-col h-full bg-[#010804] text-[#ecfdf5] font-sans overflow-hidden select-none relative">
      
      {/* 100% Vector Stadium field backdrop elements (Loaded instantly, 0ms latency) */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#010b05] via-[#021d0f] to-[#043317] pointer-events-none" />

      {/* CORE TOP HEADER NAV SECTION */}
      <header className="flex items-center justify-between px-4 h-14 bg-[#02130a]/90 border-b border-emerald-500/15 relative z-20 shrink-0 backdrop-blur-md">
        
        <button 
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e2717] hover:bg-[#184428] text-gray-300 hover:text-white rounded-xl border border-emerald-500/20 active:scale-95 transition-all text-[11px] font-black uppercase tracking-wider shadow"
        >
          <LogOut size={12} className="stroke-[3]" />
          <span>Exit</span>
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-extrabold tracking-wider text-xs uppercase leading-none">
              PRO GOAL KICK
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
          </div>
          <p className="text-[7.5px] font-bold tracking-[0.25em] text-emerald-500/50 uppercase leading-none mt-1">SUPER FAST SHOT</p>
        </div>

        {/* Dynamic Balance Chip */}
        <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-3 py-1.5 border border-emerald-500/20 shadow-inner">
          <Zap size={11} className="text-emerald-400 fill-emerald-400" />
          <span className="text-emerald-400 font-mono font-black text-xs leading-none">
            RS {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

      </header>

      {/* STATED STATUS HUD BAR */}
      <div className="shrink-0 h-10 px-4 bg-[#031c0e]/95 border-b border-emerald-500/10 flex items-center justify-between text-[11px] text-emerald-400 font-bold tracking-tight relative z-20">
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Trophy size={11} className="text-yellow-400 stroke-[2.5]" />
            <span className="text-emerald-300/70 text-[10px]">Winnings:</span>
            <span className="text-yellow-400 font-extrabold font-mono">{multiplier}x Profit</span>
          </div>

          {streak > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg text-[9.5px] text-amber-500 font-black border border-amber-500/20 animate-pulse">
              <Flame size={11} className="fill-amber-500 stroke-[2.5]" />
              <span>{streak} STREAK</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-wider hidden sm:inline">
            Best Streak: {bestStreak} goals
          </span>

          <button 
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playLocalSound("click");
            }}
            className="p-1.5 rounded-lg bg-[#0c2716] hover:bg-[#123c22] text-emerald-400 border border-emerald-500/15 transition-all active:scale-95 shadow"
            title="Toggle Audio"
          >
            {soundEnabled ? <Volume2 size={11} className="text-emerald-400" /> : <VolumeX size={11} />}
          </button>
        </div>

      </div>

      {/* CORE ARENA CANVAS COMPONENT */}
      <div 
        ref={containerRef}
        className="flex-1 min-h-[200px] relative bg-[#010804] border-b border-[#041c0d] overflow-hidden"
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* 1. LOBBY IDLE WELCOME PANEL (High fidelity vector drawn, 0ms latency) */}
        {gameState === "idle" && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="max-w-xs bg-gradient-to-b from-[#092c15] to-[#03150a] border border-emerald-500/30 p-6 rounded-3xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              {/* Corner tech accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-500/40" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-500/40" />

              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Sparkles size={20} className="animate-spin" style={{ animationDuration: '6s' }} />
              </div>

              <h2 className="text-base font-black tracking-wider text-white uppercase italic">
                STADIUM MATCH OFF
              </h2>
              <p className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-widest leading-none mt-1">Ready for Kicking?</p>

              <div className="my-4 py-2 border-y border-emerald-500/10 bg-black/30 rounded-xl">
                <span className="text-[10px] font-semibold text-gray-300 block mb-0.5">CURRENT COIN BET</span>
                <span className="text-base font-mono font-black text-yellow-400">RS {bet}</span>
              </div>

              <button
                onClick={handleStartGame}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs uppercase tracking-widest rounded-xl border border-emerald-400 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Play size={13} fill="currentColor" />
                <span>START KICK MATCH</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* 2. THREE DYNAMIC TARGET ZONES (Active only in "ready" state) */}
        {gameState === "ready" && (
          <div className="absolute inset-0 top-[22%] h-[44%] left-[21.5%] w-[57%] grid grid-cols-3 gap-3.5 z-30 pointer-events-auto">
            
            {/* LEFT AREA TARGET */}
            <button
              onClick={() => shootBall("left")}
              disabled={balance < bet}
              className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/20 hover:border-[#10B981] bg-black/25 hover:bg-emerald-500/15 active:scale-95 transition-all text-center select-none"
            >
              <span className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="w-8 h-8 rounded-full bg-black/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-lg group-hover:border-[#10B981]">
                <Target size={14} className="group-hover:animate-pulse" />
              </div>
              <span className="text-[10px] font-black text-emerald-300 tracking-wider uppercase mt-2 group-hover:text-white leading-none">
                LEFT
              </span>
              <span className="text-[7px] font-bold text-emerald-500/50 leading-none mt-0.5">TOP CORNER</span>
            </button>

            {/* CENTER AREA TARGET */}
            <button
              onClick={() => shootBall("center")}
              disabled={balance < bet}
              className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-555/20 hover:border-yellow-410 bg-black/25 hover:bg-yellow-500/15 active:scale-95 transition-all text-center select-none"
            >
              <span className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="w-8 h-8 rounded-full bg-black/70 border border-emerald-500/30 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform shadow-lg group-hover:border-yellow-410">
                <Target size={14} className="group-hover:animate-pulse" />
              </div>
              <span className="text-[10px] font-black text-yellow-500 tracking-wider uppercase mt-2 group-hover:text-white leading-none">
                CENTER
              </span>
              <span className="text-[7px] font-bold text-yellow-500/50 leading-none mt-0.5">GOAL KICK</span>
            </button>

            {/* RIGHT AREA TARGET */}
            <button
              onClick={() => shootBall("right")}
              disabled={balance < bet}
              className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/20 hover:border-[#10B981] bg-black/25 hover:bg-emerald-500/15 active:scale-95 transition-all text-center select-none"
            >
              <span className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="w-8 h-8 rounded-full bg-black/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-lg group-hover:border-[#10B981]">
                <Target size={14} className="group-hover:animate-pulse" />
              </div>
              <span className="text-[10px] font-black text-emerald-300 tracking-wider uppercase mt-2 group-hover:text-white leading-none">
                RIGHT
              </span>
              <span className="text-[7px] font-bold text-emerald-500/50 leading-none mt-0.5">TOP CORNER</span>
            </button>

          </div>
        )}

        {/* TAP TO SHOT PROMPT FOR THE READY STATE */}
        {gameState === "ready" && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/85 border border-emerald-500/15 rounded-full px-4 py-1 flex items-center gap-1.5 shadow-lg max-w-sm text-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[9px] font-black tracking-widest text-[#FFFFFF] uppercase">
              🎯 TAP A TARGET RING ABOVE TO SHOOT!
            </span>
          </div>
        )}

        {/* GOAL/SAVED CELEBRATION SHIELDS */}
        <AnimatePresence>
          {gameState === "goal" && (
            <motion.div 
              initial={{ scale: 0.72, opacity: 0, y: 15 }}
              animate={{ scale: [1, 1.15, 1], opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-[30%] -translate-x-1/2 bg-gradient-to-r from-orange-600 to-red-600 text-black shadow-2xl px-6 py-3.5 rounded-2xl z-40 border border-amber-400 flex flex-col items-center select-none text-center min-w-[200px]"
            >
              <div className="flex items-center gap-1.5">
                <Trophy size={16} className="text-yellow-300 animate-bounce" />
                <span className="font-sans font-black tracking-widest uppercase italic text-xs text-white leading-none">
                  GOAL SCORED!
                </span>
              </div>
              {lastWinAmount && (
                <span className="font-mono font-black text-lg text-yellow-300 mt-1 leading-none animate-pulse">
                  +RS {lastWinAmount.toLocaleString()}
                </span>
              )}
            </motion.div>
          )}

          {gameState === "saved" && (
            <motion.div 
              initial={{ scale: 0.76, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-[30%] -translate-x-1/2 bg-[#1e1b4b]/95 text-[#f43f5e] shadow-2xl px-5 py-3 rounded-2xl z-40 border border-purple-800 flex flex-col items-center select-none text-center min-w-[180px]"
            >
              <span className="font-sans font-black tracking-widest uppercase italic text-xs leading-none">
                KEEPER SAVED!
              </span>
              <span className="text-[9px] text-gray-300 mt-1 font-bold block leading-none">TIGHT LUCK! DIVE BLOCKED.</span>
            </motion.div>
          )}

          {gameState === "kicking" && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-transparent flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="bg-black/60 px-4 py-1.5 rounded-full border border-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-widest animate-pulse">
                ⚽ BALL IN FLIGHT...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* FOOTER COMMAND CONTROL BAR */}
      <footer className="shrink-0 bg-[#021006] border-t border-emerald-500/15 p-4 space-y-3.5 relative z-10 shadow-2xl">
        
        {/* CHIP/COIN SELECTION ZONE */}
        <div className="flex flex-col gap-2">
          
          <div className="flex items-center justify-between text-[#86e2b6]/60 text-[9.5px] font-black uppercase tracking-wider">
            <span className="flex items-center gap-1.5 font-bold">
              <Zap size={11} className="text-emerald-400" />
              SELECT COIN VALUE (BET STAKE)
            </span>
            <span className="font-mono text-emerald-400/40">
              STAKE: RS {bet}
            </span>
          </div>

          <div className="flex items-center gap-2">
            
            {/* MINUS ADJUST STAKE BUTTON */}
            <button
              onClick={() => adjustBet(-10)}
              disabled={gameState === "kicking"}
              className="w-10 h-10 shrink-0 bg-[#082210] hover:bg-[#123e1f] border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 hover:text-white transition-all active:scale-95 disabled:opacity-30"
              title="Decrease Stake"
            >
              <Minus size={13} className="stroke-[3]" />
            </button>

            {/* COIN CODES SELECTION */}
            <div className="flex-1 grid grid-cols-5 gap-1.5 py-0.5">
              {bettingCoins.map((coinVal) => {
                const isSelected = bet === coinVal;
                
                let coinColor = "from-amber-700 via-amber-600 to-amber-800 border-amber-500/30";
                if (coinVal === 50) coinColor = "from-slate-500 via-slate-300 to-slate-600 border-slate-300/30";
                if (coinVal === 100) coinColor = "from-yellow-600 via-yellow-400 to-amber-600 border-yellow-400/30";
                if (coinVal === 500) coinColor = "from-indigo-700 via-blue-500 to-indigo-900 border-blue-400/30";
                if (coinVal === 1000) coinColor = "from-emerald-700 via-emerald-500 to-teal-800 border-emerald-400/30";

                return (
                  <button
                    key={coinVal}
                    disabled={gameState === "kicking"}
                    onClick={() => {
                      playLocalSound("click");
                      setBet(coinVal);
                    }}
                    className={`relative aspect-square py-1 px-0.5 bg-gradient-to-br ${coinColor} border-2 rounded-full cursor-pointer flex flex-col items-center justify-center transition-all select-none hover:scale-105 active:scale-95 disabled:opacity-30 shadow-md ${
                      isSelected 
                        ? 'ring-4 ring-offset-2 ring-emerald-500 ring-offset-[#021006] scale-110 z-10' 
                        : 'opacity-80'
                    }`}
                  >
                    <span className="text-[7.5px] text-white/50 uppercase font-bold leading-none scale-90">COIN</span>
                    <span className="text-xs font-mono font-extrabold text-[#ffffff] tracking-tighter mt-0.5 leading-none">
                      {coinVal}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-0.5 bg-emerald-500 text-black rounded-full p-0.5 border border-black shadow">
                        <Sparkles size={6} className="fill-black" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* PLUS ADJUST STAKE BUTTON */}
            <button
              onClick={() => adjustBet(10)}
              disabled={gameState === "kicking"}
              className="w-10 h-10 shrink-0 bg-[#082210] hover:bg-[#123e1f] border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 hover:text-white transition-all active:scale-95 disabled:opacity-30"
              title="Increase Stake"
            >
              <Plus size={13} className="stroke-[3]" />
            </button>

          </div>

        </div>

        {/* DOUBLE & MIN QUICK PRESET ROW */}
        <div className="grid grid-cols-2 gap-2">
          
          <button
            disabled={gameState === "kicking"}
            onClick={() => {
              playLocalSound("click");
              setBet(prev => Math.min(balance || minBet, prev * 2));
            }}
            className="py-2.5 bg-[#082210] hover:bg-[#113a1d] border border-emerald-500/10 text-emerald-400 hover:text-white text-[10px] font-black uppercase rounded-xl active:scale-95 transition-all text-center tracking-wider"
          >
            DOUBLE BET (2X)
          </button>

          <button
            disabled={gameState === "kicking"}
            onClick={() => {
              playLocalSound("click");
              setBet(minBet);
            }}
            className="py-2.5 bg-[#082210] hover:bg-[#113a1d] border border-emerald-500/10 text-emerald-300 hover:text-white text-[10px] font-black uppercase rounded-xl active:scale-95 transition-all text-center tracking-wider"
          >
            MIN BET ({minBet})
          </button>

        </div>

      </footer>

    </div>
  );
};
