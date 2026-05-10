import { motion } from "motion/react";
import { Gamepad2, RefreshCw, Zap, ArrowLeft, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

interface GameInfo {
  title: string;
  url: string;
  thumbnail: string;
  time: number; // in seconds
  reward: number;
}

export default function MoreGamesView({ profile, onExit }: { profile: any; onExit?: () => void }) {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "config"), (snap) => {
      setLoading(false);
      if (snap.exists()) {
        const data = snap.data();
        const moreGames: GameInfo[] = [];
        
        for (let i = 1; i <= 5; i++) {
          const title = data[`moreGame${i}Title`] || `Arcade Game ${i}`;
          const url = data[`moreGame${i}Url`] || "";
          const thumbnail = data[`moreGame${i}Thumbnail`] || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop";
          const time = parseInt(data[`moreGame${i}Time`]) || 60;
          const reward = parseFloat(data[`moreGame${i}Reward`]) || 10;
          
          if (url) {
            moreGames.push({ title, url, thumbnail, time, reward });
          }
        }
        
        if (moreGames.length === 0) {
          moreGames.push({
            title: "Santa Climb",
            url: "https://cdn-factory.marketjs.com/en/santa-climb/index.html",
            thumbnail: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?q=80&w=400&auto=format&fit=crop",
            time: 60,
            reward: 10
          });
        }
        
        setGames(moreGames);
      }
    }, (err) => {
      setLoading(false);
      handleFirestoreError(err, OperationType.GET, "system/config");
    });

    return () => unsub();
  }, []);

  const handleLaunchGame = async (game: GameInfo) => {
    if (!profile) return;

    try {
      // Record session start to track background rewards
      const userId = profile.uid || profile.id;
      if (!userId) throw new Error("User ID not found in profile");

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        arcadeSession: {
          title: game.title,
          startTime: new Date().toISOString(),
          duration: game.time,
          reward: game.reward,
          status: 'active'
        }
      });

      // Open in NEW TAB for compatibility with external games in AI Studio sandbox
      const gameWindow = window.open(game.url, '_blank');
      if (!gameWindow) {
         // Fallback if popup blocked
         window.location.href = game.url;
      }
    } catch (err) {
      console.error("Failed to initiate arcade session:", err);
      window.open(game.url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="text-orange-500" size={32} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto pb-24">
      <div className="flex items-center justify-between mb-8">
         <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
               <span className="text-[8px] font-black uppercase text-neutral-400 tracking-[0.3em]">AI verified Arcade</span>
            </div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase text-neutral-900 leading-none">Arcade</h2>
         </div>
         <button 
           onClick={() => onExit?.()}
           className="w-12 h-12 bg-neutral-900 text-white rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all"
         >
           <ArrowLeft size={20} />
         </button>
      </div>

      {profile?.arcadeSession?.status === 'active' && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-4 animate-pulse">
          <Zap className="text-orange-500" size={20} />
          <div className="flex-1">
            <p className="text-[8px] font-black uppercase text-orange-400">Reward Cycle Active</p>
            <p className="text-[10px] font-bold text-orange-950 uppercase">{profile.arcadeSession.title} is running</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {games.map((game, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleLaunchGame(game)}
            className="relative aspect-[16/9] rounded-[2.5rem] overflow-hidden border border-neutral-100 group bg-neutral-900 shadow-xl"
          >
            <img 
              src={game.thumbnail} 
              className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            
            <div className="absolute inset-x-8 bottom-8 flex items-end justify-between text-left">
               <div className="space-y-1">
                  <h3 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none group-hover:text-orange-400 transition-colors">
                    {game.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                     <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{game.time}s Session</span>
                     <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">RS {game.reward} Rewards</span>
                  </div>
               </div>
               
               <div className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <ExternalLink size={24} />
               </div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-12 p-8 bg-neutral-50 rounded-[2.5rem] border border-neutral-100 text-center">
         <Gamepad2 className="mx-auto text-neutral-200 mb-4" size={48} />
         <h4 className="text-sm font-black uppercase italic text-neutral-400 mb-2">Universal Play Hub</h4>
         <p className="text-[9px] text-neutral-400 leading-relaxed uppercase font-bold tracking-wider">
           Games open in a new window for full playability. Your rewards will be credited automatically when the timer expires.
         </p>
      </div>
    </div>
  );
}
