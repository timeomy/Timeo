"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Language = "en" | "ms" | "zh";

type TranslationMap = Record<string, string>;

const TRANSLATIONS: Record<Language, TranslationMap> = {
  en: {},
  ms: {},
  zh: {},
};

// Dynamically loaded translations cache
const loadedLangs = new Set<Language>();

async function loadTranslations(lang: Language): Promise<TranslationMap> {
  if (loadedLangs.has(lang)) return TRANSLATIONS[lang];
  try {
    const res = await fetch(`/messages/${lang}.json`);
    if (res.ok) {
      const data = await res.json();
      TRANSLATIONS[lang] = data;
      loadedLangs.add(lang);
    }
  } catch {
    // silently fallback
  }
  return TRANSLATIONS[lang];
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

const LS_KEY = "timeo_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [translations, setTranslations] = useState<TranslationMap>({});

  useEffect(() => {
    const stored = (localStorage.getItem(LS_KEY) as Language) || "en";
    const lang: Language = ["en", "ms", "zh"].includes(stored)
      ? (stored as Language)
      : "en";
    setLanguageState(lang);
    loadTranslations(lang).then(setTranslations);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(LS_KEY, lang);
    setLanguageState(lang);
    loadTranslations(lang).then(setTranslations);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let str = translations[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return str;
    },
    [translations],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
