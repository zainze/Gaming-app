import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Zap, AlertTriangle, Cpu, Circle, CheckCircle, ShieldAlert, Coins } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface CyberFlipProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

export const CyberFlip: React.FC<CyberFlipProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 48, minBet = 10, multiplier = 1.95 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [selectedRelay, setSelectedRelay] = useState<'alpha' | 'beta'>('alpha');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null);
  const [winningRelay, setWinningRelay] = useState<'alpha' | 'beta' | null>(null);

  const startBypass = () => {
    if (balance < bet || playing) return;
    
    setPlaying(true);
    setOutcome(null);
    setWinningRelay(null);
    setLoadingProgress(0);
    setStatusText('INITIALIZING CONDENSERS...');
    onBet(bet);
    playSound('chip');

    // Simulate charging progress with status code changes
    const duration = 2000; // 2 seconds
    const intervalTime = 100;
    const step = 100 / (duration / intervalTime);
    
    const isWin = Math.random() * 100 < winRate;
    const finalWinningRelay = isWin ? selectedRelay : (selectedRelay === 'alpha' ? 'beta' : 'alpha');

    const statuses = [
      'CHARGING VOLT CONDENSERS...',
      'OVERWRITING SECURITY REGISTERS...',
      'INJECTING ION FLUX...',
      'BYPASSING COUPLING GATEWAY...',
      'FINALIZING DECRYPTION...'
    ];

    let currentProgress = 0;
    const timer = setInterval(() => {
      currentProgress += step;
      if (currentProgress >= 100) {
        setLoadingProgress(100);
        clearInterval(timer);
        
        // Finalize outcome
        setWinningRelay(finalWinningRelay);
        setPlaying(false);
        
        if (isWin) {
          setOutcome('win');
          onWin(bet * multiplier);
          playSound('win');
        } else {
          setOutcome('lose');
          playSound('lose');
        }
      } else {
        setLoadingProgress(Math.min(95, currentProgress));
        const statusIdx = Math.floor((currentProgress / 100) * statuses.length);
        setStatusText(statuses[statusIdx] || statuses[0]);
        // Spark click sound
        if (Math.random() > 0.6) {
          playSound('click');
        }
      }
    }, intervalTime);
  };

  return (
    <div className="flex flex-col h-full bg-[#05060a] text-white font-sans overflow-hidden relative select-none">
      {/* Circuit Grid Abstract Background */}
      <div className="absolute inset-0 z-0 opacity-15">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `
            linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px)
          `, 
          backgroundSize: '40px 40px' 
        }} />
        {/* Decorative central circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-orange-500/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-orange-500/5 rounded-full" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#05060a] via-transparent to-[#05060a]/80 z-1 pointer-events-none" />

      {/* Floating Header */}
      <header className="flex items-center justify-between px-6 h-20 bg-black/60 border-b border-orange-500/20 backdrop-blur-md shrink-0 z-50">
        <button 
          onClick={onExit} 
          disabled={playing}
          className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 transition-all active:scale-90 disabled:opacity-30"
        >
          <LogOut size={22} />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-orange-500 animate-pulse" />
            <span className="text-white font-black italic tracking-tighter text-2xl uppercase">VOLT SURGE</span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.5em] text-orange-500/60">REACTOR BYPASS CORE</span>
        </div>
        <div className="bg-orange-500/10 px-4 py-2 rounded-2xl border border-orange-500/30 backdrop-blur-xl">
          <span className="text-orange-400 font-black text-sm tracking-tight flex items-center gap-1.5">
            <Coins size={14} /> RS {balance.toFixed(0)}
          </span>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <div className="flex-1 flex flex-col items-center justify-between py-8 px-6 relative z-10 max-w-md mx-auto w-full">
        
        {/* State Display Panel */}
        <div className="w-full text-center mt-4 space-y-2">
          <div className="inline-flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
            <Cpu size={12} className="text-blue-400 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-[#8b9bb4]">SURGE NODE DETECTOR</span>
          </div>
        </div>

        {/* Core Reactor View */}
        <div className="relative w-72 h-72 flex items-center justify-center">
          
          {/* Reactor Rings */}
          <div className="absolute inset-0 border-4 border-dashed border-white/5 rounded-full animate-[spin_40s_linear_infinite]" />
          <div className="absolute inset-4 border border-dashed border-orange-500/10 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
          
          {/* Interactive Core Shield */}
          <div className="absolute inset-10 bg-gradient-to-b from-neutral-950 to-neutral-900 rounded-full border-2 border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center p-4">
            
            <AnimatePresence mode="wait">
              {playing ? (
                <motion.div
                  key="playing"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center space-y-4 text-center"
                >
                  <p className="text-[10.5px] font-black tracking-widest text-orange-400 animate-pulse uppercase max-w-[150px]">
                    {statusText}
                  </p>
                  
                  {/* Charging Percentage and progress bar */}
                  <div className="space-y-1.5 w-32">
                    <span className="text-2xl font-black italic text-white font-mono block">
                      {Math.round(loadingProgress)}%
                    </span>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                      <motion.div 
                        className="h-full bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : outcome === 'win' ? (
                <motion.div
                  key="win"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center space-y-2"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                    <CheckCircle className="text-green-400" size={32} />
                  </div>
                  <h3 className="text-lg font-black italic tracking-tighter text-green-400 uppercase">
                    SURGE SUCCESSFUL
                  </h3>
                  <div className="bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                    <span className="text-xs font-black text-green-400 font-mono tracking-tight">
                      +RS {(bet * multiplier).toFixed(1)}
                    </span>
                  </div>
                </motion.div>
              ) : outcome === 'lose' ? (
                <motion.div
                  key="lose"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center space-y-2"
                >
                  <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-bounce">
                    <ShieldAlert className="text-red-400" size={32} />
                  </div>
                  <h3 className="text-lg font-black italic tracking-tighter text-red-500 uppercase">
                    CORE lockout
                  </h3>
                  <span className="text-[9px] font-black uppercase text-red-400/60 tracking-widest block">
                    FUSE EXPELLED
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center space-y-1"
                >
                  <Zap className="text-orange-500/40 animate-pulse" size={44} />
                  <p className="text-[9px] font-black tracking-widest text-[#a1afc4] uppercase">
                    RELAY READY
                  </p>
                  <p className="text-[8px] font-bold text-neutral-500 tracking-wider">
                    SELECT SURGE TERMINAL
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Decorative Laser Guides inside the layout */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-white/5 via-transparent to-white/5" />
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-white/5 via-transparent to-white/5" />
        </div>

        {/* Input & Relay Choice Panel */}
        <div className="w-full space-y-5">
          
          {/* Relay Selectors */}
          <div className="grid grid-cols-2 gap-3 w-full">
            
            <button
              onClick={() => { setSelectedRelay('alpha'); playSound('click'); }}
              disabled={playing}
              className={`relative overflow-hidden p-4 rounded-2xl border transition-all active:scale-95 text-left flex flex-col justify-between h-24 ${
                selectedRelay === 'alpha'
                  ? 'bg-gradient-to-br from-cyan-950/40 to-cyan-900/10 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-black tracking-widest text-white/50">RELAY A</span>
                <span className={`w-2 h-2 rounded-full ${selectedRelay === 'alpha' ? 'bg-cyan-400 animate-ping' : 'bg-neutral-600'}`} />
              </div>
              <div>
                <span className="text-lg font-black italic text-cyan-400 uppercase">ALPHA</span>
                <p className="text-[8.5px] font-bold text-neutral-400 uppercase tracking-wide">SURGE PATH α</p>
              </div>
            </button>

            <button
              onClick={() => { setSelectedRelay('beta'); playSound('click'); }}
              disabled={playing}
              className={`relative overflow-hidden p-4 rounded-2xl border transition-all active:scale-95 text-left flex flex-col justify-between h-24 ${
                selectedRelay === 'beta'
                  ? 'bg-gradient-to-br from-amber-950/40 to-amber-900/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-black tracking-widest text-white/50">RELAY B</span>
                <span className={`w-2 h-2 rounded-full ${selectedRelay === 'beta' ? 'bg-amber-400 animate-ping' : 'bg-neutral-600'}`} />
              </div>
              <div>
                <span className="text-lg font-black italic text-amber-400 uppercase">BETA</span>
                <p className="text-[8.5px] font-bold text-neutral-400 uppercase tracking-wide">SURGE PATH β</p>
              </div>
            </button>
          </div>

          {/* Stake selector */}
          <div className="bg-[#0c0d15] p-4 rounded-[2.2rem] border border-white/5 shadow-inner">
            <div className="flex items-center justify-between">
              
              <button 
                onClick={() => { setBet(Math.max(minBet, bet - 10)); playSound('click'); }} 
                disabled={playing} 
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center font-black transition-colors disabled:opacity-30"
              >
                -
              </button>
              
              <div className="text-center">
                <span className="text-[9px] font-black uppercase text-[#8b9bb4] tracking-widest block">BYPASS STAKE</span>
                <span className="text-xl font-black italic text-orange-500 font-mono">RS {bet}</span>
              </div>
              
              <button 
                onClick={() => { setBet(bet + 10); playSound('click'); }} 
                disabled={playing} 
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center font-black transition-colors disabled:opacity-30"
              >
                +
              </button>
            </div>

            {/* Micro Quick Multipliers */}
            <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-white/5 justify-center">
              {[
                { label: 'MIN', val: minBet },
                { label: '2X', val: bet * 2 },
                { label: '1/2', val: Math.max(minBet, Math.floor(bet / 2)) },
                { label: 'MAX', val: 1000 }
              ].map(opt => (
                <button
                  key={opt.label}
                  disabled={playing}
                  onClick={() => { setBet(opt.val); playSound('click'); }}
                  className="bg-white/5 hover:bg-white/10 active:scale-95 px-3 py-1 text-[8.5px] font-black tracking-wider text-neutral-400 rounded-lg transition-all"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Big action button */}
          <button
            onClick={startBypass}
            disabled={playing || balance < bet}
            className={`w-full py-4.5 rounded-[1.8rem] font-black italic uppercase tracking-widest text-sm transition-all active:scale-[0.98] shadow-2xl ${
              playing 
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5' 
                : balance < bet 
                  ? 'bg-red-950/40 text-red-500 border border-red-500/20'
                  : 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white shadow-orange-500/20 hover:brightness-110'
            }`}
          >
            {playing ? 'BYPASS SURGE RUNNING...' : balance < bet ? 'INSUFFICIENT BALANCE' : `INITIATE SURGE [RS ${bet}]`}
          </button>
          
          <p className="text-[9.5px] font-black uppercase text-center tracking-[0.35em] text-white/20">
            Payout Multiplier: <span className="text-orange-500/75font-bold">{multiplier}X</span> | Security Chance: {winRate}%
          </p>
        </div>
      </div>
    </div>
  );
};
