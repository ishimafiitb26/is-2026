"use client";

import { FormEvent, useMemo, useState } from "react";

const prompts = [
  "What is one small win from today?",
  "What part of the process feels heavy right now?",
  "What kind of support would help your group this week?",
];

type Note = {
  id: string;
  alias: string;
  message: string;
};

const starterNotes: Note[] = [
  { id: "1", alias: "Group Atlas", message: "The checklist view helps us stay less anxious before deadline." },
  { id: "2", alias: "Group Echo", message: "Need a sample submission format for first task." },
];

export default function ReflectionBoardPage() {
  const [notes, setNotes] = useState<Note[]>(starterNotes);
  const [alias, setAlias] = useState("Group Nova");
  const [message, setMessage] = useState("");

  const noteCountText = useMemo(() => `${notes.length} reflection notes today`, [notes.length]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanMessage = message.trim();
    const cleanAlias = alias.trim();
    if (!cleanMessage || !cleanAlias) return;

    setNotes((prev) => [
      { id: crypto.randomUUID(), alias: cleanAlias, message: cleanMessage },
      ...prev,
    ]);
    setMessage("");
  };

  return (
    <section className="space-y-4">
      <header className="panel p-6 sm:p-8">
        <p className="status-pill">Reflection Board</p>
        <h1 className="mt-3 font-heading text-5xl tracking-wider text-[#f2f1ec]">A Safe Space For Notes</h1>
        <p className="mt-3 max-w-2xl text-[#e2ded2]">
          Pseudo-anonymous reflection board to reduce stress and encourage honest communication.
        </p>
        <p className="mt-3 text-sm text-[#d8a75b]">{noteCountText}</p>
      </header>

      <article className="panel p-5">
        <h2 className="font-heading text-3xl tracking-wider text-[#f2f1ec]">Reflection Prompts</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {prompts.map((prompt) => (
            <div key={prompt} className="rounded-xl border border-[#d8a75b]/30 bg-[#d8a75b]/12 p-4 text-[#f2f1ec]">
              {prompt}
            </div>
          ))}
        </div>
      </article>

      <article className="panel p-5">
        <h2 className="font-heading text-3xl tracking-wider text-[#f2f1ec]">Drop A Note</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm text-[#d8d3c6]">Alias</span>
            <input
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              className="w-full rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-[#f2f1ec] outline-none focus:border-[#d8a75b]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-[#d8d3c6]">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              placeholder="Write your reflection safely here..."
              className="w-full rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-[#f2f1ec] outline-none placeholder:text-[#aaa391] focus:border-[#d8a75b]"
            />
          </label>
          <button type="submit" className="cta-btn px-4 py-2">
            Post Reflection
          </button>
        </form>
      </article>

      <section className="grid gap-3 sm:grid-cols-2">
        {notes.map((note) => (
          <article key={note.id} className="rounded-xl border border-white/20 bg-white/8 p-4 text-[#f2f1ec]">
            <p className="text-xs uppercase tracking-[0.08em] text-[#d8a75b]">{note.alias}</p>
            <p className="mt-2 text-[#ece8de]">{note.message}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
