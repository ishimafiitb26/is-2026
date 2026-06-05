const prompts = [
  "What is one small win from today?",
  "What part of the process feels heavy right now?",
  "What kind of support would help your group this week?",
];

export default function ReflectionBoardPage() {
  return (
    <section className="space-y-4">
      <header className="panel p-6 sm:p-8">
        <p className="status-pill">Reflection Board</p>
        <h1 className="mt-3 font-heading text-5xl tracking-[0.06em] text-[#f2f1ec]">A Safe Space For Notes</h1>
        <p className="mt-3 max-w-2xl text-[#e2ded2]">
          Pseudo-anonymous reflection board to reduce stress and encourage honest communication.
        </p>
      </header>

      <article className="panel p-5">
        <h2 className="font-heading text-3xl tracking-[0.05em] text-[#f2f1ec]">Reflection Prompts</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {prompts.map((prompt) => (
            <div key={prompt} className="rounded-xl border border-[#d8a75b]/30 bg-[#d8a75b]/12 p-4 text-[#f2f1ec]">
              {prompt}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
