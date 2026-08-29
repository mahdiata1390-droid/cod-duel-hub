import { useState } from "react";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/ui/Avatar";
import { StatPill } from "@/components/ui/StatPill";
import { Spinner } from "@/components/ui/Spinner";
import { winRate } from "@/hooks/useLeaderboard";

export default function Profile() {
  const { t } = useTranslation();
  const { profile, user, refreshProfile, loading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    username: profile?.username ?? "",
    cod_nickname: profile?.cod_nickname ?? "",
    cod_uid: profile?.cod_uid ?? "",
    bio: profile?.bio ?? "",
    rank: profile?.rank ?? "",
    country: profile?.country ?? "",
    avatar_url: profile?.avatar_url ?? "",
  });
  const [saving, setSaving] = useState(false);

  if (loading) return <Spinner />;
  if (!user || !profile) return null;

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("profiles").update(form).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="dossier-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatar_url} name={profile.username} size="xl" lastSeenAt={profile.last_seen_at} showStatus />
          <div>
            <h1 className="font-display text-xl font-bold text-ink">{profile.username}</h1>
            <p className="text-sm text-ink-muted">{profile.cod_nickname}</p>
          </div>
        </div>
        <button onClick={() => setEditing((v) => !v)} className="ghost-btn">
          {t("profile.editProfile")}
        </button>
      </div>

      {editing ? (
        <div className="glass-panel flex flex-col gap-3 p-4">
          <Field label={t("auth.register.username")} value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
          <Field label={t("profile.nickname")} value={form.cod_nickname} onChange={(v) => setForm({ ...form, cod_nickname: v })} />
          <Field label={t("profile.uid")} value={form.cod_uid} onChange={(v) => setForm({ ...form, cod_uid: v })} />
          <Field label={t("profile.rank")} value={form.rank} onChange={(v) => setForm({ ...form, rank: v })} />
          <Field label={t("profile.country")} value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <Field label="Avatar URL" value={form.avatar_url} onChange={(v) => setForm({ ...form, avatar_url: v })} />
          <label className="text-sm">
            <span className="mb-1 block text-xs text-ink-muted">{t("profile.bio")}</span>
            <textarea
              className="field min-h-24"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="ghost-btn flex-1">
              {t("common.cancel")}
            </button>
            <button onClick={handleSave} disabled={saving} className="neon-btn flex-1">
              {t("common.save")}
            </button>
          </div>
        </div>
      ) : (
        profile.bio && <p className="glass-panel p-4 text-sm text-ink-muted">{profile.bio}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <StatPill label={t("profile.stats.wins")} value={profile.wins} tone="win" />
        <StatPill label={t("profile.stats.losses")} value={profile.losses} tone="loss" />
        <StatPill label={t("profile.stats.draws")} value={profile.draws} tone="draw" />
        <StatPill label={t("profile.stats.winRate")} value={`${winRate(profile)}%`} tone="cyan" />
        <StatPill label={t("profile.stats.totalDuels")} value={profile.total_duels} tone="violet" />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs text-ink-muted">{label}</span>
      <input className="field" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
