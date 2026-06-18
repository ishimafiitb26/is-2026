"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../components/I18nProvider";

// ─DATA: ganti `pdfUrl` dengan link Firebase Storage / Cloudinary eh pake ini kan ato upload file jujur gak tau.
// Tinggal tambah / hapus objek di array ini kalau jumlah log berubah.
type LogEntry = {
  id: string;
  tag: string;       // kategori singkat, ex: "AWAKENING"
  title: string;     // judul log
  note: string;      // deskripsi singkat
  pdfUrl: string;    // link PDF (placeholder dulu)
};

const logbooks: LogEntry[] = [
  {
    id: "log-1",
    tag: "AWAKENING",
    title: "Log 1 — Awakening Protocol",
    note: "Astravara",
    pdfUrl: "/logbooks/log-1.pdf",
  },
  {
    id: "log-2",
    tag: "MISSION KIT",
    title: "Log 2 — Mission Briefing",
    note: "Finding your way to the stars",
    pdfUrl: "/logbooks/log-2.pdf",
  },
  {
    id: "log-3",
    tag: "SIGNAL",
    title: "Log 3 — Hail Mary Protocol",
    note: "Create a signal to the stars",
    pdfUrl: "/logbooks/log-3.pdf",
  },
  {
    id: "log-4",
    tag: "LOGBOOK",
    title: "Log 4 — First Contact",
    note: "The first contact to Astradhara",
    pdfUrl: "/logbooks/log-4.pdf",
  },
  {
    id: "log-5",
    tag: "BEACON",
    title: "Log 5 — Final Beacon",
    note: "Navigating the final beacon to the stars",
    pdfUrl: "/logbooks/log-5.pdf",
  },
];

export default function HandbookPage() {
  const { t } = useI18n();
  const [readLogs, setReadLogs] = useState<Record<string, boolean>>({});
  const [activeLog, setActiveLog] = useState<LogEntry | null>(null);

  const progress = useMemo(() => {
    const done = logbooks.filter((l) => readLogs[l.id]).length;
    return Math.round((done / logbooks.length) * 100);
  }, [readLogs]);

  const doneCount = logbooks.filter((l) => readLogs[l.id]).length;

  const openLog = (log: LogEntry) => {
    setActiveLog(log);
    setReadLogs((prev) => ({ ...prev, [log.id]: true }));
  };

  const closeLog = () => setActiveLog(null);

  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* ── BACKGROUND ── */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#07090c]" />

        <div
          className="absolute -left-20 -top-16 h-80 w-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(70,140,60,0.16) 0%, rgba(180,110,20,0.08) 45%, transparent 72%)",
            filter: "blur(45px)",
          }}
        />
        <div
          className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(200,40,70,0.14) 0%, rgba(120,20,40,0.07) 45%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute right-[10%] top-[30%] h-52 w-52 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(220,170,60,0.08) 0%, transparent 65%)",
            filter: "blur(35px)",
          }}
        />

        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          {([
            [6,9,.4,.15],[14,28,.3,.18],[24,14,.5,.1],[35,48,.4,.14],[44,20,.3,.2],
            [58,62,.4,.12],[68,12,.5,.16],[77,40,.3,.13],[85,68,.4,.1],[93,22,.5,.18],
            [9,60,.4,.11],[20,78,.3,.14],[50,85,.4,.1],[72,80,.5,.13],
          ] as [number,number,number,number][]).map(([x,y,r,o],i) => (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="white" opacity={o} />
          ))}
          {([
            [18,8,1.2,.55],[62,6,1,.5],[88,30,1.3,.45],
          ] as [number,number,number,number][]).map(([x,y,r,o],i) => (
            <g key={`b${i}`}>
              <circle cx={`${x}%`} cy={`${y}%`} r={r} fill="white" opacity={o} />
              <circle cx={`${x}%`} cy={`${y}%`} r={r * 2.5} fill="white" opacity={0.04} />
            </g>
          ))}
          <circle cx="90%" cy="8%" r="2" fill="#ffd584" opacity=".7" />
          <circle cx="90%" cy="8%" r="6" fill="#ffd584" opacity=".07" />
          <g><circle cx="12%" cy="40%" r="1.6" fill="#4a8c3c" opacity=".3" /><circle cx="12%" cy="40%" r="5" fill="#4a8c3c" opacity=".05" /></g>
          <g><circle cx="80%" cy="55%" r="1.8" fill="#c8542a" opacity=".25" /><circle cx="80%" cy="55%" r="5" fill="#c8542a" opacity=".04" /></g>
        </svg>

        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(247,240,232,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(247,240,232,0.02) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(circle at 50% 20%, black 15%, transparent 70%)",
          }}
        />
      </div>

      {/* ── PAGE ── */}
      <section className="relative space-y-5 p-5 sm:p-7">

        {/* HERO */}
        <div className="py-2 text-center">
          <div
            className="mb-4 flex items-center justify-center gap-3 font-mono text-[9px] uppercase tracking-[0.26em]"
            style={{ color: "rgba(213,170,80,0.45)" }}
          >
            <span className="block h-px w-7" style={{ background: "rgba(213,170,80,0.2)" }} />
            {t("Codex Eridani · Fragmen Tersegel")}
            <span className="block h-px w-7" style={{ background: "rgba(213,170,80,0.2)" }} />
          </div>

          <svg viewBox="0 0 60 60" className="mx-auto mb-4 h-11 w-11" style={{ opacity: 0.55 }} fill="none">
            <line x1="10" y1="50" x2="50" y2="10" stroke="#d5aa50" strokeWidth="1.4" />
            <line x1="18" y1="50" x2="18" y2="22" stroke="#d5aa50" strokeWidth="1.4" />
            <line x1="18" y1="22" x2="34" y2="22" stroke="#d5aa50" strokeWidth="1.4" />
            <circle cx="50" cy="10" r="2.2" fill="#d5aa50" />
            <circle cx="18" cy="50" r="1.8" fill="#d5aa50" opacity="0.7" />
            <circle cx="34" cy="22" r="1.5" fill="#d5aa50" opacity="0.6" />
          </svg>

          <h1 className="font-heading text-5xl font-normal leading-[0.98]" style={{ color: "#ede6d8" }}>
            {t("Codex")}
            <br />
            <em style={{ fontStyle: "italic", color: "#c8a135" }}>{t("Eridani.")}</em>
          </h1>

          <p
            className="mt-3 font-mono text-[10px] italic tracking-[0.18em]"
            style={{ color: "rgba(200,190,170,0.4)" }}
          >
            Ad Astra Per Problema
          </p>
          <p
            className="mt-1 text-[11px] italic"
            style={{ color: "rgba(200,190,170,0.25)" }}
          >
            {t("menuju bintang, melalui persoalan")}
          </p>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="h-px flex-1" style={{ background: "rgba(213,170,80,0.1)" }} />
          <span className="font-heading text-base italic" style={{ color: "rgba(213,170,80,0.22)" }}>⟡</span>
          <div className="h-px flex-1" style={{ background: "rgba(213,170,80,0.1)" }} />
        </div>

        {/* ── INTRO PANEL ── */}
        <header
          className="panel relative overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, rgba(40,70,45,0.32) 0%, rgba(10,18,22,0.92) 60%)",
          }}
        >
          <div
            className="absolute left-0 right-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(213,170,80,0.3) 50%,transparent)" }}
          />
          <div className="p-6 sm:p-8">
            <span className="status-pill">
              <span
                className="inline-block h-[5px] w-[5px] rounded-full bg-[var(--accent)]"
                style={{ animation: "pulse 2s ease-in-out infinite" }}
              />
              {t("Warisan Astradhara")}
            </span>

            <div className="mt-4 flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm"
                style={{
                  border: "1px solid rgba(213,170,80,0.35)",
                  background: "rgba(213,170,80,0.06)",
                  color: "#d5aa50",
                }}
              >
                ⟁
              </div>
              <div>
                <p className="font-heading text-lg italic" style={{ color: "#ede6d8" }}>
                  {t("Arsip Pengetahuan Misi")}
                </p>
                <p
                  className="font-mono text-[8px] uppercase tracking-[0.14em]"
                  style={{ color: "rgba(213,170,80,0.45)" }}
                >
                  {t("Diwariskan untuk para Astravara")}
                </p>
              </div>
            </div>

            <p
              className="mt-4 text-sm font-light italic leading-relaxed"
              style={{ color: "rgba(215,205,185,0.68)" }}
            >
              {t(
                "Codex Eridani yang kau terima bukanlah arsip yang utuh. Sebagian halamannya masih tersegel — hanya dapat dibuka oleh mereka yang bersedia membaca dan memahami setiap fragmen di dalamnya."
              )}
            </p>

            <div
              className="mt-5 flex items-center gap-3 rounded-lg px-4 py-[10px]"
              style={{
                border: "1px solid rgba(213,170,80,0.14)",
                background: "rgba(213,170,80,0.04)",
              }}
            >
              <span
                className="shrink-0 font-mono text-[8px] uppercase tracking-[0.14em]"
                style={{ color: "rgba(211, 161, 51, 0.5)" }}
              >
                {t("Segel Terbuka")}
              </span>
              <div className="h-px flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: "#d5aa50" }}
                />
              </div>
              <span
                className="font-heading shrink-0 text-2xl italic"
                style={{ color: "#d5aa50", minWidth: "44px", textAlign: "right" }}
              >
                {progress}%
              </span>
            </div>
          </div>
        </header>

        {/* CALLOUT */}
        <div
          className="mx-0.5 rounded-[10px] p-4"
          style={{
            borderLeft: "2px solid rgba(213,170,80,0.4)",
            background: "rgba(213,170,80,0.03)",
          }}
        >
          <p
            className="mb-1.5 font-mono text-[7px] uppercase tracking-[0.16em]"
            style={{ color: "rgba(213,170,80,0.5)" }}
          >
            — {t("Catatan dari Astradhara")}
          </p>
          <p className="text-sm font-light italic leading-relaxed" style={{ color: "rgba(215,205,185,0.6)" }}>
            {t("Hari ini bukan tentang menemukan jawaban. Hari ini adalah tentang keberanian untuk mulai bertanya.")}
          </p>
        </div>

        {/* ── LOGBOOK LIST PANEL ── */}
        <article className="panel relative overflow-hidden">
          <div
            className="absolute left-0 right-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(213,170,80,0.22) 50%,transparent)" }}
          />

          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="shrink-0 font-mono text-[8px] uppercase tracking-[0.2em]"
                style={{ color: "rgba(200,190,170,0.3)" }}
              >
                {t("Fragmen Inti")}
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(220,200,140,0.06)" }} />
              <span className="shrink-0 font-mono text-[8px]" style={{ color: "rgba(213,170,80,0.4)" }}>
                {doneCount} / {logbooks.length}
              </span>
            </div>

            <ul className="space-y-2">
              {logbooks.map((log, i) => {
                const isRead = readLogs[log.id];
                return (
                  <li key={log.id}>
                    <button
                      type="button"
                      onClick={() => openLog(log)}
                      className="flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200"
                      style={{
                        border: isRead
                          ? "1px solid rgba(213,170,80,0.25)"
                          : "1px solid rgba(220,200,140,0.07)",
                        background: isRead
                          ? "rgba(213,170,80,0.06)"
                          : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <span
                        className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] text-[10px] transition-all duration-250"
                        style={{
                          border: isRead ? "1.3px solid #d5aa50" : "1.3px solid rgba(220,200,140,0.22)",
                          background: isRead ? "rgba(213,170,80,0.15)" : "rgba(255,255,255,0.02)",
                        }}
                      >
                        {isRead ? "⟡" : "◇"}
                      </span>

                      <span className="flex-1">
                        <span
                          className="mb-0.5 block font-mono text-[7px] uppercase tracking-[0.12em]"
                          style={{ color: "rgba(213,170,80,0.35)" }}
                        >
                          {t("Fragmen")} {String(i + 1).padStart(2, "0")} · {log.tag}
                        </span>
                        <span
                          className="block text-sm font-light leading-snug transition-all duration-200"
                          style={{
                            color: isRead ? "rgba(200,190,170,0.4)" : "rgba(215,205,185,0.8)",
                          }}
                        >
                          {t(log.title)}
                        </span>
                        {isRead && (
                          <span
                            className="mt-1 block font-mono text-[8px] tracking-[0.06em]"
                            style={{ color: "rgba(213,170,80,0.4)" }}
                          >
                            ↳ {t(log.note)} · {t("Dibaca")}
                          </span>
                        )}
                      </span>

                      <span
                        className="mt-0.5 shrink-0 rounded-full px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em]"
                        style={{
                          border: "1px solid rgba(213,170,80,0.25)",
                          color: "#d5aa50",
                          background: "rgba(213,170,80,0.06)",
                        }}
                      >
                        {isRead ? t("Buka lagi") : t("Buka Log")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: "1px solid rgba(220,200,140,0.05)" }}
          >
            <span className="font-mono text-[7px] uppercase tracking-[0.16em]" style={{ color: "rgba(200,190,170,0.15)" }}>
              IS-2026 · HIMAFI ITB
            </span>
            <span className="font-mono text-[7px] uppercase tracking-[0.12em]" style={{ color: "rgba(200,190,170,0.15)" }}>
              Astradhara — {doneCount} / {logbooks.length} {t("fragmen terbuka")}
            </span>
          </div>
        </article>

      </section>

      {/* ── PDF VIEWER MODAL ── */}
      {activeLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          style={{ background: "rgba(4,6,8,0.85)" }}
          onClick={closeLog}
        >
          <div
            className="relative flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
            style={{
              border: "1px solid rgba(213,170,80,0.2)",
              background: "linear-gradient(160deg, rgba(20,30,28,0.97) 0%, rgba(8,10,12,0.99) 100%)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between gap-3 px-5 py-4"
              style={{ borderBottom: "1px solid rgba(213,170,80,0.12)" }}
            >
              <div className="min-w-0">
                <p
                  className="font-mono text-[7px] uppercase tracking-[0.14em]"
                  style={{ color: "rgba(213,170,80,0.5)" }}
                >
                  {t("Fragmen")} · {activeLog.tag}
                </p>
                <p
                  className="truncate font-heading text-lg italic"
                  style={{ color: "#ede6d8" }}
                >
                  {t(activeLog.title)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLog}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm transition-colors"
                style={{
                  border: "1px solid rgba(213,170,80,0.25)",
                  color: "#d5aa50",
                  background: "rgba(213,170,80,0.06)",
                }}
                aria-label={t("Tutup")}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 bg-black/40">
              <iframe
                src={activeLog.pdfUrl}
                title={activeLog.title}
                className="h-full w-full"
                style={{ border: "none" }}
              />
            </div>

            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: "1px solid rgba(213,170,80,0.08)" }}
            >
              <span
                className="font-mono text-[7px] uppercase tracking-[0.12em]"
                style={{ color: "rgba(200,190,170,0.25)" }}
              >
                {t(activeLog.note)}
              </span>
              <a
                href={activeLog.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[8px] uppercase tracking-[0.1em] underline"
                style={{ color: "rgba(213,170,80,0.6)" }}
              >
                {t("Buka di tab baru")}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* τ Ceti easter egg */}
      <div
        className="pointer-events-none fixed right-4 top-3 font-mono text-[7px] uppercase tracking-[0.18em]"
        style={{ color: "rgba(255,213,132,0.2)" }}
      >
        τ Cet · 11.9 ly
      </div>
    </div>
  );
}