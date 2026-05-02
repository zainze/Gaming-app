import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Trophy, AlertCircle, Zap, Shield, Sparkles } from "lucide-react";

interface ThreeCardSlipperProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  onLoss: () => void;
  onPenalty: (amount: number) => void;
  onStreakBonus: (amount: number) => void;
  balance: number;
  streak: number;
  losses: number;
  minBet?: number;
  winMultiplier?: number;
  penaltyAmount?: number;
}

export default function ThreeCardSlipper({ 
  onWin, 
  onBet, 
  onLoss,
  onPenalty,
  onStreakBonus,
  balance, 
  streak = 0,
  losses = 0,
  minBet = 10, 
  winMultiplier = 3,
  penaltyAmount = 100
}: ThreeCardSlipperProps) {
  const [gameState, setGameState] = useState<'idle' | 'shuffling' | 'picking' | 'result'>('idle');
  const [bet, setBet] = useState(minBet);
  const [cards, setCards] = useState([0, 1, 2]); // indices
  const [winningIndex, setWinningIndex] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [shufflePositions, setShufflePositions] = useState([0, 1, 2]);
  
  const audioContext = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first interaction
  const initAudio = () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
    if (!audioContext.current) return;
    const osc = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.current.currentTime);
    
    gain.gain.setValueAtTime(volume, audioContext.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioContext.current.destination);
    
    osc.start();
    osc.stop(audioContext.current.currentTime + duration);
  };

  const playShuffleSound = () => {
    playSound(200 + Math.random() * 100, 'sine', 0.1, 0.05);
  };

  const playWinSound = () => {
    playSound(523.25, 'triangle', 0.5, 0.1); // C5
    setTimeout(() => playSound(659.25, 'triangle', 0.5, 0.1), 100); // E5
    setTimeout(() => playSound(783.99, 'triangle', 0.5, 0.1), 200); // G5
  };

  const playLossSound = () => {
    playSound(110, 'sawtooth', 0.5, 0.2); // A2
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const shuffle = async () => {
    if (gameState !== 'idle' || balance < bet) return;
    initAudio();

    const success = await onBet(bet);
    if (!success) return;

    setGameState('shuffling');
    setSelectedIndex(null);
    const winIdx = Math.floor(Math.random() * 3);
    setWinningIndex(winIdx);

    // Shuffle sequence
    let count = 0;
    const interval = setInterval(() => {
      setShufflePositions([...Array(3).keys()].sort(() => Math.random() - 0.5));
      playShuffleSound();
      count++;
      if (count > 10) {
        clearInterval(interval);
        setShufflePositions([0, 1, 2]);
        setGameState('picking');
      }
    }, 200);
  };

  const pick = (index: number) => {
    if (gameState !== 'picking') return;
    setSelectedIndex(index);
    setGameState('result');

    if (index === winningIndex) {
      playWinSound();
      onWin(bet * winMultiplier);
      if (streak + 1 >= 30) {
        onStreakBonus(5000);
      }
    } else {
      playLossSound();
      onLoss();
      if (losses + 1 >= 2) {
        triggerShake();
        onPenalty(penaltyAmount);
      }
    }
  };

  return (
    <div className={`relative w-full max-w-lg mx-auto p-4 bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-xl transition-transform duration-500 ${shake ? 'animate-shake' : ''}`}>
      {/* Background Subtle Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-orange-500/5 blur-[80px] rounded-full" />
      </div>

      <header className="relative z-10 flex flex-col items-center mb-6">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-neutral-900">
          3-Card <span className="text-orange-500">Slipper</span>
        </h2>
        
        {/* Streak Meter Compact */}
        <div className="mt-4 flex items-center gap-2 bg-neutral-50 p-1 rounded-full border border-neutral-100 w-full max-w-[200px]">
          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(streak / 30) * 100}%` }}
              className="absolute h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]"
            />
          </div>
          <Zap size={10} className={streak >= 15 ? 'text-orange-500' : 'text-neutral-300'} />
        </div>
      </header>

      {/* Game Field - Reduced height for better fit */}
      <div className="relative h-48 md:h-64 mb-8 flex justify-center items-center">
        {cards.map((idx) => (
          <motion.div
            key={idx}
            layout
            initial={false}
            animate={{
              x: `${(shufflePositions[idx] - 1) * 105}%`,
              rotateY: gameState === 'result' ? 180 : 0
            }}
            transition={{ type: "spring", damping: 15, stiffness: 100 }}
            onClick={() => pick(idx)}
            className={`absolute w-28 h-40 md:w-36 md:h-52 cursor-pointer preserve-3d group ${gameState === 'picking' ? 'hover:scale-105' : ''}`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front */}
            <div className="absolute inset-0 rounded-xl bg-white border border-neutral-200 shadow-sm backface-hidden flex flex-col items-center justify-center p-2">
               <Zap size={32} className="text-orange-500/10" />
               <div className="absolute top-2 left-2 right-2 flex justify-between">
                 <div className="w-1.5 h-1.5 rounded-full bg-neutral-100" />
                 <div className="w-1.5 h-1.5 rounded-full bg-neutral-100" />
               </div>
               <div className="mt-4 w-8 h-0.5 bg-neutral-50 rounded-full" />
            </div>

            {/* Result Face */}
            <div 
              className={`absolute inset-0 rounded-xl border-2 backface-hidden flex flex-col items-center justify-center shadow-lg ${idx === winningIndex ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}
              style={{ transform: 'rotateY(180deg)' }}
            >
              {idx === winningIndex ? (
                 <Trophy className="text-green-500" size={32} />
              ) : (
                <AlertCircle className="text-red-500" size={32} />
              )}
              <div className={`text-[10px] font-black uppercase mt-1 ${idx === winningIndex ? 'text-green-600' : 'text-red-600'}`}>
                {idx === winningIndex ? 'WIN' : 'LOSE'}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer Controls Compact */}
      <div className="relative z-10 flex flex-col items-center space-y-4">
        <div className="flex gap-4 text-[10px] uppercase font-black tracking-widest text-neutral-400">
          <span>Streak {streak}/30</span>
          <span>Losses {losses}/2</span>
        </div>

        <div className="w-full flex gap-2">
          {[minBet, minBet * 5, minBet * 10].map(v => (
            <button
              key={v}
              onClick={() => setBet(Number(v))}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase border transition-all ${bet === v ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' : 'bg-neutral-50 border-neutral-200 text-neutral-400 hover:bg-neutral-100'}`}
            >
              RS {v}
            </button>
          ))}
        </div>

        <button
          onClick={shuffle}
          disabled={gameState !== 'idle'}
          className="w-full h-14 bg-neutral-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-neutral-800 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {gameState === 'idle' ? 'SHUFFLE & START' : gameState === 'shuffling' ? 'SHUFFLING...' : 'PICK A CARD'}
        </button>
      </div>

      <AnimatePresence>
        {gameState === 'result' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setGameState('idle')}
            className={`mt-4 text-center py-2 rounded-xl border font-black uppercase text-[10px] cursor-pointer transition-all hover:scale-[1.02] ${selectedIndex === winningIndex ? 'bg-green-500 border-green-600 text-white shadow-lg' : 'bg-red-500 border-red-600 text-white shadow-lg'}`}
          >
            {selectedIndex === winningIndex ? "SUCCESS" : "FAILED"} - TAP TO RESET
          </motion.div>
        )}
      </AnimatePresence>


      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.1s ease-in-out 0s 5; }
      `}</style>
    </div>
  );
}
