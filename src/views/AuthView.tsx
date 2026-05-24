import { motion } from "motion/react";
import { LogIn, Sparkles, ShieldCheck, Gamepad2, Coins } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";

export default function AuthView() {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setLogo(snap.data().appLogo || null);
      }
    });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-orange-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-blue-500/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-12 relative z-10"
      >
        <div className="text-center space-y-4">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 bg-black rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-lime-500/10 rotate-12 overflow-hidden border border-[#65E902]/20"
          >
            <img 
              src={logo || "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1779478958/IMG-20260522-WA0007_ksqm2p.jpg"} 
              className="w-full h-full object-cover -rotate-12" 
              alt="Logo" 
              referrerPolicy="no-referrer" 
            />
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-neutral-900">H<span className="text-[#65E902]">666</span></h1>
            <p className="text-neutral-400 text-sm font-bold uppercase tracking-[0.3em]">H666.COM Games Hub</p>
          </div>
        </div>

        <section className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-neutral-100 p-4 rounded-3xl space-y-2 shadow-sm">
              <Coins className="text-orange-500" size={24} />
              <h3 className="font-bold text-xs uppercase italic text-neutral-900">Real Money</h3>
              <p className="text-[10px] text-neutral-400 leading-tight">Fast deposits and cash out.</p>
            </div>
            <div className="bg-white border border-neutral-100 p-4 rounded-3xl space-y-2 shadow-sm">
              <ShieldCheck className="text-blue-500" size={24} />
              <h3 className="font-bold text-xs uppercase italic text-neutral-900">Secure Play</h3>
              <p className="text-[10px] text-neutral-400 leading-tight">Fair games and safe info.</p>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              className="w-full bg-neutral-900 text-white py-4 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-neutral-800 transition-all active:scale-95"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
              Sign in with Google
            </button>
            <p className="text-[10px] text-center text-neutral-400 font-bold uppercase tracking-widest leading-loose">
              By playing, you agree to our Rules.
            </p>
          </div>
        </section>

        <section className="bg-orange-50 border border-orange-100 rounded-3xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500">
            <Sparkles size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-sm uppercase italic text-orange-500">New Player Gift</h4>
            <p className="text-[10px] text-neutral-600 font-medium">Join today and get RS 500 first deposit gift!</p>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
