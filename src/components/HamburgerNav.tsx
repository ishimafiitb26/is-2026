"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "./I18nProvider";
import { languageLabels, languages, type Language } from "../lib/i18n";

export default function HamburgerNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="relative">
      <button
        aria-label="Toggle menu"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#D5C757]/30 bg-[#0F282F]/90 text-[#D5C757] hover:bg-[#084D58]"
      >
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="2" rx="1" fill="currentColor" />
          <rect y="6" width="20" height="2" rx="1" fill="currentColor" />
          <rect y="12" width="20" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-[#0F282F]/95 p-3 shadow-lg backdrop-blur-md">
          <label className="mb-2 block px-3 text-xs uppercase tracking-[0.08em] text-[#D7DCD5]">Language</label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="mb-3 w-full rounded-md border border-[#084D58]/50 bg-[#084D58]/30 px-3 py-2 text-sm text-[#F2EDEC] outline-none"
          >
            {languages.map((code) => (
              <option key={code} value={code} className="bg-[#0F282F] text-[#F2EDEC]">
                {languageLabels[code]}
              </option>
            ))}
          </select>
          <nav className="flex flex-col gap-2">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="block rounded px-3 py-2 text-sm text-[#D5C757] hover:bg-[#084D58]/50 hover:text-[#F2EDEC] transition-colors"
              >
                {t(it.label)}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
