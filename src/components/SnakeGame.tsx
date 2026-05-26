import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LogOut, 
  Target, 
  Trophy, 
  Zap, 
  HelpCircle, 
  Sparkles, 
  Compass, 
  RotateCcw,
  Flame,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Coins,
  ChevronRight,
  Sparkle,
  Plus,
  Minus
} from "lucide-react";
import { playSound } from "../lib/sounds";

interface SnakeGameProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean> | any;
  onExit: () => void;
  // Options backed by admin config
  difficulty?: string; // "low" / "easy" or "hard"
  targetScore?: number; // points score needed to win the wager multiplier
  multiplier?: number; // payouts multiplier on target score achieved
  minBet?: number;
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

export const SnakeGame: React.FC<SnakeGameProps> = ({
  balance,
  onWin,
  onBet,
  onExit,
  difficulty = "low",
  targetScore = 15,
  multiplier = 2.5,
  minBet = 10
}) => {
  // Betting states
  const [bet, setBet] = useState(minBet);
  
  // Game states
  const [gameState, setGameState] = useState<"lobby" | "playing" | "crashed" | "won">("lobby");
  const [score, setScore] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem("snake_league_highscore");
    return saved ? parseInt(saved) : 0;
  });

  // Canvas details
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Snake structure state variables stored in Refs for instant updates in high frequency timers
  const snakeRef = useRef<{ x: number; y: number }[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]);
  const directionRef = useRef<Direction>("RIGHT");
  const nextDirectionRef = useRef<Direction>("RIGHT");
  const foodRef = useRef<{ x: number; y: number; type: "normal" | "golden" | "bonus" }>({ x: 5, y: 5, type: "normal" });
  const particlesRef = useRef<Particle[]>([]);
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Multiplier or reward calculated dynamically based on score
  const isHardMode = difficulty === "hard";
  const gameSpeed = isHardMode ? 85 : 140; // 85ms for hard, 140ms for standard

  // Play sound effect triggers
  const triggerSound = (type: "win" | "lose" | "click") => {
    try {
      playSound(type);
    } catch (e) {
      console.warn("Sound play error", e);
    }
  };

  // Generate a new random food item
  const spawnFood = () => {
    const gridCount = 20; // 20x20 grid
    let newX = Math.floor(Math.random() * gridCount);
    let newY = Math.floor(Math.random() * gridCount);

    // Make sure food does not spawn inside snake body
    while (snakeRef.current.some(segment => segment.x === newX && segment.y === newY)) {
      newX = Math.floor(Math.random() * gridCount);
      newY = Math.floor(Math.random() * gridCount);
    }

    // Food probability type (85% normal, 10% bonus, 5% golden multiplier food)
    const prob = Math.random();
    let type: "normal" | "golden" | "bonus" = "normal";
    if (prob > 0.94) type = "golden";
    else if (prob > 0.85) type = "bonus";

    foodRef.current = { x: newX, y: newY, type };
  };

  // Handle Canvas graphics and animations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Logical 20x20 grid mapping
      const gridCount = 20;
      const cellW = width / gridCount;
      const cellH = height / gridCount;

      // Draw background cyber matrix grid lines
      ctx.fillStyle = "#030f08";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(16, 185, 129, 0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridCount; i++) {
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(0, i * cellH);
        ctx.lineTo(width, i * cellH);
        ctx.stroke();

        // Vertical
        ctx.beginPath();
        ctx.moveTo(i * cellW, 0);
        ctx.lineTo(i * cellW, height);
        ctx.stroke();
      }

      // Draw boundary hazard neon wall lines if hard mode
      if (isHardMode) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, width, height);
      } else {
        ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, height);
      }

      // Draw Food with pulsing aura Glow effects
      const food = foodRef.current;
      ctx.save();
      const foodRadius = Math.min(cellW, cellH) / 2 * 0.85;
      const foodCenterX = food.x * cellW + cellW / 2;
      const foodCenterY = food.y * cellH + cellH / 2;

      // Pulse scaling
      const pulse = Math.sin(Date.now() / 150) * 0.15 + 1.0;
      const glowGrad = ctx.createRadialGradient(
        foodCenterX, foodCenterY, 2,
        foodCenterX, foodCenterY, foodRadius * 3 * pulse
      );

      let foodColor = "#ef4444"; // red normal apple
      let textColor = "#ef4444";
      if (food.type === "golden") {
        foodColor = "#f59e0b"; // yellow golden apple
        textColor = "#fbbf24";
        glowGrad.addColorStop(0, "rgba(245, 158, 11, 0.6)");
        glowGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
      } else if (food.type === "bonus") {
        foodColor = "#8b5cf6"; // purple speed boost/bonus food
        textColor = "#a78bfa";
        glowGrad.addColorStop(0, "rgba(139, 92, 246, 0.6)");
        glowGrad.addColorStop(1, "rgba(139, 92, 246, 0)");
      } else {
        glowGrad.addColorStop(0, "rgba(239, 68, 68, 0.5)");
        glowGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
      }

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(foodCenterX, foodCenterY, foodRadius * 2.5 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Core sweet apple icon rendering
      ctx.fillStyle = foodColor;
      ctx.beginPath();
      ctx.arc(foodCenterX, foodCenterY, foodRadius * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Green tiny leaf details
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.ellipse(foodCenterX + 2, foodCenterY - foodRadius, 2, 4, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Snake segments with professional glowing scales and gradients
      const snake = snakeRef.current;
      snake.forEach((seg, idx) => {
        const isHead = idx === 0;
        const segX = seg.x * cellW;
        const segY = seg.y * cellH;

        ctx.save();
        if (isHead) {
          // Snake head styling
          ctx.fillStyle = "#10b981"; // Vibrant Emerald green
          ctx.beginPath();
          ctx.roundRect(segX + 1, segY + 1, cellW - 2, cellH - 2, 8);
          ctx.fill();

          // Yellow or white neon reptile eye indicators based on movement vectors
          ctx.fillStyle = "#ffffff";
          let eyeX1 = 0, eyeY1 = 0, eyeX2 = 0, eyeY2 = 0;
          const currentDir = directionRef.current;

          if (currentDir === "RIGHT") {
            eyeX1 = segX + cellW - 6; eyeY1 = segY + 5;
            eyeX2 = segX + cellW - 6; eyeY2 = segY + cellH - 7;
          } else if (currentDir === "LEFT") {
            eyeX1 = segX + 6; eyeY1 = segY + 5;
            eyeX2 = segX + 6; eyeY2 = segY + cellH - 7;
          } else if (currentDir === "UP") {
            eyeX1 = segX + 5; eyeY1 = segY + 6;
            eyeX2 = segX + cellW - 7; eyeY2 = segY + 6;
          } else {
            eyeX1 = segX + 5; eyeY1 = segY + cellH - 6;
            eyeX2 = segX + cellW - 7; eyeY2 = segY + cellH - 6;
          }

          ctx.beginPath();
          ctx.arc(eyeX1, eyeY1, 2, 0, Math.PI * 2);
          ctx.arc(eyeX2, eyeY2, 2, 0, Math.PI * 2);
          ctx.fill();

          // Snake core crown if gold or reaching close to winRate
          if (score >= targetScore - 2) {
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.moveTo(segX + cellW / 2 - 4, segY + 2);
            ctx.lineTo(segX + cellW / 2, segY - 3);
            ctx.lineTo(segX + cellW / 2 + 4, segY + 2);
            ctx.closePath();
            ctx.fill();
          }

        } else {
          // Beautiful snake body segment gradient coloring 
          const hueRatio = (idx / snake.length);
          const intensity = Math.floor(185 - hueRatio * 110);
          ctx.fillStyle = `rgb(16, ${intensity}, 129)`; // emerald to deeper forest green
          
          // Outer scale neon border line
          ctx.strokeStyle = "rgba(16, 255, 129, 0.4)";
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.roundRect(segX + 2, segY + 2, cellW - 4, cellH - 4, 4);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });

      // Update and Draw Particles system (bursts from scoring food)
      const particles = particlesRef.current;
      particles.forEach((p, index) => {
        p.life -= 0.05;
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (p.life <= 0) {
          particles.splice(index, 1);
        }
      });

      // Simple scanning scanlines simulator for elite retro console look
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.2);
      }

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [gameState, score, targetScore, difficulty]);

  // Main high-performance tick callback sequence
  const gameStep = () => {
    const snake = [...snakeRef.current];
    const head = { ...snake[0] };
    
    // Apply buffered direction change to avoid double click suicide trap
    directionRef.current = nextDirectionRef.current;
    const currentDir = directionRef.current;

    // Shift coordinates of the head segment
    if (currentDir === "UP") head.y -= 1;
    else if (currentDir === "DOWN") head.y += 1;
    else if (currentDir === "LEFT") head.x -= 1;
    else head.x += 1;

    const gridCount = 20;

    // Collision Check: Boundaries
    if (isHardMode) {
      // Hard mode has physical death boundaries!
      if (head.x < 0 || head.y < 0 || head.x >= gridCount || head.y >= gridCount) {
        triggerCrash();
        return;
      }
    } else {
      // Standard mode wraps around boundaries safely!
      if (head.x < 0) head.x = gridCount - 1;
      else if (head.x >= gridCount) head.x = 0;

      if (head.y < 0) head.y = gridCount - 1;
      else if (head.y >= gridCount) head.y = 0;
    }

    // Collision Check: eating self body segments
    if (snake.some((seg, idx) => idx > 0 && seg.x === head.x && seg.y === head.y)) {
      triggerCrash();
      return;
    }

    // Insert new head at front of list
    snake.unshift(head);

    // Collision Check: eating dynamic food
    const food = foodRef.current;
    if (head.x === food.x && head.y === food.y) {
      // Handle points based on level design type
      let ptsGained = 1;
      let rewardColor = "#10b981";
      if (food.type === "golden") {
        ptsGained = 3;
        rewardColor = "#f59e0b";
        triggerSound("win");
      } else if (food.type === "bonus") {
        ptsGained = 2;
        rewardColor = "#8b5cf6";
        triggerSound("win");
      } else {
        triggerSound("click");
      }

      const nextScore = score + ptsGained;
      setScore(nextScore);

      // Save highscore locally
      if (nextScore > highScore) {
        setHighScore(nextScore);
        localStorage.setItem("snake_league_highscore", nextScore.toString());
      }

      // Generate sparkler particle burst
      const canvas = canvasRef.current;
      if (canvas) {
        const cellW = canvas.width / gridCount;
        const cellH = canvas.height / gridCount;
        const burstX = food.x * cellW + cellW / 2;
        const burstY = food.y * cellH + cellH / 2;

        for (let s = 0; s < 18; s++) {
          const angle = Math.random() * Math.PI * 2;
          const powerLevel = Math.random() * 5 + 2;
          particlesRef.current.push({
            x: burstX,
            y: burstY,
            vx: Math.cos(angle) * powerLevel,
            vy: Math.sin(angle) * powerLevel,
            color: rewardColor,
            size: Math.random() * 3.5 + 1.5,
            life: 1.0
          });
        }
      }

      // Spawn next food
      spawnFood();

      // Check for league level target accomplished!
      if (nextScore >= targetScore) {
        triggerLevelComplete(nextScore);
        return;
      }

    } else {
      // normal movement, remove tailsegment
      snake.pop();
    }

    // Save updated reference state
    snakeRef.current = snake;
  };

  // Keyboard controls configuration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;

      const currentDir = directionRef.current;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          if (currentDir !== "DOWN") nextDirectionRef.current = "UP";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (currentDir !== "UP") nextDirectionRef.current = "DOWN";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          if (currentDir !== "RIGHT") nextDirectionRef.current = "LEFT";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (currentDir !== "LEFT") nextDirectionRef.current = "RIGHT";
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameState]);

  // Touch controls / dpad commands helper
  const handleDPadDir = (dir: Direction) => {
    if (gameState !== "playing") return;
    const currentDir = directionRef.current;

    if (dir === "UP" && currentDir !== "DOWN") nextDirectionRef.current = "UP";
    if (dir === "DOWN" && currentDir !== "UP") nextDirectionRef.current = "DOWN";
    if (dir === "LEFT" && currentDir !== "RIGHT") nextDirectionRef.current = "LEFT";
    if (dir === "RIGHT" && currentDir !== "LEFT") nextDirectionRef.current = "RIGHT";

    triggerSound("click");
  };

  // Turn triggers when snake hits walls or self
  const triggerCrash = () => {
    // Clear timer
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
    }
    setGameState("crashed");
    triggerSound("lose");

    // Give partial consolatory payout: score / targetScore of multiplier
    const ratioEarned = Math.min(1.0, score / targetScore);
    const payout = Math.floor(bet * ratioEarned * multiplier);
    if (payout > 0) {
      onWin(payout);
    }
  };

  // Turn triggers when target score is achieved successfully
  const triggerLevelComplete = (finalScore: number) => {
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
    }
    setGameState("won");
    triggerSound("win");

    // Full success payout multiplier credited
    const payoutTotal = bet * multiplier;
    onWin(payoutTotal);
  };

  // Handle game init & betting launch
  const handleStartGame = async () => {
    if (balance < bet) return;

    // Trigger platform bet
    const success = await onBet(bet);
    if (!success) return;

    // Reset snake segment arrays
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    directionRef.current = "RIGHT";
    nextDirectionRef.current = "RIGHT";
    particlesRef.current = [];
    setScore(0);
    spawnFood();

    // Start tick timers
    setGameState("playing");
    triggerSound("click");

    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    gameIntervalRef.current = setInterval(gameStep, gameSpeed);
  };

  // Cleanup on dismount
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, []);

  const adjustBet = (amount: number) => {
    triggerSound("click");
    setBet((prev) => Math.max(minBet, prev + amount));
  };

  const doubleBet = () => {
    triggerSound("click");
    setBet((prev) => Math.min(balance, prev * 2));
  };

  const halfBet = () => {
    triggerSound("click");
    setBet((prev) => Math.max(minBet, Math.floor(prev / 2)));
  };

  return (
    <div className="flex flex-col h-full bg-[#05110a] text-slate-100 font-sans overflow-hidden relative select-none">
      
      {/* Aviator style sports unified top header */}
      <header className="flex items-center justify-between px-4 h-14 bg-[#08180e] border-b border-emerald-900/40 relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkle className="text-[#10b981] animate-pulse" size={18} />
          <span className="text-white font-black italic tracking-tighter text-base uppercase whitespace-nowrap">Python League</span>
          
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
            isHardMode ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}>
            {difficulty.toUpperCase()}
          </span>
        </div>
        
        {/* Real Balance display formatting */}
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-emerald-900/40 shadow-lg">
          <div className="w-3.5 h-3.5 rounded-full bg-[#10b981] flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#05110a]" />
          </div>
          <span className="text-[#32D74B] font-black text-xs leading-none">
            RS {balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Quit action with instant return */}
        <button 
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 active:scale-95 transition-all hover:bg-red-500/20 shadow-lg"
        >
          <LogOut size={13} />
          <span className="text-[9px] font-black uppercase tracking-wider">Quit</span>
        </button>
      </header>

      {/* Primary Simulator Sandbox Arena */}
      <div className="flex-1 flex flex-col items-center justify-between p-4 relative z-10 w-full overflow-y-auto no-scrollbar">
        
        {/* Statistics or guidance bar info strip */}
        <div className="w-full max-w-sm flex items-center justify-between gap-2.5 bg-black/50 border border-emerald-900/20 rounded-2xl p-3 shadow-md">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-amber-500" />
            <div className="text-left leading-tight">
              <span className="text-[8px] font-bold text-neutral-400 uppercase block">High Score</span>
              <span className="text-[10px] font-mono font-black text-amber-400">
                {highScore} POINTS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase text-[#10b981] font-mono">
              TARGET: {targetScore} PTS
            </span>
          </div>

          <button 
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="p-1 px-2 border border-emerald-950 hover:bg-emerald-950/20 rounded-lg text-emerald-400 text-[9px] font-black uppercase transition-all"
          >
            How to Win
          </button>
        </div>

        {/* Dynamic HTML5 Canvas container */}
        <div 
          ref={containerRef}
          className="w-full max-w-sm aspect-square bg-[#020905] border border-emerald-950/60 rounded-3xl overflow-hidden relative shadow-2xl my-3"
        >
          <canvas 
            ref={canvasRef} 
            width={400} 
            height={400} 
            className="block w-full h-full" 
          />

          {/* Guidelines Popup Modal overlay */}
          <AnimatePresence>
            {showGuide && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md p-6 flex flex-col justify-center text-center space-y-4 z-40 text-xs"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Flame size={24} className="animate-pulse" />
                </div>
                <h4 className="font-extrabold text-[#10b981] uppercase tracking-wide">Python League Rules</h4>
                <div className="space-y-2.5 text-left text-neutral-300 leading-normal max-h-48 overflow-y-auto pr-1">
                  <p>📈 Select your wager stake and press <strong>START GAME</strong>.</p>
                  <p>🐍 Use arrow keys (or on-screen D-pad buttons) to redirect snake. Don't hit yourself!</p>
                  <p>🍏 Eat apples to boost your score: Normal (1 pt), Purple (2 pts), Golden (3 pts!).</p>
                  <p>🏆 Reach the <strong>{targetScore} Points Target</strong> to secure the full <strong>{multiplier}x return payout</strong>!</p>
                  <p>💥 If you crash before {targetScore} points, you get credited a <strong>partial payoff</strong> based on how far you went.</p>
                </div>
                <button 
                  onClick={() => setShowGuide(false)}
                  className="bg-[#10b981] text-black py-2.5 rounded-xl font-bold uppercase transition-colors"
                >
                  Enter Arena
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lobby Welcome Panel */}
          {gameState === "lobby" && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-950/40 border-2 border-[#10b981]/30 flex items-center justify-center text-[#10b981] shadow-lg shadow-emerald-950/30">
                <Flame size={32} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-black text-xl italic uppercase tracking-tighter">Enter Pit Arena</h3>
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Multiplier payout: {multiplier}x stake
                </p>
              </div>
              <button
                onClick={handleStartGame}
                disabled={balance < bet}
                className="w-full max-w-[200px] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase py-3 rounded-2xl text-xs tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-40"
              >
                {balance < bet ? "INSUFFICIENT FUNDS" : "START CHALLENGE"}
              </button>
            </div>
          )}

          {/* Crashed View */}
          {gameState === "crashed" && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center text-red-500">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-white font-black text-xl italic uppercase tracking-tighter text-red-500">CRASHED!</h3>
                <p className="text-neutral-400 text-[10px] uppercase font-bold tracking-widest mt-1">
                  You scored {score} of {targetScore} points
                </p>
              </div>

              {score > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-[#32D74B] font-bold text-xs uppercase">
                  Partial Payoff: +RS {Math.floor(bet * (Math.min(1.0, score / targetScore)) * multiplier)}
                </div>
              )}

              <button
                onClick={() => setGameState("lobby")}
                className="w-full max-w-[200px] bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black uppercase py-2.5 rounded-xl text-[10px] tracking-wider transition-all active:scale-95"
              >
                Try Next Round
              </button>
            </div>
          )}

          {/* Victory won view */}
          {gameState === "won" && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-yellow-500/10 border-2 border-yellow-500/20 flex items-center justify-center text-yellow-400 animate-bounce">
                <Trophy size={28} />
              </div>
              <div>
                <h3 className="text-yellow-400 font-extrabold text-2xl italic uppercase tracking-tighter">LEAGUE VICTORY!</h3>
                <p className="text-[#32D74B] text-[10px] uppercase font-black tracking-widest mt-1">
                  Target custom score cleared!
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 px-5 py-2.5 rounded-xl text-yellow-400 font-black text-sm uppercase">
                WINNER payout: +RS {(bet * multiplier).toFixed(0)}
              </div>

              <button
                onClick={() => setGameState("lobby")}
                className="w-full max-w-[200px] bg-[#10b981] text-black font-black uppercase py-2.5 rounded-xl text-[10px] tracking-wider transition-all active:scale-95 shadow-md"
              >
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Real-time score indicator */}
        <div className="w-full max-w-sm flex justify-center items-center gap-4 py-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-neutral-400">Score Progress:</span>
            <span className="text-base font-black text-emerald-400">{score}</span>
            <span className="text-neutral-500">/</span>
            <span className="text-xs text-neutral-400">{targetScore}</span>
          </div>
        </div>

        {/* Tactical On-Screen Mobile D-Pad controller */}
        {gameState === "playing" && (
          <div className="w-full max-w-sm flex items-center justify-center py-2 shrink-0">
            <div className="relative w-36 h-36">
              {/* D-Pad Buttons */}
              <button 
                onClick={() => handleDPadDir("UP")}
                className="absolute top-0 left-12 w-12 h-12 bg-neutral-900/80 active:bg-emerald-500 active:text-black border border-emerald-900/30 rounded-xl flex items-center justify-center text-white shadow-md"
              >
                <ArrowUp size={20} />
              </button>
              
              <button 
                onClick={() => handleDPadDir("LEFT")}
                className="absolute top-12 left-0 w-12 h-12 bg-neutral-900/80 active:bg-emerald-500 active:text-black border border-emerald-900/30 rounded-xl flex items-center justify-center text-white shadow-md"
              >
                <ArrowLeft size={20} />
              </button>

              <button 
                onClick={() => handleDPadDir("RIGHT")}
                className="absolute top-12 right-0 w-12 h-12 bg-neutral-900/80 active:bg-emerald-500 active:text-black border border-emerald-900/30 rounded-xl flex items-center justify-center text-white shadow-md"
              >
                <ArrowRight size={20} />
              </button>

              <button 
                onClick={() => handleDPadDir("DOWN")}
                className="absolute bottom-0 left-12 w-12 h-12 bg-neutral-900/80 active:bg-emerald-500 active:text-black border border-emerald-900/30 rounded-xl flex items-center justify-center text-white shadow-md"
              >
                <ArrowDown size={20} />
              </button>
              
              {/* Center decorative ring */}
              <div className="absolute top-12 left-12 w-12 h-12 rounded-xl bg-black/60 border border-emerald-950/20 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
            </div>
          </div>
        )}

        {/* Stake betting Dashboard panel controls */}
        {gameState === "lobby" && (
          <div className="w-full max-w-sm space-y-4 pt-1 mt-2">
            <div className="bg-black/80 border border-emerald-950/60 rounded-3xl p-4 flex flex-col gap-3.5 shadow-2xl">
              
              <div className="flex justify-between items-center bg-black/40 p-1 px-3.5 rounded-xl border border-emerald-950/20">
                <span className="text-[10px] text-neutral-400 font-extrabold uppercase">Potential payout multiplier:</span>
                <span className="text-xs text-yellow-500 font-black italic">{multiplier}x Return</span>
              </div>

              {/* Quick Stake selectors */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-1.5">
                  <button 
                    onClick={halfBet}
                    className="px-2.5 py-1.5 font-bold uppercase text-[9px] bg-neutral-800 hover:bg-neutral-700 hover:text-white border border-white/5 rounded-lg transition-transform active:scale-95"
                  >
                    1/2
                  </button>
                  <button 
                    onClick={doubleBet}
                    className="px-2.5 py-1.5 font-bold uppercase text-[9px] bg-neutral-800 hover:bg-neutral-700 hover:text-white border border-white/5 rounded-lg transition-transform active:scale-95"
                  >
                    X2
                  </button>
                </div>

                <div className="flex-1 text-center">
                  <span className="text-[8px] font-black uppercase text-neutral-400 tracking-wider block mb-0.5">ESTIMATE RETURN</span>
                  <span className="text-base font-extrabold text-[#32D74B]">RS {(bet * multiplier).toFixed(1)}</span>
                </div>

                <div className="flex gap-1.5">
                  <button 
                    onClick={() => adjustBet(-20)}
                    disabled={bet <= minBet}
                    className="w-10 h-10 font-black bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl flex items-center justify-center transition-transform active:scale-95 border border-white/10 disabled:opacity-30"
                  >
                    <Minus size={14} className="shrink-0" />
                  </button>
                  <button 
                    onClick={() => adjustBet(20)}
                    disabled={bet >= balance}
                    className="w-10 h-10 font-black bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl flex items-center justify-center transition-transform active:scale-95 border border-white/10 disabled:opacity-30"
                  >
                    <Plus size={14} className="shrink-0" />
                  </button>
                </div>
              </div>

              {/* Custom launch button or stake adjust panel */}
              <div className="grid grid-cols-3 gap-2.5 items-center">
                <div className="col-span-1 bg-neutral-900 border border-white/10 rounded-xl p-2.5 text-center leading-none">
                  <span className="text-[7.5px] font-bold text-neutral-400 block uppercase mb-1">STAKE</span>
                  <span className="text-[14px] font-black italic tracking-wide text-white">RS {bet}</span>
                </div>

                <button 
                  onClick={handleStartGame}
                  disabled={balance < bet}
                  className="col-span-2 py-3 border-transparent bg-gradient-to-r from-emerald-500 to-[#2196F3] hover:from-emerald-400 hover:to-blue-500 text-black hover:text-white font-black uppercase text-[12px] rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none animate-shimmer"
                >
                  <Coins size={14} className="text-black group-hover:text-white" /> PLACE WAGER
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
