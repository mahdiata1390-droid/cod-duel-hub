import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import fa from "./locales/fa.json";
import en from "./locales/en.json";

export type Locale = "fa" | "en";

const STORAGE_KEY = "cod-duel-hub:locale";

const dictionaries: Record<Locale, Record<string, string>> = { fa, en };

const localeMeta: Record<Locale, { dir: "rtl" | "ltr"; label: string }> = {
  fa: { dir: "rtl", label: "فارسی" },
  en: { dir: "ltr", label: "English" },
};

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "fa";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "fa" || stored === "en") return stored;
  return "fa"; // Persian is the default language
}

interface I18nContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    const { dir } = localeMeta[locale];
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const toggleLocale = useCallback(
    () => setLocaleState((prev) => (prev === "fa" ? "en" : "fa")),
    []
  );

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dictionaries[locale];
      let str = dict[key] ?? dictionaries.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`{{${k}}}`, "g"), String(v));
        }
      }
      return str;
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir: localeMeta[locale].dir, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}

export const availableLocales: { code: Locale; label: string }[] = [
  { code: "fa", label: localeMeta.fa.label },
  { code: "en", label: localeMeta.en.label },
];
