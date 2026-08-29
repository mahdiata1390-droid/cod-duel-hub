import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileByIdentifier } from "@/hooks/usePlayers";
import { useFriends } from "@/hooks/useFriends";
import { useDuels } from "@/hooks/useDuels";
import { useConversations } from "@/hooks/useMessages";
import { Avatar } from "@/components/ui/Avatar";
import { StatPill } from "@/components/ui/StatPill";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { winRate } from "@/hooks/useLeaderboard";
import { formatLastSeen, isOnline } from "@/lib/presence";

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, loading } = useProfileByIdentifier(id);
  const { friends, sendFriendRequest } = useFriends();
  const { challengePlayer, duels } = useDuels();
  const { startConversation } = useConversations();

  if (loading) return <Spinner />;
  if (!profile) return <EmptyState message={t("players.empty")} icon="❓" />;

  const isSelf = user?.id === profile.id;
  const alreadyFriends = friends.some((f) => f.friendProfile.id === profile.id);
  const relevantDuels = duels.filter(
    (d) =>
      (d.challenger_id === profile.id || d.opponent_id === profile.id) && d.status === "completed"
  );

  const handleChallenge = async () => {
    const { error } = await challengePlayer(profile.id);
    if (!error) navigate("/duels");
  };

  const handleMessage = async () => {
    const { conversationId } = await startConversation(profile.id);
    if (conversationId) navigate("/messages");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="dossier-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatar_url} name={profile.username} size="xl" lastSeenAt={profile.last_seen_at} showStatus />
          <div>
            <h1 className="font-display text-xl font-bold text-ink">{profile.username}</h1>
            <p className="text-sm text-ink-muted">{profile.cod_nickname}</p>
            <p className="mt-1 text-xs text-ink-faint">
              {isOnline(profile.last_seen_at) ? t("profile.online") : `${t("profile.lastSeen")}: ${formatLastSeen(profile.last_seen_at)}`}
            </p>
          </div>
        </div>

        {!isSelf && (
          <div className="flex flex-wrap gap-2">
            <button onClick={handleMessage} className="ghost-btn">
              {t("profile.sendMessage")}
            </button>
            <button
              onClick={() => sendFriendRequest(profile.id)}
              disabled={alreadyFriends}
              className="ghost-btn disabled:opacity-50"
            >
              {alreadyFriends ? t("profile.alreadyFriends") : t("profile.addFriend")}
            </button>
            <button onClick={handleChallenge} className="neon-btn-violet">
              {t("profile.challengeToDuel")}
            </button>
          </div>
        )}
      </div>

      {profile.bio && <p className="glass-panel p-4 text-sm text-ink-muted">{profile.bio}</p>}

      <div className="flex flex-wrap gap-3">
        <StatPill label={t("profile.stats.wins")} value={profile.wins} tone="win" />
        <StatPill label={t("profile.stats.losses")} value={profile.losses} tone="loss" />
        <StatPill label={t("profile.stats.draws")} value={profile.draws} tone="draw" />
        <StatPill label={t("profile.stats.winRate")} value={`${winRate(profile)}%`} tone="cyan" />
        <StatPill label={t("profile.stats.totalDuels")} value={profile.total_duels} tone="violet" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow label={t("profile.uid")} value={profile.cod_uid} />
        <InfoRow label={t("profile.rank")} value={profile.rank ?? "—"} />
        <InfoRow label={t("profile.country")} value={profile.country ?? "—"} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("profile.duelHistory")}</h2>
        {!profile.show_duel_history && !isSelf ? (
          <EmptyState message={t("profile.duelHistory.private")} icon="🔒" />
        ) : relevantDuels.length === 0 ? (
          <EmptyState message={t("duels.empty.history")} icon="⚔️" />
        ) : (
          <div className="flex flex-col gap-2">
            {relevantDuels.map((d) => (
              <div key={d.id} className="glass-panel flex items-center justify-between p-3 text-sm">
                <span>{d.challengerProfile?.username} {t("duels.vs")} {d.opponentProfile?.username}</span>
                <span className="font-display font-bold text-ink">
                  {d.challenger_score} – {d.opponent_score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel flex items-center justify-between p-3">
      <span className="text-xs text-ink-faint">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
