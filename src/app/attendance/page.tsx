"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { onSnapshot, collection, doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import { eventMetaRef, getCurrentTimestamp } from "@/lib/engagement";

const osjurDays = [
  { value: "day_1", label: "Day 1 - Opening & Synchronizations" },
  { value: "day_2", label: "Day 2 - Core Operations Session" },
  { value: "day_3", label: "Day 3 - Material Exploration" },
  { value: "day_4", label: "Day 4 - Final Presentation & Closing" },
  { value: "day_5", label: "Day 5 - Extra Operations Grid" },
  { value: "day_6", label: "Day 6 - Evaluation & Horizon" },
];

interface AttendanceAwalStructure {
  fullName: string;
  nim: string;
  day: string;
  status: string;
  evidenceText: string;
  evidenceUrl?: string;
}

interface AttendanceAkhirStructure {
  fullName: string;
  nim: string;
  day: string;
  status: string;
  feedback: string;
}

interface H1ConfirmationStructure {
  fullName: string;
  nim: string;
  day: string;
  status: string;
  condition: string;
  illnessName?: string;
  symptoms?: string;
  tookMedicine?: string;
  medicineName?: string;
}

interface FirebaseMetaConfig {
  expectedParticipants?: number;
  [key: string]: string | number | undefined;
}

export default function AttendancePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"dday_awal" | "dday_akhir" | "h1">("dday_awal");
  const [selectedDay, setSelectedDay] = useState<string>("day_1");

  // Input state penampung data formulir utama maba
  const [fullName, setFullName] = useState<string>("");
  const [statusDDayAwal, setStatusDDayAwal] = useState<string>("hadir");
  const [statusDDayAkhir, setStatusDDayAkhir] = useState<string>("hadir");
  const [statusH1, setStatusH1] = useState<string>("hadir tepat waktu");
  const [evidenceText, setEvidenceText] = useState<string>("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>("");

  // Input state penampung data skrining medis lapangan maba
  const [condition, setCondition] = useState<string>("Tidak sakit");
  const [illnessName, setIllnessName] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string>("");
  const [tookMedicine, setTookMedicine] = useState<string>("Belum");
  const [medicineName, setMedicineName] = useState<string>("");

  // Storage array internal penampung data kalkulasi real-time metrics
  const [awalRecords, setAwalRecords] = useState<AttendanceAwalStructure[]>([]);
  const [akhirRecords, setFeedbackRecords] = useState<AttendanceAkhirStructure[]>([]);
  const [h1Records, setH1Records] = useState<H1ConfirmationStructure[]>([]);
  
  const [expectedParticipants, setExpectedParticipants] = useState<number>(0);
  const [firebaseMeta, setFirebaseMeta] = useState<FirebaseMetaConfig | null>(null);
  const [saveMessage, setSaveMessage] = useState<string>("");

  const studentNIM = user?.email ? user.email.split("@")[0] : "";

  useEffect(() => {
    if (!user) return;
    const targetDayNumber = selectedDay.split("_")[1];

    const silentErrorHandler = (err: Error) => {
      console.debug("Firebase alignment intersection bypassed safely:", err.message);
    };

    const unsubAwal = onSnapshot(
      collection(db, `attendance_day_${targetDayNumber}`), 
      (snap) => {
        setAwalRecords(snap.docs.map((d) => d.data() as AttendanceAwalStructure));
      }, 
      silentErrorHandler
    );

    const unsubAkhir = onSnapshot(
      collection(db, `attendance_akhir_day_${targetDayNumber}`), 
      (snap) => {
        setFeedbackRecords(snap.docs.map((d) => d.data() as AttendanceAkhirStructure));
      }, 
      silentErrorHandler
    );

    const unsubH1 = onSnapshot(
      collection(db, `h1_confirmations_day_${targetDayNumber}`), 
      (snap) => {
        setH1Records(snap.docs.map((d) => d.data() as H1ConfirmationStructure));
      }, 
      silentErrorHandler
    );

    const unsubMeta = onSnapshot(eventMetaRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as FirebaseMetaConfig;
        setFirebaseMeta(data);
        setExpectedParticipants(data.expectedParticipants || 0);
      }
    }, silentErrorHandler);

    return () => {
      unsubAwal();
      unsubAkhir();
      unsubH1();
      unsubMeta();
    };
  }, [user, selectedDay]);

  // Poin 4: Pencocokan Gerbang Close Gate Mengikuti Parameter Dropdown Target Hari yang Dipilih
  const isGateClosed = useMemo(() => {
    if (!firebaseMeta) return false;
    let fieldKey = `${selectedDay}_dday_awal_deadline`;
    if (activeTab === "dday_akhir") fieldKey = `${selectedDay}_dday_akhir_deadline`;
    if (activeTab === "h1") fieldKey = `${selectedDay}_h1_deadline`;

    const targetDeadline = firebaseMeta[fieldKey];
    if (!targetDeadline || typeof targetDeadline !== "string") return false;
    return new Date() > new Date(targetDeadline);
  }, [firebaseMeta, selectedDay, activeTab]);

  const filteredDDayAwalMetrics = useMemo(() => {
    return {
      hadir: awalRecords.filter((r) => r.status === "hadir").length,
      menyusul: awalRecords.filter((r) => r.status === "menyusul").length,
      meninggalkan: awalRecords.filter((r) => r.status === "meninggalkan").length,
      tidakHadir: awalRecords.filter((r) => r.status === "tidak hadir").length,
    };
  }, [awalRecords]);

  const filteredDDayAkhirMetrics = useMemo(() => {
    return {
      hadir: akhirRecords.filter((r) => r.status === "hadir").length,
      tidakHadir: akhirRecords.filter((r) => r.status === "tidak hadir").length,
    };
  }, [akhirRecords]);

  const filteredH1Metrics = useMemo(() => {
    return {
      tepatWaktu: h1Records.filter((r) => r.status === "hadir tepat waktu").length,
      menyusul: h1Records.filter((r) => r.status === "hadir menyusul").length,
      izin: h1Records.filter((r) => r.status === "izin meninggalkan").length,
      tidakHadir: h1Records.filter((r) => r.status === "tidak hadir").length,
    };
  }, [h1Records]);

  const handleDDayAwalSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isGateClosed) return;
    if (!fullName.trim() || !studentNIM) return;

    // Fitur B: Menolak Pengiriman Jika Berkas Bukti Foto Masih Kosong
    if (!evidenceFile) {
      setSaveMessage("Gagal: Anda diwajibkan untuk mengunggah berkas foto bukti dokumentasi fisik kehadiran sebelum melakukan submit!");
      return;
    }

    setSaveMessage("Mencadangkan paket data presensi ke server pusat...");

    try {
      let evidenceUrl = "";
      let evidencePublicId = "";
      if (evidenceFile) {
        const upload = await uploadToCloudinary(evidenceFile);
        evidenceUrl = upload.secure_url;
        evidencePublicId = upload.public_id;
      }

      await setDoc(doc(db, `attendance_day_${selectedDay.split("_")[1]}`, studentNIM), {
        fullName: fullName.trim(),
        nim: studentNIM,
        day: selectedDay,
        status: statusDDayAwal,
        evidenceText: evidenceText.trim() || "-",
        evidenceUrl,
        evidencePublicId,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });
      setSaveMessage("Presensi Check-In Berhasil Dikunci!");
      setFullName("");
      setEvidenceText("");
      setEvidenceFile(null);
    } catch (err: unknown) {
      setSaveMessage(`Eror: ${err instanceof Error ? err.message : "Failure"}`);
    }
  };

  const handleDDayAkhirSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isGateClosed) return;
    if (!fullName.trim() || !studentNIM) return;
    setSaveMessage("Memproses otentikasi check-out harian...");

    try {
      await setDoc(doc(db, `attendance_akhir_day_${selectedDay.split("_")[1]}`, studentNIM), {
        fullName: fullName.trim(),
        nim: studentNIM,
        day: selectedDay,
        status: statusDDayAkhir,
        feedback: feedbackText.trim() || "-",
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });
      setSaveMessage("Presensi Check-Out Berhasil Dikunci!");
      setFullName("");
      setFeedbackText("");
    } catch (err: unknown) {
      setSaveMessage(`Eror: ${err instanceof Error ? err.message : "Failure"}`);
    }
  };

  const handleH1Submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isGateClosed) return;
    if (!fullName.trim() || !studentNIM) return;
    setSaveMessage("Mengirimkan enkripsi berkas skrining medis...");

    try {
      await setDoc(doc(db, `h1_confirmations_day_${selectedDay.split("_")[1]}`, studentNIM), {
        fullName: fullName.trim(),
        nim: studentNIM,
        day: selectedDay,
        status: statusH1,
        condition,
        illnessName: condition === "Sedang sakit" ? illnessName.trim() || "-" : "-",
        symptoms: condition === "Sedang sakit" ? symptoms.trim() || "-" : "-",
        tookMedicine: condition === "Sedang sakit" ? tookMedicine : "-",
        medicineName: (condition === "Sedang sakit" && tookMedicine === "Sudah") ? medicineName.trim() || "-" : "-",
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });
      setSaveMessage("Paket Data Skrining Kesehatan H-1 Berhasil Dikunci!");
      setFullName("");
      setIllnessName("");
      setSymptoms("");
      setMedicineName("");
    } catch (err: unknown) {
      setSaveMessage(`Eror: ${err instanceof Error ? err.message : "Failure"}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F282F] p-4 sm:p-6 lg:p-8 text-[#F2EDEC] relative overflow-hidden selection:bg-[#D5C757]/30">
      {/* GLOWING AMBIENT DECORATIVE SCATTER BLODS */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#084D58]/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#D5C757]/5 blur-[100px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* PANEL HEADER STRUKTUR PANJANG ASLI */}
        <header className="panel rounded-3xl border border-[#084D58]/40 bg-[#0F282F]/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-revealDown">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D5C757]/30 bg-[#D5C757]/10 text-[#D5C757] text-[10px] uppercase font-bold tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D5C757] animate-ping" />
              Central Telemetry Presence Station
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl tracking-wider text-[#F2EDEC] leading-tight">
              {t("Operations Presence Hub")}
            </h1>
            <p className="text-xs text-[#aaa391] leading-relaxed">
              Selamat datang di stasiun pencatatan log kehadiran terpadu. Pastikan data koordinat identitas NIM, nama, berkas digital surat dokumentasi lapangan, dan form evaluasi terisi secara akurat sebelum gerbang batas waktu pengumpulan dikunci otomatis oleh sistem administrator pusat.
            </p>
          </div>

          {/* DROPDOWN PEMILIHAN TARGET ACARA */}
          <div className="w-full md:w-72 space-y-1.5 bg-black/20 p-4 rounded-2xl border border-white/5 shadow-inner shrink-0">
            <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#D5C757] font-bold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D5C757]"><path d="M19 4H5C3.89 4 3 4.89 3 6V20C3 21.11 3.89 22 5 22H19C20.11 22 21 21.11 21 20V6C21 4.89 20.11 4H19ZM19 20H5V10H19V20ZM19 8H5V6H19V8Z" fill="currentColor"/></svg>
              Target Hari Operasional:
            </label>
            <select
              value={selectedDay}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedDay(e.target.value); setSaveMessage(""); }}
              className="w-full rounded-xl border border-[#084D58]/60 bg-[#0F282F] px-3 py-2.5 text-xs font-semibold text-[#F2EDEC] outline-none focus:border-[#D5C757] focus:ring-1 focus:ring-[#D5C757] transition cursor-pointer"
            >
              {osjurDays.map((day) => (
                <option key={day.value} value={day.value} className="bg-[#0F282F] text-[#F2EDEC]">
                  {day.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* TAB BUTTON NAVIGATION DESIGN ASLI PANJANG */}
        <nav className="flex border-b border-[#084D58]/40 bg-[#0F282F]/40 p-1.5 rounded-2xl gap-1 overflow-x-auto shadow-inner backdrop-blur-sm">
          <button
            type="button"
            onClick={() => { setActiveTab("dday_awal"); setSaveMessage(""); }}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 ${activeTab === "dday_awal" ? "bg-[#084D58] text-[#D5C757] shadow-lg border border-[#D5C757]/20 transform scale-[1.02]" : "text-[#aaa391] hover:text-[#F2EDEC] hover:bg-white/5"}`}
          >
            <svg width="16" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 22H22L12 2ZM12 6L18.8 19.5H5.2L12 6ZM11 11H13V15H11V11ZM11 16H13V18H11V16Z" fill="currentColor"/></svg>
            🚀 Check-In (Absen Awal)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("dday_akhir"); setSaveMessage(""); }}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 ${activeTab === "dday_akhir" ? "bg-[#084D58] text-[#D5C757] shadow-lg border border-[#D5C757]/20 transform scale-[1.02]" : "text-[#aaa391] hover:text-[#F2EDEC] hover:bg-white/5"}`}
          >
            <svg width="16" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V7.5L14.5 2ZM18 20H6V4H13.5V8.5H18V20ZM11 11H13V15H11V11ZM11 16H13V18H11V16Z" fill="currentColor"/></svg>
            🏁 Check-Out (Feedback Akhir)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("h1"); setSaveMessage(""); }}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 ${activeTab === "h1" ? "bg-[#084D58] text-[#D5C757] shadow-lg border border-[#D5C757]/20 transform scale-[1.02]" : "text-[#aaa391] hover:text-[#F2EDEC] hover:bg-white/5"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 11H7V13H9V11ZM13 11H11V13H13V11ZM17 11H15V13H17V11ZM19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6V20C3.01 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4H19ZM19 20H5V9H19V20Z" fill="currentColor"/></svg>
            📅 H-1 Confirmation & Skrining Medis
          </button>
        </nav>

        {/* WARNING CLOSE GATE TIMELINE BANNER */}
        {isGateClosed && (
          <div className="col-span-full panel rounded-2xl border border-[#CE4A2D]/50 bg-[#CE4A2D]/10 p-4 text-center shadow-xl animate-pulse">
            <p className="text-sm font-bold text-[#CE4A2D] uppercase tracking-widest flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 22 12 22ZM13 16H11V14H13V16ZM13 12H11V7H13V12Z" fill="currentColor"/></svg>
              ACCESS RESTRICTION ACTUATED: GATE CLOSED
            </p>
            <p className="text-[11px] text-[#aaa391] mt-0.5">Sesi formulir pengumpulan log digital untuk hari operasional ini telah habis masa berlakunya.</p>
          </div>
        )}

        {/* LAYOUT BODY FORM GRID */}
        <div className="grid gap-6 xl:grid-cols-[1fr_340px] col-span-full items-start">
          
          {/* TAB AREA FORMULIR 1: DDAY CHECK-IN (AWAL) */}
          {activeTab === "dday_awal" && (
            <article className="panel rounded-3xl border border-[#084D58]/30 bg-[#0F282F]/60 p-5 sm:p-7 space-y-5 shadow-2xl backdrop-blur-sm">
              <div className="border-b border-[#084D58]/30 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-2xl tracking-wide text-[#F2EDEC]">Form Absensi Check-In Kehadiran</h2>
                  <p className="text-[11px] text-[#aaa391] mt-0.5">Lakukan perekaman data kehadiran saat memasuki area ring utama pelaksanaan.</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-[#084D58]/30 border border-[#084D58]/60 flex items-center justify-center text-[#D5C757]">
                  🚀
                </div>
              </div>

              <form onSubmit={handleDDayAwalSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#aaa391] font-semibold">Identitas NIM Pengisi (Otomatis)</span>
                    <input type="text" value={studentNIM} disabled className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-[#F2EDEC] font-mono font-bold opacity-40 outline-none select-none" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#D5C757] font-semibold">Nama Lengkap Sesuai Berkas</span>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isGateClosed} placeholder="Ketik nama lengkap maba..." className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2.5 text-xs text-[#F2EDEC] outline-none focus:border-[#D5C757] focus:ring-1 focus:ring-[#D5C757] transition" required />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-[#aaa391] font-semibold">Status Index Kehadiran Lapangan</span>
                  <select value={statusDDayAwal} onChange={(e) => setStatusDDayAwal(e.target.value)} disabled={isGateClosed} className="w-full rounded-xl border border-white/15 bg-[#0F282F] px-3 py-2.5 text-xs text-[#F2EDEC] outline-none focus:border-[#D5C757] cursor-pointer font-medium">
                    <option value="hadir">Hadir Tepat Waktu Di Ring Utama</option>
                    <option value="menyusul">Hadir Menyusul / Mengalami Keterlambatan</option>
                    <option value="meninggalkan">Izin Meninggalkan Sesi Sebelum Selesai</option>
                    <option value="tidak hadir">Absen Absolut / Berhalangan Tetap</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-[#aaa391] font-semibold">Catatan Justifikasi / Keterangan Bukti</span>
                  <textarea value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} disabled={isGateClosed} placeholder="Isi '-' jika hadir normal. Sebutkan detail alasan apabila Anda mengalami keterlambatan atau perizinan khusus..." className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-xs text-[#F2EDEC] outline-none focus:border-[#D5C757] transition font-body" rows={3} />
                </label>

                {/* Fitur B: Elemen Wajib Unggah Lampiran Berkas Bukti Kehadiran Maba */}
                <div className="bg-black/20 p-4 rounded-xl border border-[#CE4A2D]/30 space-y-1.5 shadow-inner">
                  <label className="block text-xs text-[#CE4A2D] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#CE4A2D]" />
                    🖼️ Berkas File Bukti Kehadiran / Surat Izin (MUTLAK WAJIB DIISI)
                  </label>
                  <p className="text-[10px] text-[#aaa391] font-medium">Form absensi akan ditolak sistem jika belum melampirkan foto dokumentasi diri di lokasi kegiatan atau scan surat izin resmi!</p>
                  <input type="file" accept="image/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} disabled={isGateClosed} className="w-full text-xs text-[#aaa391] cursor-pointer mt-2 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#084D58] file:text-[#D5C757] file:hover:bg-[#084D58]/80 file:transition" />
                </div>

                <button type="submit" disabled={isGateClosed} className="cta-btn w-full sm:w-auto px-6 py-3 text-xs uppercase font-bold shadow-lg tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Submit Presensi Awal</button>
              </form>
            </article>
          )}

          {/* TAB AREA FORMULIR 2: DDAY CHECK-OUT (AKHIR) */}
          {activeTab === "dday_akhir" && (
            <article className="panel rounded-3xl border border-[#084D58]/30 bg-[#0F282F]/60 p-5 sm:p-7 space-y-5 shadow-2xl backdrop-blur-sm">
              <div className="border-b border-[#084D58]/30 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-2xl tracking-wide text-[#F2EDEC]">Form Absensi Check-Out & Evaluasi</h2>
                  <p className="text-[11px] text-[#aaa391] mt-0.5">Sesi konfirmasi kepulangan aman dan pengisian lembar umpan balik maba harian.</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-[#084D58]/30 border border-[#084D58]/60 flex items-center justify-center text-[#D5C757]">
                  🏁
                </div>
              </div>

              <form onSubmit={handleDDayAkhirSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#aaa391] font-semibold">Identitas NIM Pengisi (Otomatis)</span>
                    <input type="text" value={studentNIM} disabled className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white font-mono font-bold opacity-40 outline-none" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#D5C757] font-semibold">Nama Lengkap Sesuai Berkas</span>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isGateClosed} placeholder="Masukkan nama lengkap maba..." className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2.5 text-xs text-white outline-none focus:border-[#D5C757]" required />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-[#aaa391] font-semibold">Status Konfirmasi Checkout</span>
                  <select value={statusDDayAkhir} onChange={(e) => setStatusDDayAkhir(e.target.value)} disabled={isGateClosed} className="w-full rounded-xl border border-white/15 bg-[#0F282F] px-3 py-2.5 text-xs text-white outline-none cursor-pointer">
                    <option value="hadir">Tuntas Mengikuti Seluruh Rangkaian Acara Hari Ini</option>
                    <option value="tidak hadir">Meninggalkan Sesi Lebih Awal Karena Hal Darurat</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-[#D5C757] font-bold uppercase tracking-wider flex items-center gap-1">💬 Lembar Feedback, Evaluasi, & Insight Esensi Hari Ini</span>
                  <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} disabled={isGateClosed} placeholder="Tuliskan kritik, saran konstruktif, hambatan kendala lapangan, atau intisari pemahaman esensi materi yang Anda petik hari ini sebagai acuan rapat evaluasi panitia pelaksana..." className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-xs text-white outline-none focus:border-[#D5C757] transition font-body" rows={4} required />
                </label>

                <button type="submit" disabled={isGateClosed} className="cta-btn w-full sm:w-auto px-6 py-3 text-xs uppercase font-bold tracking-wider cursor-pointer">Submit Check-Out</button>
              </form>
            </article>
          )}

          {/* TAB AREA FORMULIR 3: H-1 CONFIRMATION & HEALTH DATA */}
          {activeTab === "h1" && (
            <article className="panel rounded-3xl border border-[#084D58]/30 bg-[#0F282F]/60 p-5 sm:p-7 space-y-5 shadow-2xl backdrop-blur-sm">
              <div className="border-b border-[#084D58]/30 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-2xl tracking-wide text-[#F2EDEC]">Form Kesiapan & Skrining Riwayat Medis</h2>
                  <p className="text-[11px] text-[#aaa391] mt-0.5">Lembar pelaporan riwayat kondisi fisik vital untuk pemetaan logistik tim medis lapangan.</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-[#084D58]/30 border border-[#084D58]/60 flex items-center justify-center text-[#D5C757]">
                  📅
                </div>
              </div>

              <form onSubmit={handleH1Submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#aaa391] font-semibold">Identitas NIM Pengisi (Otomatis)</span>
                    <input type="text" value={studentNIM} disabled className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white font-mono font-bold opacity-40 outline-none" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-[#D5C757] font-semibold">Nama Lengkap Sesuai Berkas</span>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isGateClosed} placeholder="Masukkan nama lengkap..." className="w-full rounded-xl border border-white/15 bg-[#0F282F]/40 px-3 py-2.5 text-xs text-white outline-none focus:border-[#D5C757]" required />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-[#aaa391] font-semibold">Estimasi Konfirmasi Kesiapan Kehadiran Besok</span>
                  <select value={statusH1} onChange={(e) => setStatusH1(e.target.value)} disabled={isGateClosed} className="w-full rounded-xl border border-white/15 bg-[#0F282F] px-3 py-2.5 text-xs text-white outline-none cursor-pointer">
                    <option value="hadir tepat waktu">Hadir Tepat Waktu Sesuai Garis Komando Pagi</option>
                    <option value="hadir menyusul">Hadir Menyusul Dikarenakan Tabrakan Kelas Akademik</option>
                    <option value="izin meninggalkan">Izin Meninggalkan Lapangan Lebih Cepat</option>
                    <option value="tidak hadir">Mutlak Berhalangan Hadir (Sakit Keras/Izin Khusus)</option>
                  </select>
                </label>

                {/* SEKTOR FORM SKRINING KESEHATAN PITA PUTIH */}
                <div className="border-t border-[#084D58]/30 pt-4 space-y-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#D5C757] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D5C757]" />
                      Sektor Skrining Medis Lapangan (Pita Putih Pemetaan)
                    </p>
                    <p className="text-[10px] text-[#aaa391]">Isi kondisi fisik riil Anda demi keselamatan darurat selama di lapangan operasional.</p>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-[#D7DCD5] font-medium">Bagaimana Kondisi Fisik Tubuh Anda Saat Ini?</span>
                    <select value={condition} onChange={(e) => setCondition(e.target.value)} disabled={isGateClosed} className="w-full rounded-xl border border-white/15 bg-[#0F282F] px-3 py-2.5 text-xs text-white outline-none focus:border-[#D5C757] cursor-pointer">
                      <option value="Tidak sakit">Sehat Walafiat & Bugar Tubuh</option>
                      <option value="Sedang sakit">Sedang Sakit / Kurang Sehat / Memiliki Riwayat Kronis</option>
                    </select>
                  </label>

                  {/* KONDISIKAN SUB FORM INPUT MEDIS JIKA MEMILIH SEDANG SAKIT */}
                  {condition === "Sedang sakit" && (
                    <div className="bg-black/30 border border-[#084D58]/40 p-4 rounded-2xl space-y-3 animate-revealUp shadow-inner">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-1">
                          <span className="text-[10px] text-[#D5C757] uppercase font-bold">Diagnosa Sakit / Nama Penyakit?</span>
                          <input type="text" value={illnessName} onChange={(e) => setIllnessName(e.target.value)} disabled={isGateClosed} placeholder="Asma, Vertigo, Mag Akut, Flu, Demam..." className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#D5C757]" required />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] text-[#D5C757] uppercase font-bold">Gejala Fisik yang Dirasakan?</span>
                          <input type="text" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} disabled={isGateClosed} placeholder="Nafas pendek, pusing berputar, mual lemas..." className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#D5C757]" required />
                        </label>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-1">
                          <span className="text-[10px] text-[#D5C757] uppercase font-bold">Apakah Sudah Mengonsumsi Obat?</span>
                          <select value={tookMedicine} onChange={(e) => setTookMedicine(e.target.value)} disabled={isGateClosed} className="w-full rounded-xl border border-white/15 bg-[#0F282F] px-3 py-2 text-xs text-white outline-none cursor-pointer">
                            <option value="Belum">Belum / Tidak Mengonsumsi Obat</option>
                            <option value="Sudah">Sudah Mengonsumsi Obat Medis</option>
                          </select>
                        </label>
                        
                        {tookMedicine === "Sudah" && (
                          <label className="block space-y-1 animate-revealUp">
                            <span className="text-[10px] text-[#D5C757] uppercase font-bold">Sebutkan Nama Obat yang Diminum:</span>
                            <input type="text" value={medicineName} onChange={(e) => setMedicineName(e.target.value)} disabled={isGateClosed} placeholder="Ventolin inhaler, Antasida, Paracetamol..." className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-[#D5C757]" required />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={isGateClosed} className="cta-btn w-full sm:w-auto px-6 py-3 text-xs uppercase font-bold tracking-wider cursor-pointer">Submit Konfirmasi H-1</button>
              </form>
            </article>
          )}

          {/* ASIDE LIVE TRACKING METRICS UNTUK TAB ACTIVE */}
          <aside className="panel rounded-3xl border border-[#084D58]/30 bg-[#0F282F]/60 p-5 space-y-4 shadow-2xl backdrop-blur-sm self-start">
            <div className="border-b border-[#084D58]/30 pb-2">
              <h3 className="font-heading text-xl text-[#D5C757] uppercase tracking-wider">Live Metrics Channel</h3>
              <p className="text-[9px] font-mono text-[#aaa391] uppercase mt-0.5">Koleksi Log: {selectedDay.toUpperCase()}_{activeTab.toUpperCase()}</p>
            </div>
            
            <div className="text-xs space-y-3 text-[#D7DCD5]">
              {activeTab === "dday_awal" && (
                <>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span>Hadir Normal:</span><span className="text-teal-400 font-bold font-mono">{filteredDDayAwalMetrics.hadir}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span>Terlambat/Menyusul:</span><span className="text-teal-400 font-bold font-mono">{filteredDDayAwalMetrics.menyusul}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span>Izin Sesi Keluar:</span><span className="text-teal-400 font-bold font-mono">{filteredDDayAwalMetrics.meninggalkan}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span>Absen/Sakit:</span><span className="text-teal-400 font-bold font-mono">{filteredDDayAwalMetrics.tidakHadir}</span></div>
                </>
              )}
              {activeTab === "dday_akhir" && (
                <>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span>Checkout Sukses:</span><span className="text-teal-400 font-bold font-mono">{filteredDDayAkhirMetrics.hadir}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span>Meninggalkan Lapangan:</span><span className="text-teal-400 font-bold font-mono">{filteredDDayAkhirMetrics.tidakHadir}</span></div>
                </>
              )}
              {activeTab === "h1" && (
                <>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span>Estimasi Tepat Waktu:</span><span className="text-teal-400 font-bold font-mono">{filteredH1Metrics.tepatWaktu}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span>Hadir Menyusul Besok:</span><span className="text-teal-400 font-bold font-mono">{filteredH1Metrics.menyusul}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span>Izin Sesi:</span><span className="text-teal-400 font-bold font-mono">{filteredH1Metrics.izin}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span>Absen Besok Pagi:</span><span className="text-teal-400 font-bold font-mono">{filteredH1Metrics.tidakHadir}</span></div>
                </>
              )}
              
              <div className="pt-3 text-[10px] text-[#aaa391] border-t border-[#084D58]/40 flex justify-between items-center">
                <span>Quota Target Maba:</span>
                <span className="font-mono font-bold text-white bg-[#084D58]/50 px-2 py-0.5 rounded border border-[#084D58]">{expectedParticipants} Orang</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}