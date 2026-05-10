import { Link, useLocation } from "react-router-dom";
import { Home, Gamepad2, Wallet, User as UserIcon } from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/games", icon: Gamepad2, label: "Games" },
  { path: "/wallet", icon: Wallet, label: "Wallet" },
  { path: "/profile", icon: UserIcon, label: "Profile" },
];

export default function Navigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-[#14254f]/95 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex items-center justify-between z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              isActive ? "text-orange-500 scale-110" : "text-white/40 hover:text-white"
            )}
          >
            <item.icon size={22} strokeWidth={isActive ? 3 : 2} className={isActive ? "drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" : ""} />
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              isActive ? "text-orange-500" : "text-white/40"
            )}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
