import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, Users, TrendingUp, Copy, Check, History, Award, Gift, MessageSquare
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { playSound } from "../lib/sounds";

type Tab = "invite" | "network" | "history";

export default function ReferralView({ profile, onBack }: { profile: any; onBack?: () => void }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("invite");
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [systemConfig, setSystemConfig] = useState<any>({
    referralReward: 50,
    referralText: "Share your link and earn bonus rewards forever! Join using my referral link."
  });

  // Fetch Platform Configuration dynamically
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setSystemConfig(snap.data() as any);
      }
    });
    return () => unsub();
  }, []);

  // Fetch referrals and commission history
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(collection(db, "referrals"), where("referrerId", "==", profile.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "referrals");
    });

    const qEarnings = query(collection(db, "transactions"), where("userId", "==", profile.uid), where("type", "==", "referral"));
    const unsubscribeEarnings = onSnapshot(qEarnings, (snap) => {
      let total = 0;
      snap.docs.forEach(d => total += d.data().amount);
      setTotalEarnings(total);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "transactions");
    });

    return () => {
      unsubscribe();
      unsubscribeEarnings();
    };
  }, [profile?.uid]);

  const handleBack = () => {
    playSound("click");
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const referralLink = `${window.location.origin}/auth?ref=${profile?.uid || ''}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    playSound("click");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    playSound("click");
    const shareText = `${systemConfig.referralText || "Join our platform and earn rewards!"}\nUse my referral link to get started:\n${referralLink}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F2F4F8] pb-32 text-neutral-800 font-sans select-none antialiased">
      {/* Blue Top Action Header */}
      <header className="bg-[#2196F3] text-white px-4 py-3.5 flex items-center justify-between shadow-md relative z-[120]">
        <button 
          onClick={handleBack}
          className="p-1 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft size={22} className="text-white" />
        </button>

        <h1 className="text-[19px] font-bold tracking-tight text-white pl-3 flex-1">Partner Program</h1>

        <div className="bg-white text-neutral-900 font-bold px-3 py-1 rounded-full text-[14px] flex items-center gap-1 shadow-sm border border-black/5">
          <span className="text-[#2196F3] text-xs font-black">RS</span>
          <span>{Number(totalEarnings).toLocaleString()}</span>
        </div>
      </header>

      {/* Royal Blue Tab Bar Grid */}
      <nav className="bg-[#1C2070] text-white/50 font-bold flex text-center text-[11px] uppercase tracking-wider shadow-inner z-[115]">
        <button
          onClick={() => {
            playSound("click");
            setActiveTab("invite");
          }}
          className={`flex-1 py-1.5 relative transition-all cursor-pointer ${
            activeTab === "invite" 
              ? "text-white font-extrabold" 
              : "hover:text-white/80"
          }`}
        >
          <span className="block py-2 text-[11px]">Invite</span>
          {activeTab === "invite" && (
            <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-white rounded-t" />
          )}
        </button>
        <button
          onClick={() => {
            playSound("click");
            setActiveTab("network");
          }}
          className={`flex-1 py-1.5 relative transition-all cursor-pointer ${
            activeTab === "network" 
              ? "text-white font-extrabold" 
              : "hover:text-white/80"
          }`}
        >
          <span className="block py-2 text-[11px]">Network</span>
          {activeTab === "network" && (
            <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-white rounded-t" />
          )}
        </button>
        <button
          onClick={() => {
            playSound("click");
            setActiveTab("history");
          }}
          className={`flex-1 py-1.5 relative transition-all cursor-pointer ${
            activeTab === "history" 
              ? "text-white font-extrabold" 
              : "hover:text-white/80"
          }`}
        >
          <span className="block py-2 text-[11px]">Earnings</span>
          {activeTab === "history" && (
            <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-white rounded-t" />
          )}
        </button>
      </nav>

      {/* Main View Area */}
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        
        {/* Statistics HUD Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-[#2196F3]/40 rounded-[14px] p-4 text-center shadow-sm">
            <h3 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-tight">Active Network</h3>
            <p className="text-2xl font-bold text-neutral-800 mt-1">{referrals.length} Units</p>
          </div>

          <div className="bg-white border border-[#2196F3]/40 rounded-[14px] p-4 text-center shadow-sm">
            <h3 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-tight">Total Earned</h3>
            <p className="text-2xl font-bold text-neutral-800 mt-1">RS {Number(totalEarnings).toLocaleString()}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "invite" && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Form Outline Container */}
              <div className="bg-white border border-[#2196F3]/40 rounded-2xl p-5 shadow-sm space-y-5">
                
                {/* Reward info panel */}
                <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-4 text-center space-y-2">
                  <div className="w-12 h-12 bg-[#2196F3]/10 text-[#2196F3] rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Gift size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-neutral-800 tracking-wide">Referral Program Active</h3>
                    <p className="text-[22px] font-black italic tracking-tight text-[#2196F3] mt-0.5">
                      RS {Number(systemConfig.referralReward || 50).toLocaleString()} GIFT
                    </p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">
                      Cash credited on every successful joining
                    </p>
                  </div>
                </div>

                {/* Custom active invitation code */}
                <div className="space-y-4">
                  <div className="bg-[#FCFCFD] border border-neutral-200 rounded-xl p-4 text-center space-y-2 shadow-inner">
                    <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Your Referral Link</p>
                    <div className="bg-neutral-100 rounded-xl p-3 font-mono text-[10px] font-bold text-neutral-700 select-all tracking-tight break-all border border-neutral-200 shadow-sm max-w-full">
                      {referralLink}
                    </div>
                  </div>

                  {/* Program Invitation Text */}
                  <div className="p-4 bg-[#FCFCFD] border border-neutral-200 rounded-xl space-y-1">
                    <p className="text-[9px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1">
                      <Award size={10} className="text-blue-500" /> Invitation Text
                    </p>
                    <p className="text-xs font-bold text-neutral-700 leading-relaxed uppercase">
                      {systemConfig.referralText || "Share your link and earn bonus rewards forever! Join using my referral link."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pt-2">
                    {/* Copy Link Button */}
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3.5 rounded-full text-xs shadow-md active:scale-95 transition-all text-center uppercase tracking-wider cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-emerald-400 stroke-[3]" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy Link
                        </>
                      )}
                    </button>

                    {/* WhatsApp Share Button */}
                    <button
                      onClick={shareViaWhatsApp}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white font-bold py-3.5 rounded-full text-xs shadow-md active:scale-95 transition-all text-center uppercase tracking-wider cursor-pointer"
                    >
                      <MessageSquare size={14} />
                      Share WhatsApp
                    </button>
                  </div>
                </div>

              </div>

              {/* Exact Warning disclaimer matching WalletView structure */}
              <div className="text-center px-4 pt-2">
                <p className="text-[11.5px] font-black text-black leading-snug tracking-normal uppercase max-w-sm mx-auto">
                  commissions are processed dynamically and verified upon audit check. cheating results in total ban.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === "network" && (
            <motion.div
              key="network"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">Recent Referrals</h3>

              {referrals.length === 0 ? (
                <div className="bg-white border border-[#2196F3]/20 p-10 rounded-2xl text-center space-y-2">
                  <Users className="mx-auto text-neutral-200" size={32} />
                  <p className="text-neutral-400 font-bold text-xs uppercase tracking-wider">No active network data found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {referrals.map((ref) => (
                    <div 
                      key={ref.id} 
                      className="bg-white border border-[#2196F3]/15 rounded-xl p-3.5 flex justify-between items-center shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500">
                          <Users size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-neutral-800 uppercase">UserID: {ref.referredId?.substring(0, 8)}</span>
                          </div>
                          <div className="text-[9px] text-neutral-400">Joined: {new Date(ref.createdAt || Date.now()).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <p className="text-xs font-bold tracking-tight text-neutral-800 uppercase">
                          +RS {Number(ref.rewardAmount || systemConfig.referralReward).toLocaleString()}
                        </p>
                        <span className="text-[8px] font-bold uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Linked</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">Commissions Ledger</h3>

              {referrals.length === 0 ? (
                <div className="bg-white border border-[#2196F3]/20 p-10 rounded-2xl text-center space-y-2">
                  <History className="mx-auto text-neutral-200" size={32} />
                  <p className="text-neutral-400 font-bold text-xs uppercase tracking-wider">No commissions available</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {referrals.map((ref) => (
                    <div 
                      key={ref.id + '_tx'} 
                      className="bg-white border border-[#2196F3]/15 rounded-xl p-3.5 flex justify-between items-center shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-500">
                          <TrendingUp size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-neutral-800 uppercase">Referral Bonus</span>
                          </div>
                          <div className="text-[9px] text-neutral-400">{new Date(ref.createdAt || Date.now()).toLocaleString()}</div>
                          <span className="inline-block mt-0.5 text-[8px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded font-mono">
                            User Joined: {ref.referredId?.substring(0, 8)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <p className="text-sm font-bold tracking-tight text-emerald-500">
                          +RS {Number(ref.rewardAmount || systemConfig.referralReward).toLocaleString()}
                        </p>
                        <span className="text-[8px] font-bold uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">Completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
