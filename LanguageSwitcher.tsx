import { availableLocales, useTranslation } from "@/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="inline-flex items-center rounded-lg border border-line bg-white/[0.03] p-0.5 text-xs font-medium">
      {availableLocales.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          className={`rounded-md px-2.5 py-1.5 transition-colors ${
            locale === l.code ? "bg-cyan/15 text-cyan" : "text-ink-muted hover:text-ink"
          }`}
          aria-pressed={locale === l.code}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
