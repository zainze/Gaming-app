import { motion, AnimatePresence } from "motion/react";
import { LogOut, Share2, Shield, Globe, Bell, ChevronRight, Copy, Check, ArrowLeft, Zap, Gift, AlertCircle, CheckCircle2, Volume2, Music, SlidersHorizontal, Gamepad2 } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs, limit, increment, addDoc, writeBatch, getDoc, setDoc } from "firebase/firestore";
import { playSound, getSoundSettings, updateSoundSettings, bgmTracks } from "../lib/sounds";
import PrivacyView from "./PrivacyView";

type ActiveSection = 'main' | 'notifications' | 'privacy' | 'language' | 'favorites' | 'audio_settings';

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
    playSound("click");
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
    const inputCode = (inputRaw.includes('/') ? inputRaw.replace(/\/+$/, '').split('/').pop() : inputRaw)?.toUpperCase().trim() || "";
    
    if (!inputCode) {
      setRefStatus('error');
      playSound("error" as any);
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
          setDoc(doc(db, "invite_codes", inputCode), { uid: referrerId });
        }
      }
      
      if (referrerId) {
        if (referrerId === profile.uid) {
          setRefStatus('error');
          playSound("error" as any);
          return;
        }

        const batch = writeBatch(db);
        
        batch.update(doc(db, "users", profile.uid), { referredBy: referrerId });
        batch.update(doc(db, "users", referrerId), { balance: increment(referralReward) });

        const refId = `${profile.uid}_${referrerId}`;
        batch.set(doc(db, "referrals", refId), {
          referrerId: referrerId,
          referredId: profile.uid,
          rewardAmount: referralReward,
          createdAt: new Date().toISOString()
        });

        batch.set(doc(collection(db, "transactions")), {
          userId: referrerId,
          amount: referralReward,
          type: 'referral',
          status: 'completed',
          createdAt: new Date().toISOString()
        });

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
        playSound("success" as any);
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
          playSound("error" as any);
          return;
        }

        const batch = writeBatch(db);
        
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
        
        batch.update(doc(db, "promo_codes", inputCode), {
          usedBy: [...(promo.usedBy || []), profile.uid]
        });

        await batch.commit().catch(err => {
          handleFirestoreError(err, OperationType.WRITE, "promo_batch");
          throw err;
        });
        setRefStatus('success');
        playSound("success" as any);
        return;
      }

      setRefStatus('error');
      playSound("error" as any);
    } catch (err) {
      console.error("Referral/Promo error:", err);
      setRefStatus('error');
    }
  };

  if (activeSection === 'privacy') return <PrivacyView onBack={() => setActiveSection('main')} />;

  if (activeSection === 'audio_settings') {
    const audioState = getSoundSettings();

    const handleSFXToggle = () => {
      playSound("click");
      updateSoundSettings({ sfxEnabled: !audioState.sfxEnabled });
    };

    const handleBGMToggle = () => {
      playSound("click");
      updateSoundSettings({ bgmEnabled: !audioState.bgmEnabled });
    };

    const handleVolumeChange = (volList: number) => {
      updateSoundSettings({ bgmVolume: volList });
    };

    const handleGameBGMSelection = (gameId: string, trackKey: string) => {
      playSound("click");
      const updatedBgms = { ...audioState.gameBgms, [gameId]: trackKey };
      updateSoundSettings({ gameBgms: updatedBgms });
    };

    const handleGameSFXTheme = (gameId: string, themeKey: string) => {
      playSound("click");
      const updatedThemes = { ...audioState.gameThemes, [gameId]: themeKey };
      updateSoundSettings({ gameThemes: updatedThemes });
    };

    // Human friendly list of available games for selection
    const gamesList = [
      { id: 'aviator', name: 'Aviator', category: 'Crash / Space' },
      { id: 'rocket_crash', name: 'Rocket', category: 'Crash / Space' },
      { id: 'dojo_cards', name: 'Dojo', category: 'Martial Dojo' },
      { id: 'dragon_tiger', name: 'Dragon Tiger', category: 'Martial Dojo' },
      { id: 'teen_patti', name: 'Teen Patti', category: 'Martial Dojo' },
      { id: 'slipper', name: 'Slipper', category: 'Martial Dojo' },
      { id: 'fruit_slots', name: 'Slots', category: 'Fruit Slots & Wheels' },
      { id: 'coin', name: 'Coin', category: 'Matrix Cyber' },
      { id: 'goal_kick', name: 'Goal Kick', category: 'Sports Arena' },
      { id: 'swipe', name: 'Swipe', category: 'Sports Arena' },
      { id: 'plinko', name: 'Plinko', category: 'Bouncy Physics' },
      { id: 'dice', name: 'Dice', category: 'Bouncy Physics' },
      { id: 'space_dice', name: 'Space Dice', category: 'Bouncy Physics' },
      { id: 'color_match', name: 'Match', category: 'Bouncy Physics' },
      { id: 'chests', name: 'Chests', category: 'Default Theme' },
      { id: 'treasure_hunt', name: 'Treasure', category: 'Default Theme' },
      { id: 'fruit_ninja', name: 'Ninja', category: 'Sports Arena' },
      { id: 'sushi_strike', name: 'Sushi', category: 'Default Theme' },
      { id: 'mines', name: 'Mines', category: 'Default Theme' }
    ];

    const bgmTrackOptions = [
      { key: 'none', label: 'None/Mute 🔇' },
      { key: 'synthwave', label: 'Neon Synthwave 🎵' },
      { key: 'electro', label: 'Cyber Electro ⚡' },
      { key: 'retro8bit', label: '8-Bit Arcade 👾' },
      { key: 'zen', label: 'Mystical Zen 🧘' },
      { key: 'stadium', label: 'Epic Stadium 🏆' },
      { key: 'chill', label: 'Lounge Chill ☕' }
    ];

    const sfxThemeOptions = [
      { key: 'default', label: 'Classic Casino 🔔' },
      { key: 'crash', label: 'Crash & Space 🚀' },
      { key: 'dojo', label: 'Martial Dojo ☯️' },
      { key: 'slots', label: 'Fruit Slots 🍒' },
      { key: 'cyber', label: 'Matrix Cyber 💻' },
      { key: 'sports', label: 'Sports Arena ⚽' },
      { key: 'bounce', label: 'Bouncy Physics ⚪' }
    ];

    return (
      <div className="min-h-screen bg-[#F2F4F8] pb-32 text-neutral-800 font-sans select-none antialiased animate-fadeIn">
        <header className="bg-[#2196F3] text-white px-4 py-3.5 flex items-center justify-between shadow-md relative z-20">
          <button 
            onClick={() => {
              playSound("click");
              setActiveSection('main');
            }}
            className="p-1 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center animate-pulse"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
          <h1 className="text-[19px] font-bold tracking-tight text-white pl-3">Audio & Themes</h1>
          <div className="w-10" />
        </header>

        <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">
          {/* Global Toggle Controller Card */}
          <div className="bg-white border border-[#2196F3]/40 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-neutral-100">
              <SlidersHorizontal size={14} className="text-[#2196F3]" /> Master Audio Settings
            </h3>

            {/* Sound effects toggle */}
            <div className="flex items-center justify-between py-1">
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-neutral-700">Sound Effects (SFX)</span>
                <span className="text-[10px] text-neutral-400 font-semibold">In-game responses, spin ticks and click feedback</span>
              </div>
              <button 
                onClick={handleSFXToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 outline-none ${
                  audioState.sfxEnabled ? 'bg-[#2196F3]' : 'bg-neutral-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  audioState.sfxEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Background Music Toggle */}
            <div className="flex items-center justify-between py-1 border-t border-neutral-50 pt-3">
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-neutral-700">Ambient Background Music (BGM)</span>
                <span className="text-[10px] text-neutral-400 font-semibold">Continuous streaming loops dynamically adapted to games</span>
              </div>
              <button 
                onClick={handleBGMToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 outline-none ${
                  audioState.bgmEnabled ? 'bg-[#2196F3]' : 'bg-neutral-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  audioState.bgmEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* BGM Volume Slider */}
            {audioState.bgmEnabled && (
              <div className="space-y-2 pt-3 border-t border-neutral-50">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-500">
                  <span className="flex items-center gap-1"><Volume2 size={13} /> Music Volume</span>
                  <span>{Math.round(audioState.bgmVolume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="0.4" 
                  step="0.01" 
                  value={audioState.bgmVolume} 
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-[#2196F3]"
                />
                <span className="text-[9px] text-neutral-400 font-medium block italic text-right">Low ambient audio is recommended for balanced focus</span>
              </div>
            )}
          </div>

          {/* Individual Games Audio & Style Themes Customizer */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest pl-1 flex items-center gap-1">
              <Gamepad2 size={14} className="text-[#2196F3]" /> Per-Game Soundtrack & Theme ({gamesList.length} Games)
            </h3>

            <div className="space-y-3.5">
              {gamesList.map((game) => {
                const activeBgm = audioState.gameBgms[game.id] || 'none';
                const activeTheme = audioState.gameThemes[game.id] || 'default';

                return (
                  <div key={game.id} className="bg-white border border-[#2196F3]/10 rounded-2xl p-4.5 shadow-sm hover:border-[#2196F3]/30 transition-all flex flex-col space-y-3">
                    {/* Game header */}
                    <div className="flex justify-between items-center pb-2.5 border-b border-neutral-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 text-[#2196F3]">
                          <Gamepad2 size={15} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-xs text-neutral-700 tracking-tight">{game.name}</span>
                          <span className="text-[8.5px] font-bold text-neutral-400 uppercase tracking-wider">{game.category}</span>
                        </div>
                      </div>
                      <span className="text-[8.5px] font-mono bg-neutral-50 text-neutral-500 px-2.5 py-0.5 rounded font-black uppercase border border-neutral-200/50">
                        {game.id}
                      </span>
                    </div>

                    {/* Controls Row */}
                    <div className="grid grid-cols-2 gap-3.5 pt-0.5">
                      {/* BGM Select list */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-black text-[#2196F3] uppercase tracking-wider flex items-center gap-1">
                          <Music size={10} /> Music Loop
                        </label>
                        <select 
                          value={activeBgm} 
                          onChange={(e) => handleGameBGMSelection(game.id, e.target.value)}
                          className="w-full text-[11px] font-extrabold bg-neutral-50 border border-neutral-200 hover:bg-neutral-100/50 transition-colors rounded-xl p-2.5 outline-none cursor-pointer text-neutral-700"
                        >
                          {bgmTrackOptions.map(opt => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* SFX Select list */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-black text-amber-500 uppercase tracking-wider flex items-center gap-1">
                          <Volume2 size={10} /> SFX Signature
                        </label>
                        <select 
                          value={activeTheme} 
                          onChange={(e) => handleGameSFXTheme(game.id, e.target.value)}
                          className="w-full text-[11px] font-extrabold bg-neutral-50 border border-neutral-200 hover:bg-neutral-100/50 transition-colors rounded-xl p-2.5 outline-none cursor-pointer text-neutral-700"
                        >
                          {sfxThemeOptions.map(opt => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'privacy') return <PrivacyView onBack={() => setActiveSection('main')} />;

  if (activeSection === 'notifications') {
    return (
      <div className="min-h-screen bg-[#F2F4F8] pb-32 text-neutral-800 font-sans select-none antialiased">
        {/* Blue Top Action Header */}
        <header className="bg-[#2196F3] text-white px-4 py-3.5 flex items-center justify-between shadow-md relative z-20">
          <button 
            onClick={() => {
              playSound("click");
              setActiveSection('main');
            }}
            className="p-1 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center animate-pulse"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
          
          <h1 className="text-[19px] font-bold tracking-tight text-white pl-3">Notifications</h1>
          <div className="w-10" />
        </header>

        <div className="max-w-xl mx-auto px-4 pt-6 space-y-4">
          {notifications.length === 0 ? (
            <div className="bg-white border border-[#2196F3]/20 p-12 rounded-2xl text-center space-y-3 shadow-sm">
              <Bell className="mx-auto text-neutral-300 animate-bounce" size={40} />
              <p className="text-neutral-500 font-bold uppercase text-xs tracking-wider">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3 font-urdu">
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => {
                    playSound("click");
                    markAsRead(n.id);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer hover:bg-neutral-50 transition-colors ${
                    n.read 
                      ? 'bg-white border-neutral-200/80 shadow-sm' 
                      : 'bg-[#2196F3]/5 border-[#2196F3]/40 shadow-md ring-1 ring-offset-1 ring-[#2196F3]/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <p className={`font-black text-xs uppercase tracking-wide ${n.read ? 'text-neutral-500' : 'text-[#2196F3]'}`}>{n.title}</p>
                    {!n.read && <div className="w-2 h-2 bg-[#2196F3] rounded-full mt-1 animate-ping" />}
                  </div>
                  <p className="text-xs text-neutral-700 font-medium leading-relaxed">{n.body}</p>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase mt-2.5 font-mono">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeSection === 'language') {
    return (
      <div className="min-h-screen bg-[#F2F4F8] pb-32 text-neutral-800 font-sans select-none antialiased">
        {/* Blue Top Action Header */}
        <header className="bg-[#2196F3] text-white px-4 py-3.5 flex items-center justify-between shadow-md relative z-20">
          <button 
            onClick={() => {
              playSound("click");
              setActiveSection('main');
            }}
            className="p-1 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
          
          <h1 className="text-[19px] font-bold tracking-tight text-white pl-3">Language / زبان</h1>
          <div className="w-10" />
        </header>

        <div className="max-w-xl mx-auto px-4 pt-6">
          <div className="bg-white border border-[#2196F3]/40 rounded-2xl p-5 shadow-sm space-y-4">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Choose System Language:
            </label>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  playSound("click");
                  toggleLanguage('en');
                }}
                className={`w-full p-4 rounded-xl border flex items-center justify-between group transition-all active:scale-[0.99] ${
                  profile?.language === 'en' 
                    ? 'bg-blue-50/50 border-[#2196F3] text-[#2196F3] shadow-sm' 
                    : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center font-bold text-xs text-neutral-700">EN</div>
                  <span className="font-extrabold text-sm">English (US)</span>
                </div>
                {profile?.language === 'en' && <Check size={18} className="text-[#2196F3] stroke-[3]" />}
              </button>

              <button 
                onClick={() => {
                  playSound("click");
                  toggleLanguage('ur');
                }}
                className={`w-full p-4 rounded-xl border flex items-center justify-between group transition-all active:scale-[0.99] ${
                  profile?.language === 'ur' 
                    ? 'bg-blue-50/50 border-[#2196F3] text-[#2196F3] shadow-sm' 
                    : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center font-urdu font-black text-base text-neutral-700">اردو</div>
                  <div className="text-left font-urdu">
                    <p className="font-extrabold text-sm">Urdu / اردو</p>
                    <p className="text-[9px] text-neutral-400 font-semibold uppercase">اردو زبان منتخب کریں</p>
                  </div>
                </div>
                {profile?.language === 'ur' && <Check size={18} className="text-[#2196F3] stroke-[3]" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4F8] pb-32 text-neutral-800 font-sans select-none antialiased">
      {/* Blue Top Action Header */}
      <header className="bg-[#2196F3] text-white px-4 py-3.5 flex items-center justify-between shadow-md relative z-20">
        <button 
          onClick={() => {
            playSound("click");
            navigate(-1);
          }}
          className="p-1 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
        >
          <ArrowLeft size={22} className="text-white" />
        </button>

        <h1 className="text-[19px] font-bold tracking-tight text-white pl-3">My Profile</h1>

        <div className="bg-white text-neutral-900 font-bold px-3 py-1 rounded-full text-[14px] flex items-center gap-1 shadow-sm border border-black/5">
          <span className="text-[#2196F3] text-xs font-black">RS</span>
          <span>{Number(profile?.balance || 0).toLocaleString()}</span>
        </div>
      </header>

      {/* Main View Area */}
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        
        {/* User profile & Avatar Board */}
        <div className="bg-white border border-[#2196F3]/40 rounded-2xl p-6 shadow-sm flex flex-col items-center space-y-4 text-center">
          <div className="relative inline-block">
            {/* Pulsing visual spinner boundary */}
            <div className="absolute inset-0 rounded-full border border-dashed border-[#2196F3]/40 animate-spin-slow" />
            
            <div className="relative w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#2196F3] to-[#9C27B0]">
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover bg-neutral-100"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Active badge representation spark */}
            <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-white">
              <Zap size={8} fill="currentColor" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-neutral-800 uppercase tracking-tight">{profile?.displayName}</h2>
            <div className="flex items-center justify-center gap-2">
              <span className="bg-blue-50 border border-blue-200/80 text-[#2196F3] text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                {profile?.role || "Player"}
              </span>
              <span className="text-neutral-400 text-[10px] font-medium font-mono">{profile?.email?.split('@')[0]}</span>
            </div>
          </div>
        </div>

        {/* Invite & promo code center */}
        <div className="bg-white border border-[#2196F3]/40 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Referrals & Promos</h3>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold uppercase tracking-wider border border-emerald-100">Bonus Active</span>
          </div>
          
          {/* Own invite code */}
          <div 
            onClick={copyToClipboard}
            className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-neutral-100/50 transition-colors"
          >
            <div className="space-y-0.5">
              <span className="text-[9px] text-neutral-400 font-bold uppercase">My Referral Code</span>
              <p className="font-mono font-extrabold text-[#2196F3] text-lg tracking-wider italic">{profile?.inviteCode || "GETTING CODE..."}</p>
            </div>
            <button className="flex items-center gap-1 bg-[#2196F3] text-white px-3.5 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:opacity-90">
              {copied ? "COPIED" : "COPY"}
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>

          {/* Invitation and code entry field */}
          {!profile?.referredBy && (
            <div className="space-y-2 pt-1.5 border-t border-neutral-100">
              <p className="text-[10px] font-bold text-neutral-400 uppercase">Redeem Promo or Friend's Invite Code</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white border border-neutral-200/60 rounded-xl p-1 px-3 flex items-center shadow-inner">
                  <Gift size={16} className="text-[#2196F3] shrink-0" />
                  <input
                    type="text"
                    placeholder="Enter Invite / Promo Code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="w-full py-2 px-2 bg-transparent text-neutral-800 placeholder-neutral-400 text-xs font-semibold outline-none uppercase"
                  />
                </div>
                <button
                  onClick={() => {
                    playSound("click");
                    submitReferral();
                  }}
                  disabled={refStatus === "loading" || !referralCode.trim()}
                  className="bg-gradient-to-r from-[#2196F3] to-[#9C27B0] text-white font-bold text-xs px-4 rounded-xl shadow transition-all active:scale-95 disabled:opacity-40"
                >
                  {refStatus === "loading" ? "..." : "Claim"}
                </button>
              </div>

              {/* Refer Status indicators */}
              {refStatus === "success" && (
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-[10px] p-2.5 rounded-lg border border-emerald-100">
                  <CheckCircle2 size={13} />
                  <span className="font-semibold">Code redeemed successfully! Bonus reward loaded.</span>
                </div>
              )}
              {refStatus === "error" && (
                <div className="flex items-center gap-1.5 bg-red-50 text-red-600 text-[10px] p-2.5 rounded-lg border border-red-100">
                  <AlertCircle size={13} />
                  <span className="font-semibold">Invalid, unused, or expired code. Please retry.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Administration console if user is administrator */}
        {(profile?.role === 'admin' || isAdminEmail) && (
          <div className="bg-white border border-red-500/30 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-rose-100">
              <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={14} /> Admin Controls
              </h3>
              <span className="text-[8px] font-mono font-bold text-neutral-400">AUTHORIZED MEMBERS ONLY</span>
            </div>
            <button 
              onClick={() => {
                playSound("click");
                navigate('/admin');
              }}
              className="w-full bg-[#1C2070] text-white py-3 rounded-xl font-bold tracking-wider text-xs uppercase flex items-center justify-center gap-1.5 hover:bg-neutral-800 transition-colors shadow-sm"
            >
              Open Admin Board
            </button>
          </div>
        )}

        {/* Settings Links List Card Container */}
        <div className="bg-white border border-[#2196F3]/40 rounded-2xl p-2.5 shadow-sm divide-y divide-neutral-100">
          {[
            { id: 'notifications', icon: Bell, label: "Notifications", color: "text-blue-500", bg: "bg-blue-50 p-2.5 rounded-lg border border-blue-100", badge: notifications.filter(n => !n.read).length, desc: "System alerts and transaction notices" },
            { id: 'audio_settings', icon: Volume2, label: "Advanced Audio & Style Themes", color: "text-amber-500", bg: "bg-amber-55 bg-amber-50 p-2.5 rounded-lg border border-amber-100", desc: "Toggle background music, sound effects, & custom per-game values" },
            { id: 'privacy', icon: Shield, label: "Security & Encryption", color: "text-emerald-500", bg: "bg-emerald-50 p-2.5 rounded-lg border border-emerald-100", desc: "Terms, guidelines & privacy settings" },
            { id: 'language', icon: Globe, label: "Localization / زبان", color: "text-indigo-500", bg: "bg-indigo-50 p-2.5 rounded-lg border border-indigo-100", desc: "Change language settings of App" },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => {
                playSound("click");
                setActiveSection(item.id as ActiveSection);
              }}
              className="w-full flex items-center justify-between p-3 px-4 hover:bg-neutral-50/70 transition-all rounded-xl group text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`${item.bg} flex items-center justify-center ${item.color}`}>
                  <item.icon size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-neutral-800 tracking-tight leading-none">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-1 font-semibold">{item.desc}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {item.badge ? (
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[9px] font-black shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                ) : null}
                <div className="w-7 h-7 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-300 group-hover:bg-[#2196F3] group-hover:text-white transition-all">
                   <ChevronRight size={14} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Sign Out Container block */}
        <div className="pt-2">
          <button 
            onClick={() => {
              playSound("click");
              signOut(auth);
            }}
            className="w-full bg-red-50 border border-red-200 text-red-600 py-3.5 rounded-full font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-red-100 transition-all text-xs shadow-sm"
          >
            <LogOut size={16} /> 
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
