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
  TrendingUp, 
  Info, 
  RotateCcw,
  Flame
} from "lucide-react";
import { playSound } from "../lib/sounds";

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

export const GoalKick: React.FC<PenaltyRoyaleProps> = ({
  balance,
  onWin,
  onBet,
  onExit,
  winRate = 45,
  minBet = 10,
  multiplier = 1.9
}) => {
  // Betting states
  const [bet, setBet] = useState(minBet);
  
  // Game states
  const [selectedZone, setSelectedZone] = useState<ShotZone | null>(null);
  const [power, setPower] = useState(70); // 1-100
  const [spin, setSpin] = useState(0);    // -50 to 50 (left/right curve)
  const [wind, setWind] = useState({ speed: 0, dir: "none" as "left" | "right" | "none" });
  const [gameState, setGameState] = useState<"idle" | "ready" | "kicking" | "goal" | "saved" | "missed">("idle");
  const [message, setMessage] = useState("Select a target & set your spin/power!");
  const [showGuide, setShowGuide] = useState(false);

  // Statistics persisted in localStorage
  const [stats, setStats] = useState<StatRecord>(() => {
    const saved = localStorage.getItem("penalty_royale_stats");
    return saved ? JSON.parse(saved) : { goals: 0, shots: 0, highestStreak: 0, history: [] };
  });

  const [currentStreak, setCurrentStreak] = useState(0);

  // Canvas Refs & Sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Physics simulation variables
  const ballRef = useRef({
    x: 0,     // horizontal position (-200 to 200)
    y: 0,     // height above ground (0 to 150)
    z: 0.1,   // distance to goal (starts near user, 0.1 to 10.0)
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
    width: 65,
    height: 75,
    frame: 0
  });

  const netResponseRef = useRef({
    force: 0,
    x: 0,
    y: 0
  });

  // Load highscore from state change
  useEffect(() => {
    localStorage.setItem("penalty_royale_stats", JSON.stringify(stats));
  }, [stats]);

  // Generate a random wind speed and direction on mount and when resetting
  const generateWind = () => {
    const directions: ("left" | "right" | "none")[] = ["left", "right", "none"];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    const speed = randomDir === "none" ? 0 : Math.floor(Math.random() * 8) + 2; // 2-10 mph
    setWind({ speed, dir: randomDir });
  };

  useEffect(() => {
    generateWind();
  }, []);

  // Set up Canvas with ResizeObserver for ultra-sharp rendering on any screen
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
    const observer = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Main canvas rendering & physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particleList: { x: number; y: number; z: number; vx: number; vy: number; color: string; size: number }[] = [];

    const draw = () => {
      // Clear canvas with deep football stadium emerald colors
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Logical drawing coordinate space: 800 x 500
      ctx.save();
      ctx.scale(width / 800, height / 500);

      // Draw Stadium turf & sky
      const gradientSky = ctx.createLinearGradient(0, 0, 0, 300);
      gradientSky.addColorStop(0, "#03140e");
      gradientSky.addColorStop(1, "#07261a");
      ctx.fillStyle = gradientSky;
      ctx.fillRect(0, 0, 800, 350);

      const gradientGrass = ctx.createLinearGradient(0, 350, 0, 500);
      gradientGrass.addColorStop(0, "#0a2d1d");
      gradientGrass.addColorStop(0.3, "#0d3b25");
      gradientGrass.addColorStop(1, "#0f4028");
      ctx.fillStyle = gradientGrass;
      ctx.fillRect(0, 350, 800, 150);

      // Draw Stadium spotlights
      ctx.fillStyle = "rgba(100, 255, 180, 0.04)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(250, 350);
      ctx.lineTo(0, 350);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(800, 0);
      ctx.lineTo(550, 350);
      ctx.lineTo(800, 350);
      ctx.fill();

      // Draw grass mowing bands
      ctx.fillStyle = "#0c3521";
      for (let i = 0; i < 5; i++) {
        if (i % 2 === 0) {
          ctx.fillRect(0, 350 + i * 30, 800, 15);
        }
      }

      // Draw Goalpost Network & Outline
      // Goal parameters: width: 440px wide, 200px tall centered at top y=120 to 320
      const goalLeft = 180;
      const goalRight = 620;
      const goalTop = 110;
      const goalBottom = 330;

      // Outer stadium goal frame line shadow
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 15;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalBottom);
      ctx.lineTo(goalLeft, goalTop);
      ctx.lineTo(goalRight, goalTop);
      ctx.lineTo(goalRight, goalBottom);
      ctx.stroke();

      // Net texture (reacting to ball hits/elastic bounce)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1;
      const columns = 24;
      const rows = 12;
      const cellW = (goalRight - goalLeft) / columns;
      const cellH = (goalBottom - goalTop) / rows;

      // Draw dynamic reaction offset when ball scores
      const reactionScale = netResponseRef.current.force;

      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= columns; c++) {
          let nx = goalLeft + c * cellW;
          let ny = goalTop + r * cellH;

          // Pull net nodes towards collision spot if reacting
          if (reactionScale > 0.1) {
            const dx = nx - netResponseRef.current.x;
            const dy = ny - netResponseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              const pull = (150 - dist) / 150 * reactionScale * 25;
              const angle = Math.atan2(dy, dx);
              nx += Math.cos(angle) * pull;
              ny += Math.sin(angle) * pull;
            }
          }

          if (c === 0) ctx.moveTo(nx, ny);
          else ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }

      for (let c = 0; c <= columns; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
          let nx = goalLeft + c * cellW;
          let ny = goalTop + r * cellH;

          if (reactionScale > 0.1) {
            const dx = nx - netResponseRef.current.x;
            const dy = ny - netResponseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              const pull = (150 - dist) / 150 * reactionScale * 25;
              const angle = Math.atan2(dy, dx);
              nx += Math.cos(angle) * pull;
              ny += Math.sin(angle) * pull;
            }
          }

          if (r === 0) ctx.moveTo(nx, ny);
          else ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }

      // Main Goalposts (Stiff white steel rods)
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 10;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalBottom);
      ctx.lineTo(goalLeft, goalTop);
      ctx.lineTo(goalRight, goalTop);
      ctx.lineTo(goalRight, goalBottom);
      ctx.stroke();

      // Top corner brackets (metallic corner details)
      ctx.strokeStyle = "#CCCCCC";
      ctx.lineWidth = 4;
      ctx.strokeRect(goalLeft, goalTop, 15, 15);
      ctx.strokeRect(goalRight - 15, goalTop, 15, 15);

      // Draw Target Indicators (9 zones overlay when preparing)
      if (gameState === "idle" || gameState === "ready") {
        const zoneW = (goalRight - goalLeft) / 3;
        const zoneH = (goalBottom - goalTop) / 3;
        const zones: { id: ShotZone; x: number; y: number }[] = [
          { id: "top_left", x: goalLeft + zoneW * 0.5, y: goalTop + zoneH * 0.5 },
          { id: "top_center", x: goalLeft + zoneW * 1.5, y: goalTop + zoneH * 0.5 },
          { id: "top_right", x: goalLeft + zoneW * 2.5, y: goalTop + zoneH * 0.5 },
          { id: "mid_left", x: goalLeft + zoneW * 0.5, y: goalTop + zoneH * 1.5 },
          { id: "mid_center", x: goalLeft + zoneW * 1.5, y: goalTop + zoneH * 1.5 },
          { id: "mid_right", x: goalLeft + zoneW * 2.5, y: goalTop + zoneH * 1.5 },
          { id: "bot_left", x: goalLeft + zoneW * 0.5, y: goalTop + zoneH * 2.5 },
          { id: "bot_center", x: goalLeft + zoneW * 1.5, y: goalTop + zoneH * 2.5 },
          { id: "bot_right", x: goalLeft + zoneW * 2.5, y: goalTop + zoneH * 2.5 }
        ];

        zones.forEach((z) => {
          const isSelected = selectedZone === z.id;
          ctx.save();
          ctx.translate(z.x, z.y);

          // Pulsing circle
          const pulse = Math.sin(Date.now() / 200) * 4;
          ctx.beginPath();
          ctx.arc(0, 0, isSelected ? 24 + pulse : 18, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? "rgba(33, 150, 243, 0.25)" : "rgba(255, 255, 255, 0.1)";
          ctx.fill();

          ctx.strokeStyle = isSelected ? "#2196F3" : "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = isSelected ? 3 : 1.5;
          ctx.stroke();

          // Target reticle crosshairs
          ctx.beginPath();
          ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
          ctx.moveTo(0, -10); ctx.lineTo(0, 10);
          ctx.stroke();

          ctx.restore();
        });
      }

      // Draw Goalkeeper (Diving physics, gloves, body)
      const gk = keeperRef.current;
      ctx.save();
      ctx.translate(goalLeft + (goalRight - goalLeft) / 2 + gk.x, 310 - gk.y);

      // Shadow of keeper
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      // Shrinking shadow as goalie jumps
      ctx.ellipse(0, 20 + gk.y, 40 * (1 - gk.y / 200), 10 * (1 - gk.y / 200), 0, 0, Math.PI * 2);
      ctx.fill();

      // Goalkeeper Jersey / Body
      // Draw jersey block colors
      ctx.fillStyle = "#FFC107"; // Yellow jersey model
      ctx.beginPath();
      ctx.roundRect(-22, -45, 44, 45, 10);
      ctx.fill();

      // Jersey numbers
      ctx.fillStyle = "#000000";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.fillText("1", 0, -18);

      // Keeper Head
      ctx.fillStyle = "#FFD54F";
      ctx.beginPath();
      ctx.arc(0, -58, 14, 0, Math.PI * 2);
      ctx.fill();

      // Head safety helmet
      ctx.fillStyle = "#212121";
      ctx.beginPath();
      ctx.arc(0, -61, 15, Math.PI, 0);
      ctx.fill();

      // Goalkeeper Left Glove 🧤
      ctx.fillStyle = "#E91E63"; // Pink gloves
      ctx.beginPath();
      // When diving, keeper extends hands!
      const handExtendX = gk.x > 10 ? 38 : (gk.x < -10 ? 10 : 32);
      const handExtendY = gk.y > 10 ? -55 : -30;
      ctx.roundRect(-handExtendX, handExtendY, 15, 20, 4);
      ctx.fill();

      // Goalkeeper Right Glove
      const rHandExtendX = gk.x < -10 ? 38 : (gk.x > 10 ? 10 : 32);
      ctx.beginPath();
      ctx.roundRect(rHandExtendX - 15, handExtendY, 15, 20, 4);
      ctx.fill();

      // Goalkeeper legs & shorts
      ctx.fillStyle = "#212121";
      ctx.fillRect(-22, 0, 44, 8);
      
      ctx.restore();

      // Update Net Reaction vibration mechanics
      if (netResponseRef.current.force > 0.01) {
        netResponseRef.current.force *= 0.94; // dampening
      }

      // Draw active turf/soil particles from ball impact
      if (gameState === "kicking" && ballRef.current.z < 1.0) {
        if (Math.random() < 0.6) {
          particleList.push({
            x: 400 + ballRef.current.x * (ballRef.current.z / 10),
            y: 440 - ballRef.current.y,
            z: ballRef.current.z,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 8 - 4,
            color: Math.random() < 0.3 ? "#7CB342" : "#558B2F",
            size: Math.random() * 3 + 2
          });
        }
      }

      // Render Grass/Earth debris particles
      particleList.forEach((p, index) => {
        p.vy += 0.45; // gravity on dirt
        p.x += p.vx;
        p.y += p.vy;
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.z / 20), 0, Math.PI * 2);
        ctx.fill();

        if (p.y > 470) {
          particleList.splice(index, 1);
        }
      });

      // Draw Football ball with continuous physics position
      const b = ballRef.current;
      const startX = 400; // Center kick spot
      const startY = 440; // Pitch penalty spot

      // Dynamic shadow of ball
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      const ballRadius = 26 * (1.0 - b.z / 12); // Perspective scaling
      const shadowY = startY + (150 * (b.z / 10)); // projected floor shadow
      ctx.ellipse(startX + b.x, shadowY, ballRadius, ballRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Ball itself
      ctx.save();
      // Perspective projection mapping 
      ctx.translate(startX + b.x, startY - b.y - (b.z * 15)); // Trajectory adjustments
      ctx.rotate(b.rotation);

      // Outer Soccer border circle
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
      const isGoalFlash = gameState === "goal" && Math.floor(Date.now() / 150) % 2 === 0;
      ctx.fillStyle = isGoalFlash ? "#FFD54F" : "#FFFFFF";
      ctx.fill();
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = ballRadius * 0.12;
      ctx.stroke();

      // Classic Soccer pentagon markings (Lines drawn via rotation)
      ctx.strokeStyle = "#424242";
      ctx.lineWidth = ballRadius * 0.1;
      
      // Draw internal pentagon structure
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const lx = Math.cos(angle) * (ballRadius * 0.65);
        const ly = Math.sin(angle) * (ballRadius * 0.65);
        ctx.lineTo(lx, ly);
      }
      ctx.closePath();
      ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const outerX = Math.cos(angle) * ballRadius;
        const outerY = Math.sin(angle) * ballRadius;
        const innerX = Math.cos(angle) * (ballRadius * 0.65);
        const innerY = Math.sin(angle) * (ballRadius * 0.65);
        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.stroke();
      }

      ctx.restore();

      ctx.restore();

      // Keep ticking loop
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, selectedZone, stats]);

  // Handle actual physics shot animation
  const executeShot = () => {
    if (!selectedZone || gameState !== "ready") return;

    // Trigger user bet
    onBet(bet);
    setGameState("kicking");
    setMessage("Shot in flight! Watch the keeper...");
    playSound("click");

    // Initialize 3D physics values
    ballRef.current = {
      x: 0,
      y: 10,
      z: 0.1,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: spin * 0.1,
      rotation: 0
    };

    // Calculate goals coordinate based on zone selection
    // Top, Mid, Bot values inside 800 logical frame: width: 440 wide (180 to 620), height: 220 tall (110 to 330)
    let finalGoalX = 0; // Relative to center (0 to 220/-220)
    let finalGoalY = 0; // Height (0 to 220)

    // Direction variables
    if (selectedZone.includes("left")) finalGoalX = -180 + (Math.random() - 0.5) * 40;
    else if (selectedZone.includes("right")) finalGoalX = 180 + (Math.random() - 0.5) * 40;
    else finalGoalX = (Math.random() - 0.5) * 60; // Center has small wobble

    if (selectedZone.includes("top")) finalGoalY = 170 + Math.random() * 30;
    else if (selectedZone.includes("bot")) finalGoalY = 25 + Math.random() * 30;
    else finalGoalY = 100 + (Math.random() - 0.5) * 30;

    // Adjust for wind impact (+/- x force)
    if (wind.dir === "left") finalGoalX -= wind.speed * 8;
    if (wind.dir === "right") finalGoalX += wind.speed * 8;

    // Adjust for power (too much power makes it go out/over crossbar, too small falls short)
    const powerModifier = power / 75; // Baseline ideal power is around 75

    // Physical trajectory calculation
    const travelTime = 40; // frame steps (approx 0.7 sec)
    // vx/vy/vz steps
    ballRef.current.vz = 9.9 / travelTime; 
    ballRef.current.vx = finalGoalX / travelTime;
    ballRef.current.vy = (finalGoalY / travelTime);

    // AI Goalkeeper intelligence decision (Will goalie dive towards shot zone?)
    const keeperSuccessfulSave = Math.random() * 100 > winRate;
    let keeperTargetX = 0;
    let keeperTargetY = 0;

    if (keeperSuccessfulSave) {
      // Dive EXACTLY to the targeted region to make a thumping save
      keeperTargetX = finalGoalX;
      keeperTargetY = finalGoalY;
    } else {
      // Dive to a completely different random area
      const wrongZones: ShotZone[] = [
        "top_left", "top_center", "top_right",
        "mid_left", "mid_right", "bot_left",
        "bot_center", "bot_right"
      ];
      const selectedWrong = wrongZones.filter(z => z !== selectedZone)[Math.floor(Math.random() * (wrongZones.length - 1))];
      
      if (selectedWrong.includes("left")) keeperTargetX = -160;
      else if (selectedWrong.includes("right")) keeperTargetX = 160;
      else keeperTargetX = 0;

      if (selectedWrong.includes("top")) keeperTargetY = 160;
      else if (selectedWrong.includes("bot")) keeperTargetY = 30;
      else keeperTargetY = 90;
    }

    // Goalkeeper diving state
    keeperRef.current = {
      x: 0,
      y: 0,
      targetX: keeperTargetX,
      targetY: keeperTargetY,
      width: 65,
      height: 75,
      frame: 0
    };

    let physicsFrame = 0;

    // Run custom physics loop on timer for absolute trajectory correctness
    const physicsTimer = setInterval(() => {
      const b = ballRef.current;
      const gk = keeperRef.current;

      physicsFrame++;

      // Travel ball towards goalpost
      // Parabolic curvature with spin (Magnus dynamic force)
      b.z += b.vz;
      b.x += b.vx + (b.spin * (b.z / 10)); // curve grows over distance
      b.y += b.vy;
      b.rotation += 0.22; // spin rotation visual

      // Slowly dive keeper towards his designed diving target
      if (physicsFrame > 5) {
        const easeFactor = (physicsFrame - 5) / (travelTime - 5);
        gk.x = gk.targetX * easeFactor;
        gk.y = gk.targetY * easeFactor * 0.8; // gravity reduction on body
      }

      // Check for collision when depth arrives on the goal line (z=10.0)
      if (physicsFrame >= travelTime) {
        clearInterval(physicsTimer);
        
        const goalLeftBoundary = -220;
        const goalRightBoundary = 220;
        const goalTopBoundary = 220; // 330 logical height - 110 logic top

        // Let's check boundaries
        const isWithinHorizontal = b.x >= goalLeftBoundary && b.x <= goalRightBoundary;
        const isWithinVertical = b.y >= 0 && b.y <= goalTopBoundary;
        const isCleanGoalZone = isWithinHorizontal && isWithinVertical;

        // Check if ball went over the crossbar (above 220) or wide
        if (!isCleanGoalZone) {
          setGameState("missed");
          playSound("lose");
          setMessage("MISS! Shot went completely wide into the stands!");
          setCurrentStreak(0);
          setStats((prev) => ({
            ...prev,
            shots: prev.shots + 1,
            history: ["miss", ...prev.history].slice(0, 10)
          }));
          return;
        }

        // Check if goalie hands blocked the ball (Within 70 logical radius to goalkeeper spot)
        const distToGK = Math.sqrt(Math.pow(b.x - gk.x, 2) + Math.pow(b.y - gk.y, 2));
        const keeperSaved = distToGK < 68;

        if (keeperSaved) {
          setGameState("saved");
          playSound("lose");
          setMessage("SAVED! Dynamic save by the goalkeeper's gloves!");
          // Bounce ball off goalkeeper
          b.vx = (b.x < gk.x ? -5 : 5);
          b.vy = 2;
          b.spin = 0;
          setCurrentStreak(0);
          setStats((prev) => ({
            ...prev,
            shots: prev.shots + 1,
            history: ["save", ...prev.history].slice(0, 10)
          }));
        } else {
          // GOAL SCORDED!
          setGameState("goal");
          playSound("win");
          setMessage("GOAL!!! Masterfully tucked into the corner nets!");
          
          // Ripple Goal Net physics
          netResponseRef.current = {
            force: 1.0,
            x: 400 + b.x,
            y: 330 - b.y
          };

          // Update Streak and local counters
          const newStreak = currentStreak + 1;
          setCurrentStreak(newStreak);
          
          setStats((prev) => {
            const nextStreak = Math.max(prev.highestStreak, newStreak);
            return {
              goals: prev.goals + 1,
              shots: prev.shots + 1,
              highestStreak: nextStreak,
              history: ["goal", ...prev.history].slice(0, 10)
            };
          });

          // Trigger rewards payout
          onWin(bet * multiplier);
        }
      }
    }, 18);
  };

  const handleReset = () => {
    playSound("click");
    setSelectedZone(null);
    setGameState("ready");
    setMessage("Target another direction & adjust values!");
    generateWind();
    
    // Clear ball position
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

    keeperRef.current = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      width: 65,
      height: 75,
      frame: 0
    };

    netResponseRef.current = {
      force: 0,
      x: 0,
      y: 0
    };
  };

  // Adjust stakes helper
  const adjustBet = (amount: number) => {
    playSound("click");
    setBet((prev) => Math.max(minBet, prev + amount));
  };

  const doubleBet = () => {
    playSound("click");
    setBet((prev) => Math.min(balance, prev * 2));
  };

  const halfBet = () => {
    playSound("click");
    setBet((prev) => Math.max(minBet, Math.floor(prev / 2)));
  };

  return (
    <div className="flex flex-col h-full bg-[#051a10] text-[#E3F2FD] font-sans overflow-hidden relative select-none">
      
      {/* Top Champions League visual sports header */}
      <header className="flex items-center justify-between px-5 h-16 bg-black/50 border-b border-[#2196F3]/30 backdrop-blur-md shrink-0 z-50">
        <button 
          onClick={onExit} 
          className="p-2 border border-[#2196F3]/20 bg-[#2196F3]/10 hover:bg-[#2196F3]/20 text-neutral-200 rounded-xl transition-all active:scale-95"
        >
          <LogOut size={18} />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-extrabold italic tracking-tight text-lg uppercase flex items-center gap-1">
              PENALTY ROYALE
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-[7.5px] font-bold uppercase tracking-[0.25em] text-[#2196F3]">UEFA PRO SIMULATOR</span>
        </div>

        {/* Real Balance display formatting */}
        <div className="bg-[#2196F3]/10 px-3.5 py-1.5 rounded-xl border border-[#2196F3]/40 backdrop-blur-xl flex items-center gap-1.5">
          <Zap size={12} className="text-blue-400 fill-blue-400" />
          <span className="text-[#90CAF9] font-black text-xs tracking-tight">
            RS {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </header>

      {/* Main Sandbox Simulation Arena */}
      <div className="flex-1 flex flex-col items-center justify-between p-4 relative z-10 w-full overflow-y-auto no-scrollbar">
        
        {/* Info / Wind indicator status strip */}
        <div className="w-full max-w-sm flex items-center justify-between gap-2.5 bg-black/60 border border-white/5 rounded-2xl p-3 shadow-md">
          {/* Wind bar */}
          <div className="flex items-center gap-2">
            <Compass size={14} className="text-sky-400 animate-spin-slow" />
            <div className="text-left leading-tight">
              <span className="text-[8px] font-bold text-neutral-400 uppercase block">Field Wind Direction</span>
              <span className="text-[10px] font-mono font-black text-sky-300">
                {wind.dir === "none" ? "CALM 0 KM/H" : `${wind.dir.toUpperCase()} ${wind.speed} KM/H`}
              </span>
            </div>
          </div>

          {/* Current Streak banner */}
          {currentStreak > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg px-2 py-0.5 flex items-center gap-1 animate-pulse">
              <Flame size={12} className="text-amber-500 fill-amber-500" />
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-tight">
                {currentStreak} STREAK
              </span>
            </div>
          )}

          {/* Guide toggle info button */}
          <button 
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="p-1 px-2 border border-[#2196F3]/20 hover:bg-white/5 rounded-lg text-neutral-400 text-xs font-bold transition-all"
          >
            Rules
          </button>
        </div>

        {/* Physics Canvas Field Container Board */}
        <div 
          ref={containerRef} 
          className="w-full max-w-sm aspect-[4/3] bg-[#031c11] border border-white/10 rounded-2xl overflow-hidden relative shadow-inner my-3"
        >
          {/* The canvas component that does high fidelity paint operations */}
          <canvas ref={canvasRef} className="block w-full h-full" />

          {/* Interactive Guide rules overlay */}
          <AnimatePresence>
            {showGuide && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-sm p-5 flex flex-col justify-center text-center space-y-4 z-40 text-xs"
              >
                <h4 className="font-extrabold text-blue-400 uppercase tracking-wide">Penalty Shootout Guidelines</h4>
                <div className="space-y-2 text-left text-neutral-300 leading-normal max-h-48 overflow-y-auto pr-1">
                  <p>⚽ Select any of the <strong>9 Target Zones</strong> on the soccer screen.</p>
                  <p>🌪️ Watch the <strong>Wind Indicator</strong>. Left or right wind bends the ball trajectory away from your selection!</p>
                  <p>⚙️ Adjust <strong>Spin Curve</strong> to curve the football in mid-air to dodge the goalkeeper's gloves!</p>
                  <p>⚡ Adjust <strong>Shot Power</strong>: Too low allows the goalie to save, while excessive power can bounce off the post or fly wide.</p>
                </div>
                <button 
                  onClick={() => setShowGuide(false)}
                  className="bg-[#2196F3] text-white py-2 rounded-xl font-bold uppercase transition-colors"
                >
                  Enter Arena
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Highlight overlays on state results on screen */}
          <AnimatePresence>
            {gameState === "goal" && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-x-0 top-1/3 flex flex-col items-center pointer-events-none"
              >
                <span className="bg-yellow-400 text-black font-black italic text-5xl tracking-tighter uppercase px-6 py-2 rounded-2xl shadow-[0_4px_30px_rgba(250,204,21,0.5)] border-4 border-white animate-bounce">
                  GOAL!
                </span>
                <span className="text-[10px] bg-black/80 text-yellow-300 font-extrabold tracking-widest uppercase mt-3 px-3 py-1 rounded-full border border-yellow-400/30">
                  +RS {(bet * multiplier).toFixed(1)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {gameState === "saved" && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-x-0 top-1/3 flex flex-col items-center pointer-events-none"
              >
                <span className="bg-rose-600 text-white font-black italic text-4xl tracking-tighter uppercase px-6 py-2 rounded-2xl shadow-xl border-4 border-red-200">
                  SAVED!
                </span>
                <span className="text-[9px] bg-black/80 text-red-200 font-bold tracking-wider mt-2 px-3 py-1 rounded-full border border-red-500/20">
                  Goalkeeper caught it
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {gameState === "missed" && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-x-0 top-1/3 flex flex-col items-center pointer-events-none"
              >
                <span className="bg-gray-700 text-red-400 font-black italic text-4xl tracking-tighter uppercase px-6 py-2 rounded-2xl shadow-xl border-4 border-gray-500">
                  WIDE OUT!
                </span>
                <span className="text-[9px] bg-black/80 text-gray-300 font-bold tracking-wider mt-2 px-3 py-1 rounded-full border border-gray-500/30">
                  Hit crossbar / flew wide
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Stadium announcer instructions strip */}
        <div className="w-full max-w-sm text-center py-2">
          <p className="text-[11px] font-black tracking-wide text-[#90CAF9] uppercase animate-pulse">
            🎤 Announcer: {message}
          </p>
        </div>

        {/* 9 Button Grid Overlay for shot selection */}
        {gameState === "idle" || gameState === "ready" ? (
          <div className="w-full max-w-sm bg-black/50 border border-white/5 rounded-2xl p-3.5 space-y-2 mt-1">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block text-center mb-1">
              Select shooting point spot:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "top_left", label: "TL 🏆" },
                { id: "top_center", label: "T CENTER ⚽" },
                { id: "top_right", label: "TR 🏆" },
                { id: "mid_left", label: "LEFT 🧤" },
                { id: "mid_center", label: "MID GOAL" },
                { id: "mid_right", label: "RIGHT 🧤" },
                { id: "bot_left", label: "BOT L" },
                { id: "bot_center", label: "LOW CEN" },
                { id: "bot_right", label: "BOT R" }
              ].map((zone) => {
                const isSelected = selectedZone === zone.id;
                return (
                  <button
                    key={zone.id}
                    onClick={() => {
                      playSound("click");
                      setSelectedZone(zone.id as ShotZone);
                      setGameState("ready");
                      setMessage(`Ready! Targets lock on: ${zone.id.replace("_", " ").toUpperCase()}`);
                    }}
                    className={`p-2.5 rounded-xl text-[9px] font-black uppercase tracking-tight text-center transition-all ${
                      isSelected 
                        ? "bg-[#2196F3] text-white shadow-md border-transparent scale-105" 
                        : "bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10"
                    }`}
                  >
                    {zone.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center py-2">
            {gameState !== "kicking" && (
              <button 
                onClick={handleReset}
                className="w-full bg-white/10 hover:bg-white/15 border border-white/10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all text-white active:scale-95"
              >
                <RotateCcw size={14} /> Tap to Try Next Shoot
              </button>
            )}
          </div>
        )}

        {/* Physic Slider Adjusters */}
        {(gameState === "idle" || gameState === "ready") && (
          <div className="w-full max-w-sm bg-black/50 border border-white/5 rounded-2xl p-4.5 space-y-4 mt-2">
            
            {/* Spin Curve Slide adjustment */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wide">
                <span className="text-neutral-400">Spin Curve Direction</span>
                <span className="text-indigo-400">{spin === 0 ? "STRIAGHT" : (spin < 0 ? `LEFT CURVE (${Math.abs(spin)})` : `RIGHT CURVE (${spin})`)}</span>
              </div>
              <input 
                type="range"
                min="-40"
                max="40"
                value={spin}
                onChange={(e) => {
                  setSpin(Number(e.target.value));
                }}
                className="w-full accent-indigo-500 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            {/* Power slide adjustment */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wide">
                <span className="text-neutral-400">Shot Fire Power</span>
                <span className={power > 85 ? "text-red-400 font-black animate-pulse" : "text-emerald-400"}>
                  {power}% {power > 85 ? "CRITICAL (RISK)" : "SAFE"}
                </span>
              </div>
              <input 
                type="range"
                min="30"
                max="100"
                value={power}
                onChange={(e) => {
                  setPower(Number(e.target.value));
                }}
                className="w-full accent-emerald-500 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
              />
            </div>

          </div>
        )}

        {/* Betting Panel controls */}
        <div className="w-full max-w-sm space-y-4 pt-1 mt-2">
          <div className="bg-black/80 border border-neutral-700/50 rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xl">
            
            <div className="flex justify-between items-center bg-black/40 p-1 px-3.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-neutral-400 font-extrabold uppercase">Potential payout multiplier:</span>
              <span className="text-xs text-yellow-500 font-black italic">{multiplier}x Return</span>
            </div>

            {/* Quick Stake increase selectors */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-1.5">
                <button 
                  onClick={halfBet}
                  disabled={gameState === "kicking"}
                  className="px-2.5 py-1.5 font-bold uppercase text-[9px] bg-neutral-800 hover:bg-neutral-700 border border-white/5 rounded-lg transition-transform active:scale-95 disabled:opacity-40"
                >
                  1/2
                </button>
                <button 
                  onClick={doubleBet}
                  disabled={gameState === "kicking"}
                  className="px-2.5 py-1.5 font-bold uppercase text-[9px] bg-neutral-800 hover:bg-neutral-700 border border-white/5 rounded-lg transition-transform active:scale-95 disabled:opacity-40"
                >
                  X2
                </button>
              </div>

              <div className="flex-1 text-center">
                <span className="text-[8px] font-black uppercase text-neutral-400 tracking-wider block mb-0.5">ESTIMATE RETURN</span>
                <span className="text-base font-extrabold text-white">RS {(bet * multiplier).toFixed(1)}</span>
              </div>

              <div className="flex gap-1.5">
                <button 
                  onClick={() => adjustBet(-20)}
                  disabled={gameState === "kicking" || bet <= minBet}
                  className="w-8 h-8 font-black bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center justify-center transition-transform active:scale-95 text-xs border border-white/5"
                >
                  -
                </button>
                <button 
                  onClick={() => adjustBet(20)}
                  disabled={gameState === "kicking" || bet >= balance}
                  className="w-8 h-8 font-black bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center justify-center transition-transform active:scale-95 text-xs border border-white/5"
                >
                  +
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
                onClick={executeShot}
                disabled={gameState !== "ready" || balance < bet}
                className="col-span-2 py-3 border-transparent bg-gradient-to-r from-emerald-500 to-[#2196F3] hover:from-emerald-400 hover:to-blue-500 text-white font-black uppercase text-[12px] rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Target size={14} className="animate-spin-slow" /> SHOOT PENALTY
              </button>
            </div>

          </div>
        </div>

        {/* Dashboard statistics section bottom bar */}
        <div className="w-full max-w-sm mt-4 bg-black/60 border border-white/5 rounded-2xl p-4 space-y-2.5 shadow-md">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-neutral-400 border-b border-white/5 pb-2">
            <span className="flex items-center gap-1"><Trophy size={11} className="text-yellow-400" /> Stats Records</span>
            <span className="font-mono text-[9px]">W/S Ratio: {stats.shots > 0 ? `${((stats.goals / stats.shots) * 100).toFixed(0)}%` : "0%"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-neutral-900/50 p-2 rounded-xl">
              <span className="text-[8px] font-bold text-neutral-400 uppercase block mb-0.5">Scored</span>
              <span className="font-black text-white">{stats.goals} GOALS</span>
            </div>
            
            <div className="bg-neutral-900/50 p-2 rounded-xl">
              <span className="text-[8px] font-bold text-neutral-400 uppercase block mb-0.5">Consecutive</span>
              <span className="font-black text-amber-400">{currentStreak} RUN</span>
            </div>

            <div className="bg-neutral-900/50 p-2 rounded-xl">
              <span className="text-[8px] font-bold text-neutral-400 uppercase block mb-0.5">Peak Record</span>
              <span className="font-black text-rose-400">{stats.highestStreak} MAX</span>
            </div>
          </div>

          {/* Past shot histories strip */}
          {stats.history.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5">
              <span className="text-[8px] font-black text-neutral-400 uppercase tracking-tight shrink-0">Recent:</span>
              <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
                {stats.history.map((record, idx) => (
                  <span 
                    key={idx}
                    className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${
                      record === "goal" 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/20" 
                        : (record === "save" ? "bg-rose-500/20 text-rose-400 border border-rose-400/20" : "bg-neutral-700/30 text-neutral-400")
                    }`}
                  >
                    {record}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
