import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export default function Settings() {
  const { t } = useTranslation();
  const { profile, user, signOut, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!user || !profile) return null;

  const handleResetPassword = async () => {
    if (!user.email) return;
    const { error } = await resetPassword(user.email);
    setStatusMessage(error ?? t("settings.saved"));
    setSaved(!error);
    setTimeout(() => {
      setSaved(false);
      setStatusMessage(null);
    }, 2400);
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

      {(saved || statusMessage) && <p className="text-xs text-win">{statusMessage || t("settings.saved")}</p>}

      <section className="glass-panel flex flex-col gap-4 p-4">
        <h2 className="text-sm font-semibold text-ink-muted">{t("settings.section.account")}</h2>
        <button className="ghost-btn w-full justify-start" onClick={handleResetPassword}>
          {t("settings.changePassword")}
        </button>
        <button onClick={handleLogout} className="ghost-btn w-full justify-start !text-alert-soft">
          {t("settings.logoutEverywhere")}
        </button>
      </section>
    </div>
  );
}
