/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, getDoc, setDoc, getDocFromServer, onSnapshot, writeBatch } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./lib/firestore-errors";
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
      <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans selection:bg-orange-500/30">
        <div className="pb-24 max-w-lg mx-auto bg-white border-x border-neutral-100 min-h-screen relative shadow-sm overflow-x-hidden">
          {/* Top Bar */}
          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {systemConfig?.appLogo ? (
                <img 
                  src={systemConfig.appLogo} 
                  alt="Logo" 
                  className="w-10 h-10 object-contain p-0.5" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-neutral-500/20">h</div>
              )}
              <span className="font-black text-xl tracking-tighter uppercase italic">h<span className="text-orange-500">666</span></span>
            </div>
            <div className="flex items-center gap-4">
              <Search size={20} className="text-neutral-400 hover:text-orange-500 transition-colors cursor-pointer" />
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
