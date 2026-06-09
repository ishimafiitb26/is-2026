"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import {
  eventMetaRef,
  getCurrentTimestamp,
  h1CollectionRef,
  h1DocRef,
  type EventMeta,
  type H1ConfirmationRecord,
} from "../../lib/engagement";
import { h1Statuses, countByValue, expectedRoster } from "../../lib/checkins";
import { useI18n } from "../../components/I18nProvider";

const statusLabels: Record<(typeof h1Statuses)[number], string> = {
  "hadir tepat waktu": "Hadir Tepat Waktu",
  "hadir menyusul": "Hadir Menyusul",
  "izin meninggalkan": "Izin Meninggalkan",
  "tidak hadir": "Tidak Hadir",
};

const defaultMeta: EventMeta = { expectedParticipants: expectedRoster.length };

export default function H1ConfirmationPage() {
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [attendanceTomorrow, setAttendanceTomorrow] = useState<(typeof h1Statuses)[number]>("hadir tepat waktu");
  const [reason, setReason] = useState("");
  const [records, setRecords] = useState<H1ConfirmationRecord[]>([]);
  const [expectedParticipants, setExpectedParticipants] = useState(defaultMeta.expectedParticipants ?? 0);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const unsubscribeH1 = onSnapshot(h1CollectionRef, (snapshot) => {
      setRecords(snapshot.docs.map((document) => document.data() as H1ConfirmationRecord));
    });

    const unsubscribeMeta = onSnapshot(eventMetaRef, (document) => {
      const meta = document.data() as EventMeta | undefined;
      const nextExpected = meta?.expectedParticipants ?? defaultMeta.expectedParticipants ?? 0;
      setExpectedParticipants(nextExpected);
    });

    return () => {
      unsubscribeH1();
      unsubscribeMeta();
    };
  }, []);

  const summaries = useMemo(() => countByValue(records.map((record) => ({ value: record.status })), h1Statuses), [records]);
  const notConfirmedCount = Math.max(expectedParticipants - records.length, 0);
  const recentRecords = useMemo(
    () =>
      [...records].sort((left, right) => (right.updatedAt?.toMillis?.() ?? 0) - (left.updatedAt?.toMillis?.() ?? 0)).slice(0, 4),
    [records],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    if (!trimmedName) return;

    setSaveMessage("Saving confirmation...");

    try {
      const normalizedReason = attendanceTomorrow === "hadir tepat waktu" ? "-" : reason.trim() || "-";
      await setDoc(h1DocRef(trimmedName), {
        fullName: trimmedName,
        status: attendanceTomorrow,
        reason: normalizedReason,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });

      setSaveMessage("H-1 confirmation saved to Firebase.");
      setFullName("");
      setAttendanceTomorrow("hadir tepat waktu");
      setReason("");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save confirmation.");
    }
  };

  return (
    <section className="space-y-4">
      <header className="panel p-5 sm:p-6 lg:p-8">
        <p className="status-pill">{t("H-1 Confirmation")}</p>
        <h1 className="mt-3 font-heading text-4xl leading-tight tracking-wider text-[#f7f0e8] sm:text-5xl">
          {t("Attendance Confirmation")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#ddd0c2] sm:text-base">
          {t("Confirm your attendance for tomorrow, and let the committee see the live confirmation counts in Firebase.")}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("hadir tepat waktu")}</p>
          <p className="mt-2 text-3xl font-semibold">{summaries["hadir tepat waktu"]}</p>
        </div>
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("hadir menyusul")}</p>
          <p className="mt-2 text-3xl font-semibold">{summaries["hadir menyusul"]}</p>
        </div>
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("izin meninggalkan")}</p>
          <p className="mt-2 text-3xl font-semibold">{summaries["izin meninggalkan"]}</p>
        </div>
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("tidak hadir")}</p>
          <p className="mt-2 text-3xl font-semibold">{summaries["tidak hadir"]}</p>
        </div>
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("Belum Konfirmasi")}</p>
          <p className="mt-2 text-3xl font-semibold">{notConfirmedCount}</p>
        </div>
        <div className="panel p-4 text-[#f7f0e8]">
          <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{t("Expected")}</p>
          <p className="mt-2 text-3xl font-semibold">{expectedParticipants || "-"}</p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="panel p-5 sm:p-6">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("H-1 Confirmation")}</h2>
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
              <span className="text-sm text-[#d7bfaf]">{t("Attendance Tomorrow")}</span>
              <select
                value={attendanceTomorrow}
                onChange={(event) => setAttendanceTomorrow(event.target.value as (typeof h1Statuses)[number])}
                className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
              >
                {h1Statuses.map((option) => (
                  <option key={option} value={option} className="bg-[#2d1b16] text-[#f7f0e8]">
                    {statusLabels[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm text-[#d7bfaf]">{t("Reason")}</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder={attendanceTomorrow === "hadir tepat waktu" ? t("Fill '-' if attending on time") : t("Explain the reason here...")}
                className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none placeholder:text-[#ac9180] focus:border-[#c18f63]"
              />
            </label>

            <button type="submit" className="cta-btn w-full px-4 py-3 sm:w-auto">
              {t("Save H-1 Confirmation")}
            </button>
          </form>
          {saveMessage ? (
            <p className="mt-4 rounded-xl border border-[#c18f63]/40 bg-[#c18f63]/12 px-3 py-2 text-sm text-[#f7f0e8]">
              {saveMessage}
            </p>
          ) : null}
        </article>

        <article className="panel p-5 sm:p-6">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Recent Confirmations")}</h2>
          <div className="mt-4 space-y-3">
            {recentRecords.length ? (
              recentRecords.map((record) => (
                <div key={record.fullName} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-[#d7bfaf]">{record.fullName}</p>
                  <p className="mt-1 text-lg font-semibold text-[#f7f0e8]">{statusLabels[record.status]}</p>
                  <p className="mt-2 text-sm text-[#dfcbbd] wrap-break-word">{record.reason}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[#dfcbbd]">
                {t("No H-1 confirmations yet.")}
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
