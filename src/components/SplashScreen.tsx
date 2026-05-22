import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Plane, Cpu, ShieldCheck, RefreshCw } from "lucide-react";

interface SplashScreenProps {
  logo?: string;
  appName?: string;
}

export default function SplashScreen({ logo, appName }: SplashScreenProps) {
  const [dots, setDots] = useState("");
  
  // Custom logo from user request is used as the default premium branding
  const currentLogo = logo || "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1779478958/IMG-20260522-WA0007_ksqm2p.jpg";
  const displayAppName = appName || "H666";

  // Cycle through loader notes
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050608] flex flex-col items-center justify-between p-8 overflow-hidden select-none">
      
      {/* Background Jet-Speed Lines / Trails */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[120%] h-[1px] bg-gradient-to-r from-transparent via-[#65E902] to-transparent rotate-12" />
        <div className="absolute top-[40%] left-[-10%] w-[120%] h-[1px] bg-gradient-to-r from-transparent via-white to-transparent -rotate-6" />
        <div className="absolute top-[60%] left-[-10%] w-[120%] h-[1px] bg-gradient-to-r from-transparent via-[#65E902]/50 to-transparent rotate-45" />
        <div className="absolute top-[80%] left-[-10%] w-[120%] h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent -rotate-12" />
      </div>

      {/* Cyber Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ 
        backgroundImage: `
          linear-gradient(#65E902 1px, transparent 1px), 
          linear-gradient(90deg, #65E902 1px, transparent 1px)
        `, 
        backgroundSize: '30px 30px' 
      }} />

      {/* Neon Green Ambient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#65E902]/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-[250px] h-[250px] bg-emerald-500/5 blur-[90px] rounded-full pointer-events-none" />

      {/* Outer Glow Trajectory Arc */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050608] z-1" />

      {/* Invisible Top Header Spacer */}
      <div className="h-6" />

      {/* Centerpiece Hero Section */}
      <div className="flex flex-col items-center gap-6 relative z-10 w-full max-w-sm">
        
        {/* Soaring Airplane Micro-Animation */}
        <div className="relative w-64 h-24 overflow-visible pointer-events-none">
          {/* Arc trajectory line */}
          <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 256 96">
            <path 
              id="traj-path"
              d="M 12 80 C 60 72, 120 64, 230 32" 
              fill="none" 
              stroke="url(#green-grad)" 
              strokeWidth="1.5"
              strokeDasharray="4 2"
              className="opacity-40"
            />
            <defs>
              <linearGradient id="green-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#050608" stopOpacity="0" />
                <stop offset="50%" stopColor="#65E902" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Glowing flight jet coordinate */}
          <motion.div
            initial={{ offsetDistance: "0%", opacity: 0 }}
            animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
            style={{ 
              position: 'absolute',
              offsetPath: 'path("M 12 80 C 60 72, 120 64, 230 32")',
              offsetRotate: 'auto',
            }}
            transition={{ 
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="flex items-center justify-center"
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_#65E902,0_0_20px_#65E902]">
              <Plane size={14} className="text-[#65E902] -rotate-45 -translate-y-2 translate-x-1" />
            </div>
          </motion.div>
        </div>

        {/* Master H666 Rounded Brand Plate */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative group p-1.5 rounded-[2.5rem] bg-gradient-to-b from-neutral-800/40 via-neutral-900/40 to-black border border-white/5 shadow-2xl"
        >
          {/* High-intensity lime halo ring */}
          <div className="absolute -inset-4 bg-[#65E902]/10 blur-xl rounded-[3rem] group-hover:bg-[#65E902]/20 transition-all duration-700 pointer-events-none" />
          
          <div className="relative rounded-[2.2rem] overflow-hidden bg-black/95 aspect-square w-48 h-48 flex items-center justify-center p-0.5 border border-[#65E902]/20 shadow-[0_15px_30px_rgba(0,0,0,0.6)]">
            <img 
              src={currentLogo} 
              alt={displayAppName} 
              className="w-full h-full object-cover rounded-[2.1rem] select-none"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        {/* Dynamic Launch telemetry details */}
        <div className="w-full space-y-5 text-center px-4 mt-2">
          
          <div className="space-y-1">
            <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase flex items-center justify-center gap-1">
              H<span className="text-[#65E902]">666</span>
            </h1>
            <div className="flex items-center justify-center gap-2">
              <span className="h-0.5 w-6 bg-gradient-to-r from-transparent to-[#65E902]/60" />
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#65E902] italic">
                FLIGHT SECTOR ENGINE
              </span>
              <span className="h-0.5 w-6 bg-gradient-to-l from-transparent to-[#65E902]/60" />
            </div>
          </div>

          {/* Loader bar inspired by H666 dashboard speed lines */}
          <div className="space-y-3 pt-2">
            <div className="w-48 h-1 bg-neutral-950 rounded-full mx-auto relative overflow-hidden border border-white/5">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ 
                  duration: 2.3, 
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-gradient-to-r from-[#65E902]/40 via-[#65E902] to-white rounded-full shadow-[0_0_10px_#65E902]"
              />
            </div>
            
            <p className="text-[9px] font-mono tracking-widest text-[#65E902]/60 uppercase flex items-center justify-center gap-1.5 font-bold">
              <RefreshCw size={8} className="animate-spin text-[#65E902]" />
              SECURE LOADING{dots}
            </p>
          </div>
        </div>
      </div>

      {/* Styled H666.COM Pill Panel (Matching bottom pill of Logo) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="relative z-10 flex flex-col items-center gap-2.5 pb-6"
      >
        <div className="inline-flex items-center gap-2 px-6 py-1.5 rounded-full border-2 border-[#65E902] bg-[#0c1306]/30 backdrop-blur-md shadow-[0_0_15px_rgba(101,233,2,0.15)]">
          <span className="text-white text-[11px] font-black tracking-widest italic uppercase">
            H666.COM
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#65E902] rounded-full animate-ping" />
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">
            SPEED CORE ONLINE
          </span>
        </div>
      </motion.div>
    </div>
  );
}
