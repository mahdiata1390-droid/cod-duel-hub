import { Link } from "react-router-dom";
import type { FriendRow as FriendRowType } from "@/hooks/useFriends";
import { Avatar } from "@/components/ui/Avatar";
import { formatLastSeen, isOnline } from "@/lib/presence";
import { useTranslation } from "@/i18n";

interface FriendRowProps {
  friend: FriendRowType;
  onMessage: (userId: string) => void;
  onRemove: (friendshipId: string) => void;
}

export function FriendRow({ friend, onMessage, onRemove }: FriendRowProps) {
  const { t } = useTranslation();
  const p = friend.friendProfile;

  return (
    <div className="glass-panel flex items-center justify-between gap-3 p-3">
      <Link to={`/players/${p.id}`} className="flex items-center gap-3">
        <Avatar name={p.username} src={p.avatar_url} size="md" lastSeenAt={p.last_seen_at} showStatus />
        <div>
          <p className="text-sm font-semibold text-ink">{p.username}</p>
          <p className="text-xs text-ink-faint">
            {isOnline(p.last_seen_at) ? t("common.online") : formatLastSeen(p.last_seen_at)}
          </p>
        </div>
      </Link>
      <div className="flex gap-2">
        <button onClick={() => onMessage(p.id)} className="ghost-btn !px-3 !py-1.5 !text-xs">
          {t("profile.sendMessage")}
        </button>
        <button onClick={() => onRemove(friend.id)} className="ghost-btn !px-3 !py-1.5 !text-xs !text-alert-soft">
          {t("friends.remove")}
        </button>
      </div>
    </div>
  );
}
