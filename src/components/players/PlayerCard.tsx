import { Link } from "react-router-dom";
import type { Profile } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { formatLastSeen, isOnline } from "@/lib/presence";
import { winRate } from "@/hooks/useLeaderboard";
import { useTranslation } from "@/i18n";

interface PlayerCardProps {
  player: Profile;
  onChallenge?: (playerId: string) => void;
}

export function PlayerCard({ player, onChallenge }: PlayerCardProps) {
  const { t } = useTranslation();
  const online = isOnline(player.last_seen_at);

  return (
    <div className="dossier-card flex flex-col gap-3 p-4 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/players/${player.id}`} className="flex items-center gap-3">
          <Avatar
            src={player.avatar_url}
            name={player.username}
            size="md"
            lastSeenAt={player.last_seen_at}
            showStatus
          />
          <div>
            <p className="font-display text-base font-semibold text-ink">{player.username}</p>
            <p className="text-xs text-ink-muted">{player.cod_nickname}</p>
          </div>
        </Link>
        {player.rank && (
          <span className="eyebrow rounded-md border border-line px-2 py-1">{player.rank}</span>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="rounded-md border border-line bg-white/[0.02] px-2 py-1 text-[11px] text-win">
          {player.wins} {t("profile.stats.wins")}
        </span>
        <span className="rounded-md border border-line bg-white/[0.02] px-2 py-1 text-[11px] text-loss">
          {player.losses} {t("profile.stats.losses")}
        </span>
        <span className="rounded-md border border-line bg-white/[0.02] px-2 py-1 text-[11px] text-cyan">
          {winRate(player)}%
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-ink-faint">
        <span>{online ? t("common.online") : `${t("profile.lastSeen")}: ${formatLastSeen(player.last_seen_at)}`}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <Link to={`/players/${player.id}`} className="ghost-btn flex-1 !py-2">
          {t("players.viewProfile")}
        </Link>
        {onChallenge && (
          <button onClick={() => onChallenge(player.id)} className="neon-btn-violet flex-1 !py-2">
            {t("players.challenge")}
          </button>
        )}
      </div>
    </div>
  );
}
