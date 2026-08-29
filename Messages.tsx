import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, useMessages } from "@/hooks/useMessages";
import { ConversationListItem } from "@/components/chat/ConversationListItem";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";

export default function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { conversations, loading } = useConversations();
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const { messages, sendMessage, markRead } = useMessages(activeId);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    if (activeId) markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    await sendMessage(draft);
    setDraft("");
  };

  return (
    <div className="flex h-[calc(100vh-160px)] gap-4 md:h-[calc(100vh-120px)]">
      <div className={`flex w-full flex-col gap-1 sm:w-72 sm:shrink-0 ${activeId ? "hidden sm:flex" : "flex"}`}>
        <h1 className="mb-2 font-display text-xl font-bold text-ink">{t("messages.title")}</h1>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-card border border-line bg-panel/40">
          {loading ? (
            <Spinner />
          ) : conversations.length === 0 ? (
            <EmptyState message={t("messages.empty")} icon="💬" />
          ) : (
            <div className="flex flex-col gap-0.5 p-1">
              {conversations.map((c) => (
                <ConversationListItem
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  onClick={() => setActiveId(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`glass-panel flex min-w-0 flex-1 flex-col ${activeId ? "flex" : "hidden sm:flex"}`}>
        {activeConversation ? (
          <>
            <div className="flex items-center gap-3 border-b border-line p-3">
              <button className="sm:hidden" onClick={() => setActiveId(undefined)}>
                ←
              </button>
              <Avatar
                name={activeConversation.otherProfile?.username ?? "?"}
                src={activeConversation.otherProfile?.avatar_url}
                size="sm"
                lastSeenAt={activeConversation.otherProfile?.last_seen_at}
                showStatus
              />
              <p className="font-semibold text-ink">{activeConversation.otherProfile?.username}</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} mine={m.sender_id === user?.id} />
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="flex gap-2 border-t border-line p-3">
              <input
                className="field flex-1"
                placeholder={t("messages.typePlaceholder")}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button onClick={handleSend} className="neon-btn !px-4">
                {t("messages.send")}
              </button>
            </div>
          </>
        ) : (
          <EmptyState message={t("messages.empty")} icon="💬" />
        )}
      </div>
    </div>
  );
}
