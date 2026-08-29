import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useNotifications } from "@/hooks/useNotifications";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import type { AppNotification } from "@/types/database";

const iconMap: Record<AppNotification["type"], string> = {
  friend_request: "🤝",
  friend_request_accepted: "✅",
  friend_request_rejected: "❌",
  duel_request: "⚔️",
  duel_accepted: "✅",
  duel_rejected: "❌",
  duel_result_confirmation: "📝",
  new_message: "💬",
};

export default function Notifications() {
  const { t } = useTranslation();
  const { notifications, loading, markAllRead, unreadCount } = useNotifications();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">{t("notifications.title")}</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="ghost-btn !py-1.5 !text-xs">
            {t("notifications.markAllRead")}
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : notifications.length === 0 ? (
        <EmptyState message={t("notifications.empty")} icon="🔔" />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={targetForType(n)}
              className={`glass-panel flex items-start gap-3 p-3 transition-colors hover:bg-white/[0.03] ${
                !n.read ? "border-cyan/30" : ""
              }`}
            >
              <span className="text-lg">{iconMap[n.type]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">
                  {t(`notifications.type.${n.type}`, { name: String(n.payload?.name ?? "") })}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-faint">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function targetForType(n: AppNotification): string {
  switch (n.type) {
    case "friend_request":
    case "friend_request_accepted":
    case "friend_request_rejected":
      return "/friends";
    case "duel_request":
    case "duel_accepted":
    case "duel_rejected":
    case "duel_result_confirmation":
      return "/duels";
    case "new_message":
      return "/messages";
    default:
      return "/";
  }
}
