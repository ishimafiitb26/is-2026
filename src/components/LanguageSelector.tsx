"use client";

import { useI18n } from "./I18nProvider";
import { languages, languageLabels, type Language } from "../lib/i18n";

export default function LanguageSelector() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="relative inline-block text-left">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="cursor-pointer rounded-xl border border-[#452ABC]/60 bg-[#0A0A0B]/90 px-3 py-1.5 text-xs font-semibold text-[#E1D9F9] outline-none hover:border-[#F6C545] transition duration-300 shadow-md backdrop-blur-sm"
      >
        {languages.map((lang) => (
          <option key={lang} value={lang} className="bg-[#0A0A0B] text-[#E1D9F9]">
            🌐 {languageLabels[lang]}
          </option>
        ))}
      </select>
    </div>
  );
}
