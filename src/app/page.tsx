"use client";

import Link from "next/link";
import { useI18n } from "../components/I18nProvider";

export default function Home() {
  const { t } = useI18n();
  const quickPanels = [
    { title: t("Latest Briefing"), value: "3 New Announcements", hint: "Updated 15 minutes ago" },
    { title: t("Countdown"), value: "12 Days to Day 1", hint: "Prep window is still open" },
    { title: t("Today Schedule"), value: "Mentor Sync - 19:30", hint: "Join from your group channel" },
  ];

  const featureLinks = [
    {
      href: "/journey-map",
      title: t("Journey Map"),
      description: t("Track each phase with a clear progress timeline."),
    },
    {
      href: "/tasks",
      title: t("Tasks Center"),
      description: t("See task info, download briefs, and upload submissions in one flow."),
    },
    {
      href: "/attendance",
      title: t("Attendance"),
      description: t("Track presence for each session with a simple status view."),
    },
    {
      href: "/h1-confirmation",
      title: t("H-1 Confirmation"),
      description: t("Confirm attendance the day before the event with a quick form."),
    },
    {
      href: "/handbook",
      title: t("Digital Handbook"),
      description: t("Read regulations, essentials, and prep checklist in one place."),
    },
    {
      href: "/reflection-board",
      title: t("Reflection Board"),
      description: t("A calm space for short reflections and anonymous support notes."),
    },
    {
      href: "/help-center",
      title: t("Help Center"),
      description: t("Frequently asked questions to reduce repetitive panitia chats."),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel reveal p-6 sm:p-8">
        <p className="status-pill">Operations Feed</p>
        <h1 className="mt-4 font-heading text-5xl leading-none tracking-wider text-[#f2f1ec] sm:text-6xl">
          {t("Enter The Maze, Stay On Track.")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[#e2ded2] sm:text-lg">
          {t("One mobile-first command center for announcements, journey guidance, handbook access, and assignment flow.")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/portal" className="cta-btn px-5 py-3">
            {t("Open Portal Access")}
          </Link>
          <Link href="/help-center" className="nav-chip px-5 py-3">
            {t("Browse Help Center")}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {quickPanels.map((panel) => (
          <article key={panel.title} className="panel reveal p-4" style={{ animationDelay: "80ms" }}>
            <p className="text-xs uppercase tracking-[0.08em] text-[#c7c3b8]">{panel.title}</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#f2f1ec]">{panel.value}</h2>
            <p className="mt-1 text-sm text-[#d8d3c6]">{panel.hint}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {featureLinks.map((feature, index) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="panel reveal block p-5 transition-transform hover:-translate-y-0.5"
            style={{ animationDelay: `${120 + index * 70}ms` }}
          >
            <h2 className="font-heading text-3xl tracking-wider text-[#f2f1ec]">{feature.title}</h2>
            <p className="mt-2 text-[#ddd8cb]">{feature.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
