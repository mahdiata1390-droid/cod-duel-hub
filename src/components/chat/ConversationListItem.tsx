import type { ConversationRow } from "@/hooks/useMessages";
import { Avatar } from "@/components/ui/Avatar";
import { formatLastSeen } from "@/lib/presence";

interface ConversationListItemProps {
  conversation: ConversationRow;
  active?: boolean;
  onClick: () => void;
}

export function ConversationListItem({ conversation, active, onClick }: ConversationListItemProps) {
  const p = conversation.otherProfile;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors ${
        active ? "bg-cyan/10" : "hover:bg-white/[0.03]"
      }`}
    >
      <Avatar name={p?.username ?? "?"} src={p?.avatar_url} size="md" lastSeenAt={p?.last_seen_at} showStatus />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-semibold text-ink">{p?.username}</p>
          {conversation.lastMessage && (
            <span className="shrink-0 text-[10px] text-ink-faint">
              {formatLastSeen(conversation.lastMessage.created_at)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ink-muted">
          {conversation.lastMessage?.content ?? ""}
        </p>
      </div>
      {conversation.unreadCount > 0 && (
        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-cyan px-1 text-[10px] font-bold text-void">
          {conversation.unreadCount}
        </span>
      )}
    </button>
  );
}
