import { Link } from "react-router-dom";
import type { FriendRequestRow } from "@/hooks/useFriends";
import { Avatar } from "@/components/ui/Avatar";
import { useTranslation } from "@/i18n";

interface FriendRequestCardProps {
  request: FriendRequestRow;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export function FriendRequestCard({ request, onAccept, onReject }: FriendRequestCardProps) {
  const { t } = useTranslation();
  const sender = request.senderProfile;

  return (
    <div className="glass-panel flex items-center justify-between gap-3 p-3">
      <Link to={`/players/${sender.id}`} className="flex items-center gap-3">
        <Avatar name={sender.username} src={sender.avatar_url} size="md" lastSeenAt={sender.last_seen_at} showStatus />
        <div>
          <p className="text-sm font-semibold text-ink">{sender.username}</p>
          <p className="text-xs text-ink-muted">{sender.cod_nickname}</p>
        </div>
      </Link>
      <div className="flex gap-2">
        <button onClick={() => onAccept(request.id)} className="neon-btn !px-3 !py-1.5 !text-xs">
          {t("friends.accept")}
        </button>
        <button onClick={() => onReject(request.id)} className="ghost-btn !px-3 !py-1.5 !text-xs">
          {t("friends.reject")}
        </button>
      </div>
    </div>
  );
}
