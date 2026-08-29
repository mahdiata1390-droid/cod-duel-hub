import type { Message } from "@/types/database";

export function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
          mine
            ? "rounded-ee-sm border border-cyan/30 bg-cyan/10 text-ink"
            : "rounded-ss-sm border border-line bg-white/[0.03] text-ink"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className="mt-1 text-[10px] text-ink-faint">{time}</p>
      </div>
    </div>
  );
}
