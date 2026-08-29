import { NavLink } from "react-router-dom";
import { useTranslation } from "@/i18n";

const items = [
  { to: "/", icon: "🏠", key: "nav.home" },
  { to: "/players", icon: "🎯", key: "nav.players" },
  { to: "/duels", icon: "⚔️", key: "nav.duels" },
  { to: "/messages", icon: "💬", key: "nav.messages" },
  { to: "/profile", icon: "👤", key: "nav.profile" },
] as const;

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-void/90 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-6xl items-stretch justify-between px-2 py-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] transition-colors ${
                isActive ? "text-cyan" : "text-ink-faint"
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {t(item.key)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
