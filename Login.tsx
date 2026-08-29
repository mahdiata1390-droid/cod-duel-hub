import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
    else navigate("/");
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center">
      <div className="dossier-card p-6">
        <span className="eyebrow">{t("app.name")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("auth.login.title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("auth.login.subtitle")}</p>

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
          <label className="text-sm">
            <span className="mb-1 block text-xs text-ink-muted">{t("auth.login.password")}</span>
            <input
              type="password"
              required
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="text-xs text-alert">{error}</p>}

          <button type="submit" disabled={loading} className="neon-btn mt-2 w-full">
            {t("auth.login.submit")}
          </button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2 text-xs">
          <Link to="/reset-password" className="text-ink-faint hover:text-cyan">
            {t("auth.login.forgot")}
          </Link>
          <p className="text-ink-faint">
            {t("auth.login.noAccount")}{" "}
            <Link to="/register" className="text-cyan hover:underline">
              {t("auth.login.createOne")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
