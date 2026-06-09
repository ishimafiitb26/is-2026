"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { addDoc, onSnapshot, orderBy, query, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getCurrentTimestamp, reflectionNotesCollectionRef, reflectionPromptsCollectionRef, type ReflectionNote, type ReflectionPrompt } from "../../lib/engagement";
import { useI18n } from "../../components/I18nProvider";
import { useAuth } from "../../components/AuthProvider";

const stickyColors = [
  "bg-[#f3d9b1] text-[#4a352b]",
  "bg-[#f0cbb3] text-[#4a352b]",
  "bg-[#e9d7c8] text-[#4a352b]",
  "bg-[#e4c1ad] text-[#4a352b]",
];

// A simple grid-based placement to avoid overlaps
const MAX_POSITIONS = 15;
const usedPositions = new Set<string>();

function getNewPosition(): { x: number; y: number; rotate: number } {
  if (usedPositions.size >= MAX_POSITIONS) {
    usedPositions.clear(); // Reset if all positions are used
  }

  let x, y, positionKey;
  do {
    x = Math.floor(Math.random() * 5); // 5 columns
    y = Math.floor(Math.random() * 3); // 3 rows
    positionKey = `${x}-${y}`;
  } while (usedPositions.has(positionKey));

  usedPositions.add(positionKey);

  return {
    x: x * 18 + 5, // %-based positioning
    y: y * 25 + 5, // %-based positioning
    rotate: Math.floor(Math.random() * 13) - 6,
  };
}

export default function ReflectionBoardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<ReflectionPrompt[]>([]);
  const [notes, setNotes] = useState<(ReflectionNote & { id: string })[]>([]);
  const [alias, setAlias] = useState("Group Nova");
  const [message, setMessage] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [messageInfo, setMessageInfo] = useState("");
  const [editingNote, setEditingNote] = useState<(ReflectionNote & { id: string }) | null>(null);
  const [userId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    let localUserId = localStorage.getItem("reflectionBoardUserId");
    if (!localUserId) {
      localUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("reflectionBoardUserId", localUserId);
    }
    return localUserId;
  });

  useEffect(() => {
    // Only subscribe to Firestore when user is authenticated
    if (!user) return;

    const onError = (error: Error) => {
      if (error.message.includes("permission")) {
        console.debug("Firestore permission check:", error.message);
      } else {
        console.error("Firestore error:", error);
      }
    };

    const promptsQuery = query(reflectionPromptsCollectionRef, orderBy("order", "asc"));
    const unsubscribePrompts = onSnapshot(promptsQuery, (snapshot) => {
      const rows = snapshot.docs.map((entry) => entry.data() as ReflectionPrompt);
      setPrompts(rows);
      if (!selectedPrompt && rows[0]?.text) {
        setSelectedPrompt(rows[0].text);
      }
    }, onError);

    const notesQuery = query(reflectionNotesCollectionRef, orderBy("createdAt", "desc"));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const newNotes = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as ReflectionNote & { id: string }));
      setNotes(newNotes);
      // Repopulate used positions to avoid overlap on reload
      usedPositions.clear();
      newNotes.forEach(note => {
        const x = Math.floor((note.x - 5) / 18);
        const y = Math.floor((note.y - 5) / 25);
        usedPositions.add(`${x}-${y}`);
      });
    }, onError);

    return () => {
      unsubscribePrompts();
      unsubscribeNotes();
    };
  }, [selectedPrompt, user]);

  const noteCountText = useMemo(() => `${notes.length} ${t("reflection notes on board")}`, [notes.length, t]);

  const handleOpenComposer = (noteToEdit: (ReflectionNote & { id: string }) | null = null) => {
    if (noteToEdit) {
      setEditingNote(noteToEdit);
      setAlias(noteToEdit.alias);
      // Simple split, might need refinement if prompts contain newlines
      const parts = noteToEdit.message.split('\n\n');
      if (parts.length > 1) {
        setSelectedPrompt(parts[0]);
        setMessage(parts.slice(1).join('\n\n'));
      } else {
        setMessage(noteToEdit.message);
      }
    } else {
      setEditingNote(null);
      setMessage("");
      // Don't reset alias, let them keep it
    }
    setComposerOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanAlias = alias.trim();
    const cleanMessage = message.trim();
    if (!cleanAlias || !cleanMessage || !userId) return;

    const noteContent = {
      alias: cleanAlias,
      message: selectedPrompt ? `${selectedPrompt}\n\n${cleanMessage}` : cleanMessage,
      createdAt: getCurrentTimestamp(),
      userId: userId,
    };

    if (editingNote) {
      // Update existing note
      const noteRef = doc(reflectionNotesCollectionRef, editingNote.id);
      await updateDoc(noteRef, {
        alias: noteContent.alias,
        message: noteContent.message,
      });
      setMessageInfo(t("Reflection updated."));
    } else {
      // Add new note
      const placement = getNewPosition();
      await addDoc(reflectionNotesCollectionRef, {
        ...noteContent,
        x: placement.x,
        y: placement.y,
        rotate: placement.rotate,
      });
      setMessageInfo(t("Reflection posted."));
    }

    setMessage("");
    setComposerOpen(false);
    setEditingNote(null);
    // Reset form to default state
    setAlias("Group Nova");
    setMessage("");
  };

  const handleDelete = async (noteId: string) => {
    if (window.confirm(t("Are you sure you want to delete this note?"))) {
      await deleteDoc(doc(reflectionNotesCollectionRef, noteId));
      setMessageInfo(t("Reflection deleted."));
    }
  };

  return (
    <section className="space-y-4">
      <header className="panel p-6 sm:p-8">
        <p className="status-pill">{t("Reflection Board")}</p>
        <h1 className="mt-3 font-heading text-5xl tracking-wider text-[#f7f0e8]">{t("Sticky Notes Board")}</h1>
        <p className="mt-3 max-w-2xl text-[#e6d7cb]">
          {t("Prompts are managed by admin. Participants can pick an empty sticky note, write reflections, and pin it to the board. Your notes are editable only during your current browser session.")}
        </p>
        <p className="mt-3 text-sm text-[#c18f63]">{noteCountText}</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.5fr]">
        <article className="panel p-5">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Reflection Wall")}</h2>
          <div className="relative mt-4 min-h-[36rem] overflow-hidden rounded-2xl border border-white/10 bg-[#2e211b]/65 p-4 sm:min-h-[48rem]">
            {notes.length ? (
              notes.slice(0, 30).map((note, index) => {
                const palette = stickyColors[index % stickyColors.length];
                const isOwner = note.userId === userId;
                return (
                  <article
                    key={note.id}
                    className={`absolute w-[28%] rounded-md p-3 shadow-lg sm:w-[18%] ${palette} transition-transform duration-300 hover:scale-105 hover:z-10`}
                    style={{
                      left: `${Math.min(note.x, 88)}%`,
                      top: `${Math.min(note.y, 88)}%`,
                      transform: `rotate(${note.rotate}deg)`,
                    }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em]">{note.alias}</p>
                    <p className="mt-1 text-xs whitespace-pre-line">{note.message}</p>
                    {isOwner && (
                       <div className="absolute -top-2 -right-2 flex gap-1">
                        <button onClick={() => handleOpenComposer(note)} className="h-5 w-5 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs shadow-md hover:bg-blue-600">✏️</button>
                        <button onClick={() => handleDelete(note.id)} className="h-5 w-5 rounded-full bg-red-500 text-white text-xs shadow-md hover:bg-red-600">X</button>
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-white/20 text-center text-sm text-[#cfb7a6]">
                {t("Board is empty. Pin the first sticky note.")}
              </div>
            )}
          </div>
        </article>

        <article className="panel p-5">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Sticky Kit")}</h2>
          <p className="mt-2 text-sm text-[#e6d7cb]">{t("Click any empty sticky note to open the writing panel.")}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleOpenComposer()}
                className={`aspect-square rounded-md border border-[#2d1b16]/20 p-2 text-left shadow ${stickyColors[index % stickyColors.length]} hover:-translate-y-0.5 transition`}
              >
                <p className="text-[10px] uppercase tracking-[0.08em]">{t("Empty Note")}</p>
                <p className="mt-1 text-[10px]">{t("Tap to write")}</p>
              </button>
            ))}
          </div>

          {composerOpen ? (
            <form className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/15 p-4" onSubmit={handleSubmit}>
              <h3 className="font-bold text-lg text-[#e6d7cb]">{editingNote ? t("Edit Reflection") : t("New Reflection")}</h3>
              <label className="block space-y-1">
                <span className="text-sm text-[#d7bfaf]">{t("Alias")}</span>
                <input
                  value={alias}
                  onChange={(event) => setAlias(event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-[#d7bfaf]">{t("Prompt")}</span>
                <select
                  value={selectedPrompt}
                  onChange={(event) => setSelectedPrompt(event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
                >
                  {prompts.map((prompt) => (
                    <option key={prompt.text} value={prompt.text} className="bg-[#2d1b16] text-[#f7f0e8]">
                      {prompt.text}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-[#d7bfaf]">{t("Message")}</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  placeholder={t("Write your reflection...")}
                  className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-[#f7f0e8] outline-none placeholder:text-[#ac9180] focus:border-[#c18f63]"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className="cta-btn px-4 py-2">{editingNote ? t("Update Note") : t("Pin to board")}</button>
                <button type="button" onClick={() => setComposerOpen(false)} className="nav-chip px-4 py-2">{t("Cancel")}</button>
              </div>
            </form>
          ) : null}

          {messageInfo ? (
            <p className="mt-3 rounded-lg border border-[#c18f63]/40 bg-[#c18f63]/12 px-3 py-2 text-sm text-[#f7f0e8]">{messageInfo}</p>
          ) : null}
        </article>
      </div>
    </section>
  );
}
