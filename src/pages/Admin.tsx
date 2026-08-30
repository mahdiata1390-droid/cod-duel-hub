import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n";
import { supabase } from "@/lib/supabase";
import type { AccountStatus, AdminAuditLog, AdminDuel, Profile } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

type AdminTab = "dashboard" | "users" | "duels" | "audit";

export default function Admin() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [users, setUsers] = useState<Profile[]>([]);
  const [duels, setDuels] = useState<AdminDuel[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [duelSearch, setDuelSearch] = useState("");
  const [duelStatus, setDuelStatus] = useState("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    const [{ data: userData, error: userError }, { data: duelData, error: duelError }, { data: auditData, error: auditError }] =
      await Promise.all([
        supabase.rpc("admin_list_users"),
        supabase.rpc("admin_list_duels"),
        supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
    if (userError || duelError || auditError) setError(userError?.message ?? duelError?.message ?? auditError?.message ?? t("admin.error"));
    setUsers((userData as Profile[] | null) ?? []);
    setDuels((duelData as AdminDuel[] | null) ?? []);
    setAuditLogs((auditData as AdminAuditLog[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setUserStatus = async (userId: string, status: AccountStatus, suspendedUntil?: string | null) => {
    const { error: actionError } = await supabase.rpc("admin_set_user_status", {
      target_user_id: userId,
      new_status: status,
      new_suspended_until: suspendedUntil ?? null,
    });
    if (actionError) setError(actionError.message);
    else await load();
  };

  const updateDuel = async (duel: AdminDuel, challengerScore: number, opponentScore: number) => {
    const { error: actionError } = await supabase.rpc("admin_update_duel_result", {
      target_duel_id: duel.id,
      new_challenger_score: challengerScore,
      new_opponent_score: opponentScore,
    });
    if (actionError) setError(actionError.message);
    else await load();
  };

  const cancelDuel = async (duelId: string) => {
    const { error: actionError } = await supabase.rpc("admin_cancel_duel", { target_duel_id: duelId });
    if (actionError) setError(actionError.message);
    else await load();
  };

  const filteredUsers = users.filter((user) =>
    [user.username, user.cod_nickname, user.cod_uid].some((value) => value.toLowerCase().includes(userSearch.toLowerCase()))
  );
  const filteredDuels = duels.filter((duel) => {
    const matchesSearch = `${duel.challenger_username} ${duel.opponent_username} ${duel.id}`.toLowerCase().includes(duelSearch.toLowerCase());
    return matchesSearch && (duelStatus === "all" || duel.status === duelStatus);
  });

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "dashboard", label: t("admin.tabs.dashboard") },
    { key: "users", label: t("admin.tabs.users") },
    { key: "duels", label: t("admin.tabs.duels") },
    { key: "audit", label: t("admin.tabs.audit") },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="eyebrow">{t("admin.eyebrow")}</span>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("admin.title")}</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-lg border px-3 py-2.5 text-sm ${tab === item.key ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-line bg-white/[0.02] text-ink-muted"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg border border-alert/30 bg-alert/10 p-3 text-sm text-alert-soft">{error}</p>}
      {loading ? <Spinner /> : tab === "dashboard" ? <Dashboard users={users} duels={duels} /> : null}
      {!loading && tab === "users" && (
        <UsersSection users={filteredUsers} search={userSearch} onSearch={setUserSearch} onStatus={setUserStatus} t={t} />
      )}
      {!loading && tab === "duels" && (
        <DuelsSection duels={filteredDuels} search={duelSearch} status={duelStatus} onSearch={setDuelSearch} onStatus={setDuelStatus} onUpdate={updateDuel} onCancel={cancelDuel} t={t} />
      )}
      {!loading && tab === "audit" && <AuditSection logs={auditLogs} t={t} />}
    </div>
  );
}

function Dashboard({ users, duels }: { users: Profile[]; duels: AdminDuel[] }) {
  const { t } = useTranslation();
  const stats = [
    [t("admin.stats.users"), users.length],
    [t("admin.stats.active"), users.filter((user) => user.account_status === "active").length],
    [t("admin.stats.suspended"), users.filter((user) => user.account_status === "suspended").length],
    [t("admin.stats.duels"), duels.length],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(([label, value]) => (
        <div key={String(label)} className="glass-panel p-4">
          <p className="font-display text-2xl font-bold text-cyan">{value}</p>
          <p className="mt-1 text-xs text-ink-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}

function UsersSection({ users, search, onSearch, onStatus, t }: { users: Profile[]; search: string; onSearch: (value: string) => void; onStatus: (id: string, status: AccountStatus, until?: string | null) => Promise<void>; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <section className="flex flex-col gap-3">
      <input className="field" value={search} onChange={(event) => onSearch(event.target.value)} placeholder={t("admin.users.search")} />
      {users.length === 0 ? <EmptyState message={t("admin.users.empty")} icon="👥" /> : users.map((user) => <UserRow key={user.id} user={user} onStatus={onStatus} t={t} />)}
    </section>
  );
}

function UserRow({ user, onStatus, t }: { user: Profile; onStatus: (id: string, status: AccountStatus, until?: string | null) => Promise<void>; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const [until, setUntil] = useState(user.suspended_until ? new Date(user.suspended_until).toISOString().slice(0, 16) : "");
  const statusLabel = user.account_status === "active" ? t("admin.status.active") : user.account_status === "suspended" ? t("admin.status.suspended") : t("admin.status.banned");
  return (
    <div className="dossier-card flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <Avatar src={user.avatar_url} name={user.username} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{user.username}</p>
          <p className="truncate text-xs text-ink-muted">{user.cod_nickname} · UID: {user.cod_uid}</p>
        </div>
        <span className="eyebrow shrink-0">{statusLabel}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-ink-muted sm:grid-cols-6">
        <span>{t("profile.stats.wins")}<strong className="block text-win">{user.wins}</strong></span>
        <span>{t("profile.stats.losses")}<strong className="block text-loss">{user.losses}</strong></span>
        <span>{t("profile.stats.draws")}<strong className="block text-draw">{user.draws}</strong></span>
        <span>{t("profile.stats.totalDuels")}<strong className="block text-cyan">{user.total_duels}</strong></span>
        <span>{t("leaderboard.sort.xp")}<strong className="block text-violet-soft">{user.xp}</strong></span>
        <span>{t("profile.rank")}<strong className="block text-ink">{user.rank ?? "-"}</strong></span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {user.account_status !== "banned" && <input className="field sm:max-w-xs" type="datetime-local" value={until} onChange={(event) => setUntil(event.target.value)} aria-label={t("admin.users.suspensionUntil")} />}
        <div className="flex flex-1 flex-wrap gap-2">
          {user.account_status === "active" && <button className="ghost-btn flex-1 !py-2" onClick={() => onStatus(user.id, "suspended", until ? new Date(until).toISOString() : null)}>{t("admin.actions.suspend")}</button>}
          {user.account_status === "suspended" && <button className="ghost-btn flex-1 !py-2" onClick={() => onStatus(user.id, "active")}>{t("admin.actions.unsuspend")}</button>}
          {user.account_status !== "banned" && <button className="ghost-btn flex-1 !py-2 !text-alert-soft" onClick={() => onStatus(user.id, "banned")}>{t("admin.actions.ban")}</button>}
          {user.account_status === "banned" && <button className="ghost-btn flex-1 !py-2" onClick={() => onStatus(user.id, "active")}>{t("admin.actions.unban")}</button>}
        </div>
      </div>
    </div>
  );
}

function DuelsSection({ duels, search, status, onSearch, onStatus, onUpdate, onCancel, t }: { duels: AdminDuel[]; search: string; status: string; onSearch: (value: string) => void; onStatus: (value: string) => void; onUpdate: (duel: AdminDuel, challengerScore: number, opponentScore: number) => Promise<void>; onCancel: (id: string) => Promise<void>; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="field flex-1" value={search} onChange={(event) => onSearch(event.target.value)} placeholder={t("admin.duels.search")} />
        <select className="field sm:max-w-48" value={status} onChange={(event) => onStatus(event.target.value)}>
          <option value="all">{t("admin.filters.all")}</option>
          {(["pending", "accepted", "completed", "cancelled", "disputed"] as const).map((key) => <option key={key} value={key}>{t(`duels.status.${key}`)}</option>)}
        </select>
      </div>
      {duels.length === 0 ? <EmptyState message={t("admin.duels.empty")} icon="⚔️" /> : duels.map((duel) => <DuelRow key={duel.id} duel={duel} onUpdate={onUpdate} onCancel={onCancel} t={t} />)}
    </section>
  );
}

function DuelRow({ duel, onUpdate, onCancel, t }: { duel: AdminDuel; onUpdate: (duel: AdminDuel, challengerScore: number, opponentScore: number) => Promise<void>; onCancel: (id: string) => Promise<void>; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const [challengerScore, setChallengerScore] = useState(String(duel.challenger_score ?? 0));
  const [opponentScore, setOpponentScore] = useState(String(duel.opponent_score ?? 0));
  return (
    <div className="glass-panel flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{duel.challenger_username} <span className="text-ink-faint">{t("duels.vs")}</span> {duel.opponent_username}</span>
        <span className="eyebrow">{t(`duels.status.${duel.status}`)}</span>
      </div>
      <p className="truncate text-[11px] text-ink-faint">#{duel.id} · {new Date(duel.created_at).toLocaleString()}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs text-ink-muted">{duel.challenger_username}<input className="field mt-1" type="number" min="0" value={challengerScore} onChange={(event) => setChallengerScore(event.target.value)} /></label>
        <label className="flex-1 text-xs text-ink-muted">{duel.opponent_username}<input className="field mt-1" type="number" min="0" value={opponentScore} onChange={(event) => setOpponentScore(event.target.value)} /></label>
        <button className="neon-btn !py-2" onClick={() => onUpdate(duel, Number(challengerScore), Number(opponentScore))}>{t("admin.actions.saveResult")}</button>
        {duel.status !== "cancelled" && <button className="ghost-btn !py-2 !text-alert-soft" onClick={() => onCancel(duel.id)}>{t("admin.actions.cancelDuel")}</button>}
      </div>
    </div>
  );
}

function AuditSection({ logs, t }: { logs: AdminAuditLog[]; t: (key: string, vars?: Record<string, string | number>) => string }) {
  if (logs.length === 0) return <EmptyState message={t("admin.audit.empty")} icon="📋" />;
  return <section className="flex flex-col gap-2">{logs.map((log) => <div key={log.id} className="glass-panel flex flex-col gap-1 p-3 text-sm"><span className="font-medium text-ink">{t(`admin.audit.actions.${log.action_type}`)}</span><span className="text-xs text-ink-faint">{log.target_user_id ?? log.target_duel_id ?? "-"} · {new Date(log.created_at).toLocaleString()}</span></div>)}</section>;
}
