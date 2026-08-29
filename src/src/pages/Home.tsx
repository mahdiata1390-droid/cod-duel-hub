import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayers } from "@/hooks/usePlayers";
import { useDuels } from "@/hooks/useDuels";
import { PlayerCard } from "@/components/players/PlayerCard";
import { DuelCard } from "@/components/duels/DuelCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { players, loading: playersLoading } = usePlayers("", {});
  const { duels, loading: duelsLoading } = useDuels();

  const onlineCount = players.filter(
    (p) => Date.now() - new Date(p.last_seen_at).getTime() < 120000
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <section className="dossier-card relative overflow-hidden p-6 md:p-10">
        <span className="eyebrow">{t("home.hero.eyebrow")}</span>

        <h1 className="mt-2 max-w-xl font-display text-3xl font-extrabold leading-tight text-ink md:text-4xl">
          {t("home.hero.title")}
        </h1>

        <p className="mt-3 max-w-lg text-sm text-ink-muted md:text-base">
          {t("home.hero.subtitle")}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/players" className="neon-btn">
            {t("home.hero.cta.findPlayers")}
          </Link>

          <Link to="/leaderboard" className="ghost-btn">
            {t("home.hero.cta.viewLeaderboard")}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <StatCard
          label={t("home.stats.totalPlayers")}
          value={players.length}
        />

        <StatCard
          label={t("home.stats.onlineNow")}
          value={onlineCount}
          tone="win"
        />

        <StatCard
          label={t("home.stats.activeDuels")}
          value={
            duels.filter(
              (d) => d.status === "accepted" || d.status === "pending"
            ).length
          }
          tone="violet"
        />
      </section>

      {user && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-ink">
            {t("home.recentDuels")}
          </h2>

          {duelsLoading ? (
            <Spinner />
          ) : duels.length === 0 ? (
            <EmptyState
              message={t("home.empty.noDuelsYet")}
              icon="⚔️"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {duels.slice(0, 3).map((d) => (
                <DuelCard key={d.id} duel={d} />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">
          {t("home.suggestedPlayers")}
        </h2>

        {playersLoading ? (
          <Spinner />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.slice(0, 6).map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: number;
  tone?: "cyan" | "win" | "violet";
}) {
  const toneClass = {
    cyan: "text-cyan",
    win: "text-win",
    violet: "text-violet-soft",
  }[tone];

  return (
    <div className="glass-panel flex flex-col items-center gap-1 py-4">
      <span
        className={`font-display text-2xl font-extrabold ${toneClass}`}
      >
        {value}
      </span>

      <span className="text-center text-[11px] text-ink-faint">
        {label}
      </span>
    </div>
  );
}
