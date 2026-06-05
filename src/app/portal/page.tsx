import Link from "next/link";

export default function PortalPage() {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
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
    </section>
  );
}
