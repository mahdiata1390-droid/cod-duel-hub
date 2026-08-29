import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-white/[0.02] px-6 py-14 text-center">
      {icon && <div className="text-3xl opacity-60">{icon}</div>}
      <p className="max-w-xs text-sm text-ink-muted">{message}</p>
      {action}
    </div>
  );
}
