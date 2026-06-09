"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import {
  attendanceCollectionRef,
  attendanceDocRef,
  eventMetaRef,
  getCurrentTimestamp,
  h1CollectionRef,
  normalizeName,
  type AttendanceRecord,
  type H1ConfirmationRecord,
  type EventMeta,
} from "../../lib/engagement";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { attendanceStatuses, countByValue, expectedRoster } from "../../lib/checkins";
import { useI18n } from "../../components/I18nProvider";

const proofHints: Record<(typeof attendanceStatuses)[number], string> = {
  hadir: "Upload bukti hadir di tempat, misalnya foto saat check-in atau tanda hadir dari panitia.",
  menyusul: "Upload bukti saat menyusul kegiatan atau screenshot konfirmasi kedatangan.",
  meninggalkan: "Upload bukti izin meninggalkan ke panitia.",
  "tidak hadir": "Upload bukti izin ke panitia, surat sakit, atau foto pendukung bila diperlukan.",
};

const statusLabels: Record<(typeof attendanceStatuses)[number], string> = {
  hadir: "Hadir",
  menyusul: "Menyusul",
  meninggalkan: "Meninggalkan",
  "tidak hadir": "Tidak Hadir",
};

const defaultMeta: EventMeta = { expectedParticipants: expectedRoster.length };

export default function AttendancePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<(typeof attendanceStatuses)[number]>("hadir");
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [h1Records, setH1Records] = useState<H1ConfirmationRecord[]>([]);
  const [expectedParticipants, setExpectedParticipants] = useState(defaultMeta.expectedParticipants ?? 0);
  const [saveMessage, setSaveMessage] = useState("");

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

    const unsubscribeAttendance = onSnapshot(attendanceCollectionRef, (snapshot) => {
      setRecords(snapshot.docs.map((document) => document.data() as AttendanceRecord));
    }, onError);

    const unsubscribeH1 = onSnapshot(h1CollectionRef, (snapshot) => {
      setH1Records(snapshot.docs.map((document) => document.data() as H1ConfirmationRecord));
    }, onError);

    const unsubscribeMeta = onSnapshot(eventMetaRef, (document) => {
      const meta = document.data() as EventMeta | undefined;
      const nextExpected = meta?.expectedParticipants ?? defaultMeta.expectedParticipants ?? 0;
      setExpectedParticipants(nextExpected);
    }, onError);

    return () => {
      unsubscribeAttendance();
      unsubscribeH1();
      unsubscribeMeta();
    };
  }, [user]);

  const h1NameSet = useMemo(() => new Set(h1Records.map((record) => normalizeName(record.fullName))), [h1Records]);

  const attendanceCounts = useMemo(() => countByValue(records.map((record) => ({ value: record.status })), attendanceStatuses), [records]);

  const withoutH1ConfirmationCount = useMemo(
    () => records.filter((record) => !h1NameSet.has(normalizeName(record.fullName))).length,
    [records, h1NameSet],
  );

  const recentRecords = useMemo(
    () =>
      [...records].sort((left, right) => (right.updatedAt?.toMillis?.() ?? 0) - (left.updatedAt?.toMillis?.() ?? 0)).slice(0, 4),
    [records],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEvidence = evidenceText.trim();

    if (!trimmedName) return;

    setSaveMessage("Saving attendance...");

    try {
      let evidenceUrl: string | undefined;
      let evidencePublicId: string | undefined;

      if (evidenceFile) {
        const upload = await uploadToCloudinary(evidenceFile);
        evidenceUrl = upload.secure_url;
        evidencePublicId = upload.public_id;
      }

      await setDoc(attendanceDocRef(trimmedName), {
        fullName: trimmedName,
        status,
        evidenceText: trimmedEvidence || "-",
        evidenceUrl,
        evidencePublicId,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });

      setSaveMessage("Attendance saved to Firebase.");
      setFullName("");
      setStatus("hadir");
      setEvidenceText("");
      setEvidenceFile(null);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save attendance.");
    }
  };

  return (
    <section className="space-y-4">
      <header className="panel p-5 sm:p-6 lg:p-8">
        <p className="status-pill">{t("Attendance")}</p>
        <h1 className="mt-3 font-heading text-4xl leading-tight tracking-wider text-[#f7f0e8] sm:text-5xl">
          {t("Presence Check & Evidence Upload")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#ddd0c2] sm:text-base">
          {t("Submit your presence status, attach evidence, and let the committee track attendance live from Firebase.")}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("Hadir")}</p>
          <p className="mt-2 text-3xl font-semibold">{attendanceCounts.hadir}</p>
        </div>
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("Menyusul")}</p>
          <p className="mt-2 text-3xl font-semibold">{attendanceCounts.menyusul}</p>
        </div>
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("Meninggalkan")}</p>
          <p className="mt-2 text-3xl font-semibold">{attendanceCounts.meninggalkan}</p>
        </div>
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("Tidak Hadir")}</p>
          <p className="mt-2 text-3xl font-semibold">{attendanceCounts["tidak hadir"]}</p>
        </div>
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("No H-1 Confirm")}</p>
          <p className="mt-2 text-3xl font-semibold">{withoutH1ConfirmationCount}</p>
        </div>
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("Expected")}</p>
          <p className="mt-2 text-3xl font-semibold">{expectedParticipants || "-"}</p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="panel p-5 sm:p-6">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Attendance Form")}</h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-1">
              <span className="text-sm text-[#d7bfaf]">{t("Full Name")}</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none placeholder:text-[#ac9180] focus:border-[#c18f63]"
                placeholder={t("Full Name")}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-[#d7bfaf]">{t("Attendance Status")}</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as (typeof attendanceStatuses)[number])}
                className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
              >
                {attendanceStatuses.map((option) => (
                  <option key={option} value={option} className="bg-[#2d1b16] text-[#f7f0e8]">
                    {statusLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-[#e6d7cb]">
              <p className="font-semibold text-[#f7f0e8]">{t("Evidence guidance")}</p>
              <p className="mt-1">{proofHints[status]}</p>
            </div>

            <label className="block space-y-1">
              <span className="text-sm text-[#d7bfaf]">{t("Evidence / Note")}</span>
              <textarea
                value={evidenceText}
                onChange={(event) => setEvidenceText(event.target.value)}
                rows={4}
                placeholder={t("Describe the evidence or the reason here...")}
                className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none placeholder:text-[#ac9180] focus:border-[#c18f63]"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-[#d7bfaf]">{t("Upload Evidence File")}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] file:mr-4 file:rounded-full file:border-0 file:bg-[#c18f63] file:px-4 file:py-2 file:font-semibold file:text-[#2a1a16]"
              />
              <p className="text-xs text-[#ccb6a6]">
                {t("If you choose not to attach a file, the note will still be stored in Firebase.")}
              </p>
            </label>

            <button type="submit" className="cta-btn w-full px-4 py-3 sm:w-auto">
              {t("Save Attendance")}
            </button>
          </form>
          {saveMessage ? (
            <p className="mt-4 rounded-xl border border-[#c18f63]/40 bg-[#c18f63]/12 px-3 py-2 text-sm text-[#f7f0e8]">
              {saveMessage}
            </p>
          ) : null}
        </article>

        <article className="panel p-5 sm:p-6">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">Recent Check-Ins</h2>
          <div className="mt-4 space-y-3">
            {recentRecords.length ? (
              recentRecords.map((record) => (
                <div key={record.fullName} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{record.fullName}</p>
                  <p className="mt-1 text-lg font-semibold text-[#f7f0e8]">{statusLabels[record.status]}</p>
                  <p className="mt-2 text-sm text-[#dfcbbd] wrap-break-word">{record.evidenceText}</p>
                  {record.evidenceUrl ? (
                    <a href={record.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[#c18f63] underline underline-offset-4">
                      Open evidence file
                    </a>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[#dfcbbd]">
                No attendance submissions yet.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
