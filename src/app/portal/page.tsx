"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Owner = "Lead" | "Frontend Staff" | "Data Staff";
type Status = "Not Started" | "In Progress" | "Done";

type TeamTask = {
  id: string;
  owner: Owner;
  title: string;
  due: string;
  status: Status;
};

const baseTasks: TeamTask[] = [
  { id: "T-01", owner: "Lead", title: "Auth flow and route guard", due: "Day 4", status: "In Progress" },
  { id: "T-02", owner: "Lead", title: "Firebase and Cloudinary integration", due: "Day 3", status: "Done" },
  { id: "T-03", owner: "Frontend Staff", title: "Slice Journey Map and FAQ UI", due: "Day 5", status: "In Progress" },
  { id: "T-04", owner: "Frontend Staff", title: "Empty and loading states polish", due: "Day 7", status: "Not Started" },
  { id: "T-05", owner: "Data Staff", title: "Firestore schema and data dictionary", due: "Day 4", status: "In Progress" },
  { id: "T-06", owner: "Data Staff", title: "Python script for bulk account injection", due: "Day 6", status: "Not Started" },
];

export default function PortalPage() {
  const [activeOwner, setActiveOwner] = useState<Owner | "All">("All");

  const visibleTasks = useMemo(() => {
    if (activeOwner === "All") return baseTasks;
    return baseTasks.filter((task) => task.owner === activeOwner);
  }, [activeOwner]);

  const statusCount = useMemo(() => {
    return {
      done: visibleTasks.filter((task) => task.status === "Done").length,
      progress: visibleTasks.filter((task) => task.status === "In Progress").length,
      todo: visibleTasks.filter((task) => task.status === "Not Started").length,
    };
  }, [visibleTasks]);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
      <article className="panel p-6 sm:p-7">
        <p className="status-pill">Student Access</p>
        <h1 className="mt-3 font-heading text-4xl tracking-wider text-[#f2f1ec]">Student Dashboard</h1>
        <p className="mt-3 text-[#ddd8cb]">
          Check active assignments, download task files, and submit results before deadline.
        </p>
        <Link href="/" className="cta-btn mt-5 inline-flex px-4 py-2">
          Continue as Student
        </Link>
      </article>

      <article className="panel p-6 sm:p-7">
        <p className="status-pill">Committee Access</p>
        <h2 className="mt-3 font-heading text-4xl tracking-wider text-[#f2f1ec]">Admin Dashboard</h2>
        <p className="mt-3 text-[#ddd8cb]">
          Publish tasks, set deadlines, and monitor completion status for every participant group.
        </p>
        <Link href="/" className="cta-btn mt-5 inline-flex px-4 py-2">
          Continue as Committee
        </Link>
      </article>
      </div>

      <article className="panel p-6">
        <p className="status-pill">Team Operations</p>
        <h2 className="mt-3 font-heading text-4xl tracking-wider text-[#f2f1ec]">Webdev Task Board</h2>
        <p className="mt-2 text-[#ddd8cb]">
          Live division of work so everyone contributes without being rushed.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["All", "Lead", "Frontend Staff", "Data Staff"] as const).map((owner) => (
            <button
              key={owner}
              type="button"
              onClick={() => setActiveOwner(owner)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                activeOwner === owner
                  ? "border-[#d8a75b] bg-[#d8a75b]/20 text-[#f2f1ec]"
                  : "border-white/25 bg-white/5 text-[#d8d3c6]"
              }`}
            >
              {owner}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-[#e8e3d8]">Done: {statusCount.done}</div>
          <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-[#e8e3d8]">In Progress: {statusCount.progress}</div>
          <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-[#e8e3d8]">Not Started: {statusCount.todo}</div>
        </div>

        <div className="mt-4 space-y-2">
          {visibleTasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-white/15 bg-black/15 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[#c7c3b8]">
                {task.id} • {task.owner} • Due {task.due}
              </p>
              <h3 className="mt-1 text-lg text-[#f2f1ec]">{task.title}</h3>
              <p className="mt-1 text-sm text-[#d8a75b]">Status: {task.status}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
