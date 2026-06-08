import { motion } from "motion/react";
import { 
  Gift, 
  ChevronLeft, 
  Sparkles, 
  Timer,
  Coins
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, updateDoc, increment, addDoc, collection, onSnapshot } from "firebase/firestore";
import { playSound } from "../lib/sounds";

export default function DailyClaimModal({ profile, onBack }: { profile: any; onBack: () => void }) {
  const [bonusCooldown, setBonusCooldown] = useState<string | null>(null);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(50);

  // Load the dynamic daily bonus config
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.dailyBonus) {
          setBonusAmount(Number(data.dailyBonus));
        }
      }
    });
    return () => unsub();
  }, []);

  // Cooldown tracker
  useEffect(() => {
    if (!profile?.lastBonusClaimed) {
      setBonusCooldown(null);
      return;
    }
    const updateCooldown = () => {
      const last = new Date(profile.lastBonusClaimed).getTime();
      const now = new Date().getTime();
      const diff = 24 * 60 * 60 * 1000 - (now - last);
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setBonusCooldown(`${hours}h ${mins}m ${secs}s`);
      } else {
        setBonusCooldown(null);
      }
    };
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [profile?.lastBonusClaimed]);

  const handleClaim = async () => {
    if (!profile || bonusCooldown || bonusLoading) return;
    playSound('click');
    setBonusLoading(true);
    try {
      const reward = bonusAmount;
      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(reward),
        lastBonusClaimed: new Date().toISOString()
      });
      playSound('win');
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: reward,
        type: 'bonus',
        status: 'completed',
        createdAt: new Date().toISOString()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, "daily_bonus");
    } finally {
      setBonusLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[110] bg-[#0b0e11]/95 backdrop-blur-md text-white flex flex-col overflow-y-auto pb-24"
    >
      {/* Header */}
      <div className="bg-gradient-to-b from-orange-950/40 to-[#0b0e11] p-8 pt-12 rounded-b-[3rem] shadow-2xl sticky top-0 z-10 border-b border-orange-500/10">
         <button onClick={onBack} className="flex items-center gap-2 text-white/60 mb-6 font-black uppercase text-xs">
            <ChevronLeft size={16} /> Close
         </button>
         <div className="flex items-center justify-between">
            <div>
               <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-orange-500">Daily Rewards</h2>
               <p className="text-[10px] font-black uppercase text-yellow-500 tracking-[.25em] mt-1">Claim Free Cash Every 24h</p>
            </div>
            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                 <Sparkles size={24} className="text-yellow-500 animate-pulse" />
            </div>
         </div>
      </div>

      <main className="flex-1 p-6 flex flex-col justify-center max-w-md mx-auto w-full space-y-8">
         {/* Reward Announcement Box */}
         <div className="bg-gradient-to-br from-[#14254f] to-[#0f1b3a] border border-orange-500/20 rounded-[2rem] p-8 relative overflow-hidden shadow-2xl space-y-6 text-center">
            
            <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-yellow-500 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl shadow-orange-500/20 animate-bounce">
              <Gift size={38} className="stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase italic tracking-tight text-white">Daily Bonus Cycle</h3>
              <p className="text-xs text-neutral-400 uppercase leading-relaxed font-bold">
                Get free RS {bonusAmount} directly added to your balance. Use this to play real-time games on PlayHub and cashout!
              </p>
            </div>

            <div className="pt-2">
              {bonusCooldown ? (
                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-1.5 backdrop-blur-md">
                  <div className="flex items-center justify-center gap-2 text-orange-500">
                    <Timer size={18} className="animate-spin" style={{ animationDuration: '4s' }} />
                    <span className="font-mono font-black text-xl tracking-tighter italic">{bonusCooldown}</span>
                  </div>
                  <p className="text-[8px] font-black uppercase text-white/30 tracking-widest font-mono">Cooldown Remaining Before Next Claim</p>
                </div>
              ) : (
                <button 
                  onClick={handleClaim}
                  disabled={bonusLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:opacity-95 text-white font-black py-4.5 rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-orange-500/10 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Coins size={16} />
                  {bonusLoading ? 'CLAIMING...' : `CLAIM RS ${bonusAmount} NOW`}
                </button>
              )}
            </div>
         </div>

         {/* Anti-cheat guidelines */}
         <div className="bg-white/5 rounded-2xl p-5 border border-white/5 text-center space-y-1">
           <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] font-mono">System Integrity Notice</p>
           <p className="text-[10px] text-white/50 uppercase font-bold leading-normal">
             Multiple accounts from the same device/IP will trigger automatic security ban. Please play fair and enjoy!
           </p>
         </div>
      </main>
    </motion.div>
  );
}
