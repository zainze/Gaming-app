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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Connection test
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'system', 'connection_test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.error("Firebase is offline. Check configuration.");
        }
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

                const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                const newProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "New User",
                  balance: 100,
                  role: role,
                  language: 'en',
                  favorites: [],
                  inviteCode: inviteCode,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-orange-500/30">
        <div className="pb-24 max-w-lg mx-auto border-x border-neutral-800 min-h-screen relative shadow-2xl overflow-x-hidden">
          {/* Top Bar */}
          <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-orange-900/20">P</div>
              <span className="font-bold text-xl tracking-tight">PlayHub<span className="text-orange-500">Pro</span></span>
            </div>
            <div className="flex items-center gap-4">
              <Search size={20} className="text-neutral-500 hover:text-orange-500 transition-colors cursor-pointer" />
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
