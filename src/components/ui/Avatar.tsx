import { isOnline } from "@/lib/presence";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  lastSeenAt?: string | null;
  showStatus?: boolean;
}

const sizeMap = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-2xl",
};

export function Avatar({ src, name, size = "md", lastSeenAt, showStatus = false }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={`${sizeMap[size]} flex items-center justify-center overflow-hidden rounded-xl border border-line bg-panel2 font-display font-semibold text-cyan`}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {showStatus && (
        <span
          className={`status-dot absolute -bottom-0.5 -end-0.5 border-2 border-void ${
            isOnline(lastSeenAt) ? "status-dot--online" : "status-dot--offline"
          }`}
        />
      )}
    </div>
  );
}
