import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, Plus, Minus, HelpCircle, Volume2, VolumeX, RotateCcw, 
  Swords, Trophy, Sparkles, Coins, Flame, ArrowLeft, Target 
} from 'lucide-react';
import { playSound } from '../lib/sounds';

interface FruitNinjaProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

const FRUITS = [
  { char: '🍎', color: '#EF4444', label: 'Apple' },
  { char: '🍊', color: '#F97316', label: 'Orange' },
  { char: '🍋', color: '#FACC15', label: 'Lemon' },
  { char: '🍉', color: '#22C55E', label: 'Watermelon' },
  { char: '🍓', color: '#F43F5E', label: 'Strawberry' },
  { char: '🍍', color: '#EAB308', label: 'Pineapple' },
  { char: '🥝', color: '#84CC16', label: 'Kiwi' },
  { char: '🍇', color: '#A855F7', label: 'Grapes' },
  { char: '🥥', color: '#D1D5DB', label: 'Coconut' }
];

const CHIPS = [10, 50, 100, 500, 1000, 5000];

// Dynamic types for realistic canvas simulation
interface FruitObject {
  id: number;
  char: string;
  color: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  sliced: boolean;
  type: 'fruit' | 'bomb';
  half1?: { x: number; y: number; vx: number; vy: number; rotation: number; rotSpeed: number };
  half2?: { x: number; y: number; vx: number; vy: number; rotation: number; rotSpeed: number };
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
  gravity: number;
}

interface DripSplatter {
  id: number;
  x: number;
  y: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
}

interface CherryBlossom {
  id: number;
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  angle: number;
  spinSpeed: number;
}

export const FruitNinja: React.FC<FruitNinjaProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 45, minBet = 10, multiplier = 2 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState<'ready' | 'active' | 'result'>('ready');
  const [slicedCount, setSlicedCount] = useState(0);
  const [requiredScore] = useState(12); // Slice 12 fruits to win
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Flash, Shake and Combo references
  const [flashIntensity, setFlashIntensity] = useState(0);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [latestCombo, setLatestCombo] = useState<string | null>(null);

  // References for pure canvas loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fruitsRef = useRef<FruitObject[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const splattersRef = useRef<DripSplatter[]>([]);
  const floatTextsRef = useRef<FloatingText[]>([]);
  const blossomsRef = useRef<CherryBlossom[]>([]);
  const trailRef = useRef<{ x: number; y: number; time: number }[]>([]);
  
  const isDragging = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const gameLoopId = useRef<number | null>(null);
  const spawnerIntervalId = useRef<NodeJS.Timeout | null>(null);
  const nextId = useRef(0);
  const comboCounter = useRef(0);
  const comboTimer = useRef<NodeJS.Timeout | null>(null);

  // Live trackers to absolutely bypass any React functional closure stale states
  const playingLiveRef = useRef(playing);
  const stageLiveRef = useRef(stage);

  useEffect(() => {
    playingLiveRef.current = playing;
  }, [playing]);

  useEffect(() => {
    stageLiveRef.current = stage;
  }, [stage]);

  // Helper: Segment distance check for ultra-responsive high speed swipes
  const checkSliceSegment = (
    x1: number, y1: number, 
    x2: number, y2: number, 
    fruit: FruitObject
  ) => {
    const r = fruit.radius;
    const cx = fruit.x;
    const cy = fruit.y;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      const dSq = (cx - x1) * (cx - x1) + (cy - y1) * (cy - y1);
      return dSq <= r * r;
    }

    let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    const distSq = (cx - closestX) * (cx - closestX) + (cy - closestY) * (cy - closestY);
    return distSq <= r * r;
  };

  // Trigger combo announcement
  const recordCombo = (count: number, posX: number, posY: number) => {
    if (count < 2) return;
    let title = 'DOUBLE SLICE!';
    let col = '#EAB308';
    
    if (count === 3) {
      title = 'TRIPLE COMBO! ⚡';
      col = '#F97316';
    } else if (count >= 4) {
      title = 'UNBELIEVABLE SLICE! 🔥';
      col = '#EF4444';
    }

    setLatestCombo(`${title} +${count}`);
    if (soundEnabled) playSound('levelUp');

    // Float combotext
    floatTextsRef.current.push({
      id: nextId.current++,
      text: title,
      x: posX,
      y: posY - 30,
      color: col,
      alpha: 1,
      scale: 1.3
    });
  };

  // Slice individual fruit
  const executeSlice = (fruit: FruitObject, px: number, py: number) => {
    fruit.sliced = true;
    
    // Play blast sound when bomb is hit, otherwise splash sound
    if (fruit.type === 'bomb') {
      setFlashIntensity(1);
      setShakeIntensity(25);
      if (soundEnabled) playSound('mine_boom');
      
      // Detonation particles
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 3 + Math.random() * 10;
        particlesRef.current.push({
          id: nextId.current++,
          x: fruit.x,
          y: fruit.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: i % 2 === 0 ? '#FF3D00' : '#FFD600',
          radius: 3 + Math.random() * 6,
          alpha: 1,
          decay: 0.015 + Math.random() * 0.02,
          gravity: 0.12
        });
      }

      terminateGame('lose');
      return;
    }

    // Play splash sound
    if (soundEnabled) playSound('plink');

    setSlicedCount(prev => {
      const nextScore = prev + 1;
      if (nextScore >= requiredScore) {
        terminateGame('win');
      }
      return nextScore;
    });

    // Animate split halves
    const angleOfCut = lastPointer.current 
      ? Math.atan2(py - lastPointer.current.y, px - lastPointer.current.x) 
      : (Math.random() * Math.PI - Math.PI / 2);

    const force = 3.5 + Math.random() * 4;
    fruit.half1 = {
      x: fruit.x,
      y: fruit.y,
      vx: fruit.vx + Math.cos(angleOfCut - Math.PI / 2) * force,
      vy: fruit.vy + Math.sin(angleOfCut - Math.PI / 2) * force - 2.5,
      rotation: angleOfCut,
      rotSpeed: -0.06 - Math.random() * 0.12
    };

    fruit.half2 = {
      x: fruit.x,
      y: fruit.y,
      vx: fruit.vx + Math.cos(angleOfCut + Math.PI / 2) * force,
      vy: fruit.vy + Math.sin(angleOfCut + Math.PI / 2) * force - 2.5,
      rotation: angleOfCut + Math.PI,
      rotSpeed: 0.06 + Math.random() * 0.12
    };

    // Splash splatter drips background
    splattersRef.current.push({
      id: nextId.current++,
      x: fruit.x,
      y: fruit.y,
      color: fruit.color,
      radius: 45 + Math.random() * 30,
      alpha: 0.85,
      decay: 0.001
    });

    // Premium glowing splatter particles
    for (let i = 0; i < 22; i++) {
      const pAngle = Math.random() * Math.PI * 2;
      const pSpd = 4 + Math.random() * 8;
      particlesRef.current.push({
        id: nextId.current++,
        x: fruit.x,
        y: fruit.y,
        vx: Math.cos(pAngle) * pSpd,
        vy: Math.sin(pAngle) * pSpd,
        color: fruit.color,
        radius: 2 + Math.random() * 5,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02,
        gravity: 0.22
      });
    }

    // Critical floating score
    floatTextsRef.current.push({
      id: nextId.current++,
      text: `+1 ${fruit.label}`,
      x: fruit.x,
      y: fruit.y,
      color: '#FFFFFF',
      alpha: 1,
      scale: 1.15
    });

    // Trigger Combo tracking
    comboCounter.current++;
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => {
      if (comboCounter.current >= 2) {
        recordCombo(comboCounter.current, fruit.x, fruit.y);
      }
      comboCounter.current = 0;
    }, 300);
  };

  // Launch Fruit Waves
  const launchFruitWave = useCallback(() => {
    if (!playingLiveRef.current || stageLiveRef.current !== 'active') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Launch 1 to 3 fruits/bombs per wave
    const waveSize = Math.floor(Math.random() * 3) + 1;
    
    // Absolute dimension safety fallbacks to handle uninitialized layouts
    const rect = canvas.parentElement?.getBoundingClientRect();
    const w = rect && rect.width > 120 ? Math.floor(rect.width) : (canvas.width > 120 ? canvas.width : 520);
    const h = rect && rect.height > 120 ? Math.floor(rect.height) : (canvas.height > 120 ? canvas.height : 420);
    
    const forceFactor = h * 0.026 > 9 ? h * 0.026 : 14.5;
    const isWinRateFlipped = Math.random() * 100 > winRate;

    for (let i = 0; i < waveSize; i++) {
      // Small delay per launch so they have minor stagger
      setTimeout(() => {
        if (!playingLiveRef.current) return;
        
        // Spawn source horizontal width (keep away from bounds text)
        const x = (0.22 + Math.random() * 0.56) * w;
        const speedX = (x < w / 2) ? (1.5 + Math.random() * 3.2) : (-1.5 - Math.random() * 3.2);
        const speedY = -(forceFactor + Math.random() * 6); // Upward launch push

        // High contrast fruit selection
        const fruitType = FRUITS[Math.floor(Math.random() * FRUITS.length)];
        
        // Decide if bomb is generated
        const isBomb = isWinRateFlipped && (Math.random() > 0.82);

        const newObj: FruitObject = {
          id: nextId.current++,
          char: isBomb ? '💣' : fruitType.char,
          color: isBomb ? '#FF3D00' : fruitType.color,
          label: isBomb ? 'BOMB!' : fruitType.label,
          type: isBomb ? 'bomb' : 'fruit',
          x,
          y: h + 42, // Start safely below the bottom edge of computed layout
          vx: speedX,
          vy: speedY,
          radius: 26 + Math.random() * 8,
          rotation: Math.random() * Math.PI,
          rotationSpeed: -0.06 + Math.random() * 0.12,
          sliced: false
        };

        fruitsRef.current.push(newObj);
      }, i * 350);
    }
  }, [winRate]);

  // Handle Game Termination
  const terminateGame = (result: 'win' | 'lose') => {
    setPlaying(false);
    setStage('result');
    setGameResult(result);
    comboCounter.current = 0;

    // Clean up spawner
    if (spawnerIntervalId.current) clearInterval(spawnerIntervalId.current);

    if (result === 'win') {
      onWin(bet * multiplier);
      if (soundEnabled) playSound('win');
    } else {
      if (soundEnabled) playSound('lose');
    }
  };

  // Setup periodic launch of waves via useEffect to prevent stale closures and clean up perfectly
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;

    if (playing && stage === 'active') {
      // Immediate launch
      timeout = setTimeout(() => {
        launchFruitWave();
      }, 150);

      // Periodic waves
      interval = setInterval(() => {
        launchFruitWave();
      }, 1600);

      spawnerIntervalId.current = interval;
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
      spawnerIntervalId.current = null;
    };
  }, [playing, stage, launchFruitWave]);

  // Process game setup
  const startGame = () => {
    if (balance < bet || playing) return;

    // Deduct Bet Wager
    onBet(bet);
    setPlaying(true);
    setStage('active');
    setSlicedCount(0);
    setGameResult(null);
    setLatestCombo(null);
    setFlashIntensity(0);
    setShakeIntensity(0);

    // Empty references
    fruitsRef.current = [];
    particlesRef.current = [];
    splattersRef.current = [];
    floatTextsRef.current = [];
    trailRef.current = [];

    if (soundEnabled) playSound('click');
  };

  // Initialize Falling Cherry Blossom Petals
  useEffect(() => {
    const blossoms: CherryBlossom[] = [];
    for (let i = 0; i < 18; i++) {
      blossoms.push({
        id: i,
        x: Math.random() * 1200,
        y: Math.random() * 800 - 400,
        size: 3 + Math.random() * 6,
        speedY: 0.5 + Math.random() * 1.5,
        speedX: -0.4 + Math.random() * 0.8,
        angle: Math.random() * Math.PI,
        spinSpeed: -0.02 + Math.random() * 0.04
      });
    }
    blossomsRef.current = blossoms;
  }, []);

  // Main high speed Canvas visual frame update
  useEffect(() => {
    let frameId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Dynamic parent container size sync (Crucial to ensure fruits are visible inside active boundaries!)
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        const rectW = Math.floor(rect.width);
        const rectH = Math.floor(rect.height);
        if (rectW > 0 && rectH > 0 && (canvas.width !== rectW || canvas.height !== rectH)) {
          canvas.width = rectW;
          canvas.height = rectH;
        }
      }

      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // Sensory background ambient animations
      if (playingLiveRef.current && stageLiveRef.current === 'active') {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 108, 0, 0.05)';
        ctx.lineWidth = 1;
        
        const pulseRatio = 1 + 0.035 * Math.sin(Date.now() / 250);
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.35 * pulseRatio, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(239, 108, 0, 0.02)';
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.6 * pulseRatio, 0, Math.PI * 2);
        ctx.stroke();

        // Elegant gradient drapes
        const radialGrad = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.65);
        radialGrad.addColorStop(0, 'rgba(24, 10, 5, 0)');
        radialGrad.addColorStop(1, 'rgba(8, 2, 1, 0.45)');
        ctx.fillStyle = radialGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // Apply gorgeous slow decay shake
      ctx.save();
      if (shakeIntensity > 0.1) {
        const shakeX = (Math.random() - 0.5) * shakeIntensity;
        const shakeY = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(shakeX, shakeY);
      }

      // Draw splatters on background
      splattersRef.current.forEach(splat => {
        ctx.save();
        ctx.shadowBlur = 40;
        ctx.shadowColor = splat.color;
        ctx.fillStyle = splat.color;
        
        ctx.globalAlpha = splat.alpha;
        ctx.beginPath();
        ctx.arc(splat.x, splat.y, splat.radius, 0, Math.PI * 2);
        ctx.fill();

        // Minor drips around
        ctx.beginPath();
        ctx.arc(splat.x - splat.radius * 0.4, splat.y + splat.radius * 0.5, splat.radius * 0.2, 0, Math.PI * 2);
        ctx.arc(splat.x + splat.radius * 0.5, splat.y + splat.radius * 0.35, splat.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Slow fade
        splat.alpha -= splat.decay;
        if (splat.alpha < 0.1) splat.alpha = 0.1; // lock minimal visible drip stain
      });

      // Draw cherry blossoms falling overlay
      blossomsRef.current.forEach(petal => {
        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.angle);
        ctx.fillStyle = 'rgba(244, 180, 194, 0.7)'; // beautiful rose petal color
        
        // Draw real petal shape
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.ellipse(0, 0, petal.size * 1.4, petal.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        petal.y += petal.speedY;
        petal.x += petal.speedX;
        petal.angle += petal.spinSpeed;

        if (petal.y > H + 10) {
          petal.y = -10;
          petal.x = Math.random() * W;
        }
      });

      // Update and Draw active fruits
      fruitsRef.current.forEach(fruit => {
        if (!fruit.sliced) {
          // Physics movement
          fruit.y += fruit.vy;
          fruit.x += fruit.vx;
          fruit.vy += 0.28; // standard beautiful gravity
          fruit.rotation += fruit.rotationSpeed;

          // Render intact emoji
          ctx.save();
          ctx.translate(fruit.x, fruit.y);
          ctx.rotate(fruit.rotation);
          ctx.font = `${fruit.radius * 2}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Outer magical glow for high visibility
          ctx.shadowBlur = fruit.type === 'bomb' ? 30 : 20;
          ctx.shadowColor = fruit.color;
          
          ctx.fillText(fruit.char, 0, 0);
          ctx.restore();

          // Sparkle line on bomb fuse
          if (fruit.type === 'bomb' && Math.random() > 0.4) {
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(fruit.x + 12, fruit.y - 24, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // SPLIT TRAJECTORY RENDER
          // Half 1 physics
          if (fruit.half1) {
            fruit.half1.x += fruit.half1.vx;
            fruit.half1.y += fruit.half1.vy;
            fruit.half1.vy += 0.35; // slightly faster drop for halves
            fruit.half1.rotation += fruit.half1.rotSpeed;

            ctx.save();
            ctx.translate(fruit.half1.x, fruit.half1.y);
            ctx.rotate(fruit.half1.rotation);
            ctx.font = `${fruit.radius * 2}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.beginPath();
            ctx.rect(-fruit.radius * 2, -fruit.radius * 2, fruit.radius * 2, fruit.radius * 4);
            ctx.clip();
            ctx.fillText(fruit.char, 0, 0);
            ctx.restore();
          }

          // Half 2 physics
          if (fruit.half2) {
            fruit.half2.x += fruit.half2.vx;
            fruit.half2.y += fruit.half2.vy;
            fruit.half2.vy += 0.35;
            fruit.half2.rotation += fruit.half2.rotSpeed;

            ctx.save();
            ctx.translate(fruit.half2.x, fruit.half2.y);
            ctx.rotate(fruit.half2.rotation);
            ctx.font = `${fruit.radius * 2}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.beginPath();
            ctx.rect(0, -fruit.radius * 2, fruit.radius * 2, fruit.radius * 4);
            ctx.clip();
            ctx.fillText(fruit.char, 0, 0);
            ctx.restore();
          }
        }
      });

      // Clear fallen or unreachable out-of-bounds fruits
      fruitsRef.current = fruitsRef.current.filter(f => f.y < H + 120);

      // Draw splatter particles
      particlesRef.current.forEach((p, idx) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        
        ctx.beginPath();
        if (p.id % 2 === 0) {
          // Radiant starburst cross sparks for immersive feedback
          ctx.rect(p.x - p.radius * 1.5, p.y - p.radius * 0.35, p.radius * 3, p.radius * 0.7);
          ctx.rect(p.x - p.radius * 0.35, p.y - p.radius * 1.5, p.radius * 0.7, p.radius * 3);
        } else {
          ctx.arc(p.x, p.y, p.radius * 1.2, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();

        // Particle dynamics
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= p.decay;
      });
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);

      // Render Floating score texts
      floatTextsRef.current.forEach(txt => {
        ctx.save();
        ctx.globalAlpha = txt.alpha;
        ctx.fillStyle = txt.color;
        ctx.font = `black italic ${Math.floor(18 * txt.scale)}px sans-serif`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = txt.color;
        ctx.fillText(txt.text, txt.x, txt.y);
        ctx.restore();

        txt.y -= 1.2;
        txt.alpha -= 0.025;
      });
      floatTextsRef.current = floatTextsRef.current.filter(t => t.alpha > 0);

      // DRAW SLICING SWORD TRAIL
      if (trailRef.current.length >= 2) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Loop trail points and draw colorful neon lines
        for (let i = 1; i < trailRef.current.length; i++) {
          const pt1 = trailRef.current[i - 1];
          const pt2 = trailRef.current[i];
          
          // Width decays towards start
          const width = (i / trailRef.current.length) * 11;
          const progress = i / trailRef.current.length;
          
          // Golden gradient style blade trial
          ctx.strokeStyle = `rgba(251, 140, 0, ${progress})`;
          ctx.lineWidth = width;
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#F57C00';

          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();

          // Core ultra-hot white slice line
          ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.9})`;
          ctx.lineWidth = width * 0.45;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore(); // end shake matrix

      // Decay intensities
      if (shakeIntensity > 0) setShakeIntensity(prev => Math.max(0, prev - 0.75));
      if (flashIntensity > 0) setFlashIntensity(prev => Math.max(0, prev - 0.04));

      // Draw Bomb Flash Screen overlay
      if (flashIntensity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.95})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Keep calling frame
      gameLoopId.current = requestAnimationFrame(render);
    };

    // Begin loop
    render();

    return () => {
      if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
    };
  }, [shakeIntensity, flashIntensity]);

  // Track dragging trails
  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    isDragging.current = true;
    lastPointer.current = { x, y };
    trailRef.current = [{ x, y, time: Date.now() }];
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging.current || !lastPointer.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    trailRef.current.push({ x, y, time: Date.now() });

    // Prune stale trail points
    const now = Date.now();
    trailRef.current = trailRef.current.filter(pt => now - pt.time < 180);

    // Scan for fruit slices intersecting segment
    if (stageLiveRef.current === 'active' && playingLiveRef.current) {
      fruitsRef.current.forEach(fruit => {
        if (!fruit.sliced) {
          const splitTriggered = checkSliceSegment(
            lastPointer.current!.x, lastPointer.current!.y,
            x, y,
            fruit
          );
          if (splitTriggered) {
            executeSlice(fruit, x, y);
          }
        }
      });
    }

    lastPointer.current = { x, y };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    lastPointer.current = null;
    trailRef.current = [];
  };

  // Adjust chip stake values
  const addChipToBet = (val: number) => {
    if (playing) return;
    if (val === minBet) {
      setBet(minBet);
    } else {
      setBet(prev => Math.min(balance, prev + val));
    }
    if (soundEnabled) playSound('chip');
  };

  const clearBet = () => {
    setBet(minBet);
    if (soundEnabled) playSound('click');
  };

  const doubleBet = () => {
    setBet(prev => Math.min(balance, prev * 2));
    if (soundEnabled) playSound('click');
  };

  // Terminate intervals on unmount
  useEffect(() => {
    return () => {
      if (spawnerIntervalId.current) clearInterval(spawnerIntervalId.current);
      if (comboTimer.current) clearTimeout(comboTimer.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0a0504] text-[#ecefed] font-sans overflow-hidden select-none relative">
      
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 opacity-15 bg-[url('https://images.unsplash.com/photo-1542324391-2ca29c0f2aef?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/45 to-[#0b0403]" />

      {/* Elegant Header with integrated Sound/GoBack controls */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a121e] border-b border-[#1a2b45] relative z-25 shrink-0">
        
        {/* Left Aspect: exit option */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#17253b] hover:bg-[#1f324f] text-[#9EA0A3] hover:text-white rounded-lg border border-[#21385a] active:scale-95 transition-all text-[11px] font-black uppercase tracking-wider shadow"
          >
            <ArrowLeft size={11} className="stroke-[3]" />
            <span>Go Back</span>
          </button>
          
          <div className="hidden xxs:block h-4 w-[1px] bg-[#21385a]" />

          <div className="hidden xxs:flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-orange-600/15 border border-orange-500/20 flex items-center justify-center">
              <span className="text-xs animate-spin" style={{ animationDuration: '6s' }}>🍎</span>
            </div>
            <span className="text-orange-550 font-black italic tracking-tighter text-xs uppercase text-orange-500">Dojo Slasher</span>
          </div>
        </div>

        {/* Center: Aviator style central Balance pill */}
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#1a2b45] shadow-lg">
          <div className="w-3 px-0.5 aspect-square rounded-full bg-[#FBCB35] flex items-center justify-center shadow-[0_0_10px_rgba(251,203,53,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#14171A]" />
          </div>
          <span className="text-[#32D74B] font-black text-xs leading-none">RS {balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
        </div>

        {/* Right Header controls: Audio level + instructions */}
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
            className="p-1.5 rounded-lg bg-[#0e1724] border border-[#21385a] text-zinc-450 hover:text-white transition-all active:scale-95 shadow"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 size={13} className="text-orange-500 animate-pulse" /> : <VolumeX size={13} />}
          </button>

          <button 
            onClick={() => {
              if (soundEnabled) playSound('click');
              setShowHelp(!showHelp);
            }} 
            className="p-1.5 rounded-lg bg-[#0e1724] border border-[#21385a] text-zinc-400 hover:text-white transition-all active:scale-95 shadow"
            title="Dojo Rules"
          >
            <HelpCircle size={13} />
          </button>
        </div>
      </header>

      {/* Rules Modal Drawer Overlay */}
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
              className="bg-[#110a08] border border-orange-500/25 max-w-sm w-full rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 select-none font-serif text-8xl pointer-events-none">🍁</div>
              
              <h3 className="text-xl font-black italic tracking-tight text-orange-500 flex items-center gap-1.5 uppercase border-b border-orange-500/10 pb-3">
                <Swords size={18} /> Dojo Training Manual
              </h3>
              
              <ul className="space-y-3 pt-4 text-xs font-medium text-zinc-300">
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-orange-500 font-extrabold">•</span>
                  <span>Select a wager stake chip and press <span className="text-orange-400 font-black italic">Enter Dojo</span> to deploy.</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-orange-500 font-extrabold">•</span>
                  <span>Drag or swipe your screen to swing your active <span className="text-white font-bold">blade trail</span> through floating fruits.</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <span className="text-amber-500 font-extrabold">•</span>
                  <span>Slice <span className="text-green-400 font-bold font-mono">12 fruits</span> successfully to win premium <span className="text-orange-400 font-black">{multiplier}x payouts</span>.</span>
                </li>
                <li className="flex gap-2 leading-relaxed text-red-400/90">
                  <span className="text-red-500 font-extrabold">•</span>
                  <span>Slicing a <span className="text-red-500 font-black">💣 BOMB</span> triggers an instantaneous blast ending trial in Defeat.</span>
                </li>
                <li className="flex gap-2 leading-relaxed text-[#F97316]">
                  <span className="text-[#F97316] font-extrabold">•</span>
                  <span>Combos! Slicing multiple fruits in rapid succession activates <span className="text-[#F97316] font-black">Double/Triple</span> style floating bonuses!</span>
                </li>
              </ul>

              <button 
                onClick={() => {
                  if (soundEnabled) playSound('click');
                  setShowHelp(false);
                }}
                className="w-full mt-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-orange-950/20 active:scale-95 transition-all text-center"
              >
                Let's Slash
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Screen Canvas Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 p-3 justify-between space-y-3">
        
        {/* UPPER STATUS SCOREBOARD */}
        <div className="shrink-0 w-full flex items-center justify-between bg-black/35 backdrop-blur-md border border-zinc-900 rounded-xl p-2.5 px-4">
          <div className="flex items-center gap-1.5">
            <Target size={13} className="text-orange-500 animate-pulse" />
            <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Required Slices:</span>
            <span className="text-xs font-black tracking-tight text-white font-mono">{slicedCount}/{requiredScore}</span>
          </div>

          {/* Slices dynamic track bar */}
          <div className="flex-1 max-w-xs mx-4 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-950">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(slicedCount / requiredScore) * 100}%` }}
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
            />
          </div>

          {/* Quick multiplier status badge */}
          <span className="bg-orange-500/10 border border-orange-500/20 rounded-md text-[8px] font-extrabold text-[#F97316] px-1.5 py-0.5 tracking-wider uppercase">
            Payout: 2.0x
          </span>
        </div>

        {/* INTERACTIVE DOJO PHYSICS CANVAS */}
        <div 
          ref={containerRef}
          className="relative flex-1 min-h-[190px] bg-gradient-to-b from-[#180e0a] to-[#0c0402] border border-orange-500/15 rounded-2xl shadow-[0_6px_30px_rgba(0,0,0,0.9)] overflow-hidden cursor-crosshair group"
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handlePointerDown(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            // Prevent scrolling on touch screens for seamless swipes
            if (e.cancelable) e.preventDefault();
            const touch = e.touches[0];
            handlePointerMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={handlePointerUp}
          onTouchCancel={handlePointerUp}
        >
          {/* Main Visual high-fps rendering Canvas */}
          <canvas 
            ref={(el) => {
              if (el) {
                canvasRef.current = el;
                // Auto adapt size of canvas inside parent layout to look extremely crisp
                const r = el.parentElement?.getBoundingClientRect();
                if (r && el.width !== r.width) {
                  el.width = r.width;
                  el.height = r.height;
                }
              }
            }} 
            className="absolute inset-0 w-full h-full block" 
          />

          {/* Combo announcements overlays inside dojo */}
          <AnimatePresence>
            {latestCombo && (
              <motion.div 
                initial={{ scale: 0.6, opacity: 0, y: 15 }}
                animate={{ scale: [1, 1.15, 1], opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-400/10 border border-yellow-400/25 backdrop-blur-sm shadow px-3.5 py-1 rounded-full text-center z-12 select-none"
              >
                <span className="text-yellow-400 font-extrabold tracking-widest uppercase italic text-[10px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                  {latestCombo}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Swipe guidance text when game begins */}
          {stage === 'active' && slicedCount === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none z-12 animate-pulse">
              <Swords size={32} className="text-orange-500/20 mx-auto mb-2" />
              <p className="text-[10px] tracking-[0.4em] text-white/30 uppercase font-bold text-center">SWIPE TO SLICE</p>
            </div>
          )}

          {/* Begin Match starter button (If not active) */}
          {stage === 'ready' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center space-y-4 p-4 z-15"
            >
              <div className="relative">
                <div className="w-22 h-22 bg-orange-600/10 rounded-full flex items-center justify-center border border-orange-500/20 animate-pulse relative">
                  <span className="text-4xl animate-bounce">🍉</span>
                  <div className="absolute inset-0 rounded-full border border-dashed border-orange-500/30 scale-125 animate-spin" style={{ animationDuration: '24s' }} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Dojo Arena Open</h4>
                <p className="text-amber-500/60 text-[9px] font-black uppercase tracking-[0.25em] mt-1.5">Slice {requiredScore} Fruits • Avoid Bombs</p>
              </div>
            </motion.div>
          )}

          {/* Match over result badge */}
          <AnimatePresence>
            {stage === 'result' && gameResult && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col justify-center items-center backdrop-blur-md bg-black/85 p-4 text-center space-y-3"
              >
                <div className="space-y-1">
                  {gameResult === 'win' ? (
                    <div className="flex flex-col items-center justify-center gap-1 text-yellow-500">
                      <Sparkles className="animate-spin text-yellow-400 mb-1" size={24} />
                      <h4 className="text-2xl sm:text-3xl font-serif font-black italic tracking-wider animate-bounce text-yellow-400">UNMATCHED BLADE</h4>
                      <p className="text-sm font-bold text-[#EAB308] mt-1">WINNER payout collected!</p>
                      <p className="text-xs text-zinc-400 font-medium">Earned +RS {(bet * multiplier).toLocaleString('en-US')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <span className="text-4xl animate-pulse mb-1">💥</span>
                      <h4 className="text-2xl sm:text-3xl font-sans font-extrabold uppercase tracking-tighter text-red-500">BOMB EXPLODED</h4>
                      <p className="text-xs text-[#9EA0A3] max-w-xs mt-1.5 leading-relaxed font-semibold">Your focus drifted and the fuse ignited. Retrain your spirit in the dojo.</p>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => {
                      if (soundEnabled) playSound('click');
                      setStage('ready');
                    }}
                    className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-[10px] font-black uppercase rounded-full tracking-wider shadow-md transition-transform hover:scale-105 active:scale-95"
                  >
                    Confirm / Re-bet
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* WAGER INPUT & BET SELECTION MODULE */}
        <div className="shrink-0 w-full bg-zinc-950/80 border border-zinc-900 rounded-2xl p-3 flex flex-col space-y-2.5">
          
          <div className="flex justify-between items-center text-[9px] uppercase font-bold text-zinc-400 leading-tight">
            <span>Place Dojo Stake</span>
            <span className="text-yellow-400 font-extrabold tracking-tight font-mono text-xs">Total Stake: RS {bet}</span>
          </div>

          {/* Horizontal Chips Selection Bar */}
          <div className="flex items-center justify-between gap-1.5 bg-black/40 p-1 rounded-xl border border-zinc-900/60 overflow-x-auto no-scrollbar">
            {CHIPS.map((chipVal) => {
              const colors: Record<number, string> = {
                10: 'from-zinc-500 to-zinc-700 text-zinc-100 border-zinc-400/40',
                50: 'from-blue-600 to-blue-800 text-blue-100 border-blue-400/40',
                100: 'from-red-600 to-red-800 text-red-100 border-red-400/40',
                500: 'from-teal-600 to-teal-800 text-teal-100 border-teal-400/40',
                1000: 'from-purple-600 to-purple-800 text-purple-100 border-purple-400/40',
                5000: 'from-amber-600 to-amber-700 text-amber-100 border-yellow-400/40'
              };
              return (
                <button
                  key={chipVal}
                  disabled={playing}
                  onClick={() => addChipToBet(chipVal)}
                  className={`flex-1 min-w-[50px] aspect-[9/6] p-0.5 rounded-lg bg-gradient-to-br border flex flex-col items-center justify-center font-mono font-black shadow transition-all text-[10px] disabled:opacity-45 select-none hover:scale-102 active:scale-95 active:duration-75 ${
                    colors[chipVal] || 'from-zinc-800 to-zinc-950 border-zinc-700'
                  }`}
                >
                  <span className="text-[6.5px] uppercase opacity-60 leading-none scale-90">CHIP</span>
                  <span className="text-xs leading-none font-extrabold mt-0.5">{chipVal}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Double, Clear + Main Launch Game Call Grid */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-5 grid grid-cols-2 gap-1.5">
              <button 
                disabled={playing}
                onClick={doubleBet}
                className="py-2.5 bg-zinc-900 border border-zinc-800 text-[9px] font-bold rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 shadow"
              >
                2X DOUBLE
              </button>
              <button 
                disabled={playing}
                onClick={clearBet}
                className="py-2.5 bg-zinc-900 border border-zinc-800 text-[9px] font-bold rounded-xl text-zinc-350 hover:text-white hover:bg-[#150a08] hover:border-orange-950/40 transition-all active:scale-95 shadow flex items-center justify-center gap-1"
              >
                <RotateCcw size={9} />
                <span>RESET</span>
              </button>
            </div>

            <button 
              onClick={startGame}
              disabled={playing || balance < bet}
              className={`col-span-7 h-10.5 rounded-xl font-serif font-black italic uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 select-none active:scale-[0.98] border-b-2 ${
                playing 
                  ? 'bg-zinc-800 text-zinc-500 border-zinc-700/20 cursor-not-allowed' 
                  : balance < bet 
                  ? 'bg-red-950/20 text-red-500 border-red-500/20 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 via-amber-500 to-red-600 hover:from-orange-500 hover:to-red-500 text-white hover:shadow-orange-500/10 cursor-pointer border-orange-850'
              }`}
            >
              <Flame size={13} className="animate-pulse" />
              <span className="text-xs font-serif font-black tracking-wide">
                {playing ? 'SLASH FRUIT!' : `ENTER DOJO: RS ${bet}`}
              </span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
