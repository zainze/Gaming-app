import { motion } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, Gamepad2, Wallet, User as UserIcon } from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { path: "/games", icon: Gamepad2, label: "Games" },
  { path: "/", icon: Sparkles, label: "Discover" },
  { path: "/wallet", icon: Wallet, label: "Wallet" },
  { path: "/profile", icon: UserIcon, label: "Profile" },
];

export default function Navigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-[#14254f]/95 backdrop-blur-3xl border-t border-white/5 px-6 py-4 flex items-center justify-between z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "relative flex flex-col items-center gap-1.5 transition-all duration-300 px-3",
              isActive ? "text-orange-500 scale-105" : "text-white/40 hover:text-white"
            )}
          >
            <item.icon 
              size={22} 
              strokeWidth={isActive ? 3 : 2} 
              className={cn(
                "transition-all duration-300",
                isActive ? "drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]" : ""
              )} 
            />
            <span className={cn(
              "text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300",
              isActive ? "opacity-100" : "opacity-40"
            )}>
              {item.label}
            </span>
            
            {isActive && (
              <motion.div 
                layoutId="nav-glow"
                className="absolute inset-0 bg-orange-500/10 blur-xl rounded-full"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            
            {isActive && (
              <motion.div 
                layoutId="nav-indicator"
                className="absolute -bottom-2 w-8 h-1 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.8)]"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
