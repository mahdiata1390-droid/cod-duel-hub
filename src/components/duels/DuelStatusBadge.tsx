import type { DuelStatus } from "@/types/database";
import { useTranslation } from "@/i18n";

const toneMap: Record<DuelStatus, string> = {
  pending: "border-draw/40 bg-draw/10 text-draw",
  accepted: "border-cyan/40 bg-cyan/10 text-cyan",
  rejected: "border-loss/40 bg-loss/10 text-loss",
  completed: "border-win/40 bg-win/10 text-win",
  cancelled: "border-line bg-white/[0.03] text-ink-faint",
  disputed: "border-alert/40 bg-alert/10 text-alert-soft",
};

export function DuelStatusBadge({ status }: { status: DuelStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${toneMap[status]}`}>
      {t(`duels.status.${status}`)}
    </span>
  );
}
