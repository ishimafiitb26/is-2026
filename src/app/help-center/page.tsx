"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../components/I18nProvider";

const faqs = [
  {
    q: "Where do I upload assignments?",
    a: "Use Portal Access and open Student Dashboard. Every active task has a direct upload action.",
  },
  {
    q: "What if I miss a deadline?",
    a: "Contact your mentor first, then submit a short explanation through your group channel.",
  },
  {
    q: "Can I edit a submitted file?",
    a: "Yes, while the deadline is still active. After that, revision depends on panitia approval.",
  },
];

export default function HelpCenterPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [openQuestion, setOpenQuestion] = useState(faqs[0]?.q ?? "");

  const filteredFaqs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return faqs;
    return faqs.filter((item) => {
      const content = `${t(item.q)} ${t(item.a)}`.toLowerCase();
      return content.includes(keyword);
    });
  }, [query, t]);

  return (
    <section className="space-y-4">
      <header className="panel p-6 sm:p-8">
        <p className="status-pill">{t("Help Center")}</p>
        <h1 className="mt-3 font-heading text-5xl tracking-wider text-[#f2f1ec]">{t("FAQ Command Post")}</h1>
        <p className="mt-3 max-w-2xl text-[#e2ded2]">
          {t("Frequently asked questions to keep support clear and reduce repetitive chats.")}
        </p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("Search help topics...")}
          className="mt-4 w-full max-w-md rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-[#f2f1ec] outline-none placeholder:text-[#aaa391] focus:border-[#d8a75b]"
        />
      </header>

      <div className="space-y-3">
        {filteredFaqs.map((faq) => (
          <article key={faq.q} className="panel p-2">
            <button
              type="button"
              onClick={() => setOpenQuestion((prev) => (prev === faq.q ? "" : faq.q))}
              className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left"
            >
              <h2 className="text-lg font-semibold text-[#f2f1ec]">{t(faq.q)}</h2>
              <span className="text-[#d8a75b]">{openQuestion === faq.q ? "-" : "+"}</span>
            </button>
            {openQuestion === faq.q ? <p className="px-3 pb-4 text-[#ddd8cb]">{t(faq.a)}</p> : null}
          </article>
        ))}
        {filteredFaqs.length === 0 ? (
          <p className="panel p-4 text-[#ddd8cb]">No result found. Try another keyword or ask your mentor.</p>
        ) : null}
      </div>
    </section>
  );
}
