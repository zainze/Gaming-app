import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Volume2, 
  VolumeX, 
  Sparkle, 
  Trophy, 
  ShieldAlert, 
  Coins, 
  HelpCircle, 
  Flame, 
  ArrowRight, 
  Play, 
  Gamepad2, 
  Compass, 
  Info,
  DollarSign
} from "lucide-react";

interface GameExplainerProps {
  gameId: string;
  gameTitle: string;
  onClose: () => void;
  onPlay: () => void;
  minBet?: number;
  winRate?: number;
  multiplier?: number;
}

interface SpeechSection {
  text: string;
  tag: "ID" | "PLAY" | "WIN" | "MONEY" | "RULE";
  title: string;
}

export const GameExplainer: React.FC<GameExplainerProps> = ({
  gameId,
  gameTitle,
  onClose,
  onPlay,
  minBet = 10,
  winRate = 45,
  multiplier = 2.0
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem("explainer_muted");
    return saved === "true";
  });
  
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [speakingProgress, setSpeakingProgress] = useState(0); // For mimicking typing/speech bar
  const [typedText, setTypedText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(true);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Generate customized detailed scripts explaining Overview, How to Play, How to Win, and Smart Money Tip for each game
  const getSpeechScript = (id: string, name: string): SpeechSection[] => {
    const cleanId = id.toLowerCase();
    
    // Default base structure
    const defaultSections: SpeechSection[] = [
      {
        tag: "ID",
        title: "Introduction",
        text: `Welcome to ${name}! This is an extremely exciting classic arcade gaming node custom-engineered for premium thrills.`
      },
      {
        tag: "PLAY",
        title: "How to Play",
        text: `Simply adjust your staking amount with the controls, choose your tactics, and press start. The controls are responsive and fully optimized.`
      },
      {
        tag: "WIN",
        title: "Winning Goal",
        text: `Match the symbols or complete the challenges inside the canvas to score winning multiplier values. Our system tracks matches instant-time.`
      },
      {
        tag: "MONEY",
        title: "Smart Money Tip",
        text: `Protect your capital base! Start with the minimum stake of RS ${minBet} to master the pacing before raising your stakes for massive payoff streaks.`
      }
    ];

    if (cleanId === "slipper") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to Slipper Monte, our high stakes shell game! Watch carefully as three cards are dealt face down.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Keep your eyes locked on the target card as they shuffle. Tap the correct positions inside the screen to place your choice.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Uncover the winning target card for an instant multiplier profit increase. Chain continuous consecutive wins to activate streak bonuses!`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `Be careful of the random penalty modifiers! Start with a comfortable buffer stake so you do not drain your balance on a single bad flip.`
        }
      ];
    }

    if (cleanId === "spin") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to the neon Spin Wheel! This is a fast-paced color and multiplier fortune wheel.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Simply lock in your bet amount from the control board, hit the spin switch, and watch the fluorescent light wheel accelerate.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Land the sector pins on the yellow and red high-paying regions for multipliers reaching up to six times your input wager!`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `The center peg has a predictable payout index. Spread your credits out across several quick rounds to bypass short cool-down cycles.`
        }
      ];
    }

    if (cleanId === "coin") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to Coin Flip! Double your money instantly in this simple fifty-fifty absolute classic.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Toggle between heads and tails, program your desired wagering stake, and execute the flip.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Match the golden coin's landing orientation to secure double your credits on the spot!`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `Since it features a fifty-fifty probability matrix, double your stake slightly during continuous losing rolls to recover losses fast, then revert to base stakes.`
        }
      ];
    }

    if (cleanId === "swipe") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to Swipe Master! Test your rapid mental processing and extreme finger reaction speed.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Observe the direction arrows displayed on screen. Swipe or drag quickly in that exact direction before the timer clock runs dry.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Complete successive correct directional swipes. The faster your inputs, the higher the score multiplier scale rises.`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `Focus on clean gesture inputs rather than chaotic speed. Mistaps instantly void your score, so keeping a smooth rhythm saves you money.`
        }
      ];
    }

    if (cleanId === "chests") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to Lucky Chests! Behind these classic wooden lockboxes lie mysterious ancient cash prizes.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Wager your stake and select one of the glowing chests standing in the alignment row.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Open a rich chest to instantly unlock gold multipliers. Be careful not to trip empty chests relative to the estimated setup win rate.`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `Always lock in profits early. If you reveal a nice multiplier value, consider returning to the lobby to bank your earnings rather than pushing your luck.`
        }
      ];
    }

    if (cleanId === "dice") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to Dice Pro! This is a clean mathematical blockchain-inspired over-under prediction simulator.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Slide the dynamic slider bar to establish your betting threshold line, then choose to wager over or under that threshold.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Roll the quantum dice. If the result lands in your predicted zone, you win! Adjust the target to change your payout size.`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `Setting a high win rate percentage pays smaller multipliers but guarantees highly stable, consistent compound balance growth.`
        }
      ];
    }

    if (cleanId === "scratch") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to Gold Scratch! Scratch off lucky tickets to find matching golden amulets and clovers.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Set your stake, purchase a ticket, and swipe your finder across the silvery coating to reveal the hidden cards.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Reveal three matching items to claim the jackpot multiplier reward instantly.`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `Treat scratchers as high reward assets. Scratch them occasionally at moderate stakes to catch high payout peaks.`
        }
      ];
    }

    if (cleanId === "aviator") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to Aviator! This is the legendary multiplayer plane crash vertical curve simulator.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Wager your stake. Watch the lucky Red Propeller Plane take off and ascend, leaving a rapidly scaling multiplier curve trailing behind.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Tap the Cash Out button at the absolute perfect split-second before the plane flies off the screen. If the plane escapes, your wager is lost!`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `Do not get greedy waiting for massive numbers. Constant cash outs at one point two to one point five multiplier build a fortress balance.`
        }
      ];
    }

    if (cleanId === "rocket_crash" || cleanId === "moon_crash") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to the futuristic Space Crash Terminal! Put your spacecraft into high velocity cosmic orbit.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Set your wager stake. As the digital spacecraft accelerates beyond the stratosphere, the reward coefficient spikes exponentially.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Hit the abort cash out trigger prior to a spontaneous reactor explosion. You win the precise multiplier displayed when you abort.`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `Implement consistent low multiplier auto cash outs. Slow and steady space exploration saves you from burning up in orbit.`
        }
      ];
    }

    if (cleanId === "mines") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to Mines Finder! Step onto an intense five-by-five electronic puzzle grid loaded with hidden diamonds.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Select the amount of starting hidden landmines inside the level configuration to define your risk scale, then click tiles to reveal what lies beneath.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Every diamond uncovered increases your pending reward payout. Press Cash Out whenever you want before tripping an explosive landmine!`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `Just revealing two or three safe diamonds at two mines difficulty yield a safe and reliable profit of over twenty percent each round.`
        }
      ];
    }

    if (cleanId === "snake_league") {
      return [
        {
          tag: "ID",
          title: "Introduction",
          text: `Welcome to the competitive Python League arena! Control the neon digital cyber snake on the grid matrix.`
        },
        {
          tag: "PLAY",
          title: "How to Play",
          text: `Use Arrow keys or the mobile digital on screen D-pad controller to steer. Eat shiny apples to extend your body.`
        },
        {
          tag: "WIN",
          title: "Winning Goal",
          text: `Clear the exact required Point Target to secure the jackpot multiplier. If you crash early, do not panic! You still get a fair partial payback!`
        },
        {
          tag: "MONEY",
          title: "Smart Money Tip",
          text: `In standard difficulty, you wrap around horizontal walls safely. Use the warp lanes to escape tight corners and keep your tail from trapping you.`
        }
      ];
    }

    // Default matching for standard titles
    return [
      {
        tag: "ID",
        title: "Introduction",
        text: `Welcome to ${name}! This is an immersive interactive simulation custom engineered for premium entertainment.`
      },
      {
        tag: "PLAY",
        title: "How to Play",
        text: `Simply adjust your staking amount with the console tools, study the game rules layout, and execute your round.`
      },
      {
        tag: "WIN",
        title: "Winning Goal",
        text: `Complete the active challenges or land matching panels inside the grid to score immediate credit payouts!`
      },
      {
        tag: "MONEY",
        title: "Smart Money Tip",
        text: `Set sensible session limits. Starting with smaller bets of RS 10 allows you to unlock high win streaks without putting your total balance at risk.`
      }
    ];
  };

  const script = getSpeechScript(gameId, gameTitle);
  const currentTextToSpeak = script[activeSectionIdx]?.text || "";

  // Web Speech synthesis implementation
  useEffect(() => {
    if (typeof window === "undefined") return;
    synthRef.current = window.speechSynthesis;

    return () => {
      stopVoice();
    };
  }, []);

  // Trigger voice when section updates
  useEffect(() => {
    setTypedText("");
    let charIdx = 0;
    const intervalTime = 25; // Speed of typing letters
    
    const typingTimer = setInterval(() => {
      if (charIdx < currentTextToSpeak.length) {
        setTypedText(prev => prev + currentTextToSpeak.charAt(charIdx));
        charIdx++;
      } else {
        clearInterval(typingTimer);
      }
    }, intervalTime);

    if (!isMuted) {
      speakText(currentTextToSpeak);
    } else {
      setIsSpeaking(false);
    }

    return () => {
      clearInterval(typingTimer);
      stopVoice();
    };
  }, [activeSectionIdx, isMuted, currentTextToSpeak]);

  const speakText = (text: string) => {
    try {
      if (!synthRef.current) return;
      synthRef.current.cancel();

      // Clean HTML brackets if any
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      
      // Select the best English speaker voice
      const voices = synthRef.current.getVoices();
      const engVoice = voices.find(v => v.lang.startsWith("en-") && v.name.includes("Google")) || 
                        voices.find(v => v.lang.startsWith("en-")) || 
                        voices[0];
      if (engVoice) {
        utterance.voice = engVoice;
      }
      
      utterance.rate = 1.05; // Slightly fast, polished pacing
      utterance.pitch = 1.1; // Gentle friendly pitch
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        // Stagger automatic progress to next tip block
        setTimeout(() => {
          if (activeSectionIdx < script.length - 1) {
            setActiveSectionIdx(prev => prev + 1);
          }
        }, 1500);
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis trigger warning", e);
        setIsSpeaking(false);
      };

      synthRef.current.speak(utterance);
    } catch (err) {
      console.warn("TTS Error", err);
      setIsSpeaking(false);
    }
  };

  const stopVoice = () => {
    try {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    } catch (e) {}
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem("explainer_muted", nextMuted ? "true" : "false");
    if (nextMuted) {
      stopVoice();
      setIsSpeaking(false);
    } else {
      speakText(currentTextToSpeak);
    }
  };

  const skipAndStart = () => {
    stopVoice();
    onPlay();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden select-none">
      
      {/* Top micro details */}
      <div className="w-full max-w-md flex items-center justify-between absolute top-4 px-4 text-xs z-10">
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-300">
          <Sparkle size={12} className="text-[#32D74B] animate-pulse" />
          <span className="font-extrabold uppercase text-[9px] tracking-wide">AI Professor Terminal</span>
        </div>

        <button 
          onClick={toggleMute}
          className="flex items-center gap-1.5 p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/15 transition-all text-neutral-300 hover:text-white"
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} className="animate-bounce" />}
          <span className="text-[9px] font-bold uppercase">{isMuted ? "Unmute Bot" : "Mute Sound"}</span>
        </button>
      </div>

      <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center space-y-6 pt-12 pb-24 overflow-y-auto no-scrollbar">
        
        {/* Deep background glow effects */}
        <div className="absolute w-72 h-72 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none -translate-y-12" />

        {/* The Animated Speaking GIF */}
        <div className="relative w-44 h-44 md:w-52 md:h-52 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center shadow-2xl p-2 relative overflow-hidden group">
          
          <img 
            src="https://res.cloudinary.com/dpmjzqhdh/image/upload/v1779703633/original-be7870269cb8092d7eb6f9e3435eda7c_z52xdo.gif" 
            alt="AI Bot Speaker" 
            className="w-full h-full object-cover rounded-full z-10 group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />

          {/* Glowing pulse rings when speaking */}
          {isSpeaking && (
            <>
              <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping border border-blue-500/40 opacity-40" />
              <div className="absolute inset-2 bg-emerald-500/5 rounded-full animate-pulse border border-emerald-500/30 opacity-60" />
            </>
          )}

          {/* Sound waves visualization block */}
          {isSpeaking && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 py-1 px-3.5 bg-black/80 backdrop-blur-md rounded-full border border-white/10 z-20">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-full animate-[bounce_0.6s_infinite] delay-100" />
              <span className="w-1.5 h-4.5 bg-[#32D74B] rounded-full animate-[bounce_0.6s_infinite] delay-200" />
              <span className="w-1.5 h-6 bg-blue-400 rounded-full animate-[bounce_0.6s_infinite] delay-300" />
              <span className="w-1.5 h-4 bg-[#32D74B] rounded-full animate-[bounce_0.6s_infinite] delay-150" />
              <span className="w-1.5 h-2 bg-emerald-500 rounded-full animate-[bounce_0.6s_infinite]" />
            </div>
          )}
        </div>

        {/* Title & Game branding */}
        <div className="text-center space-y-1 z-10">
          <span className="text-[10px] font-black tracking-widest text-[#32D74B] uppercase block">EXPLAINING CHALLENGE</span>
          <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white drop-shadow-md">
            {gameTitle}
          </h2>
          
          {/* Info stats pill bar */}
          <div className="flex items-center justify-center gap-3.5 pt-1.5">
            <div className="flex items-center gap-1 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-[9px] font-black text-slate-300 uppercase">
              <Coins size={11} className="text-yellow-500" /> Stake: RS {minBet}+
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-[9px] font-black text-slate-300 uppercase">
              <Trophy size={11} className="text-[#32D74B]" /> Win Rate: {winRate}%
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-[9px] font-black text-slate-300 uppercase">
              <Flame size={11} className="text-orange-500 animate-pulse" /> Multiplier: {multiplier}x
            </div>
          </div>
        </div>

        {/* Progress tracker steps bullet indicators */}
        <div className="flex items-center justify-center gap-2 z-10">
          {script.map((sec, currIdx) => (
            <button
              key={sec.tag}
              onClick={() => {
                setActiveSectionIdx(currIdx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeSectionIdx === currIdx 
                  ? "w-8 bg-[#32D74B]" 
                  : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Interactive Highlight Bullet Card */}
        <div className="w-full bg-[#121933] border border-white/10 rounded-[1.8rem] p-4 relative shadow-2xl z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
              script[activeSectionIdx]?.tag === 'MONEY' 
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                : script[activeSectionIdx]?.tag === 'WIN'
                ? 'bg-[#32D74B]/10 text-[#32D74B] border border-[#32D74B]/20'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              {script[activeSectionIdx]?.title}
            </span>
          </div>
          
          {/* Subtitles Mimicking Dynamic Speaking Box */}
          <div className="min-h-[70px] flex items-center justify-start">
            <p className="text-slate-200 text-xs md:text-sm font-semibold leading-relaxed tracking-wide text-left">
              {typedText}
              <span className="inline-block w-1.5 h-3.5 bg-blue-400 ml-1 animate-pulse" />
            </p>
          </div>
        </div>

        {/* Educational/Strategy Alerts info line */}
        <div className="w-full flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl p-3 z-10 text-[10px] text-slate-400 leading-tight">
          <Info size={14} className="text-blue-400 shrink-0" />
          <p>The system voice explains features step-by-step. Adjust volume toggle at your convenience before commencing gameplay.</p>
        </div>

      </div>

      {/* Action Footer Button panels */}
      <div className="w-full max-w-md absolute bottom-4 px-4 flex gap-3 z-10 shrink-0">
        <button
          onClick={onClose}
          className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 text-neutral-300 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all"
        >
          Close Explainer
        </button>

        <button
          onClick={skipAndStart}
          className="flex-1 py-3 px-6 bg-gradient-to-r from-[#2196F3] to-[#32D74B] text-black hover:text-white font-black uppercase text-[11px] tracking-wider rounded-2xl flex items-center justify-center gap-1.5 shadow-2xl shadow-emerald-500/15 active:scale-95 transition-transform group"
        >
          <Play size={13} fill="currentColor" /> Let's Play Game <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

    </div>
  );
};
