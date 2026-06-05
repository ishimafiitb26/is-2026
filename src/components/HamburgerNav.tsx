"use client";

import { useState } from "react";
import Link from "next/link";

export default function HamburgerNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-label="Toggle menu"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-black/10 text-[#f2f1ec] hover:bg-white/5"
      >
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="20" height="2" rx="1" fill="currentColor" />
          <rect y="6" width="20" height="2" rx="1" fill="currentColor" />
          <rect y="12" width="20" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-[#1f2d26]/95 p-3 shadow-lg">
          <nav className="flex flex-col gap-2">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="block rounded px-3 py-2 text-sm text-[#d8d3c6] hover:bg-white/5"
              >
                {it.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
