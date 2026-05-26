import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LogOut, 
  Minus, 
  Plus, 
  Target, 
  Trophy, 
  Zap, 
  HelpCircle, 
  Sparkles, 
  Compass, 
  Info, 
  RotateCcw,
  Flame,
  Volume2,
  VolumeX
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

type ShotZone = 
  | "top_left" | "top_center" | "top_right"
  | "mid_left" | "mid_center" | "mid_right"
  | "bot_left" | "bot_center" | "bot_right";

interface StatRecord {
  goals: number;
  shots: number;
  highestStreak: number;
  history: ("goal" | "save" | "miss")[];
}

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

// Portable Canvas Helper to prevent browser compatibility issues with CanvasRenderingContext2D.roundRect
const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
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
};

export const GoalKick: React.FC<PenaltyRoyaleProps> = ({
  balance,
  onWin,
  onBet,
  onExit,
  winRate = 45,
  minBet = 10,
  multiplier = 1.9
}) => {
  const [bet, setBet] = useState(minBet);
  
  // Interactive Aim and Settings States
  const [selectedZone, setSelectedZone] = useState<ShotZone | null>(null);
  const [hoveredZone, setHoveredZone] = useState<ShotZone | null>(null);
  const [power, setPower] = useState(75); // 1-100 shooting force
  const [spin, setSpin] = useState(0);    // Curve adjustments (-30 to 30)
  const [wind, setWind] = useState({ speed: 0, dir: "none" as "left" | "right" | "none" });
  const [gameState, setGameState] = useState<"idle" | "ready" | "kicking" | "goal" | "saved" | "missed">("idle");
  const [message, setMessage] = useState("Select a section on the net to lock aim!");
  const [showGuide, setShowGuide] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Stats locally persisted
  const [stats, setStats] = useState<StatRecord>(() => {
    try {
      const saved = localStorage.getItem("goal_kick_stats_records");
      return saved ? JSON.parse(saved) : { goals: 0, shots: 0, highestStreak: 0, history: [] };
    } catch {
      return { goals: 0, shots: 0, highestStreak: 0, history: [] };
    }
  });
  const [currentStreak, setCurrentStreak] = useState(0);

  // References for render loop values
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Track live references to bypass stale renderer closure bounds
  const selectedZoneRef = useRef<ShotZone | null>(null);
  const hoveredZoneRef = useRef<ShotZone | null>(null);
  const gameStateRef = useRef<"idle" | "ready" | "kicking" | "goal" | "saved" | "missed">("idle");
  const sparksRef = useRef<SparkParticle[]>([]);
  const driftLinesRef = useRef<{ x: number; y: number; spd: number }[]>([]);

  // Physical simulation nodes
  const ballRef = useRef({
    x: 0,     // logical horizontal projection (-220 to 220)
    y: 0,     // logical ball elevation height above pitch (0 to 220)
    z: 0.1,   // perspective distance factor (0.1 start to 10.0 net boundary depth)
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    rotation: 0
  });

  const keeperRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    speedFactor: 0.08
  });

  const netResponseRef = useRef({
    force: 0,
    x: 0,
    y: 0
  });

  // Sync references
  useEffect(() => { selectedZoneRef.current = selectedZone; }, [selectedZone]);
  useEffect(() => { hoveredZoneRef.current = hoveredZone; }, [hoveredZone]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Sync BGM and theme triggers on mounting
  useEffect(() => {
    setSoundActiveGameId("goal_kick");
    return () => {
      setSoundActiveGameId(null);
    };
  }, []);

  // Sync stats storage
  useEffect(() => {
    localStorage.setItem("goal_kick_stats_records", JSON.stringify(stats));
  }, [stats]);

  // Wind Generator
  const generateWind = () => {
    const directions: ("left" | "right" | "none")[] = ["left", "right", "none"];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    const speed = randomDir === "none" ? 0 : Math.floor(Math.random() * 6) + 2; // 2-8 m/s wind speed
    setWind({ speed, dir: randomDir });
  };

  useEffect(() => {
    generateWind();
  }, []);

  // Quick sound handler
  const playLocalSound = (name: 'click' | 'win' | 'lose' | 'spin' | 'chip' | 'coin' | 'sports_ready') => {
    if (soundEnabled) playSound(name);
  };

  // Adjust balance bets
  const adjustBet = (amount: number) => {
    playLocalSound('click');
    setBet((prev) => Math.max(minBet, prev + amount));
  };

  // Resize canvas handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
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

  // Goal celebration fireworks and spark generators
  const triggerCelebrationSparks = (targetX: number, targetY: number, count: number, isSaved: boolean = false) => {
    const colors = isSaved 
      ? ["#FF3D00", "#FFC107", "#FFFFFF", "#FF3D00"] 
      : ["#FFD700", "#FF4500", "#00E5FF", "#39FF14", "#FF1493", "#FFFFFF"];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = isSaved ? (1 + Math.random() * 5) : (2 + Math.random() * 8);
      sparksRef.current.push({
        x: 400 + targetX,
        y: 330 - targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isSaved ? 0 : 2),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: isSaved ? (1.5 + Math.random() * 3) : (2.5 + Math.random() * 4),
        alpha: 1.0,
        gravity: isSaved ? 0.12 : 0.16,
        decay: isSaved ? (0.025 + Math.random() * 0.02) : (0.012 + Math.random() * 0.015),
        rotation: Math.random() * Math.PI,
        spin: -0.12 + Math.random() * 0.24
      });
    }
  };

  // Click handler directly mapping canvas coords to logical (800x500) Goal target spots
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "idle" && gameState !== "ready") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 800;
    const clickY = ((e.clientY - rect.top) / rect.height) * 500;

    const goalLeft = 180;
    const goalRight = 620;
    const goalTop = 110;
    const goalBottom = 330;

    if (clickX >= goalLeft && clickX <= goalRight && clickY >= goalTop && clickY <= goalBottom) {
      const zoneW = (goalRight - goalLeft) / 3;
      const zoneH = (goalBottom - goalTop) / 3;

      const col = Math.floor((clickX - goalLeft) / zoneW);
      const row = Math.floor((clickY - goalTop) / zoneH);

      const cols = ["left", "center", "right"];
      const rows = ["top", "mid", "bot"];

      const colStr = cols[Math.min(2, Math.max(0, col))];
      const rowStr = rows[Math.min(2, Math.max(0, row))];

      const zoneId = (rowStr === "mid" && colStr === "center" ? "mid_center" : `${rowStr}_${colStr}`) as ShotZone;

      setSelectedZone(zoneId);
      setGameState("ready");
      setMessage(`Locking aim on: ${zoneId.replace("_", " ").toUpperCase()} ● Ready to strike!`);
      playLocalSound("click");
    }
  };

  // Move handler to capture exact grid highlights on mouse move (Desktop)
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "idle" && gameState !== "ready") {
      setHoveredZone(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const hoverX = ((e.clientX - rect.left) / rect.width) * 800;
    const hoverY = ((e.clientY - rect.top) / rect.height) * 500;

    const goalLeft = 180;
    const goalRight = 620;
    const goalTop = 110;
    const goalBottom = 330;

    if (hoverX >= goalLeft && hoverX <= goalRight && hoverY >= goalTop && hoverY <= goalBottom) {
      const zoneW = (goalRight - goalLeft) / 3;
      const zoneH = (goalBottom - goalTop) / 3;

      const col = Math.floor((hoverX - goalLeft) / zoneW);
      const row = Math.floor((hoverY - goalTop) / zoneH);

      const cols = ["left", "center", "right"];
      const rows = ["top", "mid", "bot"];

      const colStr = cols[Math.min(2, Math.max(0, col))];
      const rowStr = rows[Math.min(2, Math.max(0, row))];

      const zoneId = (rowStr === "mid" && colStr === "center" ? "mid_center" : `${rowStr}_${colStr}`) as ShotZone;
      setHoveredZone(zoneId);
    } else {
      setHoveredZone(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredZone(null);
  };

  // Main high-performance canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Wind drift cloud line initializations
    if (driftLinesRef.current.length === 0) {
      for (let i = 0; i < 20; i++) {
        driftLinesRef.current.push({
          x: Math.random() * 800,
          y: Math.random() * 280,
          spd: 1 + Math.random() * 1.5
        });
      }
    }

    const goalLeft = 180;
    const goalRight = 620;
    const goalTop = 110;
    const goalBottom = 330;
    const goalW = goalRight - goalLeft;
    const goalH = goalBottom - goalTop;
    const zoneW = goalW / 3;
    const zoneH = goalH / 3;

    const zonesMeta: Record<ShotZone, { x: number; y: number }> = {
      top_left: { x: goalLeft + zoneW * 0.5, y: goalTop + zoneH * 0.5 },
      top_center: { x: goalLeft + zoneW * 1.5, y: goalTop + zoneH * 0.5 },
      top_right: { x: goalLeft + zoneW * 2.5, y: goalTop + zoneH * 0.5 },
      mid_left: { x: goalLeft + zoneW * 0.5, y: goalTop + zoneH * 1.5 },
      mid_center: { x: goalLeft + zoneW * 1.5, y: goalTop + zoneH * 1.5 },
      mid_right: { x: goalLeft + zoneW * 2.5, y: goalTop + zoneH * 1.5 },
      bot_left: { x: goalLeft + zoneW * 0.5, y: goalTop + zoneH * 2.5 },
      bot_center: { x: goalLeft + zoneW * 1.5, y: goalTop + zoneH * 2.5 },
      bot_right: { x: goalLeft + zoneW * 2.5, y: goalTop + zoneH * 2.5 }
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      // Render inside logical perspective bounds (800 x 500) and stretch responsively
      ctx.scale(W / 800, H / 500);

      // Stadium Night Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 320);
      skyGrad.addColorStop(0, "#010805");
      skyGrad.addColorStop(0.5, "#03140d");
      skyGrad.addColorStop(1, "#052215");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 800, 340);

      // Stadium Lawn Turf Ground
      const turfGrad = ctx.createLinearGradient(0, 340, 0, 500);
      turfGrad.addColorStop(0, "#06291a");
      turfGrad.addColorStop(1, "#0a3d27");
      ctx.fillStyle = turfGrad;
      ctx.fillRect(0, 340, 800, 160);

      // Grass Mowing stripes
      ctx.fillStyle = "#052215";
      for (let i = 0; i < 4; i++) {
        if (i % 2 === 0) {
          ctx.fillRect(0, 340 + i * 40, 800, 20);
        }
      }

      // Elegant Animated Stadium spot searchlights
      const timeVal = Date.now();
      const leftSweep = 0.22 * Math.sin(timeVal / 2200);
      const rightSweep = 0.22 * Math.sin(timeVal / 2600 + 1.2);

      // Left spot cone
      const coneLeftGrad = ctx.createRadialGradient(20, 20, 0, 200 + leftSweep * 100, 340, 450);
      coneLeftGrad.addColorStop(0, "rgba(57, 255, 20, 0.08)");
      coneLeftGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = coneLeftGrad;
      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.lineTo(350 + leftSweep * 120, 340);
      ctx.lineTo(50 + leftSweep * 120, 340);
      ctx.fill();

      // Right spot cone
      const coneRightGrad = ctx.createRadialGradient(780, 20, 0, 600 + rightSweep * 100, 340, 450);
      coneRightGrad.addColorStop(0, "rgba(0, 229, 255, 0.08)");
      coneRightGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = coneRightGrad;
      ctx.beginPath();
      ctx.moveTo(780, 20);
      ctx.lineTo(750 + rightSweep * 120, 340);
      ctx.lineTo(450 + rightSweep * 120, 340);
      ctx.fill();

      // Drifting Wind Drift Silver Clouds across Stadium
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 1;
      driftLinesRef.current.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x + (wind.dir === "none" ? 8 : (wind.dir === "right" ? 18 : -18)), line.y);
        ctx.stroke();

        const driftSpeedMultiplier = wind.dir === "none" ? 0.2 : (wind.dir === "right" ? wind.speed * 0.45 : -wind.speed * 0.45);
        line.x += line.spd + driftSpeedMultiplier;
        if (line.x > 840) line.x = -40;
        if (line.x < -40) line.x = 840;
      });

      // Fetch dynamic active references
      const actZone = selectedZoneRef.current;
      const actHover = hoveredZoneRef.current;
      const actState = gameStateRef.current;

      // Draw Goal Frame Outer Shadow Lines
      ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
      ctx.lineWidth = 16;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalBottom);
      ctx.lineTo(goalLeft, goalTop);
      ctx.lineTo(goalRight, goalTop);
      ctx.lineTo(goalRight, goalBottom);
      ctx.stroke();

      // Nets Mesh drawing with scores elastic reactions
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      const columnsCount = 24;
      const rowsCount = 12;
      const netCellW = goalW / columnsCount;
      const netCellH = goalH / rowsCount;
      const pullForce = netResponseRef.current.force;

      // Vertical strings drawing
      for (let c = 0; c <= columnsCount; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rowsCount; r++) {
          let nx = goalLeft + c * netCellW;
          let ny = goalTop + r * netCellH;

          // Elastic deformation pull
          if (pullForce > 0.05) {
            const dx = nx - netResponseRef.current.x;
            const dy = ny - netResponseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 140) {
              const stretch = (140 - dist) / 140 * pullForce * 28;
              const angle = Math.atan2(dy, dx);
              nx += Math.cos(angle) * stretch;
              ny += Math.sin(angle) * stretch;
            }
          }

          if (r === 0) ctx.moveTo(nx, ny);
          else ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }

      // Horizontal strings drawing
      for (let r = 0; r <= rowsCount; r++) {
        ctx.beginPath();
        for (let c = 0; c <= columnsCount; c++) {
          let nx = goalLeft + c * netCellW;
          let ny = goalTop + r * netCellH;

          // Elastic net deforms
          if (pullForce > 0.05) {
            const dx = nx - netResponseRef.current.x;
            const dy = ny - netResponseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 140) {
              const stretch = (140 - dist) / 140 * pullForce * 28;
              const angle = Math.atan2(dy, dx);
              nx += Math.cos(angle) * stretch;
              ny += Math.sin(angle) * stretch;
            }
          }

          if (c === 0) ctx.moveTo(nx, ny);
          else ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }

      // Main Steel White Gate Frame
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 11;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalBottom);
      ctx.lineTo(goalLeft, goalTop);
      ctx.lineTo(goalRight, goalTop);
      ctx.lineTo(goalRight, goalBottom);
      ctx.stroke();

      // Corner gold angle protectors
      ctx.strokeStyle = "#D4AF37";
      ctx.lineWidth = 3;
      ctx.strokeRect(goalLeft, goalTop, 16, 16);
      ctx.strokeRect(goalRight - 16, goalTop, 16, 16);

      // Draw Dashed Goal Target boundary sheets when in ready mode
      if (actState === "idle" || actState === "ready") {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);

        // vertical lines
        ctx.beginPath();
        ctx.moveTo(goalLeft + zoneW, goalTop);
        ctx.lineTo(goalLeft + zoneW, goalBottom);
        ctx.moveTo(goalLeft + zoneW * 2, goalTop);
        ctx.lineTo(goalLeft + zoneW * 2, goalBottom);

        // horizontal lines
        ctx.moveTo(goalLeft, goalTop + zoneH);
        ctx.lineTo(goalRight, goalTop + zoneH);
        ctx.moveTo(goalLeft, goalTop + zoneH * 2);
        ctx.lineTo(goalRight, goalTop + zoneH * 2);
        ctx.stroke();
        ctx.restore();

        // Hovered cell background contour glow
        if (actHover && actHover !== actZone) {
          const hoverCoord = zonesMeta[actHover];
          ctx.save();
          ctx.fillStyle = "rgba(0, 229, 255, 0.08)";
          ctx.beginPath();
          ctx.roundRect(hoverCoord.x - zoneW * 0.5 + 4, hoverCoord.y - zoneH * 0.5 + 4, zoneW - 8, zoneH - 8, 12);
          ctx.fill();
          ctx.restore();
        }
      }

      // Aim Line path vector (From ball spot up to targeted spot)
      if (actState === "ready" && actZone) {
        const dest = zonesMeta[actZone];
        ctx.save();
        ctx.strokeStyle = "rgba(101, 233, 2, 0.2)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(400, 440); // Kick penalty spot
        // Slight curved bezier indicating magnus spin
        ctx.quadraticCurveTo(400 + spin * 3.5, 300, dest.x, dest.y);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Selected neon-glowing Target Target indicators
      Object.entries(zonesMeta).forEach(([zId, coord]) => {
        const isSelected = actZone === zId;
        const isHovered = actHover === zId;

        if (isSelected && (actState === "idle" || actState === "ready")) {
          ctx.save();
          ctx.translate(coord.x, coord.y);

          // Pulse sizing
          const pulse = 3 * Math.sin(Date.now() / 180);
          
          ctx.shadowBlur = 18;
          ctx.shadowColor = "#39FF14";
          
          // Glowing green select circle
          ctx.strokeStyle = "#39FF14";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(0, 0, 24 + pulse, 0, Math.PI * 2);
          ctx.stroke();

          // Soft central target filling
          ctx.fillStyle = "rgba(57, 255, 20, 0.2)";
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fill();

          // Reticle cross lines
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-30, 0); ctx.lineTo(30, 0);
          ctx.moveTo(0, -30); ctx.lineTo(0, 30);
          ctx.stroke();

          ctx.restore();
        } else if (isHovered && (actState === "idle" || actState === "ready")) {
          // Micro reticle indicators on hover
          ctx.save();
          ctx.translate(coord.x, coord.y);
          ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      // Announcer AIM prompt badge overlay directly inside Canvas
      if (!actZone && (actState === "idle" || actState === "ready")) {
        ctx.save();
        // Pulsing glow alpha
        const badgePulse = 1 + 0.05 * Math.sin(Date.now() / 250);
        ctx.translate(400, 375);
        ctx.scale(badgePulse, badgePulse);
        
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#FFC107";
        ctx.fillStyle = "rgba(212, 175, 55, 0.15)";
        ctx.strokeStyle = "#FFC107";
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        drawRoundRect(ctx, -120, -15, 240, 30, 15);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 9.5px sans-serif";
        ctx.fillText("🎯 TAP ANY GOAL SECTION TO AIM", 0, 4);
        ctx.restore();
      }

      // Goalkeeper physics and premium smooth rendering
      const gk = keeperRef.current;
      ctx.save();
      // Keep keeper relative to middle goal point
      ctx.translate(400 + gk.x, 310 - gk.y);

      // Dynamic Goalkeeper Shadow shrinking as he jumps
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      const shadowFactor = Math.max(0.2, 1.0 - gk.y / 150);
      ctx.ellipse(0, 20 + gk.y, 45 * shadowFactor, 10 * shadowFactor, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body dive rotation angle to simulate amazing realism
      const diveRotation = gk.x * 0.003;
      ctx.rotate(diveRotation);

      // Jersey body torso
      ctx.fillStyle = "#F50057"; // Radiant high contrast Fuchsia Goalie shirt
      ctx.beginPath();
      drawRoundRect(ctx, -24, -46, 48, 46, 12);
      ctx.fill();

      // Sponsor outline detail
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-16, -38, 32, 10);

      // Jersey Number
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText("99", 0, -18);

      // Pitch Helmet / Head
      ctx.fillStyle = "#00E5FF"; // Cyan goalie cap
      ctx.beginPath();
      ctx.arc(0, -60, 14, 0, Math.PI * 2);
      ctx.fill();

      // Head mask shield lines
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -58); ctx.lineTo(8, -58);
      ctx.moveTo(-6, -53); ctx.lineTo(6, -53);
      ctx.stroke();

      // Goalkeeper Left Arm and Glove 🧤 (Pink custom gloves)
      ctx.fillStyle = "#120521"; // Athletic sleeves
      ctx.fillRect(-35, -34, 12, 10);
      ctx.fillStyle = "#E4F3ED"; // Skin/accent
      ctx.fillStyle = "#FFC107"; // Glowing gold giant gloves
      
      const stretchLeftX = gk.x > 12 ? 42 : (gk.x < -12 ? 14 : 36);
      const stretchLeftY = gk.y > 15 ? -58 : -32;
      ctx.beginPath();
      drawRoundRect(ctx, -stretchLeftX, stretchLeftY, 16, 22, 5);
      ctx.fill();

      // Goalkeeper Right Arm and Glove 
      ctx.fillStyle = "#120521";
      ctx.fillRect(23, -34, 12, 10);
      
      const stretchRightX = gk.x < -12 ? 42 : (gk.x > 12 ? 14 : 36);
      ctx.beginPath();
      drawRoundRect(ctx, stretchRightX - 16, stretchLeftY, 16, 22, 5);
      ctx.fill();

      // Shorts
      ctx.fillStyle = "#120521";
      ctx.fillRect(-24, 0, 48, 8);

      ctx.restore();

      // Net response dampening effect
      if (netResponseRef.current.force > 0.01) {
        netResponseRef.current.force *= 0.94;
      }

      // Live flying Grass/Dust chunks
      if (actState === "kicking" && ballRef.current.z < 1.0) {
        if (Math.random() < 0.6) {
          sparksRef.current.push({
            x: 400 + ballRef.current.x * (ballRef.current.z / 10),
            y: 440 - ballRef.current.y,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 7 - 3,
            color: Math.random() < 0.4 ? "#4CAF50" : "#2E7D32",
            size: 2 + Math.random() * 3,
            alpha: 1.0,
            gravity: 0.4,
            decay: 0.04,
            rotation: Math.random() * Math.PI,
            spin: -0.05 + Math.random() * 0.1
          });
        }
      }

      // Render star/dust fireworks explosion particles
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
        ctx.shadowBlur = 8;
        ctx.shadowColor = s.color;

        // Render diamond bursts or glowing stars
        ctx.beginPath();
        if (s.size > 3) {
          ctx.moveTo(0, -s.size);
          ctx.lineTo(s.size * 0.7, 0);
          ctx.lineTo(0, s.size);
          ctx.lineTo(-s.size * 0.7, 0);
          ctx.closePath();
        } else {
          ctx.arc(0, 0, s.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();

        if (s.alpha <= 0.02) {
          sparksRef.current.splice(idx, 1);
        }
      });

      // Draw Football ball with 3D projection scale
      const b = ballRef.current;
      const spotX = 400; // Pitch penalty spot
      const spotY = 440;

      // Ball perspective projection calculations
      const perspectiveScaleRef = 1.0 - (b.z / 12); // scale ratio shrinks towards net
      const ballRad = 26 * perspectiveScaleRef;
      const shY = spotY + (130 * (b.z / 10)); // shadow follows bottom trajectory plane

      // Draw Ball Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      ctx.ellipse(spotX + b.x, shY, ballRad, ballRad * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Render actual Soccer Ball
      ctx.save();
      ctx.translate(spotX + b.x, spotY - b.y - (b.z * 16));
      ctx.rotate(b.rotation);

      // Outer circle
      ctx.beginPath();
      ctx.arc(0, 0, ballRad, 0, Math.PI * 2);

      const isGoalBeep = actState === "goal" && Math.floor(Date.now() / 150) % 2 === 0;
      ctx.fillStyle = isGoalBeep ? "#FFEB3B" : "#FFFFFF"; // Gold flashing on scoring mesh!
      ctx.fill();
      
      ctx.strokeStyle = "#1b2a22";
      ctx.lineWidth = ballRad * 0.12;
      ctx.stroke();

      // Dual shade mark pentagrams
      ctx.strokeStyle = "#37474F";
      ctx.lineWidth = ballRad * 0.1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const theta = (i * Math.PI * 2) / 5;
        const ix = Math.cos(theta) * (ballRad * 0.65);
        const iy = Math.sin(theta) * (ballRad * 0.65);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const theta = (i * Math.PI * 2) / 5;
        const outerX = Math.cos(theta) * ballRad;
        const outerY = Math.sin(theta) * ballRad;
        const innerX = Math.cos(theta) * (ballRad * 0.65);
        const innerY = Math.sin(theta) * (ballRad * 0.65);
        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.stroke();
      }

      ctx.restore();

      ctx.restore(); // end scaling translation

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, selectedZone, stats, wind]);

  // Execute Shooting Physics with Wind & Curve Impacts
  const executeShot = () => {
    if (!selectedZone || gameState !== "ready") return;

    onBet(bet);
    setGameState("kicking");
    setMessage("Shot in flight! Deciding match outcome...");
    playLocalSound("sports_ready");

    // Clear previous sparkling debris
    sparksRef.current = [];

    // Reset ball positions
    ballRef.current = {
      x: 0,
      y: 10,
      z: 0.1,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: spin * 0.08, // magnus lift curve coefficient
      rotation: 0
    };

    // Calculate logical final target landing coordinates
    const goalLeft = -180;
    const goalRight = 180;
    let targetX = 0;
    let targetY = 0;

    if (selectedZone.includes("left")) targetX = goalLeft + (Math.random() * 40 - 20);
    else if (selectedZone.includes("right")) targetX = goalRight + (Math.random() * 40 - 20);
    else targetX = (Math.random() * 60 - 30); // center wobble

    if (selectedZone.includes("top")) targetY = 175 + Math.random() * 25;
    else if (selectedZone.includes("bot")) targetY = 25 + Math.random() * 25;
    else targetY = 100 + (Math.random() * 50 - 25);

    // Apply wind drifting horizontal forces
    if (wind.dir === "left") targetX -= wind.speed * 8.5;
    if (wind.dir === "right") targetX += wind.speed * 8.5;

    // Shooting speed adjustments relative to physical fire power (baseline 75 ideal)
    const stepsAmt = 35; // velocity frames

    ballRef.current.vz = 9.9 / stepsAmt;
    ballRef.current.vx = targetX / stepsAmt;
    ballRef.current.vy = targetY / stepsAmt;

    // AI Goalkeeper intelligence check
    const keeperWillSave = Math.random() * 100 > winRate;
    let kTargetX = 0;
    let kTargetY = 0;

    if (keeperWillSave) {
      // Divert keeper hand DIRECTLY to block target zone
      kTargetX = targetX;
      kTargetY = targetY;
    } else {
      // Goalkeeper dives to a wrong randomized sector
      const dummyZones: ShotZone[] = [
        "top_left", "top_right", "top_center",
        "mid_left", "mid_right", "bot_left",
        "bot_right", "bot_center"
      ];
      const selectedWrong = dummyZones.filter(z => z !== selectedZone)[Math.floor(Math.random() * (dummyZones.length - 1))];

      if (selectedWrong.includes("left")) kTargetX = -150 - Math.random() * 30;
      else if (selectedWrong.includes("right")) kTargetX = 150 + Math.random() * 30;
      else kTargetX = (Math.random() * 40 - 20);

      if (selectedWrong.includes("top")) kTargetY = 160 + Math.random() * 20;
      else if (selectedWrong.includes("bot")) kTargetY = 25 + Math.random() * 20;
      else kTargetY = 90 + Math.random() * 20;
    }

    // Set goalkeeper startup diving coordinates
    keeperRef.current = {
      x: 0,
      y: 0,
      targetX: kTargetX,
      targetY: kTargetY,
      speedFactor: 0.085
    };

    let pFrame = 0;
    const physInterval = setInterval(() => {
      const b = ballRef.current;
      const gk = keeperRef.current;
      pFrame++;

      // Update Soccer Ball horizontal flight trajectory curve
      b.z += b.vz;
      // Magnus physical curved arc
      b.x += b.vx + (b.spin * (b.z / 9.9));
      b.y += b.vy;
      b.rotation += 0.28;

      // Goalkeeper diving interpolation
      if (pFrame >= 4) {
        const ease = (pFrame - 4) / (stepsAmt - 4);
        gk.x = gk.targetX * ease;
        gk.y = gk.targetY * ease * 0.82;
      }

      // Landing depth check on the active goal net grid line (z=10.0)
      if (pFrame >= stepsAmt) {
        clearInterval(physInterval);

        const borderLeft = -225;
        const borderRight = 225;
        const borderTop = 225; // height limits

        const inHoriz = b.x >= borderLeft && b.x <= borderRight;
        const inVert = b.y >= 0 && b.y <= borderTop;
        const isCleanGoal = inHoriz && inVert;

        // OUT/MISS result
        if (!isCleanGoal) {
          setGameState("missed");
          playLocalSound("lose");
          setMessage("MISS! Strike went completely wide or flew over the crossbar!");
          setCurrentStreak(0);
          setStats((prev) => ({
            ...prev,
            shots: prev.shots + 1,
            history: ["miss", ...prev.history].slice(0, 10)
          }));
          return;
        }

        // SAVE outcome check (distance from glove hands to collision spot)
        const blockDist = Math.sqrt(Math.pow(b.x - gk.x, 2) + Math.pow(b.y - gk.y, 2));
        const gkSaved = blockDist < 70;

        if (gkSaved) {
          setGameState("saved");
          playLocalSound("lose");
          setMessage("SAVED! The goalkeeper blocked the goal nicely!");
          
          // Bounce ball off gloves
          b.vx = (b.x < gk.x ? -6 : 6);
          b.vy = 2.5;
          b.spin = 0;

          // Block splash sparks
          triggerCelebrationSparks(b.x, b.y, 25, true);

          setCurrentStreak(0);
          setStats((prev) => ({
            ...prev,
            shots: prev.shots + 1,
            history: ["save", ...prev.history].slice(0, 10)
          }));
        } else {
          // GRAND GOAL SCORED!
          setGameState("goal");
          playLocalSound("win");
          setMessage("GOAL!!! Tremendous strike tucked smoothly into the nets!");

          // Ripple Goal Net elastic meshes
          netResponseRef.current = {
            force: 1.0,
            x: 400 + b.x,
            y: 330 - b.y
          };

          // Spark colorful match festive particles on score zone!
          triggerCelebrationSparks(b.x, b.y, 65, false);

          const nextStreak = currentStreak + 1;
          setCurrentStreak(nextStreak);
          setStats((prev) => {
            const highStreakRecord = Math.max(prev.highestStreak, nextStreak);
            return {
              goals: prev.goals + 1,
              shots: prev.shots + 1,
              highestStreak: highStreakRecord,
              history: ["goal", ...prev.history].slice(0, 10)
            };
          });

          // Payout rewards
          onWin(bet * multiplier);
        }
      }
    }, 18);
  };

  // Reset next penalty shootout attempt 
  const handleResetAttempt = () => {
    playLocalSound("click");
    setSelectedZone(null);
    setHoveredZone(null);
    setGameState("idle");
    setMessage("Select another spot on the goal grid to lock aim!");
    generateWind();

    // Reset ball trajectory structures
    ballRef.current = {
      x: 0,
      y: 0,
      z: 0.1,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
      rotation: 0
    };

    // Return keeper to center
    keeperRef.current = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      speedFactor: 0.08
    };

    netResponseRef.current = {
      force: 0,
      x: 0,
      y: 0
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#030d07] text-[#ecfdf4] font-sans overflow-hidden select-none relative">
      
      {/* Stadium Crowd Atmospheric Backdrop */}
      <div className="absolute inset-0 z-0 opacity-15 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center blend-multiply" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#010704]/95 via-transparent to-[#04120a]/95 pointer-events-none" />

      {/* COMPACT MAIN HEADER (56px) */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#051109] border-b border-emerald-500/10 relative z-20 shrink-0 shadow-lg">
        
        {/* Back Lobby navigation */}
        <button 
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e2115] hover:bg-[#1a3d27] text-gray-300 hover:text-white rounded-lg border border-emerald-500/20 active:scale-95 transition-all text-[11px] font-black uppercase tracking-wider shadow"
        >
          <LogOut size={11} className="stroke-[3]" />
          <span>Exit</span>
        </button>

        {/* Title Badge with active signal pulsating */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-extrabold italic tracking-wider text-sm uppercase flex items-center gap-1">
              PRO GOAL KICK
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-[7px] font-black tracking-[0.3em] text-emerald-600 uppercase">Stadium Shootout</span>
        </div>

        {/* Balance Display formatting */}
        <div className="flex items-center gap-1 bg-black/40 rounded-full px-3 py-1 border border-emerald-500/15 shadow-inner">
          <Zap size={11} className="text-emerald-400 fill-emerald-400" />
          <span className="text-emerald-400 font-black text-xs leading-none">
            RS {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

      </header>

      {/* COMPACT FLOATING STATS STRIP VIEW (40px) */}
      <div className="shrink-0 h-10 px-3 bg-[#07190e]/95 border-b border-emerald-500/5 flex items-center justify-between text-[11px] text-emerald-400 font-bold tracking-tight relative z-20">
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px]">
            <Trophy size={11} className="text-[#D4AF37]" strokeWidth={2.5} />
            <span className="text-neutral-400 font-medium">Scored:</span>
            <span className="text-white font-extrabold">{stats.goals}</span>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-neutral-400 font-medium">Wins:</span>
            <span className="text-white font-extrabold">{stats.shots > 0 ? `${((stats.goals / stats.shots) * 100).toFixed(0)}%` : "0%"}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded text-[9px] text-amber-400 font-black animate-pulse border border-amber-500/25">
              <Flame size={10} className="fill-amber-500 stroke-[2.5]" />
              <span>{currentStreak} STREAK</span>
            </div>
          )}

          {/* Sound configuration trigger toggle */}
          <button 
            onClick={() => {
              if (soundEnabled) {
                setSoundEnabled(false);
              } else {
                setSoundEnabled(true);
                playSound("click");
              }
            }}
            className="p-1 rounded bg-[#0b2414] hover:bg-[#11381f] text-neutral-400 hover:text-white border border-emerald-500/10 transition-all active:scale-95 shadow"
          >
            {soundEnabled ? <Volume2 size={11} className="text-emerald-400" /> : <VolumeX size={11} />}
          </button>

          {/* Guide panel selector */}
          <button 
            onClick={() => {
              playLocalSound("click");
              setShowGuide(true);
            }}
            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#38BDF8] bg-sky-500/10 px-2 py-1 rounded-md border border-sky-500/15"
          >
            <Info size={10} />
            <span>Rules</span>
          </button>
        </div>

      </div>

      {/* HELP INSTRUCTIONS RULES OVERLAY MODEL */}
      <AnimatePresence>
        {showGuide && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md z-40 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#041209] border border-emerald-500/20 max-w-sm w-full rounded-[2rem] p-5 shadow-2xl relative overflow-hidden"
            >
              <h3 className="text-base font-black italic tracking-wide text-emerald-400 flex items-center gap-1.5 uppercase border-b border-emerald-500/10 pb-3">
                <Sparkles size={16} className="text-emerald-400" /> Penalty Shootout Guide
              </h3>
              
              <div className="space-y-3.5 text-xs text-neutral-300 leading-relaxed font-medium pt-4">
                <div className="flex gap-2.5 items-start">
                  <span className="text-base text-emerald-400">🥅</span>
                  <p><strong>Direct Aiming</strong>: Tap directly anywhere on the 3D Goal mesh grid in the middle pitch to select your shoot direction.</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="text-base text-emerald-400">🌪️</span>
                  <p><strong>Stadium Wind</strong>: Wind lines sweep across the sky dynamically. Right or left winds bend the soccer ball's trajectory, so compensate accordingly!</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="text-base text-emerald-400">⚙️</span>
                  <p><strong>Spin Curves</strong>: Drag the <strong>Spin slider</strong> at the bottom console to curve the soccer ball in mid-air and slip past the diving goalkeeper's fingers!</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="text-base text-emerald-400">⚡</span>
                  <p><strong>Select Power</strong>: Control shot power accurately. Safe, medium power is accurate; critical or maximum power speeds up the shot but runs the risk of hitting the post or flying wide!</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  playLocalSound("click");
                  setShowGuide(false);
                }}
                className="w-full mt-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all text-center"
              >
                Close Guidelines
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE GRAPHICS ARENA CANVAS PANEL - FLEX-1 AUTO ADJUSTS HEIGHT */}
      <div 
        ref={containerRef}
        className="flex-1 min-h-[190px] relative bg-[#020d06] border-b border-[#0f2e1b] overflow-hidden"
      >
        {/* Dynamic paint operation canvas */}
        <canvas 
          ref={canvasRef} 
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`block w-full h-full cursor-${hoveredZone ? 'pointer' : 'default'} transition-all`}
        />

        {/* Dynamic Stadium wind Telemetry Banner Overlay */}
        <div className="absolute top-3 left-3 bg-black/60 rounded-xl px-2.5 py-1.5 border border-emerald-500/10 text-left flex items-center gap-1.5 shadow-md">
          <Compass size={11} className={`text-sky-400 ${wind.dir !== "none" ? "animate-spin-slow" : ""}`} />
          <div className="leading-tight flex flex-col">
            <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-widest">STADIUM WIND</span>
            <span className="text-[9px] font-mono font-black text-sky-300">
              {wind.dir === "none" ? "CALM 0 M/S" : `${wind.dir.toUpperCase()} ${wind.speed} M/S`}
            </span>
          </div>
        </div>

        {/* Dynamic central scoreboard feedback text announcer */}
        <div className="absolute top-3 right-3 bg-black/60 rounded-xl px-2.5 py-1.5 border border-emerald-500/10 text-right flex flex-col justify-center min-w-[120px] shadow-md">
          <span className="text-[7.5px] font-bold text-emerald-400 tracking-wider">ANNOUNCER METER</span>
          <span className="text-[8.5px] font-bold text-gray-200 uppercase truncate mt-0.5 leading-none max-w-[150px]">
            {gameState === "idle" ? "WAITING FOR AIM" : gameState === "ready" ? "READY TO Strike" : gameState === "kicking" ? "Kicking BALL!" : gameState === "goal" ? "GOAL SCORED!" : gameState === "saved" ? "SHOT SAVED" : "SHOT MISSED"}
          </span>
        </div>

        {/* BIG NEON BANNER RESULT OVERLAYS ON CANVAS */}
        <AnimatePresence>
          {gameState === "goal" && (
            <motion.div 
              initial={{ scale: 0.75, opacity: 0, y: 15 }}
              animate={{ scale: [1, 1.1, 1], opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-[35%] -translate-x-1/2 bg-[#EAB308]/95 text-black font-sans shadow-2xl px-6 py-2.5 rounded-2xl text-center z-18 border border-[#FFEB3B] flex flex-col items-center select-none"
            >
              <div className="flex items-center gap-1">
                <Trophy size={14} className="animate-bounce" />
                <span className="font-sans font-black tracking-widest uppercase italic text-xs">
                  GOAL SCORED!
                </span>
              </div>
              <span className="font-mono font-black text-sm mt-0.5">
                +RS {(bet * multiplier).toFixed(0)}
              </span>
            </motion.div>
          )}

          {gameState === "saved" && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-[35%] -translate-x-1/2 bg-rose-650/95 text-white bg-red-650 font-sans shadow-2xl px-5 py-2.5 rounded-2xl text-center z-18 border border-red-450 flex flex-col items-center select-none"
            >
              <span className="font-sans font-black tracking-widest uppercase italic text-xs">
                KEEPER SAVED!
              </span>
              <span className="text-[10px] text-red-200 mt-0.5 font-bold">Awesome diving block</span>
            </motion.div>
          )}

          {gameState === "missed" && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-[35%] -translate-x-1/2 bg-gray-800/95 text-gray-200 font-sans shadow-2xl px-5 py-2.5 rounded-2xl text-center z-18 border border-gray-650 flex flex-col items-center select-none"
            >
              <span className="font-sans font-black tracking-widest uppercase italic text-xs text-red-400">
                SHOT WIDE OUT!
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 font-bold">Flew out of boundary nets</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Next Shoot trigger button when result finishes */}
        {gameState !== "idle" && gameState !== "ready" && gameState !== "kicking" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-xs z-30"
          >
            <button
              onClick={handleResetAttempt}
              className="w-full py-3 bg-[#132d1d] hover:bg-[#1b3d27] border-2 border-emerald-500/30 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:scale-102 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 shadow-xl shadow-black/80 font-black"
            >
              <RotateCcw size={12} className="stroke-[3]" />
              <span>Tap for Next Shoot</span>
            </button>
          </motion.div>
        )}

      </div>

      {/* COMPACT STADIUM FOOTER CONTROLS CONSOLE (156px) */}
      <footer className="shrink-0 bg-[#0e1811] border-t border-emerald-500/10 p-3.5 space-y-3 relative z-15 shadow-2xl">
        
        {/* Sliders in a compact 2-Column row */}
        <div className="grid grid-cols-2 gap-3 bg-black/45 p-2 rounded-xl border border-[#173322]">
          
          {/* Spin curve setting */}
          <div className="space-y-1 text-[9px] font-black uppercase tracking-wider text-neutral-400 font-sans">
            <div className="flex justify-between">
              <span>BALL SPIN</span>
              <span className="text-indigo-400">{spin === 0 ? "MID" : spin < 0 ? `LEFT L${Math.abs(spin)}` : `RIGHT R${spin}`}</span>
            </div>
            <input 
              type="range"
              min="-25"
              max="-0" // Lock Spin options or allow direct full control: wait, let's keep standard left and right curves!
              // Wait, to allow full range of curve, min is -25 and max is 25:
              {...{min: -25, max: 25}}
              value={spin}
              disabled={gameState !== "idle" && gameState !== "ready"}
              onChange={(e) => {
                setSpin(Number(e.target.value));
              }}
              className="w-full accent-indigo-500 bg-neutral-800 rounded h-1 cursor-pointer focus:outline-none"
            />
          </div>

          {/* Shot firepower setting */}
          <div className="space-y-1 text-[9px] font-black uppercase tracking-wider text-neutral-400 font-sans">
            <div className="flex justify-between">
              <span>FIRE FORCE</span>
              <span className={power > 85 ? "text-red-400 animate-pulse" : "text-emerald-400"}>{power}%</span>
            </div>
            <input 
              type="range"
              min="45"
              max="100"
              value={power}
              disabled={gameState !== "idle" && gameState !== "ready"}
              onChange={(e) => {
                setPower(Number(e.target.value));
              }}
              className="w-full accent-emerald-500 bg-neutral-800 rounded h-1 cursor-pointer focus:outline-none"
            />
          </div>

        </div>

        {/* Quick chip increment pills */}
        <div className="flex justify-between items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[10, 50, 100, 500, 1000].map((val) => (
            <button
              key={val}
              disabled={gameState === "kicking"}
              onClick={() => {
                playLocalSound("click");
                setBet(prev => Math.min(balance, prev + val));
              }}
              className="flex-1 min-w-[50px] py-1 bg-[#12241a] hover:bg-[#1a3827]/80 text-[#a3ebd5] border border-emerald-500/10 rounded-lg text-[10.5px] font-black font-mono leading-none transition-all hover:scale-102 active:scale-95 select-none"
            >
              +{val}
            </button>
          ))}
        </div>

        {/* Stake wager inputs and execute controls */}
        <div className="grid grid-cols-12 gap-2">
          
          <div className="col-span-4 grid grid-cols-2 gap-1.5">
            <button
              disabled={gameState === "kicking"}
              onClick={() => {
                playLocalSound("click");
                setBet(prev => Math.min(balance, prev * 2));
              }}
              className="py-2 bg-[#122419] hover:bg-[#1a3525] border border-emerald-500/15 text-emerald-450 leading-none text-[10px] font-black uppercase rounded-lg active:scale-95 transition-all w-full text-center text-[#a1f3c5]"
            >
              2X
            </button>
            <button
              disabled={gameState === "kicking"}
              onClick={() => {
                playLocalSound("click");
                setBet(minBet);
              }}
              className="py-2 bg-[#122419] hover:bg-[#1a3525] border border-emerald-500/15 text-neutral-400 leading-none text-[10px] font-black uppercase rounded-lg active:scale-95 transition-all w-full text-center"
            >
              MIN
            </button>
          </div>

          <button 
            onClick={executeShot}
            disabled={gameState !== "ready" || balance < bet}
            className={`col-span-8 h-9 border-b-2 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 select-none font-serif italic uppercase active:scale-[0.98] ${
              gameState !== "ready" 
                ? 'bg-zinc-805 bg-[#17261d] border-emerald-950/20 text-[#a3ebd5]/30 cursor-not-allowed'
                : balance < bet
                ? 'bg-red-950/20 text-red-500 border-red-500/20 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 via-[#39FF14] to-emerald-600 hover:from-emerald-400 hover:to-lime-400 text-black font-black border-[#25c40e] animate-shimmer cursor-pointer'
            }`}
          >
            <Target size={13} className={gameState === "ready" ? "animate-spin-slow text-black" : "text-[#a3ebd5]/30"} />
            <span className="text-[11px] leading-tight font-sans font-black tracking-wider">
              {gameState === "kicking" ? "STRIKING..." : `SHOOT PENALTY: RS ${bet}`}
            </span>
          </button>

        </div>

      </footer>

      {/* COMPACT STREAK HISTORIES DOTS ROW BOTTOM-BAR (28px) */}
      <div className="shrink-0 h-7 bg-[#050b07] border-t border-emerald-500/5 px-3 flex items-center justify-between text-[8px] font-black uppercase text-neutral-500 tracking-wider">
        <span>Streak Peak: <span className="text-[#39FF14] font-mono">{stats.highestStreak} MAX</span></span>
        
        {/* Past shot history dots inline */}
        <div className="flex items-center gap-1 max-w-[155px] overflow-hidden">
          {stats.history.slice(0, 6).map((record, index) => (
            <span 
              key={index} 
              className={`text-[7px] font-extrabold px-1 py-0.5 rounded leading-none shrink-0 border ${
                record === "goal" 
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" 
                  : record === "save" 
                  ? "bg-rose-500/15 text-rose-450 border-rose-500/25" 
                  : "bg-zinc-800/20 text-neutral-400 border-neutral-700/20"
              }`}
            >
              {record === "goal" ? "GOAL" : record === "save" ? "SAVE" : "WID"}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
};
