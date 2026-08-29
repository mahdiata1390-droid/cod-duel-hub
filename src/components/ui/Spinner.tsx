export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-ink-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan/20 border-t-cyan" />
      {label && <p className="text-xs">{label}</p>}
    </div>
  );
}
