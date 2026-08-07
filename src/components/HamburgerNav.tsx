"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { useAuth } from "./AuthProvider";
import { languageLabels, languages, type Language } from "../lib/i18n";

export default function HamburgerNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, t } = useI18n();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleMobileLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/auth/login");
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Toggle menu"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#084D58]/40 bg-[#084D58]/40 text-[#D5C757] hover:bg-[#084D58]/80 transition shadow-[0_0_10px_rgba(213,199,87,0.1)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.83 9.17L22 12L14.83 14.83L12 22L9.17 14.83L2 12L9.17 9.17L12 2Z" fill="currentColor"/>
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[#084D58]/40 bg-[#0F282F]/95 p-4 shadow-2xl z-50 backdrop-blur-md">
          
          <div className="mb-3 pb-3 border-b border-[#084D58]/50">
            <p className="text-[10px] uppercase tracking-wider text-[#D7DCD5]/60">Log In as</p>
            <p className="text-xs text-[#F2EDEC] truncate font-medium mt-0.5">{user?.email}</p>
          </div>

          <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#D7DCD5]/60">Language</label>
          
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            translate="no"
            className="notranslate mb-4 w-full rounded-md border border-[#084D58]/30 bg-[#084D58]/50 px-3 py-1.5 text-xs text-[#F2EDEC] outline-none cursor-pointer font-medium"
          >
            {languages.map((code) => (
              <option 
                key={code} 
                value={code} 
                translate="no"
                className="notranslate bg-[#0F282F] text-[#F2EDEC]"
              >
                {languageLabels[code]}
              </option>
            ))}
          </select>
          
          <nav className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1 mb-2">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-[#F2EDEC] hover:bg-[#084D58]/60 transition"
              >
                {t(it.label)}
              </Link>
            ))}
          </nav>

          <div className="mt-3 pt-3 border-t border-[#084D58]/50">
            <button
              type="button"
              onClick={handleMobileLogout}
              className="w-full py-2 bg-[#CE4A2D] hover:bg-[#b23d22] text-[#F2EDEC] text-xs font-bold rounded-lg transition"
            >
              Logout dari Portal
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}