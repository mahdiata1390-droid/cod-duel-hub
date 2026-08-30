import { NavLink } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/", icon: "🏠", key: "nav.home" },
  { to: "/players", icon: "🎯", key: "nav.players" },
  { to: "/duels", icon: "⚔️", key: "nav.duels" },
  { to: "/messages", icon: "💬", key: "nav.messages" },
  { to: "/friends", icon: "🤝", key: "nav.friends" },
  { to: "/leaderboard", icon: "🏆", key: "nav.leaderboard" },
  { to: "/profile", icon: "👤", key: "nav.profile" },
  { to: "/settings", icon: "⚙️", key: "nav.settings" },
] as const;

export function SideNav() {
  const { t } = useTranslation();
  const { signOut, isAdmin } = useAuth();

  return (
    <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-56 shrink-0 flex-col justify-between border-e border-line px-3 py-4 md:flex">
      <nav className="flex flex-col gap-1">
        {[...items, ...(isAdmin ? [{ to: "/admin", icon: "🛡️", key: "nav.admin" }] : [])].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-cyan/10 text-cyan shadow-[inset_0_0_0_1px_rgba(0,229,199,0.25)]"
                  : "text-ink-muted hover:bg-white/[0.03] hover:text-ink"
              }`
            }
          >
            <span>{item.icon}</span>
            {t(item.key)}
          </NavLink>
        ))}
      </nav>
      <button onClick={() => signOut()} className="ghost-btn w-full">
        {t("nav.logout")}
      </button>
    </aside>
  );
}
