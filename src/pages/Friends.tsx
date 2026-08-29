import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useFriends } from "@/hooks/useFriends";
import { useConversations } from "@/hooks/useMessages";
import { FriendRequestCard } from "@/components/friends/FriendRequestCard";
import { FriendRow } from "@/components/friends/FriendRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

type Tab = "all" | "requests";

export default function Friends() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { friends, incomingRequests, loading, respondToRequest, removeFriend } = useFriends();
  const { startConversation } = useConversations();
  const [tab, setTab] = useState<Tab>("all");

  const handleMessage = async (userId: string) => {
    const { conversationId } = await startConversation(userId);
    if (conversationId) navigate("/messages");
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold text-ink">{t("friends.title")}</h1>

      <div className="inline-flex w-full gap-1 rounded-lg border border-line bg-white/[0.03] p-1 text-sm sm:w-fit">
        {(["all", "requests"] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-4 py-2 sm:flex-none ${
              tab === key ? "bg-cyan/15 text-cyan" : "text-ink-muted"
            }`}
          >
            {t(`friends.tab.${key}`)}
            {key === "requests" && incomingRequests.length > 0 && (
              <span className="ms-1.5 rounded-full bg-alert px-1.5 text-[10px] text-white">
                {incomingRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : tab === "all" ? (
        friends.length === 0 ? (
          <EmptyState message={t("friends.empty.all")} icon="🤝" />
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((f) => (
              <FriendRow key={f.id} friend={f} onMessage={handleMessage} onRemove={removeFriend} />
            ))}
          </div>
        )
      ) : incomingRequests.length === 0 ? (
        <EmptyState message={t("friends.empty.requests")} icon="📨" />
      ) : (
        <div className="flex flex-col gap-2">
          {incomingRequests.map((r) => (
            <FriendRequestCard
              key={r.id}
              request={r}
              onAccept={(id) => respondToRequest(id, true)}
              onReject={(id) => respondToRequest(id, false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
