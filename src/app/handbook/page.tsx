"use client";

import { useMemo, useState } from "react";

const handbookSections = [
  "Read rules and attendance policy",
  "Prepare daily essentials checklist",
  "Understand group communication protocol",
  "Confirm task submission standards",
  "Pin emergency contacts and support channel",
];

export default function HandbookPage() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const progress = useMemo(() => {
    const done = handbookSections.filter((item) => checkedItems[item]).length;
    return Math.round((done / handbookSections.length) * 100);
  }, [checkedItems]);

  const toggleItem = (item: string) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <section className="space-y-4">
      <header className="panel p-6 sm:p-8">
        <p className="status-pill">Digital Handbook</p>
        <h1 className="mt-3 font-heading text-5xl tracking-wider text-[#f2f1ec]">Guidelines, Simplified</h1>
        <p className="mt-3 max-w-2xl text-[#e2ded2]">
          A calm reading mode for all critical information so participants do not need to scan long PDF files.
        </p>
        <p className="mt-4 text-sm text-[#d8a75b]">Checklist progress: {progress}% completed</p>
      </header>

      <article className="panel p-5">
        <h2 className="font-heading text-3xl tracking-wider text-[#f2f1ec]">Core Sections</h2>
        <ul className="mt-3 space-y-2 text-[#ddd8cb]">
          {handbookSections.map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => toggleItem(item)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                  checkedItems[item]
                    ? "border-[#d8a75b]/70 bg-[#d8a75b]/15 text-[#f2f1ec]"
                    : "border-white/15 bg-white/5"
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded border text-xs ${
                    checkedItems[item] ? "border-[#d8a75b] bg-[#d8a75b] text-[#1b1f1d]" : "border-white/40"
                  }`}
                >
                  {checkedItems[item] ? "✓" : ""}
                </span>
                <span>{item}</span>
              </button>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
