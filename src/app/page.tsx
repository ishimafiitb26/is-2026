"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { onSnapshot, query, orderBy } from "firebase/firestore";
import { useI18n } from "@/components/I18nProvider";
import { useAuth } from "@/components/AuthProvider";
import { eventMetaRef, announcementsCollectionRef, type Announcement } from "@/lib/engagement";

interface AnnouncementStructure {
  id: string;
  title: string;
  content: string;
  posterUrl?: string;
  links?: Array<{ label: string; url: string }>;
}
function parseMarkdownToHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*(.*?)\*/g, "<b>$1</b>")
    .replace(/_(.*?)_/g, "<i>$1</i>")
    .replace(/~(.*?)~/g, "<u>$1</u>");
}

export default function Home() {
  const { t } = useI18n();
  const { user } = useAuth();
  
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  
  const [briefing, setBriefing] = useState<string>("");
  const [countdown, setCountdown] = useState<string>("");
  const [schedule, setSchedule] = useState<string>("");
  const [feedAnnouncements, setFeedAnnouncements] = useState<AnnouncementStructure[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 0);

    const safeErrorHandler = (error: Error) => {
      console.debug(error.message);
    };

    const unsubscribeMeta = onSnapshot(eventMetaRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBriefing(data.latestBriefing || "");
        setCountdown(data.countdownText || "");
        setSchedule(data.todaySchedule || "");
      }
    }, safeErrorHandler);

    const unsubscribeAnnouncements = onSnapshot(
      query(announcementsCollectionRef, orderBy("createdAt", "desc")),
      (snapshot) => {
        setFeedAnnouncements(
          snapshot.docs.map((docItem) => {
            const data = docItem.data();
            return {
              id: docItem.id,
              title: data.title || "",
              content: data.content || "",
              posterUrl: data.posterUrl,
              links: data.links,
            };
          })
        );
      },
      safeErrorHandler
    );

    return () => {
      clearTimeout(timer);
      unsubscribeMeta();
      unsubscribeAnnouncements();
    };
  }, []);

  const visibleCardsCount = useMemo(() => {
    return [
      briefing && briefing.trim() !== "",
      countdown && countdown.trim() !== "",
      schedule && schedule.trim() !== ""
    ].filter(Boolean).length;
  }, [briefing, countdown, schedule]);

  if (!isHydrated) {
    return <div className="min-h-screen bg-[#0A0A0B]" />;
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6 sm:p-8">
        <h1 className="mt-4 font-heading text-5xl leading-none tracking-wider text-[#E1D9F9] sm:text-6xl">
          Welcome Astravara!
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[#E1D9F9]/80 sm:text-lg">
          Tidak ada jalan menuju bintang selain melalui masalah yang harus dipecahkan.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user ? (
            <>
              <Link href="/attendance" className="cta-btn px-6 py-3 text-sm">
                {t("Attendance")}
              </Link>
              <Link href="/handbook" className="cta-btn px-6 py-3 text-sm bg-[#452ABC] border-[#452ABC] hover:bg-[#452ABC]/80 transition">
                {t("Explore Area")}
              </Link>
            </>
          ) : (
            <Link href="/auth/login" className="cta-btn px-8 py-3 text-sm">
              {t("Login")}
            </Link>
          )}
        </div>
      </section>

      {visibleCardsCount > 0 && (
        <section className={`grid gap-3 ${visibleCardsCount === 3 ? "sm:grid-cols-3" : visibleCardsCount === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {briefing && briefing.trim() !== "" && (
            <article className="panel p-4 animate-revealUp">
              <p className="text-xs uppercase tracking-[0.08em] text-[#E1D9F9]/50">{t("Latest Briefing")}</p>
              <h2 className="mt-1 text-sm font-semibold text-[#E1D9F9] whitespace-pre-wrap">{briefing}</h2>
            </article>
          )}
          {countdown && countdown.trim() !== "" && (
            <article className="panel p-4 animate-revealUp">
              <p className="text-xs uppercase tracking-[0.08em] text-[#E1D9F9]/50">{t("Countdown")}</p>
              <h2 className="mt-1 text-xl font-semibold text-[#E1D9F9]">{countdown}</h2>
            </article>
          )}
          {schedule && schedule.trim() !== "" && (
            <article className="panel p-4 animate-revealUp">
              <p className="text-xs uppercase tracking-[0.08em] text-[#E1D9F9]/50">{t("Today Schedule")}</p>
              <h2 className="mt-1 text-sm font-semibold text-[#E1D9F9] whitespace-pre-wrap">{schedule}</h2>
            </article>
          )}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-heading text-2xl text-[#F6C545] tracking-wider">{t("Broadcast")}</h2>
        {feedAnnouncements.length > 0 ? (
          feedAnnouncements.map((ann) => (
            <article key={ann.id} className="panel p-5 space-y-4 border border-white/5 bg-black/5">
              <h3 className="text-xl font-bold text-[#E1D9F9] border-b border-white/5 pb-1">{ann.title}</h3>
              
              {ann.posterUrl && (
                <div className="overflow-hidden rounded-xl border border-white/10 max-w-2xl bg-black/20 animate-revealUp">
                  {ann.posterUrl.toLowerCase().endsWith(".pdf") ? (
                    <iframe 
                      src={`${ann.posterUrl}#toolbar=0`} 
                      className="w-full h-[350px] border-0 select-none"
                      title={`Poster ${ann.title}`}
                    />
                  ) : (
                    <img 
                      src={ann.posterUrl} 
                      alt={`Poster ${ann.title}`} 
                      className="w-full h-auto object-contain max-h-[450px]"
                    />
                  )}
                </div>
              )}

              <div 
                className="text-sm text-[#E1D9F9]/80 whitespace-pre-wrap leading-relaxed font-body"
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(ann.content) }}
              />

              {ann.links && ann.links.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                  {ann.links.map((link, lIdx) => (
                    <a 
                      key={lIdx} 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="status-pill text-[11px] text-[#F6C545] border-[#F6C545]/30 hover:bg-[#F6C545]/10 transition"
                    >
                      🔗 {link.label || "Link"}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))
        ) : (
          <p className="text-xs text-[#E1D9F9]/50 italic p-2">No active encryption packets broadcasted currently.</p>
        )}
      </section>
    </div>
  );
}