import { supabase } from "@/lib/supabase";

/**
 * "Online" in COD Duel Hub means active on THIS website right now —
 * never a claim about being online inside Call of Duty Mobile itself.
 * We derive it from a rolling last_seen_at heartbeat rather than a
 * literal boolean, so a closed tab naturally ages into "offline".
 */
export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute

export function isOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

export function formatLastSeen(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return "unknown";
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

/** Starts a periodic heartbeat that stamps last_seen_at for the given user. */
export function startPresenceHeartbeat(userId: string) {
  stopPresenceHeartbeat();

  const beat = async () => {
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId);
  };

  beat();
  heartbeatTimer = setInterval(beat, HEARTBEAT_INTERVAL_MS);

  const onVisible = () => {
    if (document.visibilityState === "visible") beat();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    stopPresenceHeartbeat();
  };
}

export function stopPresenceHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
