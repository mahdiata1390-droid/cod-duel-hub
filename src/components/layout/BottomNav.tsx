import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";

const primaryItems = [
  { to: "/", icon: "🏠", key: "nav.home" },
  { to: "/players", icon: "🎯", key: "nav.players" },
  { to: "/messages", icon: "💬", key: "nav.messages" },
  { to: "/duels", icon: "⚔️", key: "nav.duels" },
  { to: "/profile", icon: "👤", key: "nav.profile" },
] as const;

const moreItems = [
  { to: "/friends", icon: "🤝", key: "nav.friends" },
  { to: "/leaderboard", icon: "🏆", key: "nav.leaderboard" },
  { to: "/notifications", icon: "🔔", key: "nav.notifications" },
  { to: "/settings", icon: "⚙️", key: "nav.settings" },
] as const;

export function BottomNav() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-void/90 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-6xl items-stretch justify-between px-2 py-1">
        {primaryItems.map((item) => (
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

        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] text-ink-faint transition-colors hover:text-ink"
          aria-label={t("nav.more")}
        >
          <span className="text-lg leading-none">⋯</span>
          {t("nav.more")}
        </button>
      </div>

      {moreOpen && (
        <div className="border-t border-line bg-void/95 px-2 py-2">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 text-xs">
            {[...moreItems, ...(isAdmin ? [{ to: "/admin", icon: "🛡️", key: "nav.admin" }] : [])].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-line bg-panel/40 px-2 py-2 text-ink-muted transition-colors hover:border-cyan/30 hover:text-ink"
              >
                <span>{item.icon}</span>
                {t(item.key)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
