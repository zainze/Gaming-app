import { motion, AnimatePresence } from "motion/react";
import { Send, Heart, Users, X, Share2, MessageCircle, TrendingUp, Trophy } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "../lib/utils";

export default function LiveStream({ 
  title, 
  onBack,
  onWin,
  onBet,
  balance
}: { 
  title: string, 
  onBack: () => void,
  onWin: (amount: number) => void,
  onBet: (amount: number) => Promise<boolean>,
  balance: number
}) {
  const [messages, setMessages] = useState([
    { id: 1, user: "Lucky_Player", text: "Wow, big win!" },
    { id: 2, user: "CryptoKing", text: "Nice stream!" },
    { id: 3, user: "Admin_Zain", text: "Welcome everyone!" },
  ]);
  const [input, setInput] = useState("");
  const [betLoading, setBetLoading] = useState(false);
  const [betResult, setBetResult] = useState<{ win: boolean, amount: number } | null>(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now(), user: "You", text: input }]);
    setInput("");
  };

  const placeBet = async (type: 'red' | 'black') => {
    const amount = 20;
    if (balance < amount) return;

    setBetLoading(true);
    setBetResult(null);

    const success = await onBet(amount);
    if (!success) {
      setBetLoading(false);
      return;
    }

    // Simulate "Live" outcome
    setTimeout(() => {
      const outcome = Math.random() > 0.5 ? 'red' : 'black';
      const isWin = outcome === type;
      
      if (isWin) {
        onWin(amount * 2);
        setBetResult({ win: true, amount: amount * 2 });
      } else {
        setBetResult({ win: false, amount: 0 });
      }
      setBetLoading(false);
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="fixed inset-0 z-[100] bg-white max-w-lg mx-auto overflow-hidden flex flex-col"
    >
      {/* Video Area */}
      <div className="relative flex-1 bg-neutral-100 overflow-hidden">
        <img 
          src="https://picsum.photos/seed/liveroom/1080/1920" 
          alt="Live Stream" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20" />
        
        {/* Top Controls */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-white/40 p-0.5 bg-white/20 backdrop-blur-sm">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=streamer" className="w-full h-full rounded-full bg-neutral-200" />
            </div>
            <div>
              <p className="text-white text-sm font-bold truncate w-32 drop-shadow-md">{title}</p>
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1 drop-shadow-md">
                <Users size={10} /> 1.2k
              </p>
            </div>
          </div>
          <button onClick={onBack} className="p-2 bg-white/20 backdrop-blur rounded-full text-white border border-white/30">
            <X size={20} />
          </button>
        </div>

        {/* Reaction Floating Hearts (Simulation) */}
        <div className="absolute bottom-40 right-6 flex flex-col items-center gap-4">
          <button className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
            <Heart size={24} fill="currentColor" />
          </button>
          <button className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/30">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="h-2/5 flex flex-col p-4 bg-white border-t border-neutral-100 relative shadow-2xl">
        {/* Betting Overlay */}
        <div className="absolute -top-32 left-4 right-4 bg-white/95 backdrop-blur-md border border-neutral-100 rounded-3xl p-4 shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-orange-500" size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Live Betting</span>
            </div>
            <div className="text-[10px] font-bold text-neutral-400 uppercase italic">Next round in 5s</div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 relative">
            <button 
              disabled={betLoading}
              onClick={() => placeBet('red')}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all shadow-red-500/20"
            >
              BET RED (RS 20)
            </button>
            <button 
              disabled={betLoading}
              onClick={() => placeBet('black')}
              className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all shadow-neutral-900/20"
            >
              BET BLACK (RS 20)
            </button>

            <AnimatePresence>
              {betResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={`absolute inset-0 flex items-center justify-center rounded-2xl z-10 font-black italic text-xl border-2 ${betResult.win ? 'bg-green-500 text-white border-green-400' : 'bg-red-500/90 text-white border-red-400'}`}
                >
                  {betResult.win ? `WIN +RS ${betResult.amount}` : 'LOSE - RS 20'}
                </motion.div>
              )}
              {betLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-white/80 flex items-center justify-center gap-2 rounded-2xl z-10"
                >
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-4 scrollbar-hide">
          {messages.map((m) => (
            <div key={m.id} className="flex gap-2 text-sm leading-tight">
              <span className="font-black text-orange-500 uppercase text-[10px] whitespace-nowrap">{m.user}:</span>
              <span className="text-neutral-700">{m.text}</span>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Say something..."
            className="flex-1 bg-neutral-50 border border-neutral-100 rounded-2xl px-4 py-3 text-sm text-neutral-900 outline-none focus:border-orange-500 transition-colors"
          />
          <button onClick={sendMessage} className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
