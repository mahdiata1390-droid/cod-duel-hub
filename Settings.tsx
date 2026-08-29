import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export default function Settings() {
  const { t } = useTranslation();
  const { profile, user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDuelHistory, setShowDuelHistory] = useState(profile?.show_duel_history ?? true);
  const [saved, setSaved] = useState(false);

  if (!user || !profile) return null;

  const handleToggle = async () => {
    const next = !showDuelHistory;
    setShowDuelHistory(next);
    await supabase.from("profiles").update({ show_duel_history: next }).eq("id", user.id);
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-2xl font-bold text-ink">{t("settings.title")}</h1>

      <section className="glass-panel flex flex-col gap-4 p-4">
        <h2 className="text-sm font-semibold text-ink-muted">{t("settings.section.language")}</h2>
        <LanguageSwitcher />
      </section>

      <section className="glass-panel flex flex-col gap-4 p-4">
        <h2 className="text-sm font-semibold text-ink-muted">{t("settings.section.privacy")}</h2>
        <label className="flex items-center justify-between gap-4">
          <span>
            <p className="text-sm text-ink">{t("settings.showDuelHistory")}</p>
            <p className="text-xs text-ink-faint">{t("settings.showDuelHistory.desc")}</p>
          </span>
          <button
            onClick={handleToggle}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
              showDuelHistory ? "border-cyan/50 bg-cyan/30" : "border-line bg-white/[0.05]"
            }`}
            aria-pressed={showDuelHistory}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-transform ${
                showDuelHistory ? "translate-x-[-1.375rem] rtl:translate-x-[1.375rem]" : "translate-x-0"
              }`}
              style={{
                insetInlineStart: "2px",
                transform: showDuelHistory ? "translateX(20px)" : "translateX(0)",
              }}
            />
          </button>
        </label>
        {saved && <p className="text-xs text-win">{t("settings.saved")}</p>}
      </section>

      <section className="glass-panel flex flex-col gap-4 p-4">
        <h2 className="text-sm font-semibold text-ink-muted">{t("settings.section.account")}</h2>
        <button
          className="ghost-btn w-full justify-start"
          onClick={() => user.email && supabase.auth.resetPasswordForEmail(user.email)}
        >
          {t("settings.changePassword")}
        </button>
        <button onClick={handleLogout} className="ghost-btn w-full justify-start !text-alert-soft">
          {t("settings.logoutEverywhere")}
        </button>
      </section>
    </div>
  );
}
