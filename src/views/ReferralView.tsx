import { motion } from "motion/react";
import { 
  Users, 
  ChevronLeft, 
  Copy, 
  Share2, 
  Gift, 
  TrendingUp, 
  Trophy,
  Zap,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, getDocs } from "firebase/firestore";
import { formatCurrency } from "../lib/utils";
import { playSound } from "../lib/sounds";

export default function ReferralView({ profile, onBack }: { profile: any, onBack: () => void }) {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, "referrals"), where("referrerId", "==", profile.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qEarnings = query(collection(db, "transactions"), where("userId", "==", profile.uid), where("type", "==", "referral"));
    const unsubscribeEarnings = onSnapshot(qEarnings, (snap) => {
      let total = 0;
      snap.docs.forEach(d => total += d.data().amount);
      setTotalEarnings(total);
    });

    return () => {
      unsubscribe();
      unsubscribeEarnings();
    };
  }, [profile]);

  const referralLink = `${window.location.origin}/auth?ref=${profile?.uid || ''}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    playSound('click');
    alert("Referral link copied!");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed inset-0 z-[110] bg-[#0b0e11] text-white flex flex-col overflow-y-auto pb-24"
    >
      {/* Header */}
      <div className="bg-gradient-to-b from-green-900 to-[#0b0e11] p-8 pt-12 rounded-b-[3rem] shadow-2xl sticky top-0 z-10 border-b border-green-500/10">
         <button onClick={onBack} className="flex items-center gap-2 text-white/60 mb-6 font-black uppercase text-xs">
            <ChevronLeft size={16} /> Dashboard
         </button>
         <div className="flex items-center justify-between">
            <div>
               <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Partner Program</h2>
               <p className="text-[10px] font-black uppercase text-green-500 tracking-[.25em] mt-1">Growth & Revenue Share</p>
            </div>
            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                <p className="text-[8px] font-black text-white/40 uppercase mb-1 text-center">Your Rank</p>
                <div className="flex items-center gap-2">
                   <Trophy size={14} className="text-yellow-500" />
                   <p className="text-xl font-black italic tracking-tighter uppercase">Pro</p>
                </div>
            </div>
         </div>
      </div>

      <main className="flex-1 p-6 space-y-8">
         {/* Stats */}
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] space-y-2 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-5">
                  <Users size={60} />
               </div>
               <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Active Network</p>
               <p className="text-3xl font-black italic tracking-tighter">{referrals.length}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] space-y-2 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-5">
                  <TrendingUp size={60} />
               </div>
               <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Lifetime Commission</p>
               <p className="text-3xl font-black italic tracking-tighter text-green-400">{formatCurrency(totalEarnings)}</p>
            </div>
         </div>

         {/* Share Link */}
         <section className="bg-green-600 rounded-[2.5rem] p-8 space-y-6 shadow-2xl shadow-green-600/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
               <UserPlus size={100} />
            </div>
            <div className="space-y-2 relative z-10">
               <h3 className="text-xl font-black uppercase italic tracking-tighter">Instant Invitation</h3>
               <p className="text-xs font-bold text-white/80 leading-relaxed uppercase">
                 Share your link and earn up to 10% commission on every friend's wager forever.
               </p>
            </div>
            <div className="flex gap-2 relative z-10">
               <div className="flex-1 bg-black/20 backdrop-blur-md rounded-2xl p-4 text-[10px] font-bold text-white/60 truncate border border-white/10">
                  {referralLink}
               </div>
               <button onClick={copyToClipboard} className="bg-white text-green-600 p-4 rounded-2xl shadow-lg active:scale-90 transition-transform">
                  <Copy size={20} />
               </button>
            </div>
         </section>

         {/* Network List */}
         <section className="space-y-4">
            <h3 className="text-sm font-black uppercase italic text-white/40 px-1">Recent Referrals</h3>
            <div className="space-y-3">
               {referrals.map((ref, idx) => (
                 <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-500">
                          <Users size={20} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-white">UserID: {ref.referredId.substring(0, 8)}</p>
                          <p className="text-[8px] font-bold text-white/40 uppercase">Joined: {new Date(ref.createdAt).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-green-500 uppercase">Active</p>
                    </div>
                 </div>
               ))}
               {referrals.length === 0 && (
                 <div className="py-12 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                    <UserPlus size={40} className="mx-auto text-white/10 mb-4" />
                    <p className="text-[10px] font-black uppercase text-white/20">No active network data found</p>
                 </div>
               )}
            </div>
         </section>
      </main>

      {/* Safety Badge */}
      <div className="px-6 py-6 opacity-30 text-center space-y-1">
         <ShieldCheck className="mx-auto" size={24} />
         <p className="text-[8px] font-black uppercase tracking-widest">Verified Partner Protocol V2.1</p>
      </div>
    </motion.div>
  );
}
