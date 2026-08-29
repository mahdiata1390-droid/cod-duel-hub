import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { DuelRow } from "@/hooks/useDuels";
import { Avatar } from "@/components/ui/Avatar";
import { DuelStatusBadge } from "./DuelStatusBadge";
import { ResultModal } from "./ResultModal";
import { useTranslation } from "@/i18n";

interface DuelCardProps {
  duel: DuelRow;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function DuelCard({ duel, onAccept, onReject, onCancel }: DuelCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showResultModal, setShowResultModal] = useState(false);

  const isChallenger = user?.id === duel.challenger_id;
  const isOpponent = user?.id === duel.opponent_id;
  const myConfirmation = duel.confirmations?.find((c) => c.user_id === user?.id);
  const theirConfirmation = duel.confirmations?.find((c) => c.user_id !== user?.id);

  return (
    <div className="dossier-card flex flex-col gap-3 p-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{t("duels.title")} · #{duel.id.slice(0, 6)}</span>
        <DuelStatusBadge status={duel.status} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 flex-col items-center gap-1 text-center">
          <Avatar name={duel.challengerProfile?.username ?? "?"} src={duel.challengerProfile?.avatar_url} size="md" />
          <span className="text-xs font-medium text-ink">{duel.challengerProfile?.username}</span>
        </div>
        <span className="font-display text-sm font-bold text-ink-faint">{t("duels.vs")}</span>
        <div className="flex flex-1 flex-col items-center gap-1 text-center">
          <Avatar name={duel.opponentProfile?.username ?? "?"} src={duel.opponentProfile?.avatar_url} size="md" />
          <span className="text-xs font-medium text-ink">{duel.opponentProfile?.username}</span>
        </div>
      </div>

      {duel.status === "completed" && duel.challenger_score !== null && (
        <div className="flex items-center justify-center gap-3 font-display text-2xl font-bold text-ink">
          <span>{duel.challenger_score}</span>
          <span className="text-ink-faint">–</span>
          <span>{duel.opponent_score}</span>
        </div>
      )}

      {duel.status === "pending" && isOpponent && (
        <div className="flex gap-2">
          <button onClick={() => onAccept?.(duel.id)} className="neon-btn flex-1 !py-2">
            {t("duels.accept")}
          </button>
          <button onClick={() => onReject?.(duel.id)} className="ghost-btn flex-1 !py-2">
            {t("duels.reject")}
          </button>
        </div>
      )}

      {duel.status === "pending" && isChallenger && (
        <button onClick={() => onCancel?.(duel.id)} className="ghost-btn w-full !py-2">
          {t("duels.cancel")}
        </button>
      )}

      {duel.status === "accepted" && !myConfirmation && (
        <button onClick={() => setShowResultModal(true)} className="neon-btn w-full !py-2">
          {t("duels.submitResult")}
        </button>
      )}

      {duel.status === "accepted" && myConfirmation && !theirConfirmation && (
        <p className="text-center text-xs text-ink-faint">{t("duels.submitResult.waitingConfirmation")}</p>
      )}

      {showResultModal && (
        <ResultModal duel={duel} onClose={() => setShowResultModal(false)} />
      )}
    </div>
  );
}
