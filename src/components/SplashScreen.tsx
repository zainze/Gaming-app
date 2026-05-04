import { motion } from "motion/react";

interface SplashScreenProps {
  logo?: string;
}

export default function SplashScreen({ logo }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.8,
          ease: [0.16, 1, 0.3, 1]
        }}
        className="flex flex-col items-center gap-8"
      >
        <div className="relative">
          {/* Outer Ring Animation */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-4 border-2 border-dashed border-orange-500/20 rounded-full"
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
                className="w-24 h-24 object-contain drop-shadow-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 bg-neutral-900 rounded-[2rem] flex items-center justify-center font-black text-white text-5xl shadow-2xl shadow-neutral-900/40">
                h
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-4 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-neutral-900">
               h<span className="text-orange-500">666</span> <span className="text-neutral-300 not-italic font-medium text-lg ml-1">Entertainment</span>
            </h1>
          </motion.div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="w-48 h-1 bg-neutral-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ 
                  duration: 2.5, 
                  ease: "easeInOut"
                }}
                className="w-full h-full bg-gradient-to-r from-orange-400 to-orange-600"
              />
            </div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[10px] font-black uppercase text-neutral-400 tracking-widest italic"
            >
              Initializing Secure Engine...
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 flex items-center gap-2"
      >
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-300">
          Powered by h666 Network
        </p>
      </motion.div>
    </div>
  );
}
