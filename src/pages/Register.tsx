import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    codNickname: "",
    codUid: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err, needsEmailConfirmation } = await signUp(form);
    setLoading(false);
    if (err) setError(err);
    else if (needsEmailConfirmation) setNeedsConfirmation(true);
    else navigate("/");
  };

  if (needsConfirmation) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center py-8">
        <div className="dossier-card p-6 text-center">
          <span className="eyebrow">{t("app.name")}</span>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">
            {t("auth.register.confirmEmailTitle")}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {t("auth.register.confirmEmailBody")}
          </p>
          <Link to="/login" className="neon-btn mt-6 inline-block w-full">
            {t("auth.register.signIn")}
          </Link>
        </div>
      </div>
    );
  }

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center py-8">
      <div className="dossier-card p-6">
        <span className="eyebrow">{t("app.name")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("auth.register.title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("auth.register.subtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-ink-muted">{t("auth.register.username")}</span>
            <input required className="field" value={form.username} onChange={update("username")} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-ink-muted">{t("auth.register.codNickname")}</span>
            <input required className="field" value={form.codNickname} onChange={update("codNickname")} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-ink-muted">{t("auth.register.codUid")}</span>
            <input required className="field" value={form.codUid} onChange={update("codUid")} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-ink-muted">{t("auth.login.email")}</span>
            <input type="email" required className="field" value={form.email} onChange={update("email")} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-ink-muted">{t("auth.login.password")}</span>
            <input
              type="password"
              required
              minLength={6}
              className="field"
              value={form.password}
              onChange={update("password")}
            />
          </label>

          {error && <p className="text-xs text-alert">{error}</p>}

          <button type="submit" disabled={loading} className="neon-btn mt-2 w-full">
            {t("auth.register.submit")}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-faint">
          {t("auth.register.haveAccount")}{" "}
          <Link to="/login" className="text-cyan hover:underline">
            {t("auth.register.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
