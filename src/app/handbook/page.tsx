const handbookSections = [
  "Rules and attendance policy",
  "Daily essentials checklist",
  "Group communication protocol",
  "Task submission standards",
];

export default function HandbookPage() {
  return (
    <section className="space-y-4">
      <header className="panel p-6 sm:p-8">
        <p className="status-pill">Digital Handbook</p>
        <h1 className="mt-3 font-heading text-5xl tracking-[0.06em] text-[#f2f1ec]">Guidelines, Simplified</h1>
        <p className="mt-3 max-w-2xl text-[#e2ded2]">
          A calm reading mode for all critical information so participants do not need to scan long PDF files.
        </p>
      </header>

      <article className="panel p-5">
        <h2 className="font-heading text-3xl tracking-[0.05em] text-[#f2f1ec]">Core Sections</h2>
        <ul className="mt-3 space-y-2 text-[#ddd8cb]">
          {handbookSections.map((item) => (
            <li key={item} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
