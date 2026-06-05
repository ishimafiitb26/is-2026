const stages = [
  {
    phase: "Phase 1",
    title: "Orientation Gate",
    detail: "Opening brief, group assignment, and first-day expectations.",
    status: "Completed",
  },
  {
    phase: "Phase 2",
    title: "Core Missions",
    detail: "Main tasks, mentor checkpoints, and submission milestones.",
    status: "In Progress",
  },
  {
    phase: "Phase 3",
    title: "Final Passage",
    detail: "Reflection, closing showcase, and final group recap.",
    status: "Upcoming",
  },
];

export default function JourneyMapPage() {
  return (
    <section className="space-y-4">
      <header className="panel p-6 sm:p-8">
        <p className="status-pill">Journey Map</p>
        <h1 className="mt-3 font-heading text-5xl tracking-[0.06em] text-[#f2f1ec]">OSJUR Timeline Tracker</h1>
        <p className="mt-3 max-w-2xl text-[#e2ded2]">
          Follow each event stage with clear checkpoints so maba and panitia always know what is next.
        </p>
      </header>

      <div className="space-y-3">
        {stages.map((item) => (
          <article key={item.title} className="panel p-5">
            <p className="text-xs uppercase tracking-[0.08em] text-[#c7c3b8]">{item.phase}</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#f2f1ec]">{item.title}</h2>
            <p className="mt-2 text-[#ddd8cb]">{item.detail}</p>
            <p className="mt-3 text-sm text-[#d8a75b]">Status: {item.status}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
