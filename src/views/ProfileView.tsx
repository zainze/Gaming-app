import { motion } from "motion/react";
import { LogOut, Share2, Shield, Globe, Bell, ChevronRight, Copy, Check, ArrowLeft, Zap } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs, limit, increment, addDoc, writeBatch, getDoc, setDoc } from "firebase/firestore";
import PrivacyView from "./PrivacyView";

type ActiveSection = 'main' | 'notifications' | 'privacy' | 'language' | 'favorites';

export default function ProfileView({ profile }: { profile: any }) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('main');
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();

  const isAdminEmail = profile?.email === 'zainzeb333@gmail.com';

  useEffect(() => {
    // Auto-fix for legacy users missing invite code or registry
    if (profile && !profile.inviteCode) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const batch = writeBatch(db);
      batch.update(doc(db, "users", profile.uid), { inviteCode: code });
      batch.set(doc(db, "invite_codes", code), { uid: profile.uid });
      batch.commit().catch(console.error);
    } else if (profile?.inviteCode) {
      // Ensure it's in the registry
      getDoc(doc(db, "invite_codes", profile.inviteCode)).then(snap => {
        if (!snap.exists()) {
          setDoc(doc(db, "invite_codes", profile.inviteCode), { uid: profile.uid });
        }
      });
    }

    if (!profile) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "notifications");
    });
    return () => unsubscribe();
  }, [profile]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`https://playhub.pro/i/${profile?.inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleLanguage = async (lang: 'en' | 'ur') => {
    if (!profile) return;
    await updateDoc(doc(db, "users", profile.uid), { language: lang });
  };

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const [referralCode, setReferralCode] = useState("");
  const [refStatus, setRefStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [systemConfig, setSystemConfig] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) setSystemConfig(snap.data());
    });
    return () => unsub();
  }, []);

  const referralReward = systemConfig?.referralReward || 50;

  const submitReferral = async () => {
    if (!referralCode.trim() || profile?.referredBy) return;
    setRefStatus('loading');
    const inputRaw = referralCode.trim();
    // Extract code if it's a full URL or path (e.g., https://playhub.pro/i/CODE -> CODE)
    const inputCode = (inputRaw.includes('/') ? inputRaw.replace(/\/+$/, '').split('/').pop() : inputRaw)?.toUpperCase().trim() || "";
    
    if (!inputCode) {
      setRefStatus('error');
      return;
    }

    try {
      // 1. Try Referral Code (invite_codes registry)
      let referrerId: string | null = null;
      const codeDoc = await getDoc(doc(db, "invite_codes", inputCode));
      
      if (codeDoc.exists()) {
        referrerId = codeDoc.data().uid;
      } else {
        // Fallback: Search users collection for this inviteCode
        const userQ = query(collection(db, "users"), where("inviteCode", "==", inputCode), limit(1));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          referrerId = userSnap.docs[0].id;
          // While we're here, let's fix the registry for future fast lookups
          setDoc(doc(db, "invite_codes", inputCode), { uid: referrerId });
        }
      }
      
      if (referrerId) {
        if (referrerId === profile.uid) {
          setRefStatus('error');
          return;
        }

        const batch = writeBatch(db);
        
        // Mark current user as referred
        batch.update(doc(db, "users", profile.uid), { referredBy: referrerId });

        // Add reward to referrer balance
        batch.update(doc(db, "users", referrerId), { balance: increment(referralReward) });

        // Create referral record
        const refId = `${profile.uid}_${referrerId}`;
        batch.set(doc(db, "referrals", refId), {
          referrerId: referrerId,
          referredId: profile.uid,
          rewardAmount: referralReward,
          createdAt: new Date().toISOString()
        });

        // Create transaction for referrer
        batch.set(doc(collection(db, "transactions")), {
          userId: referrerId,
          amount: referralReward,
          type: 'referral',
          status: 'completed',
          createdAt: new Date().toISOString()
        });

        // Notification
        batch.set(doc(collection(db, "notifications")), {
          userId: referrerId,
          title: "Referral Reward! 🎉",
          body: `Congratulations! ${profile.displayName} used your code. RS ${referralReward} added to balance.`,
          type: 'success',
          read: false,
          createdAt: new Date().toISOString()
        });

        await batch.commit().catch(err => {
          handleFirestoreError(err, OperationType.WRITE, "referral_batch");
          throw err;
        });
        setRefStatus('success');
        return;
      }

    // 2. Try Promo Code (promo_codes)
    const promoDoc = await getDoc(doc(db, "promo_codes", inputCode)).catch(err => {
      handleFirestoreError(err, OperationType.GET, `promo_codes/${inputCode}`);
      throw err;
    });
    if (promoDoc.exists()) {
      const promo = promoDoc.data();
      if (!promo.active || (promo.usedBy && promo.usedBy.includes(profile.uid))) {
        setRefStatus('error');
        return;
      }

      const batch = writeBatch(db);
      
      // Reward Type Handling
      if (promo.type === 'balance') {
         batch.update(doc(db, "users", profile.uid), { balance: increment(promo.value) });
         batch.set(doc(collection(db, "transactions")), {
           userId: profile.uid,
           amount: promo.value,
           type: 'bonus',
           status: 'completed',
           createdAt: new Date().toISOString(),
           promoCode: inputCode
         });
      } else if (promo.type === 'double_rewards') {
         // Set double rewards for 24 hours
         const expiry = new Date();
         expiry.setHours(expiry.getHours() + 24);
         batch.update(doc(db, "users", profile.uid), { 
           doubleRewardsUntil: expiry.toISOString(),
           rewardMultiplier: 2
         });
         batch.set(doc(collection(db, "transactions")), {
           userId: profile.uid,
           amount: 0,
           type: 'bonus',
           status: 'completed',
           createdAt: new Date().toISOString(),
           promoCode: inputCode,
           note: "Double Rewards Activated (24h)"
         });
      }
      
      // Record Usage
      batch.update(doc(db, "promo_codes", inputCode), {
        usedBy: [...(promo.usedBy || []), profile.uid]
      });

      await batch.commit().catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "promo_batch");
        throw err;
      });
      setRefStatus('success');
      return;
    }

    setRefStatus('error');
  } catch (err) {
    console.error("Referral/Promo error:", err);
    // Already handled by throw from handleFirestoreError
    setRefStatus('error');
  }
};

  if (activeSection === 'privacy') return <PrivacyView onBack={() => setActiveSection('main')} />;

  if (activeSection === 'notifications') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-900">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-black italic uppercase text-neutral-900">Notifications</h2>
        </header>
        <div className="space-y-3 font-urdu">
          {notifications.length === 0 ? (
            <div className="bg-white border border-neutral-100 p-8 rounded-3xl text-center">
              <Bell className="mx-auto text-neutral-200 mb-2" size={32} />
              <p className="text-neutral-400 font-bold uppercase text-[10px]">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => markAsRead(n.id)}
                className={`p-4 rounded-2xl border ${n.read ? 'bg-neutral-50/50 border-neutral-100' : 'bg-white border-orange-500/20 shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className={`font-bold text-sm ${n.read ? 'text-neutral-700' : 'text-orange-500'}`}>{n.title}</p>
                  {!n.read && <div className="w-2 h-2 bg-orange-500 rounded-full mt-1" />}
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">{n.body}</p>
                <p className="text-[8px] text-neutral-400 font-bold uppercase mt-2">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    );
  }

  if (activeSection === 'language') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-900">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-black italic uppercase text-neutral-900">Language / زبان</h2>
        </header>
        <div className="space-y-4">
          <button 
            onClick={() => toggleLanguage('en')}
            className={`w-full p-6 rounded-3xl border flex items-center justify-between group transition-all ${profile?.language === 'en' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-900'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center font-black text-neutral-900">EN</div>
              <span className="font-bold">English (US)</span>
            </div>
            {profile?.language === 'en' && <Check size={20} />}
          </button>
          <button 
            onClick={() => toggleLanguage('ur')}
            className={`w-full p-6 rounded-3xl border flex items-center justify-between group transition-all ${profile?.language === 'ur' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-900'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center font-urdu font-black text-lg text-neutral-900">اردو</div>
              <div className="text-left">
                <p className="font-bold">Urdu</p>
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest font-urdu">اردو زبان منتخب کریں</p>
              </div>
            </div>
            {profile?.language === 'ur' && <Check size={20} />}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`space-y-8 pb-24 ${profile?.language === 'ur' ? 'font-urdu' : ''} text-white`}
    >
      <header className="flex flex-col items-center py-8 space-y-6">
        <div className="relative group p-3">
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full border border-dashed border-orange-500/10 animate-spin-slow" />
          
          <div className="relative">
             <div className="absolute inset-0 bg-orange-500 rounded-[1.5rem] blur-xl opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
             <div className="relative w-24 h-24 rounded-[1.5rem] border-2 border-[#14254f] p-1 shadow-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600">
               <img 
                 src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
                 alt="Profile" 
                 className="w-full h-full rounded-[1.2rem] object-cover bg-[#0b0e11]"
                 referrerPolicy="no-referrer"
               />
             </div>
             
             <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-lg shadow-xl border-2 border-[#1b2a5c]">
                <Zap size={10} fill="currentColor" />
             </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{profile?.displayName}</h2>
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/10">
               <Shield size={8} className="text-orange-500" />
               <span className="text-orange-500 text-[8px] font-black uppercase tracking-widest">{profile?.role}</span>
            </div>
            <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] font-mono">{profile?.email?.split('@')[0]}</p>
          </div>
        </div>
      </header>

      {/* Admin Section */}
      {(profile?.role === 'admin' || isAdminEmail) && (
        <section className="mx-6 relative">
          <div className="relative bg-[#14254f] border border-white/10 rounded-[1.5rem] p-6 space-y-4 shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:scale-110 transition-transform duration-700">
               <Shield size={60} className="text-blue-500" />
            </div>
            <div className="space-y-0.5 relative z-10">
              <h3 className="font-black text-white text-sm italic uppercase tracking-tight flex items-center gap-2">
                <Shield size={16} className="text-blue-500" /> System Core
              </h3>
              <p className="text-[8px] text-white/30 font-black uppercase tracking-widest font-mono">Administrative Matrix</p>
            </div>
            <button 
              onClick={() => navigate('/admin')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-black italic uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-all relative z-10"
            >
              Control Center
            </button>
          </div>
        </section>
      )}

      {/* Invite & Social */}
      <section className="mx-6">
        <div className="bg-[#14254f] border border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 right-0 p-3">
             <div className="px-2 py-0.5 bg-green-500/10 rounded-full text-[7px] font-black text-green-400 uppercase tracking-widest border border-green-500/10">Active</div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-0.5">
              <h3 className="font-black italic text-white uppercase text-base tracking-tight flex items-center gap-2">
                <Share2 size={18} className="text-orange-500" /> Referral Hash
              </h3>
              <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] font-mono pl-1">Network Identity</p>
            </div>
            
            <div 
              onClick={copyToClipboard}
              className="flex items-center justify-between bg-black/20 border border-white/5 p-4 rounded-2xl cursor-pointer group hover:bg-white/5 transition-all relative overflow-hidden"
            >
              <div className="flex flex-col relative z-10">
                 <span className="text-[7px] font-black text-white/10 uppercase tracking-widest mb-0.5 font-mono">Unique Identifier</span>
                 <span className="font-mono font-black text-xl tracking-[0.2em] text-white italic">{profile?.inviteCode}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl text-white/40 group-hover:text-white group-hover:bg-orange-500 transition-all relative z-10 shadow-lg">
                <span className="text-[9px] font-black uppercase tracking-widest">{copied ? 'OK' : 'COPY'}</span>
                {copied ? <Check size={14} className="text-white" /> : <Copy size={14} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protocols Selection */}
      <section className="px-6 space-y-3">
        <div className="flex items-center justify-between px-1">
           <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] font-mono">Protocols</h3>
           <div className="h-px flex-1 mx-3 bg-white/5" />
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'notifications', icon: Bell, label: "Relay Node", color: "text-blue-400", bg: "bg-blue-400/5", border: "border-blue-500/10", badge: notifications.filter(n => !n.read).length, desc: "Global broadcasts" },
            { id: 'privacy', icon: Shield, label: "Encryption", color: "text-green-400", bg: "bg-green-400/5", border: "border-green-500/10", desc: "Data & sessions" },
            { id: 'language', icon: Globe, label: "Localization", color: "text-orange-400", bg: "bg-orange-400/5", border: "border-orange-500/10", desc: "Language selection" },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveSection(item.id as ActiveSection)}
              className="w-full flex items-center justify-between bg-[#14254f] p-4 rounded-2xl hover:bg-white/5 transition-all group border border-white/5 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center ${item.color} border ${item.border}`}>
                  <item.icon size={20} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-black italic text-base text-white uppercase tracking-tight leading-none">{item.label}</span>
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.1em] font-mono mt-1">{item.desc}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.badge ? (
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black shadow-lg shadow-red-500/20 animate-pulse">
                    {item.badge}
                  </span>
                ) : null}
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/10 group-hover:bg-orange-500 group-hover:text-white transition-all">
                   <ChevronRight size={16} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="px-6 pt-4 pb-12">
        <button 
          onClick={() => signOut(auth)}
          className="w-full bg-[#0b0e11]/50 border border-red-500/10 text-red-500/60 py-4 rounded-xl font-black italic uppercase tracking-[0.25em] flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all text-xs"
        >
          <LogOut size={16} /> 
          Terminate Session
        </button>
      </div>
    </motion.div>
  );
}
