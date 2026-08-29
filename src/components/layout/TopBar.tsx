import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Avatar } from "@/components/ui/Avatar";

export function TopBar() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-void/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-cyan/40 bg-cyan/10 font-display text-base font-bold text-cyan">
            ⚔
          </span>
          <span className="font-display text-lg font-bold tracking-wide text-ink">
            {t("app.name")}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {user ? (
            <>
              <Link
                to="/notifications"
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:border-cyan/30 hover:text-ink"
                aria-label={t("notifications.title")}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-full bg-alert px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="hidden sm:block">
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.username ?? "?"}
                  size="sm"
                  lastSeenAt={profile?.last_seen_at}
                  showStatus
                />
              </Link>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="ghost-btn !px-3 !py-2">
                {t("nav.login")}
              </Link>
              <Link to="/register" className="neon-btn !px-3 !py-2">
                {t("nav.register")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
