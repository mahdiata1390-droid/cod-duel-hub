import { useState } from "react";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useDuels } from "@/hooks/useDuels";
import { DuelCard } from "@/components/duels/DuelCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

type Tab = "incoming" | "active" | "history";

export default function Duels() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { duels, loading, respondToDuel, cancelDuel } = useDuels();
  const [tab, setTab] = useState<Tab>("incoming");

  const incoming = duels.filter((d) => d.status === "pending" && d.opponent_id === user?.id);
  const active = duels.filter((d) => d.status === "accepted" || (d.status === "pending" && d.challenger_id === user?.id));
  const history = duels.filter((d) => ["completed", "rejected", "cancelled", "disputed"].includes(d.status));

  const lists: Record<Tab, typeof duels> = { incoming, active, history };
  const emptyKeys: Record<Tab, string> = {
    incoming: "duels.empty.incoming",
    active: "duels.empty.active",
    history: "duels.empty.history",
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold text-ink">{t("duels.title")}</h1>

      <div className="inline-flex w-full gap-1 rounded-lg border border-line bg-white/[0.03] p-1 text-sm sm:w-fit">
        {(["incoming", "active", "history"] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-4 py-2 sm:flex-none ${
              tab === key ? "bg-cyan/15 text-cyan" : "text-ink-muted"
            }`}
          >
            {t(`duels.tab.${key}`)}
            {key === "incoming" && incoming.length > 0 && (
              <span className="ms-1.5 rounded-full bg-alert px-1.5 text-[10px] text-white">{incoming.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : lists[tab].length === 0 ? (
        <EmptyState message={t(emptyKeys[tab])} icon="⚔️" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists[tab].map((d) => (
            <DuelCard
              key={d.id}
              duel={d}
              onAccept={(id) => respondToDuel(id, true)}
              onReject={(id) => respondToDuel(id, false)}
              onCancel={cancelDuel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
