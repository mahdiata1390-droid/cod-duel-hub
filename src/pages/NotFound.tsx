import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span className="font-display text-6xl font-extrabold text-cyan/40">404</span>
      <p className="text-sm text-ink-muted">{t("players.empty")}</p>
      <Link to="/" className="neon-btn mt-2">
        {t("nav.home")}
      </Link>
    </div>
  );
}
