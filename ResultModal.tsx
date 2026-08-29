import { useState } from "react";
import type { DuelRow } from "@/hooks/useDuels";
import { useDuels } from "@/hooks/useDuels";
import { useTranslation } from "@/i18n";

interface ResultModalProps {
  duel: DuelRow;
  onClose: () => void;
}

export function ResultModal({ duel, onClose }: ResultModalProps) {
  const { t } = useTranslation();
  const { submitResult, disputeResult } = useDuels();
  const [myScore, setMyScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const a = Number(myScore);
    const b = Number(opponentScore);
    if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0) {
      setError(t("common.error.generic"));
      return;
    }
    setSubmitting(true);
    const { error: err } = await submitResult(duel.id, a, b);
    setSubmitting(false);
    if (err) setError(err);
    else onClose();
  };

  const handleDispute = async () => {
    setSubmitting(true);
    await disputeResult(duel.id);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div
        className="glass-panel w-full max-w-sm p-5 animate-fade-up md:mb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-bold text-ink">{t("duels.submitResult.title")}</h3>
        <p className="mt-1 text-xs text-ink-muted">{t("duels.submitResult.disclaimer")}</p>

        <div className="mt-4 flex gap-3">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs text-ink-muted">{t("duels.submitResult.yourScore")}</span>
            <input
              type="number"
              min={0}
              className="field"
              value={myScore}
              onChange={(e) => setMyScore(e.target.value)}
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs text-ink-muted">{t("duels.submitResult.opponentScore")}</span>
            <input
              type="number"
              min={0}
              className="field"
              value={opponentScore}
              onChange={(e) => setOpponentScore(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="mt-2 text-xs text-alert">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="ghost-btn flex-1">
            {t("common.cancel")}
          </button>
          <button onClick={handleDispute} disabled={submitting} className="ghost-btn flex-1 !text-alert-soft">
            {t("duels.submitResult.dispute")}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="neon-btn flex-1">
            {t("duels.submitResult.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
