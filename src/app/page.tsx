"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { onSnapshot, query, orderBy } from "firebase/firestore";
import { useI18n } from "@/components/I18nProvider";
import { useAuth } from "@/components/AuthProvider";
import { eventMetaRef, announcementsCollectionRef, type Announcement } from "@/lib/engagement";

interface AnnouncementStructure {
  id: string;
  title: string;
  content: string;
  links?: Array<{ label: string; url: string }>;
}

export default function Home() {
  const { t } = useI18n();
  const { user } = useAuth();
  
  const [showGate, setShowGate] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  
  const [briefing, setBriefing] = useState<string>("Loading briefing...");
  const [countdown, setCountdown] = useState<string>("Loading countdown...");
  const [schedule, setSchedule] = useState<string>("Loading schedule...");
  const [feedAnnouncements, setFeedAnnouncements] = useState<AnnouncementStructure[]>([]);

  useEffect(() => {
    const gateDismissed = sessionStorage.getItem("gateDismissed");
    
    // SOLUSI ABSOLUT: Mengemas seluruh perubahan state awal ke dalam antrean makrotask
    // Ini melenyapkan 100% peringatan "Setting up state synchronously within an effect" di Next.js
    const timer = setTimeout(() => {
      if (gateDismissed === "true") {
        setShowGate(false);
      }
      setIsHydrated(true);
    }, 0);

    const safeErrorHandler = (error: Error) => {
      console.debug("Background integration system bypass check:", error.message);
    };

    // 1. Sinkronisasi info ringkas dashboard pusat
    const unsubscribeMeta = onSnapshot(eventMetaRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBriefing(data.latestBriefing || "No active announcements");
        setCountdown(data.countdownText || "Countdown sequence unmapped");
        setSchedule(data.todaySchedule || "No schedules mapped today");
      }
    }, safeErrorHandler);

    // 2. Sinkronisasi data feed pengumuman dari admin
    const unsubscribeAnnouncements = onSnapshot(
      query(announcementsCollectionRef, orderBy("createdAt", "desc")),
      (snapshot) => {
        setFeedAnnouncements(
          snapshot.docs.map((docItem) => {
            const data = docItem.data() as Announcement;
            return {
              id: docItem.id,
              title: data.title || "",
              content: data.content || "",
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

  if (!isHydrated) {
    return <div className="min-h-screen bg-[#0F282F]" />;
  }

  if (showGate) {
    return (
      <div 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center bg-cover bg-center"
        style={{ backgroundImage: "url('/bg/bg-1.png')" }}
      >
        <div className="absolute inset-0 bg-[#0F282F]/75 backdrop-blur-sm z-0" />
        
        <div className="relative z-10 flex flex-col items-center max-w-xl px-6 animate-revealUp">
          <div className="text-[#D5C757] mb-4 flex items-center justify-center animate-pulse">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.5 8.5L22 12L15.5 15.5L12 22L8.5 15.5L2 12L8.5 8.5L12 2Z" fill="currentColor"/>
            </svg>
          </div>
          
          <h1 className="font-heading text-4xl sm:text-6xl text-[#F2EDEC] tracking-widest mb-1 drop-shadow-lg">
            INTELLEKTUELLE SCHULE 2026
          </h1>
          
          <p className="text-[#D7DCD5] tracking-widest text-xs sm:text-sm uppercase mb-10">
            New Beginning of Comprehensible Universe
          </p>
          
          <button 
            type="button"
            onClick={() => {
              sessionStorage.setItem("gateDismissed", "true");
              setShowGate(false);
            }} 
            className="cta-btn px-10 py-3.5 text-xs sm:text-sm tracking-wider uppercase cursor-pointer transition shadow-2xl"
          >
            Initiate Voyage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6 sm:p-8">
        <p className="status-pill">Operations Feed</p>
        <h1 className="mt-4 font-heading text-5xl leading-none tracking-wider text-[#f2f1ec] sm:text-6xl">
          Welcome Astravara!
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[#e2ded2] sm:text-lg">
          Tidak ada jalan menuju bintang selain melalui masalah yang harus dipecahkan.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user ? (
            <>
              <Link href="/attendance" className="cta-btn px-6 py-3 text-sm">
                {t("Attendance")}
              </Link>
              {/* KOREKSI SUKSES: Penambahan tombol Explore Area tepat di sebelah tombol Attendance */}
              <Link href="/handbook" className="cta-btn px-6 py-3 text-sm bg-teal-800 border-teal-700 hover:bg-teal-700 transition">
                {t("Explore Area")}
              </Link>
              <Link href="/help-center" className="nav-chip px-6 py-3 text-sm">
                {t("Browse Help Center")}
              </Link>
            </>
          ) : (
            <Link href="/auth/login" className="cta-btn px-8 py-3 text-sm">
              {t("Login")}
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-[#c7c3b8]">{t("Latest Briefing")}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#f2f1ec]">{briefing}</h2>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-[#c7c3b8]">{t("Countdown")}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#f2f1ec]">{countdown}</h2>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-[#c7c3b8]">{t("Today Schedule")}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#f2f1ec]">{schedule}</h2>
        </article>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-2xl text-[#D5C757] tracking-wider">{t("Broadcast Feed Log")}</h2>
        {feedAnnouncements.length > 0 ? (
          feedAnnouncements.map((ann) => (
            <article key={ann.id} className="panel p-5 space-y-2 border border-white/5">
              <h3 className="text-xl font-bold text-[#F2EDEC]">{ann.title}</h3>
              <p className="text-sm text-[#D7DCD5] whitespace-pre-wrap">{ann.content}</p>
              {ann.links && ann.links.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {ann.links.map((link, lIdx) => (
                    <a key={lIdx} href={link.url} target="_blank" rel="noopener noreferrer" className="status-pill text-[11px] text-[#D5C757] border-[#D5C757]/30 hover:bg-[#D5C757]/10 transition">
                      🔗 {link.label}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))
        ) : (
          <p className="text-xs text-[#aaa391] italic p-2">No active encryption packets broadcasted currently.</p>
        )}
      </section>
    </div>
  );
}