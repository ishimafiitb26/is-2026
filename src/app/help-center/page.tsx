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
  return (
    <section className="space-y-4">
      <header className="panel p-6 sm:p-8">
        <p className="status-pill">Help Center</p>
        <h1 className="mt-3 font-heading text-5xl tracking-[0.06em] text-[#f2f1ec]">FAQ Command Post</h1>
        <p className="mt-3 max-w-2xl text-[#e2ded2]">
          Frequently asked questions to keep support clear and reduce repetitive chats.
        </p>
      </header>

      <div className="space-y-3">
        {faqs.map((faq) => (
          <article key={faq.q} className="panel p-5">
            <h2 className="text-xl font-semibold text-[#f2f1ec]">{faq.q}</h2>
            <p className="mt-2 text-[#ddd8cb]">{faq.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
