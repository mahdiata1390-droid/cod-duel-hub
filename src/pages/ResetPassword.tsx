import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";

export default function ResetPassword() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await resetPassword(email);
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center">
      <div className="dossier-card p-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("auth.resetPassword.title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("auth.resetPassword.subtitle")}</p>

        {sent ? (
          <p className="mt-6 text-sm text-win">{t("auth.resetPassword.sent")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-ink-muted">{t("auth.login.email")}</span>
              <input
                type="email"
                required
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button type="submit" disabled={loading} className="neon-btn mt-2 w-full">
              {t("auth.resetPassword.submit")}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-4 block text-center text-xs text-ink-faint hover:text-cyan">
          {t("common.back")}
        </Link>
      </div>
    </div>
  );
}
