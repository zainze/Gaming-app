import { motion } from "motion/react";

interface SplashScreenProps {
  logo?: string;
}

export default function SplashScreen({ logo }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0b0e11] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.8,
          ease: [0.16, 1, 0.3, 1]
        }}
        className="flex flex-col items-center gap-8 relative z-10"
      >
        <div className="relative">
          {/* Animated Halo */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-8 bg-orange-500/20 blur-2xl rounded-full"
          />
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative"
          >
            {logo ? (
              <img 
                src={logo} 
                alt="App Logo" 
                className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[2.5rem] flex items-center justify-center font-black text-white text-5xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10">
                D
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-1"
          >
            <h1 className="text-4xl font-black italic tracking-tighter text-white">
               Dream<span className="text-orange-500">Win</span>
            </h1>
            <p className="text-[10px] font-black uppercase text-white/30 tracking-[0.5em] italic">Sweet Dreams</p>
          </motion.div>
          
          <div className="flex flex-col items-center gap-4">
            <div className="w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ 
                  duration: 2, 
                  ease: "easeInOut"
                }}
                className="w-full h-full bg-gradient-to-r from-orange-400 to-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
              />
            </div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[9px] font-black uppercase text-orange-500/60 tracking-[0.3em] italic"
            >
              Loading Reality...
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 flex flex-col items-center gap-2"
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">
            Powered by Dream Core
          </p>
        </div>
      </motion.div>
    </div>
  );
}
