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
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#452ABC]/30 bg-[#452ABC]/30 text-[#F6C545] hover:bg-[#452ABC]/55 transition shadow-[0_0_10px_rgba(246,197,69,0.1)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.83 9.17L22 12L14.83 14.83L12 22L9.17 14.83L2 12L9.17 9.17L12 2Z" fill="currentColor"/>
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[#E1D9F9]/10 bg-[#0A0A0B]/95 p-4 shadow-2xl z-50 backdrop-blur-md">
          
          <div className="mb-3 pb-3 border-b border-[#E1D9F9]/[0.08]">
            <p className="text-[10px] uppercase tracking-wider text-[#E1D9F9]/45">Sesi Utama</p>
            <p className="text-xs text-[#E1D9F9] truncate font-medium mt-0.5">{user?.email}</p>
          </div>

          <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#E1D9F9]/45">Language</label>
          
          {/* PERBAIKAN MUTLAK: Menambahkan translate="no" dan class "notranslate" 
              untuk mengunci pilihan teks asli nama bahasa agar tidak diacak-acak Google */}
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            translate="no"
            className="notranslate mb-4 w-full rounded-md border border-[#452ABC]/25 bg-[#452ABC]/18 px-3 py-1.5 text-xs text-[#E1D9F9] outline-none cursor-pointer font-medium"
          >
            {languages.map((code) => (
              <option 
                key={code} 
                value={code} 
                translate="no"
                className="notranslate bg-[#0A0A0B] text-[#E1D9F9]"
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
                className="block rounded-lg px-3 py-2 text-sm text-[#E1D9F9] hover:bg-[#F6C545]/12 transition"
              >
                {t(it.label)}
              </Link>
            ))}
          </nav>

          <div className="mt-3 pt-3 border-t border-[#E1D9F9]/[0.08]">
            <button
              type="button"
              onClick={handleMobileLogout}
              className="w-full py-2 bg-[#EC5C2A] hover:bg-[#c44a20] text-[#E1D9F9] text-xs font-bold rounded-lg transition"
            >
              Logout dari Portal
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}