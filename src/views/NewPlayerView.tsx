import { motion } from "motion/react";
import { 
  Gift, 
  ChevronLeft, 
  User, 
  Sparkles, 
  Flame, 
  Trophy,
  Star,
  Zap,
  ShieldCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

export default function NewPlayerView({ onBack }: { onBack: () => void }) {
  const [newPlayers, setNewPlayers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snap) => {
      setNewPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[110] bg-[#0b0e11] text-white flex flex-col overflow-y-auto pb-24"
    >
      {/* Header */}
      <div className="bg-gradient-to-b from-blue-900 to-[#0b0e11] p-8 pt-12 rounded-b-[3rem] shadow-2xl sticky top-0 z-10 border-b border-blue-500/10">
         <button onClick={onBack} className="flex items-center gap-2 text-white/60 mb-6 font-black uppercase text-xs">
            <ChevronLeft size={16} /> Lobby
         </button>
         <div className="flex items-center justify-between">
            <div>
               <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">New Horizons</h2>
               <p className="text-[10px] font-black uppercase text-blue-500 tracking-[.25em] mt-1">Live Onboarding Feed</p>
            </div>
            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                <Sparkles size={24} className="text-yellow-500 animate-pulse" />
            </div>
         </div>
      </div>

      <main className="flex-1 p-6 space-y-6">
         {/* Featured Bonus */}
         <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-blue-500/20">
            <div className="absolute top-0 right-0 p-4 opacity-20">
               <Gift size={100} />
            </div>
            <div className="relative z-10 space-y-3">
               <h3 className="text-2xl font-black italic uppercase tracking-tighter">Welcome Kit</h3>
               <p className="text-xs font-bold text-white/80 leading-relaxed uppercase">
                 All new players receive up to RS 8,888 bonus on their first deposit.
               </p>
               <div className="pt-2">
                  <span className="bg-black/20 px-4 py-2 rounded-full text-[10px] font-black uppercase border border-white/20">Available Now</span>
               </div>
            </div>
         </div>

         {/* Connection Feed */}
         <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <h3 className="text-sm font-black uppercase italic text-white/40">Recent Connections</h3>
               <span className="text-[10px] font-black text-blue-500 uppercase">Live Update</span>
            </div>
            
            <div className="grid gap-4">
               {newPlayers.map((player, idx) => (
                 <motion.div 
                   key={player.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.05 }}
                   className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex items-center justify-between group"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/5 shadow-2xl bg-[#14254f] relative">
                          {player.photoURL ? (
                            <img src={player.photoURL} className="w-full h-full object-cover" alt="Profile" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                               <User size={24} className="text-white/20" />
                            </div>
                          )}
                          <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0b0e11]" />
                       </div>
                       <div>
                          <div className="flex items-center gap-2">
                             <h4 className="font-black italic uppercase text-sm text-white tracking-tight">
                                {player.displayName || 'Anonymous Player'}
                             </h4>
                             {idx < 3 && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                          </div>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
                             Joined {new Date(player.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                       </div>
                    </div>
                    <div className="bg-white/5 px-4 py-2 rounded-xl">
                       <Zap size={16} className="text-blue-500" />
                    </div>
                 </motion.div>
               ))}
            </div>
         </div>
      </main>

      {/* Safety Badge */}
      <div className="px-6 py-6 opacity-30 text-center space-y-1">
         <ShieldCheck className="mx-auto" size={24} />
         <p className="text-[8px] font-black uppercase tracking-widest">Global Player Verification Network</p>
      </div>
    </motion.div>
  );
}
