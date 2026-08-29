import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useLeaderboard, winRate, type LeaderboardSort } from "@/hooks/useLeaderboard";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

const sortOptions: LeaderboardSort[] = ["wins", "winRate", "totalDuels", "xp"];

export default function Leaderboard() {
  const { t } = useTranslation();
  const [sort, setSort] = useState<LeaderboardSort>("wins");
  const { players, loading } = useLeaderboard(sort);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold text-ink">{t("leaderboard.title")}</h1>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-muted">{t("leaderboard.sortBy")}:</span>
        {sortOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setSort(opt)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              sort === opt
                ? "border-cyan/40 bg-cyan/10 text-cyan"
                : "border-line bg-white/[0.02] text-ink-muted hover:text-ink"
            }`}
          >
            {t(`leaderboard.sort.${opt}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : players.length === 0 ? (
        <EmptyState message={t("players.empty")} icon="🏆" />
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="hidden grid-cols-[3rem_1fr_5rem_5rem_5rem] gap-2 border-b border-line px-4 py-2 text-xs uppercase tracking-wide text-ink-faint sm:grid">
            <span>{t("leaderboard.rank")}</span>
            <span>{t("leaderboard.player")}</span>
            <span className="text-center">{t("profile.stats.wins")}</span>
            <span className="text-center">{t("profile.stats.winRate")}</span>
            <span className="text-center">{t("leaderboard.sort.xp")}</span>
          </div>
          {players.map((p, idx) => (
            <Link
              to={`/players/${p.id}`}
              key={p.id}
              className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 border-b border-line px-4 py-3 last:border-0 hover:bg-white/[0.02] sm:grid-cols-[3rem_1fr_5rem_5rem_5rem]"
            >
              <span
                className={`font-display font-bold ${
                  idx === 0 ? "text-draw" : idx === 1 ? "text-ink-muted" : idx === 2 ? "text-alert-soft" : "text-ink-faint"
                }`}
              >
                #{idx + 1}
              </span>
              <span className="flex items-center gap-2 truncate">
                <Avatar name={p.username} src={p.avatar_url} size="sm" lastSeenAt={p.last_seen_at} showStatus />
                <span className="truncate text-sm font-medium text-ink">{p.username}</span>
              </span>
              <span className="hidden text-center text-sm text-win sm:block">{p.wins}</span>
              <span className="hidden text-center text-sm text-cyan sm:block">{winRate(p)}%</span>
              <span className="hidden text-center text-sm text-violet-soft sm:block">{p.xp}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
