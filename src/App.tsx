/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, getDoc, onSnapshot, writeBatch, updateDoc, increment, deleteField, addDoc, collection, getDocFromServer } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  Gamepad2, 
  Search,
  MessageCircle,
  Download
} from "lucide-react";

// Components
import Navigation from "./components/Navigation";
import HomeView from "./views/HomeView";
import GamesView from "./views/GamesView";
import WalletView from "./views/WalletView";
import ProfileView from "./views/ProfileView";
import AdminView from "./views/AdminView";
import AuthView from "./views/AuthView";
import SplashScreen from "./components/SplashScreen";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);

  // Background Arcade Reward Processing
  useEffect(() => {
    if (profile?.arcadeSession?.status === 'active' && user) {
      const session = profile.arcadeSession;
      const startTime = new Date(session.startTime).getTime();
      const now = Date.now();
      const durationMs = (Number(session.duration) || 60) * 1000;
      const timeElapsed = now - startTime;

      const creditReward = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const freshSnap = await getDoc(userRef);
          if (freshSnap.exists() && freshSnap.data()?.arcadeSession?.status === 'active') {
             await updateDoc(userRef, {
               balance: increment(Number(session.reward) || 0),
               xp: increment((Number(session.reward) || 0) * 2),
               arcadeSession: deleteField()
             });

             await addDoc(collection(db, "transactions"), {
                userId: user.uid,
                amount: Number(session.reward) || 0,
                type: 'win',
                status: 'completed',
                method: 'Arcade Reward',
                accountName: profile.displayName || profile.email,
                createdAt: new Date().toISOString()
             });
          }
        } catch (err) {
          console.error("Failed to credit background arcade reward:", err);
        }
      };

      if (timeElapsed >= durationMs) {
        creditReward();
      } else {
        const timer = setTimeout(creditReward, durationMs - timeElapsed);
        return () => clearTimeout(timer);
      }
    }
  }, [profile?.arcadeSession, user]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'system', 'connection_test'));
      } catch (error) {
        console.debug("Firebase connection check:", error);
      }
    };
    testConnection();

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
            setLoading(false);
          } else {
            (async () => {
              try {
                const adminCheckRef = doc(db, "system", "admin_check");
                const adminCheck = await getDoc(adminCheckRef);
                
                const batch = writeBatch(db);
                let role = "user";

                if (!adminCheck.exists()) {
                  role = "admin";
                  batch.set(adminCheckRef, { first_admin: firebaseUser.uid });
                  batch.set(doc(db, "admins", firebaseUser.uid), { 
                    email: firebaseUser.email,
                    grantedAt: new Date().toISOString() 
                  });
                } else if (adminCheck.data()?.first_admin === firebaseUser.uid) {
                  role = "admin";
                }

                const configSnap = await getDoc(doc(db, "system", "config"));
                const joiningBonus = configSnap.exists() ? (Number(configSnap.data().joiningBonus) || 0) : 100;

                const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                const newProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "New User",
                  balance: joiningBonus,
                  role: role,
                  language: 'en',
                  favorites: [],
                  inviteCode: inviteCode,
                  winStreak: 0,
                  lossCount: 0,
                  lastCycleReset: new Date().toISOString(),
                  createdAt: new Date().toISOString()
                };
                
                batch.set(userDocRef, newProfile);
                batch.set(doc(db, "invite_codes", inviteCode), {
                  uid: firebaseUser.uid
                });

                await batch.commit();
              } catch (err) {
                console.error("Profile creation error:", err);
              }
            })();
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setSystemConfig(snap.data());
      }
    });
    return () => unsubConfig();
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setSplashVisible(false);
      }, 2500); 
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (splashVisible) {
    return <SplashScreen logo={systemConfig?.appLogo} appName={systemConfig?.appName} />;
  }

  return (
    <BrowserRouter>
       <AppContent 
         user={user} 
         profile={profile} 
         systemConfig={systemConfig} 
       />
    </BrowserRouter>
  );
}

function AppContent({ user, profile, systemConfig }: any) {
  const navigate = useNavigate();
  const location = useLocation();
  const onNavigate = (path: string) => {
    navigate('/' + path);
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-white font-sans selection:bg-orange-500/30">
      <div className="pb-24 max-w-lg mx-auto bg-[#1b2a5c] border-x border-white/5 min-h-screen relative shadow-2xl overflow-x-hidden">
        <header className="sticky top-0 z-50 bg-[#14254f]/90 backdrop-blur-xl border-b border-white/5 px-4 py-2.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            {systemConfig?.appLogo ? (
              <img 
                src={systemConfig.appLogo} 
                alt="Logo" 
                className="h-6 w-6 object-contain opacity-90 rounded-[5px]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <img 
                src="https://res.cloudinary.com/dpmjzqhdh/image/upload/v1779478958/IMG-20260522-WA0007_ksqm2p.jpg" 
                alt="Logo" 
                className="h-6 w-6 object-contain opacity-90 rounded-[5px]"
                referrerPolicy="no-referrer"
              />
            )}
            <h1 className="text-sm font-black tracking-tighter italic text-white leading-none">
              {systemConfig?.appName || (
                <>H<span className="text-[#65E902]">666</span></>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {location.pathname === '/games' && systemConfig?.appDownloadUrl && (
              <a 
                href={systemConfig.appDownloadUrl}
                download
                className="bg-gradient-to-r from-[#65E902] to-emerald-500 text-black px-2.5 py-1 rounded-lg flex items-center gap-1 hover:scale-105 active:scale-95 transition-all shadow-[0_0_12px_rgba(101,233,2,0.4)] border border-lime-400/30 font-black animate-pulse"
              >
                <Download size={10} className="stroke-[3]" />
                <span className="text-[8.5px] uppercase tracking-wider italic">App</span>
              </a>
            )}
            {profile?.balance !== undefined ? (
              <div className="bg-black/40 px-2.5 py-1 rounded-lg border border-white/5 flex items-center gap-2 shadow-inner">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black italic tracking-tighter text-white/90">PKR {profile.balance.toLocaleString()}</span>
              </div>
            ) : (
              <Search size={16} className="text-white/20 hover:text-white transition-colors cursor-pointer" />
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={user ? <HomeView profile={profile} onNavigate={onNavigate} /> : <Navigate to="/auth" />} />
            <Route path="/games" element={user ? <GamesView profile={profile} onNavigate={onNavigate} /> : <Navigate to="/auth" />} />
            <Route path="/wallet" element={user ? <WalletView profile={profile} /> : <Navigate to="/auth" />} />
            <Route path="/profile" element={user ? <ProfileView profile={profile} /> : <Navigate to="/auth" />} />
            <Route path="/admin" element={(user && (profile?.role === 'admin' || profile?.email === 'zainzeb333@gmail.com')) ? <AdminView /> : <Navigate to="/" />} />
            <Route path="/auth" element={!user ? <AuthView /> : <Navigate to="/" />} />
          </Routes>
        </AnimatePresence>

        {user && <Navigation />}

        {systemConfig?.whatsappUrl && (
          <motion.a
            href={systemConfig.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-24 right-4 z-[60] bg-[#25D366] text-white p-3.5 rounded-full shadow-2xl hover:shadow-[#25D366]/40 transition-all border-2 border-white/20"
          >
            <MessageCircle size={24} fill="currentColor" className="text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-bounce" />
          </motion.a>
        )}
      </div>
    </div>
  );
}
