import { motion } from "motion/react";
import { LogOut, Share2, Shield, User as UserIcon, Heart, Globe, Bell, ChevronRight, Copy, Check, ArrowLeft, Languages, Trash2, Zap } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs, limit, increment, addDoc } from "firebase/firestore";
import PrivacyView from "./PrivacyView";

type ActiveSection = 'main' | 'notifications' | 'privacy' | 'language' | 'favorites';

export default function ProfileView({ profile }: { profile: any }) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('main');
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();

  const isAdminEmail = profile?.email === 'zainzeb333@gmail.com';

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const submitReferral = async () => {
    if (!referralCode.trim() || profile?.referredBy) return;
    setRefStatus('loading');
    try {
      // Find the user with this invite code
      const q = query(collection(db, "users"), where("inviteCode", "==", referralCode.toUpperCase().trim()), limit(1));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setRefStatus('error');
        return;
      }

      const referrer = snap.docs[0].data();
      if (referrer.uid === profile.uid) {
        setRefStatus('error');
        return;
      }

      // 1. Mark current user as referred
      await updateDoc(doc(db, "users", profile.uid), { 
        referredBy: referrer.uid 
      });

      // 2. Add RS 50 to referrer balance
      await updateDoc(doc(db, "users", referrer.uid), {
        balance: increment(50)
      });

      // 3. Create referral record
      await addDoc(collection(db, "referrals"), {
        referrerId: referrer.uid,
        referredId: profile.uid,
        rewardAmount: 50,
        createdAt: new Date().toISOString()
      });

      // 4. Create transaction for referrer
      await addDoc(collection(db, "transactions"), {
        userId: referrer.uid,
        amount: 50,
        type: 'referral',
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // 5. Create notification for referrer
      await addDoc(collection(db, "notifications"), {
        userId: referrer.uid,
        title: "Referral Reward! 🎉",
        body: `Congratulations! ${profile.displayName} used your code. RS 50 added to balance.`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString()
      });

      setRefStatus('success');
    } catch (err) {
      console.error("Referral error:", err);
      setRefStatus('error');
    }
  };

  if (activeSection === 'privacy') return <PrivacyView onBack={() => setActiveSection('main')} />;

  if (activeSection === 'notifications') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-black italic uppercase">Notifications</h2>
        </header>
        <div className="space-y-3 font-urdu">
          {notifications.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl text-center">
              <Bell className="mx-auto text-neutral-800 mb-2" size={32} />
              <p className="text-neutral-500 font-bold uppercase text-[10px]">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => markAsRead(n.id)}
                className={`p-4 rounded-2xl border ${n.read ? 'bg-neutral-900/50 border-neutral-800/50' : 'bg-neutral-900 border-orange-500/20 shadow-lg shadow-orange-500/5'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className={`font-bold text-sm ${!n.read && 'text-orange-500'}`}>{n.title}</p>
                  {!n.read && <div className="w-2 h-2 bg-orange-500 rounded-full mt-1" />}
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">{n.body}</p>
                <p className="text-[8px] text-neutral-600 font-bold uppercase mt-2">{new Date(n.createdAt).toLocaleString()}</p>
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
          <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-black italic uppercase">Language / زبان</h2>
        </header>
        <div className="space-y-4">
          <button 
            onClick={() => toggleLanguage('en')}
            className={`w-full p-6 rounded-3xl border flex items-center justify-between group transition-all ${profile?.language === 'en' ? 'bg-orange-500 border-orange-400' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black">EN</div>
              <span className="font-bold">English (US)</span>
            </div>
            {profile?.language === 'en' && <Check size={20} />}
          </button>
          <button 
            onClick={() => toggleLanguage('ur')}
            className={`w-full p-6 rounded-3xl border flex items-center justify-between group transition-all ${profile?.language === 'ur' ? 'bg-orange-500 border-orange-400' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-urdu font-black text-lg">اردو</div>
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

  if (activeSection === 'favorites') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-black italic uppercase">Favorites</h2>
        </header>
        <div className="space-y-4">
          {(!profile?.favorites || profile.favorites.length === 0) ? (
            <div className="bg-neutral-900 border border-neutral-800 p-12 rounded-3xl text-center space-y-4">
              <Heart className="mx-auto text-neutral-800" size={48} />
              <p className="text-neutral-500 font-bold uppercase text-xs">No favorites added yet</p>
            </div>
          ) : (
            profile.favorites.map((fav: string) => (
              <div key={fav} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                    <Zap size={18} />
                  </div>
                  <span className="font-bold uppercase text-sm">{fav}</span>
                </div>
                <button className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`p-4 space-y-6 ${profile?.language === 'ur' ? 'font-urdu' : ''}`}
    >
      <header className="flex flex-col items-center py-8 space-y-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-orange-500 p-1 shadow-2xl shadow-orange-500/20">
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
              alt="Profile" 
              className="w-full h-full rounded-full object-cover bg-neutral-800"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute bottom-0 right-0 bg-neutral-900 border border-neutral-700 p-1.5 rounded-full text-green-500">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black">{profile?.displayName}</h2>
          <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">{profile?.role}</p>
        </div>
      </header>

      {/* Admin Section */}
      {(profile?.role === 'admin' || isAdminEmail) && (
        <section className="bg-neutral-900 border border-orange-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold flex items-center gap-2 text-orange-500">
                <Shield size={18} /> Admin Dashboard
              </h3>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight">Main Admin: zainzeb333@gmail.com</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin')}
            className="w-full bg-orange-500 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
          >
            Enter Admin Panel
          </button>
        </section>
      )}

      {/* Referral Section */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 bg-gradient-to-br from-orange-500/10 to-transparent flex items-center justify-between border-b border-neutral-800">
          <div className="space-y-1">
            <h3 className="font-bold flex items-center gap-2">
              <Share2 size={18} className="text-orange-500" /> Invite & Earn
            </h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight">Earn RS 50 on every friend's registration</p>
          </div>
          <div className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">Active</div>
        </div>
        
        <div className="p-6 space-y-4">
          {!profile?.referredBy ? (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Been invited? Enter Code</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="EX: ABCD12"
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 font-mono font-bold text-sm uppercase placeholder:text-neutral-700 focus:border-orange-500 outline-none transition-colors"
                />
                <button 
                  onClick={submitReferral}
                  disabled={refStatus === 'loading' || refStatus === 'success'}
                  className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${refStatus === 'success' ? 'bg-green-500 text-white' : 'bg-white text-black'}`}
                >
                  {refStatus === 'loading' ? '...' : refStatus === 'success' ? 'Applied' : 'Apply'}
                </button>
              </div>
              {refStatus === 'error' && <p className="text-red-500 text-[10px] font-bold uppercase pl-1 animate-pulse">Invalid or expired code</p>}
            </div>
          ) : (
            <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-2xl flex items-center gap-3">
              <Check className="text-green-500" size={16} />
              <p className="text-[10px] text-green-500 font-bold uppercase">Referral benefits active</p>
            </div>
          )}

          <div className="pt-2">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1 mb-2">Your Invite Code</p>
            <div 
              onClick={copyToClipboard}
              className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-4 rounded-2xl cursor-pointer group hover:border-orange-500/50 transition-colors"
            >
              <span className="font-mono font-black text-lg tracking-widest text-orange-500">{profile?.inviteCode}</span>
              <div className="flex items-center gap-2 text-neutral-500 group-hover:text-neutral-300">
                <span className="text-[10px] font-bold uppercase">{copied ? 'Copied' : 'Copy'}</span>
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Settings Grid */}
      <section className="grid grid-cols-1 gap-2">
        <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-4 mb-2">Account Settings</h3>
        
        {[
          { id: 'notifications', icon: Bell, label: "Notifications", color: "text-blue-500", badge: notifications.filter(n => !n.read).length },
          { id: 'privacy', icon: Shield, label: "Security & Privacy", color: "text-green-500" },
          { id: 'language', icon: Globe, label: "Language / زبان", color: "text-purple-500" },
          { id: 'favorites', icon: Heart, label: "Favorites", color: "text-red-500" },
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveSection(item.id as ActiveSection)}
            className="flex items-center justify-between bg-neutral-900/50 p-4 rounded-2xl hover:bg-neutral-800 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center ${item.color} relative`}>
                <item.icon size={20} />
                {item.badge ? (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black border-2 border-neutral-900">{item.badge}</span>
                ) : null}
              </div>
              <span className="font-bold text-sm">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-neutral-600 group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </section>

      <div className="pt-4 pb-12">
        <button 
          onClick={() => signOut(auth)}
          className="w-full bg-red-500/10 border border-red-500/20 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
        >
          <LogOut size={20} /> Sign Out
        </button>
      </div>
    </motion.div>
  );
}
