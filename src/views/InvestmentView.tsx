import { motion } from "motion/react";
import { 
  TrendingUp, 
  ChevronLeft, 
  Clock, 
  Target, 
  Zap, 
  ShieldCheck, 
  Wallet,
  ArrowUpRight,
  TrendingDown
} from "lucide-react";
import { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, increment, getDoc } from "firebase/firestore";
import { formatCurrency } from "../lib/utils";
import { playSound } from "../lib/sounds";

export default function InvestmentView({ profile, onBack }: { profile: any, onBack: () => void }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [myInvestments, setMyInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubPlans = onSnapshot(query(collection(db, "investment_plans"), where("active", "==", true)), (snap) => {
      setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubMy = onSnapshot(query(collection(db, "user_investments"), where("userId", "==", profile?.uid)), (snap) => {
      setMyInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubPlans();
      unsubMy();
    };
  }, [profile]);

  const handleInvest = async (plan: any) => {
    if (!profile || loading) return;
    const amount = parseFloat(prompt(`Enter investment amount (Minimum RS ${plan.minAmount}):`) || "0");
    
    if (isNaN(amount) || amount < plan.minAmount) {
      alert(`Minimum investment for this plan is RS ${plan.minAmount}`);
      return;
    }

    if (profile.balance < amount) {
      alert("Insufficient balance!");
      return;
    }

    setLoading(true);
    playSound('click');
    try {
      // Calculate next payout date
      const nextPayout = new Date();
      if (plan.rewardType === 'daily') nextPayout.setDate(nextPayout.getDate() + 1);
      else if (plan.rewardType === 'weekly') nextPayout.setDate(nextPayout.getDate() + 7);
      else if (plan.rewardType === 'monthly') nextPayout.setMonth(nextPayout.getMonth() + 1);

      await addDoc(collection(db, "user_investments"), {
        userId: profile.uid,
        planId: plan.id,
        planTitle: plan.title,
        amount,
        rewardRate: plan.rewardRate,
        rewardType: plan.rewardType,
        status: 'active',
        startDate: new Date().toISOString(),
        nextPayoutDate: nextPayout.toISOString(),
        totalEarned: 0,
        lastPayoutDate: null
      });

      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(-amount)
      });

      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: -amount,
        type: 'wager',
        method: 'Investment: ' + plan.title,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      playSound('win');
      alert("Investment successfully activated!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, "investments");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (inv: any) => {
    if (loading) return;
    const now = new Date();
    const nextPayout = new Date(inv.nextPayoutDate);
    
    if (now < nextPayout) {
      alert("Investment has not matured yet!");
      return;
    }

    setLoading(true);
    playSound('click');
    try {
      const profit = (inv.amount * inv.rewardRate) / 100;
      
      const newNextPayout = new Date(nextPayout);
      if (inv.rewardType === 'daily') newNextPayout.setDate(newNextPayout.getDate() + 1);
      else if (inv.rewardType === 'weekly') newNextPayout.setDate(newNextPayout.getDate() + 7);
      else if (inv.rewardType === 'monthly') newNextPayout.setMonth(newNextPayout.getMonth() + 1);

      await updateDoc(doc(db, "user_investments", inv.id), {
        totalEarned: increment(profit),
        lastPayoutDate: now.toISOString(),
        nextPayoutDate: newNextPayout.toISOString()
      });

      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(profit)
      });

      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: profit,
        type: 'bonus',
        method: 'Investment Profit: ' + inv.planTitle,
        status: 'completed',
        createdAt: now.toISOString()
      });

      playSound('win');
      alert(`Success! Profit of RS ${profit} claimed.`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, "claim_investment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed inset-0 z-[110] bg-[#0b0e11] text-white flex flex-col overflow-y-auto pb-24"
    >
      {/* Header */}
      <div className="bg-[#14254f] p-6 pt-12 rounded-b-[3rem] shadow-2xl sticky top-0 z-10">
         <button onClick={onBack} className="flex items-center gap-2 text-white/60 mb-6 font-black uppercase text-xs">
            <ChevronLeft size={16} /> Portfolio
         </button>
         <div className="flex items-center justify-between">
            <div>
               <h2 className="text-3xl font-black italic tracking-tighter uppercase">VIP Vault</h2>
               <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest">High-Yield Stake Pool</p>
            </div>
            <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                <p className="text-[8px] font-black text-white/40 uppercase mb-1">Available Funds</p>
                <p className="text-xl font-black italic tracking-tighter">{formatCurrency(profile?.balance || 0)}</p>
            </div>
         </div>
      </div>

      <main className="flex-1 p-6 space-y-8">
         {/* Live Stats */}
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#14254f] border border-white/5 p-5 rounded-[2rem] space-y-2">
               <div className="flex items-center gap-2 text-green-400">
                  <ArrowUpRight size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Total Stakes</span>
               </div>
               <p className="text-2xl font-black italic tracking-tighter">
                  {formatCurrency(myInvestments.reduce((acc, i) => acc + (i.status === 'active' ? i.amount : 0), 0))}
               </p>
            </div>
            <div className="bg-[#14254f] border border-white/5 p-5 rounded-[2rem] space-y-2">
               <div className="flex items-center gap-2 text-orange-400">
                  <Zap size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Growth</span>
               </div>
               <p className="text-2xl font-black italic tracking-tighter">
                  {formatCurrency(myInvestments.reduce((acc, i) => acc + (i.totalEarned || 0), 0))}
               </p>
            </div>
         </div>

         {/* Active Positions */}
         {myInvestments.length > 0 && (
           <section className="space-y-4">
              <div className="flex items-center justify-between pl-1">
                 <h3 className="text-sm font-black uppercase italic text-white/60">Live Positions</h3>
                 <span className="text-[10px] font-black text-orange-500 animate-pulse uppercase">Syncing...</span>
              </div>
              <div className="space-y-3">
                 {myInvestments.map(inv => {
                    const daysLeft = Math.max(0, Math.ceil((new Date(inv.nextPayoutDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                    const hoursLeft = Math.max(0, Math.ceil((new Date(inv.nextPayoutDate).getTime() - new Date().getTime()) / (1000 * 60 * 60)));
                    
                    return (
                      <div key={inv.id} className="bg-white/5 border border-white/10 p-5 rounded-[2.5rem] relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Clock size={60} className="text-white" />
                         </div>
                         <div className="flex justify-between items-start mb-4">
                            <div>
                               <h4 className="font-black uppercase text-xs italic text-white tracking-widest leading-none mb-1">{inv.planTitle}</h4>
                               <p className="text-[10px] font-bold text-white/40 uppercase">Initial: RS {inv.amount}</p>
                            </div>
                            <div className="bg-green-500/20 px-3 py-1 rounded-full border border-green-500/20">
                               <p className="text-[8px] font-black text-green-400 uppercase tracking-widest">Active</p>
                            </div>
                         </div>
                         <div className="flex items-center justify-between border-t border-white/5 pt-4">
                            <div className="space-y-1">
                               <div className="flex items-center gap-1.5 text-orange-500">
                                  <Clock size={12} />
                                  <span className="text-[10px] font-black uppercase tracking-tight">Next Profit</span>
                               </div>
                               <p className="text-xl font-black italic tracking-tighter text-white">
                                  {inv.rewardType === 'daily' ? `${hoursLeft}H Remaining` : `${daysLeft}D Remaining`}
                               </p>
                               <p className="text-[8px] font-black uppercase text-white/20">
                                  Next: {new Date(inv.nextPayoutDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </p>
                            </div>
                            <div className="text-right space-y-1">
                               {new Date() >= new Date(inv.nextPayoutDate) ? (
                                 <button 
                                   onClick={() => handleClaim(inv)}
                                   disabled={loading}
                                   className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/20 active:scale-95 animate-pulse"
                                 >
                                    Claim Profit
                                 </button>
                               ) : (
                                 <>
                                   <span className="text-[10px] font-black uppercase text-white/40 tracking-tight">Cycle ROI</span>
                                   <p className="text-xl font-black italic tracking-tighter text-green-400">+{inv.rewardRate}%</p>
                                 </>
                               )}
                            </div>
                         </div>
                      </div>
                    );
                 })}
              </div>
           </section>
         )}

         {/* Available Plans */}
         <section className="space-y-6">
            <div className="flex items-center justify-between pl-1">
               <h3 className="text-lg font-black uppercase italic tracking-tighter">Growth Models</h3>
               <div className="bg-white/5 px-2 py-0.5 rounded text-[8px] font-black text-white/60 uppercase">Market Live</div>
            </div>
            
            <div className="grid gap-6">
               {plans.map(plan => (
                 <div key={plan.id} className="bg-[#14254f] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl group transition-all hover:bg-[#1a2c5a] hover:border-orange-500/30">
                    <div className="aspect-[16/7] relative overflow-hidden">
                       <img src={plan.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Plan" />
                       <div className="absolute inset-0 bg-gradient-to-t from-[#14254f] via-transparent" />
                       <div className="absolute bottom-4 left-6">
                          <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 mb-2 inline-block">
                             {plan.rewardType} Cycle
                          </span>
                          <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white drop-shadow-md">{plan.title}</h4>
                       </div>
                    </div>
                    <div className="p-6 space-y-6">
                       <div className="grid grid-cols-3 gap-2">
                          <div className="bg-black/20 p-3 rounded-2xl border border-white/5 text-center">
                             <p className="text-[8px] font-black text-white/40 uppercase mb-1">ROI Rate</p>
                             <p className="font-black italic text-green-400">+{plan.rewardRate}%</p>
                          </div>
                          <div className="bg-black/20 p-3 rounded-2xl border border-white/5 text-center">
                             <p className="text-[8px] font-black text-white/40 uppercase mb-1">Duration</p>
                             <p className="font-black italic text-white">{plan.durationDays}D</p>
                          </div>
                          <div className="bg-black/20 p-3 rounded-2xl border border-white/5 text-center">
                             <p className="text-[8px] font-black text-white/40 uppercase mb-1">Entry</p>
                             <p className="font-black italic text-white">RS {plan.minAmount}</p>
                          </div>
                       </div>
                       
                       <button 
                         onClick={() => handleInvest(plan)}
                         className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                       >
                         Initialize Stake
                       </button>
                    </div>
                 </div>
               ))}
            </div>
         </section>
      </main>

      {/* Safety Badge */}
      <div className="px-6 py-6 opacity-30 text-center space-y-1">
         <ShieldCheck className="mx-auto" size={24} />
         <p className="text-[8px] font-black uppercase tracking-widest">End-to-End Cryptographic Ledger Protection</p>
      </div>
    </motion.div>
  );
}
