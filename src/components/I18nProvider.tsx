"use client";

import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { Language, languages, translate } from "../lib/i18n";

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("is2026-language");
    if (stored && languages.includes(stored as Language)) {
      return stored as Language;
    }
    return "en";
  });

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem("is2026-language", nextLanguage);

    if (typeof window !== "undefined") {
      let googleLangCode = nextLanguage as string;
      if (nextLanguage === "zh") googleLangCode = "zh-CN";

      // SOLUSI MUTLAK: Format kuki standar Google Translate (/bahasa_asal/bahasa_tujuan)
      // Jika memilih 'en', kita set ke /en/en (artinya English ke English = kembali normal)
      const cookieValue = `/en/${googleLangCode}`;

      // Tulis paksa ke kuki browser agar dibaca langsung oleh sistem inti Google Translate
      document.cookie = `googtrans=${cookieValue}; path=/;`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname};`;

      // REFRESH INSTAN: Membersihkan DOM React yang sempat dirusak oleh Google Translate
      window.location.reload();
    }
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string) => translate(language, key),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}