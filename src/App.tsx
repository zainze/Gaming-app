/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, getDoc, setDoc, getDocFromServer, onSnapshot, writeBatch, updateDoc, increment, deleteField, addDoc, collection } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  Home, 
  Gamepad2, 
  Wallet, 
  User as UserIcon, 
  Settings, 
  Gift, 
  Share2,
  Bell,
  Search,
  LayoutDashboard
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
          // Verify session still exists and is active before crediting
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

             console.log(`Arcade Reward Credited: RS ${session.reward} for ${session.title}`);
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
    // Connection test (silent)
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'system', 'connection_test'));
      } catch (error) {
        // Log quietly once
        console.debug("Firebase connection check:", error);
      }
    };
    testConnection();

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Cleanup previous profile listener if user changes
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
            // Profile creation logic
            (async () => {
              try {
                const adminCheckRef = doc(db, "system", "admin_check");
                const adminCheck = await getDoc(adminCheckRef).catch(err => {
                  handleFirestoreError(err, OperationType.GET, "system/admin_check");
                  throw err;
                });
                
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

                const configSnap = await getDoc(doc(db, "system", "config")).catch(err => {
                  handleFirestoreError(err, OperationType.GET, "system/config");
                  throw err;
                });
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

                await batch.commit().catch(err => {
                  handleFirestoreError(err, OperationType.WRITE, "profile_init_batch");
                  throw err;
                });
              } catch (err) {
                console.error("Profile creation error:", err);
              }
            })();
            // snapshot will trigger again after setDoc
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
    // Config Listener
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
      }, 2500); // Minimum splash time
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (splashVisible) {
    return <SplashScreen logo={systemConfig?.appLogo} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0b0e11] text-white font-sans selection:bg-orange-500/30">
        <div className="pb-24 max-w-lg mx-auto bg-[#1b2a5c] border-x border-white/5 min-h-screen relative shadow-2xl overflow-x-hidden">
          {/* Top Bar - Only show if not in a game/auth or if specifically needed */}
          <header className="sticky top-0 z-50 bg-[#14254f] border-b border-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-orange-500 p-1 rounded-md">
                 <Gamepad2 className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-black tracking-tighter italic text-white leading-none">988<span className="text-orange-500 italic">win</span></h1>
            </div>
            <div className="flex items-center gap-2">
              {profile?.balance !== undefined ? (
                <div className="bg-[#0b0e11] px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-black italic">RS {profile.balance.toLocaleString()}</span>
                </div>
              ) : (
                <Search size={20} className="text-neutral-400 hover:text-orange-500 transition-colors cursor-pointer" />
              )}
            </div>
          </header>

          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={user ? <HomeView profile={profile} /> : <Navigate to="/auth" />} />
              <Route path="/games" element={user ? <GamesView profile={profile} /> : <Navigate to="/auth" />} />
              <Route path="/wallet" element={user ? <WalletView profile={profile} /> : <Navigate to="/auth" />} />
              <Route path="/profile" element={user ? <ProfileView profile={profile} /> : <Navigate to="/auth" />} />
              <Route path="/admin" element={(user && (profile?.role === 'admin' || profile?.email === 'zainzeb333@gmail.com')) ? <AdminView /> : <Navigate to="/" />} />
              <Route path="/auth" element={!user ? <AuthView /> : <Navigate to="/" />} />
            </Routes>
          </AnimatePresence>

          {user && <Navigation />}
        </div>
      </div>
    </BrowserRouter>
  );
}
