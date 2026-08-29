import { useState } from "react";
import { useTranslation } from "@/i18n";
import { usePlayers } from "@/hooks/usePlayers";
import { useDuels } from "@/hooks/useDuels";
import { PlayerCard } from "@/components/players/PlayerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

export default function Players() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const { players, loading } = usePlayers(query, { onlineOnly });
  const { challengePlayer } = useDuels();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{t("players.title")}</h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="field flex-1"
          placeholder={t("players.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="inline-flex gap-2 rounded-lg border border-line bg-white/[0.03] p-1 text-sm">
          <button
            onClick={() => setOnlineOnly(false)}
            className={`rounded-md px-3 py-1.5 ${!onlineOnly ? "bg-cyan/15 text-cyan" : "text-ink-muted"}`}
          >
            {t("players.filter.all")}
          </button>
          <button
            onClick={() => setOnlineOnly(true)}
            className={`rounded-md px-3 py-1.5 ${onlineOnly ? "bg-cyan/15 text-cyan" : "text-ink-muted"}`}
          >
            {t("players.filter.online")}
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : players.length === 0 ? (
        <EmptyState message={t("players.empty")} icon="🎯" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => (
            <PlayerCard key={p.id} player={p} onChallenge={(id) => challengePlayer(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
