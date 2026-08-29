interface StatPillProps {
  label: string;
  value: string | number;
  tone?: "cyan" | "violet" | "win" | "loss" | "draw";
}

const toneMap = {
  cyan: "text-cyan",
  violet: "text-violet-soft",
  win: "text-win",
  loss: "text-loss",
  draw: "text-draw",
};

export function StatPill({ label, value, tone = "cyan" }: StatPillProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-line bg-white/[0.02] px-3 py-2 min-w-[4.5rem]">
      <span className={`font-display text-lg font-bold leading-none ${toneMap[tone]}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );
}
