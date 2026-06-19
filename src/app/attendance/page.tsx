"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onSnapshot, collection, doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import {
  eventMetaRef,
  getCurrentTimestamp,
  type AttendanceRecord,
  type H1ConfirmationRecord,
} from "@/lib/engagement";

const osjurDays = [
  { value: "day_1", label: "Day 1 - Opening & Synchronizations" },
  { value: "day_2", label: "Day 2 - Core Operations Session" },
  { value: "day_3", label: "Day 3 - Material Exploration" },
  { value: "day_4", label: "Day 4 - Final Presentation & Closing" },
];

export default function AttendancePage() {
  const { t } = useI18n();
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<"dday" | "h1">("dday");
  
  // State pelacakan hari pelaksanaan aktif
  const [selectedDay, setSelectedDay] = useState<string>("day_1");

  // State Form inputs
  const [fullName, setFullName] = useState<string>("");
  const [statusDDay, setStatusDDay] = useState<string>("hadir");
  const [statusH1, setStatusH1] = useState<string>("hadir tepat waktu");
  const [evidenceText, setEvidenceText] = useState<string>("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [reasonH1, setReasonH1] = useState<string>("");

  // Storage states harian
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [h1Records, setH1Records] = useState<H1ConfirmationRecord[]>([]);
  const [expectedParticipants, setExpectedParticipants] = useState<number>(0);
  const [saveMessage, setSaveMessage] = useState<string>( "");

  // Otomatis mendeteksi NIM maba dari awalan email akun auth mereka
  const studentNIM = user?.email ? user.email.split("@")[0] : "";

  // Efek Sinkronisasi Dynamic Collection: Otomatis subscribe ulang tiap dropdown "Day" diganti
  useEffect(() => {
    if (!user) return;

    const silentErrorHandler = (err: Error) => {
      console.debug("Bypassed background collection intersection:", err.message);
    };

    // KOREKSI 1: Membaca data langsung dari koleksi spesifik hari yang dipilih (e.g. attendance_day_1)
    const unsubscribeAttendance = onSnapshot(
      collection(db, `attendance_${selectedDay}`), 
      (snapshot) => {
        setRecords(snapshot.docs.map((d) => d.data() as AttendanceRecord));
      }, 
      silentErrorHandler
    );

    const unsubscribeH1 = onSnapshot(
      collection(db, `h1_confirmations_${selectedDay}`), 
      (snapshot) => {
        setH1Records(snapshot.docs.map((d) => d.data() as H1ConfirmationRecord));
      }, 
      silentErrorHandler
    );

    const unsubscribeMeta = onSnapshot(eventMetaRef, (document) => {
      if (document.exists()) {
        setExpectedParticipants(document.data().expectedParticipants || 0);
      }
    }, silentErrorHandler);

    return () => {
      unsubscribeAttendance();
      unsubscribeH1();
      unsubscribeMeta();
    };
  }, [user, selectedDay]); // selectedDay masuk ke dependency array agar memicu re-subscribe

  // Karena data sudah terisolasi per koleksi harian, kalkulasi metrik bisa langsung dihitung tanpa filter manual
  const filteredDDayMetrics = useMemo(() => {
    return {
      hadir: records.filter((r) => r.status === "hadir").length,
      menyusul: records.filter((r) => r.status === "menyusul").length,
      meninggalkan: records.filter((r) => r.status === "meninggalkan").length,
      tidakHadir: records.filter((r) => r.status === "tidak hadir").length,
    };
  }, [records]);

  const filteredH1Metrics = useMemo(() => {
    return {
      tepatWaktu: h1Records.filter((r) => r.status === "hadir tepat waktu").length,
      menyusul: h1Records.filter((r) => r.status === "hadir menyusul").length,
      izin: h1Records.filter((r) => r.status === "izin meninggalkan").length,
      tidakHadir: h1Records.filter((r) => r.status === "tidak hadir").length,
    };
  }, [h1Records]);

  const handleDDaySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    // Proteksi validasi NIM akun
    if (!studentNIM || studentNIM === "UNKNOWN") {
      setSaveMessage("Gagal mendeteksi identitas. Silakan login kembali.");
      return;
    }

    setSaveMessage("Syncing telemetry data into Firebase...");

    try {
      let evidenceUrl = "";
      let evidencePublicId = "";

      if (evidenceFile) {
        const upload = await uploadToCloudinary(evidenceFile);
        evidenceUrl = upload.secure_url;
        evidencePublicId = upload.public_id;
      }

      // KOREKSI 1 & 2: Menyimpan ke koleksi hari dinamis, dengan nama Dokumen berupa NIM asli maba
      await setDoc(doc(db, `attendance_${selectedDay}`, studentNIM), {
        fullName: fullName.trim(),
        nim: studentNIM,
        day: selectedDay,
        status: statusDDay,
        evidenceText: evidenceText.trim() || "-",
        evidenceUrl,
        evidencePublicId,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });

      setSaveMessage(`Presensi D-Day untuk ${osjurDays.find(d => d.value === selectedDay)?.label} berhasil dikunci.`);
      setFullName("");
      setEvidenceText("");
      setEvidenceFile(null);
    } catch (err) {
      // Menampilkan pesan eror asli dari sistem untuk mempermudah pelacakan
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setSaveMessage(`Transmission sequence failure: ${errMsg}`);
    }
  };

  const handleH1Submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    if (!studentNIM || studentNIM === "UNKNOWN") {
      setSaveMessage("Gagal mendeteksi identitas. Silakan login kembali.");
      return;
    }

    setSaveMessage("Piping confirmation token...");

    try {
      // KOREKSI 1 & 2: Menyimpan ke koleksi hari dinamis, dengan nama Dokumen berupa NIM asli maba
      await setDoc(doc(db, `h1_confirmations_${selectedDay}`, studentNIM), {
        fullName: fullName.trim(),
        nim: studentNIM,
        day: selectedDay,
        status: statusH1,
        reason: statusH1 === "hadir tepat waktu" ? "-" : reasonH1.trim() || "-",
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });

      setSaveMessage(`Konfirmasi H-1 untuk ${osjurDays.find(d => d.value === selectedDay)?.label} berhasil dikunci.`);
      setFullName("");
      setReasonH1("");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setSaveMessage(`Transaction sequence aborted: ${errMsg}`);
    }
  };

  return (
    <section className="space-y-6">
      <header className="panel p-6">
        <h1 className="font-heading text-4xl text-[#F2EDEC] tracking-wider">{t("Operations Presence Hub")}</h1>
        
        <div className="mt-4 max-w-md">
          <label className="block text-xs uppercase tracking-wider text-[#D5C757] mb-2 font-semibold">
            Choose D-Day:
          </label>
          <select
            value={selectedDay}
            onChange={(e) => { setSelectedDay(e.target.value); setSaveMessage(""); }}
            className="w-full rounded-xl border border-[#084D58]/40 bg-[#0F282F] px-4 py-3 text-sm text-[#F2EDEC] font-medium outline-none focus:border-[#D5C757] transition shadow-md"
          >
            {osjurDays.map((day) => (
              <option key={day.value} value={day.value} className="bg-[#0F282F] text-[#F2EDEC]">
                {day.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex border-b border-[#084D58]/30 gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab("dday"); setSaveMessage(""); }}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition ${activeTab === "dday" ? "border-b-[#D5C757] text-[#D5C757]" : "border-transparent text-[#aaa391]"}`}
          >
            🚀 D-Day Attendance
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("h1"); setSaveMessage(""); }}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition ${activeTab === "h1" ? "border-b-[#D5C757] text-[#D5C757]" : "border-transparent text-[#aaa391]"}`}
          >
            📅 H-1 Confirmation
          </button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        {activeTab === "dday" ? (
          <>
            <article className="panel p-5 space-y-4">
              <h2 className="font-heading text-2xl text-[#F2EDEC]">
                Form Presensi Hari H ({osjurDays.find(d => d.value === selectedDay)?.label})
              </h2>
              <form onSubmit={handleDDaySubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] uppercase text-[#D7DCD5]/60 mb-1">Identitas NIM Pengisi</label>
                    <input type="text" value={studentNIM} disabled className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[#F2EDEC] font-mono font-bold opacity-50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-[#D7DCD5]/60 mb-1">Nama Lengkap Sesuai Berkas</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Masukkan nama lengkap..." className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-[#F2EDEC] outline-none focus:border-[#D5C757]" required />
                  </div>
                </div>
                <select value={statusDDay} onChange={(e) => setStatusDDay(e.target.value)} className="w-full rounded-xl border border-white/15 bg-[#0F282F] px-3 py-2.5 text-sm text-[#F2EDEC] outline-none">
                  <option value="hadir">Hadir di Tempat</option>
                  <option value="menyusul">Hadir Menyusul / Terlambat</option>
                  <option value="meninggalkan">Izin Meninggalkan Sesi</option>
                  <option value="tidak hadir">Tidak Hadir (Sakit/Izin)</option>
                </select>
                <textarea value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} placeholder="Catatan opsional alasan..." className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-[#F2EDEC] outline-none" rows={3} />
                <div>
                  <label className="block text-[11px] text-[#D5C757] mb-1">Unggah Foto Bukti Kehadiran / Surat Izin</label>
                  <input type="file" accept="image/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} className="w-full text-xs text-[#aaa391]" />
                </div>
                <button type="submit" className="cta-btn px-6 py-2.5 text-xs uppercase">Submit Core Presence</button>
              </form>
            </article>
            
            <aside className="panel p-5 w-full xl:w-80 space-y-4">
              <h3 className="font-heading text-xl text-[#D5C757]">Live Metrics Dashboard</h3>
              <p className="text-[10px] uppercase tracking-wider text-[#D7DCD5]/60 border-b border-white/10 pb-1">
                Koleksi: ATTENDANCE_{selectedDay.toUpperCase()}
              </p>
              <div className="text-xs space-y-2 text-[#D7DCD5]">
                <p>Hadir: <span className="text-[#D5C757] font-bold">{filteredDDayMetrics.hadir}</span></p>
                <p>Menyusul: <span className="text-[#D5C757] font-bold">{filteredDDayMetrics.menyusul}</span></p>
                <p>Meninggalkan: <span className="text-[#D5C757] font-bold">{filteredDDayMetrics.meninggalkan}</span></p>
                <p>Tidak Hadir: <span className="text-[#D5C757] font-bold">{filteredDDayMetrics.tidakHadir}</span></p>
                <p className="pt-2 text-[10px] text-[#aaa391] border-t border-white/5">Expected Quota Target: {expectedParticipants}</p>
              </div>
            </aside>
          </>
        ) : (
          <>
            <article className="panel p-5 space-y-4">
              <h2 className="font-heading text-2xl text-[#F2EDEC]">
                Form Konfirmasi Kehadiran Besok ({osjurDays.find(d => d.value === selectedDay)?.label})
              </h2>
              <form onSubmit={handleH1Submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] uppercase text-[#D7DCD5]/60 mb-1">Identitas NIM</label>
                    <input type="text" value={studentNIM} disabled className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[#F2EDEC] font-mono font-bold opacity-50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-[#D7DCD5]/60 mb-1">Nama Lengkap</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Masukkan nama lengkap..." className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-[#F2EDEC] outline-none focus:border-[#D5C757]" required />
                  </div>
                </div>
                <select value={statusH1} onChange={(e) => setStatusH1(e.target.value)} className="w-full rounded-xl border border-white/15 bg-[#0F282F] px-3 py-2.5 text-sm text-[#F2EDEC] outline-none">
                  <option value="hadir tepat waktu">Hadir Tepat Waktu Besok</option>
                  <option value="hadir menyusul">Hadir Menyusul Sesi</option>
                  <option value="izin meninggalkan">Izin Pulang Awal</option>
                  <option value="tidak hadir">Tidak Hadir</option>
                </select>
                {statusH1 !== "hadir tepat waktu" && (
                  <textarea value={reasonH1} onChange={(e) => setReasonH1(e.target.value)} placeholder="Sebutkan detail alasan berhalangan..." className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-[#F2EDEC] outline-none" rows={3} required />
                )}
                <button type="submit" className="cta-btn px-6 py-2.5 text-xs uppercase">Submit H-1 Confirmation</button>
              </form>
            </article>

            <aside className="panel p-5 w-full xl:w-80 space-y-4">
              <h3 className="font-heading text-xl text-[#D5C757]">Live Metrics Dashboard</h3>
              <p className="text-[10px] uppercase tracking-wider text-[#D7DCD5]/60 border-b border-white/10 pb-1">
                Koleksi: H1_CONFIRMATIONS_{selectedDay.toUpperCase()}
              </p>
              <div className="text-xs space-y-2 text-[#D7DCD5]">
                <p>Tepat Waktu: <span className="text-teal-400 font-bold">{filteredH1Metrics.tepatWaktu}</span></p>
                <p>Menyusul: <span className="text-teal-400 font-bold">{filteredH1Metrics.menyusul}</span></p>
                <p>Izin Sesi: <span className="text-teal-400 font-bold">{filteredH1Metrics.izin}</span></p>
                <p>Tidak Hadir: <span className="text-teal-400 font-bold">{filteredH1Metrics.tidakHadir}</span></p>
                <p className="pt-2 text-[10px] text-[#aaa391] border-t border-white/5">Expected Quota Target: {expectedParticipants}</p>
              </div>
            </aside>
          </>
        )}
      </div>

      {saveMessage && <p className="panel p-3 text-xs text-center text-[#D5C757] font-mono">{saveMessage}</p>}
    </section>
  );
}