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
  { value: "day_2", label: "Day 2 - Rigel: Potential of The Stars" },
  { value: "day_3", label: "Day 3 - Material Exploration" },
  { value: "day_4", label: "Day 4 - Final Presentation & Closing" },
  { value: "day_5", label: "Day 5 - Extra Operations Grid" },
  { value: "day_6", label: "Day 6 - Evaluation & Horizon" },
];

// DAFTAR HITAM TESTER: 
// Akun-akun ini datanya akan tetap masuk ke database & CSV, 
// TAPI TIDAK AKAN dihitung di kotak "Live Metrics" sebelah kanan.
const TESTER_NIMS = ["webdevishimafiitb", "10224000"]; 

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
  evidenceUrl?: string;
}

interface FirebaseMetaConfig {
  expectedParticipants?: number;
  activeOsjurDay?: string;
  [key: string]: string | number | undefined;
}

export default function AttendancePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"h1" | "dday_awal" | "dday_akhir">("h1");

  const [fullName, setFullName] = useState<string>("");
  const [statusDDayAwal, setStatusDDayAwal] = useState<string>("hadir tepat waktu");
  const [statusDDayAkhir, setStatusDDayAkhir] = useState<string>("hadir");
  const [statusH1, setStatusH1] = useState<string>("hadir tepat waktu");
  const [evidenceText, setEvidenceText] = useState<string>("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  
  const [evidenceFileH1, setEvidenceFileH1] = useState<File | null>(null);
  
  const [feedbackText, setFeedbackText] = useState<string>("");

  const [condition, setCondition] = useState<string>("Tidak sakit");
  const [illnessName, setIllnessName] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string>("");
  const [tookMedicine, setTookMedicine] = useState<string>("Belum");
  const [medicineName, setMedicineName] = useState<string>("");

  const [awalRecords, setAwalRecords] = useState<AttendanceAwalStructure[]>([]);
  const [akhirRecords, setFeedbackRecords] = useState<AttendanceAkhirStructure[]>([]);
  const [h1Records, setH1Records] = useState<H1ConfirmationStructure[]>([]);
  
  const [expectedParticipants, setExpectedParticipants] = useState<number>(0);
  const [firebaseMeta, setFirebaseMeta] = useState<FirebaseMetaConfig | null>(null);
  const [saveMessage, setSaveMessage] = useState<string>("");
  
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const studentNIM = user?.email ? user.email.split("@")[0] : "";
  const selectedDay = typeof firebaseMeta?.activeOsjurDay === "string" ? firebaseMeta.activeOsjurDay : "day_1";

  useEffect(() => {
    if (!user) return;
    const targetDayNumber = selectedDay.split("_")[1];

    const silentErrorHandler = (err: Error) => {
      console.debug("Firebase alignment bypassed:", err.message);
    };

    const unsubAwal = onSnapshot(collection(db, `attendance_day_${targetDayNumber}`), (snap) => {
      setAwalRecords(snap.docs.map((d) => d.data() as AttendanceAwalStructure));
    }, silentErrorHandler);

    const unsubAkhir = onSnapshot(collection(db, `attendance_akhir_day_${targetDayNumber}`), (snap) => {
      setFeedbackRecords(snap.docs.map((d) => d.data() as AttendanceAkhirStructure));
    }, silentErrorHandler);

    const unsubH1 = onSnapshot(collection(db, `h1_confirmations_day_${targetDayNumber}`), (snap) => {
      setH1Records(snap.docs.map((d) => d.data() as H1ConfirmationStructure));
    }, silentErrorHandler);

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

  const isGateClosed = useMemo(() => {
    if (!firebaseMeta) return false;
    let fieldKey = `${selectedDay}_h1_deadline`;
    if (activeTab === "dday_awal") fieldKey = `${selectedDay}_dday_awal_deadline`;
    if (activeTab === "dday_akhir") fieldKey = `${selectedDay}_dday_akhir_deadline`;

    const targetDeadline = firebaseMeta[fieldKey];
    if (!targetDeadline || typeof targetDeadline !== "string") return false;
    return new Date() > new Date(targetDeadline);
  }, [firebaseMeta, selectedDay, activeTab]);

  // FIX PENGECUALIAN TESTER: Metrik mengabaikan akun yang ada di daftar TESTER_NIMS
  const filteredDDayAwalMetrics = useMemo(() => {
    const validRecords = awalRecords.filter(r => !TESTER_NIMS.includes(r.nim));
    return {
      hadir: validRecords.filter((r) => r.status === "hadir tepat waktu" || r.status === "hadir").length,
      menyusul: validRecords.filter((r) => r.status === "izin menyusul" || r.status === "menyusul").length,
      meninggalkan: validRecords.filter((r) => r.status === "izin meninggalkan" || r.status === "meninggalkan").length,
      tidakHadir: validRecords.filter((r) => r.status === "tidak hadir").length,
    };
  }, [awalRecords]);

  const filteredDDayAkhirMetrics = useMemo(() => {
    const validRecords = akhirRecords.filter(r => !TESTER_NIMS.includes(r.nim));
    return {
      hadir: validRecords.filter((r) => r.status === "hadir").length,
      tidakHadir: validRecords.filter((r) => r.status === "tidak hadir").length,
    };
  }, [akhirRecords]);

  const filteredH1Metrics = useMemo(() => {
    const validRecords = h1Records.filter(r => !TESTER_NIMS.includes(r.nim));
    return {
      tepatWaktu: validRecords.filter((r) => r.status === "hadir tepat waktu").length,
      menyusul: validRecords.filter((r) => r.status === "hadir menyusul").length,
      izin: validRecords.filter((r) => r.status === "izin meninggalkan").length,
      tidakHadir: validRecords.filter((r) => r.status === "tidak hadir").length,
    };
  }, [h1Records]);

  const handleDDayAwalSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isGateClosed || isLoading) return;
    if (!fullName.trim() || !studentNIM) return;

    if (!evidenceFile) {
      setSaveMessage("❌ GAGAL: Anda wajib melampirkan berkas foto bukti dokumentasi kehadiran sebelum submit!");
      return;
    }
    
    if (evidenceFile.size > 5 * 1024 * 1024) {
      setSaveMessage("❌ GAGAL: Ukuran file foto Anda terlalu besar (Maks 5MB). Silakan kompres file Anda terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setSaveMessage("⏳ Sedang memproses dan mencadangkan data presensi Anda ke server...");

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
      setSaveMessage("✅ BERHASIL: Presensi Check-In Anda sudah terkirim dan terkunci di sistem!");
      setFullName("");
      setEvidenceText("");
      setEvidenceFile(null);
    } catch (err: unknown) {
      setSaveMessage(`❌ GAGAL: ${err instanceof Error ? err.message : "Terjadi kesalahan jaringan."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDDayAkhirSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isGateClosed || isLoading) return;
    if (!fullName.trim() || !studentNIM) return;
    
    setIsLoading(true);
    setSaveMessage("⏳ Memproses otentikasi data check-out harian Anda...");

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
      setSaveMessage("✅ BERHASIL: Presensi Check-Out & Evaluasi Anda berhasil terekam sistem!");
      setFullName("");
      setFeedbackText("");
    } catch (err: unknown) {
      setSaveMessage(`❌ GAGAL: ${err instanceof Error ? err.message : "Terjadi kesalahan jaringan."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleH1Submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isGateClosed || isLoading) return;
    if (!fullName.trim() || !studentNIM) return;

    if (statusH1 !== "hadir tepat waktu" && !evidenceFileH1) {
      setSaveMessage("❌ GAGAL: Anda WAJIB melampirkan berkas bukti/surat keterangan (PDF/Foto)!");
      return;
    }

    if (evidenceFileH1 && evidenceFileH1.size > 5 * 1024 * 1024) {
      setSaveMessage("❌ GAGAL: Ukuran file surat keterangan terlalu besar (Maks 5MB). Silakan kompres file Anda.");
      return;
    }

    setIsLoading(true);
    setSaveMessage("⏳ Mengenkripsi dan mengirimkan berkas konfirmasi H-1 Anda...");

    try {
      let evidenceUrl = "";
      if (evidenceFileH1) {
        const upload = await uploadToCloudinary(evidenceFileH1);
        evidenceUrl = upload.secure_url;
      }

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
        evidenceUrl: evidenceUrl || "-", 
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });
      setSaveMessage("✅ BERHASIL: Paket Data Konfirmasi H-1 Anda resmi terkunci di sistem!");
      setFullName("");
      setIllnessName("");
      setSymptoms("");
      setMedicineName("");
      setEvidenceFileH1(null);
    } catch (err: unknown) {
      setSaveMessage(`❌ GAGAL: ${err instanceof Error ? err.message : "Terjadi kesalahan jaringan."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderNotificationBanner = () => {
    if (!saveMessage) return null;
    const isSuccess = saveMessage.startsWith("✅");
    const isError = saveMessage.startsWith("❌");
    
    return (
      <div className={`p-4 mb-4 rounded-xl border font-bold text-[11px] sm:text-xs tracking-wider animate-revealDown ${isSuccess ? 'bg-[#452ABC]/25 border-[#452ABC] text-[#9b87e8]' : isError ? 'bg-[#EC5C2A]/20 border-[#EC5C2A] text-[#EC5C2A]' : 'bg-[#E1D9F9]/10 border-[#E1D9F9]/20 text-[#F6C545]'}`}>
        {saveMessage}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-4 sm:p-6 lg:p-8 text-[#E1D9F9] relative overflow-x-hidden selection:bg-[#F6C545]/30 w-full max-w-full">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#452ABC]/10 blur-[120px] pointer-events-none z-0 hidden sm:block" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#F6C545]/5 blur-[100px] pointer-events-none z-0 hidden sm:block" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10 w-full min-w-0">
        
        <header className="panel rounded-3xl border border-[#E1D9F9]/[0.08] bg-[#0A0A0B]/80 p-5 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full min-w-0">
          <div className="space-y-2 w-full max-w-xl">
            <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full border border-[#F6C545]/30 bg-[#F6C545]/10 text-[#F6C545] text-[10px] uppercase font-bold tracking-widest break-words text-center sm:text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F6C545] animate-ping shrink-0" />
              Central Telemetry Presence Station
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl tracking-wider text-[#E1D9F9] leading-tight break-words whitespace-normal">
              {t("Operations Presence Hub")}
            </h1>
            <p className="text-[11px] sm:text-xs text-[#E1D9F9]/50 leading-relaxed break-words whitespace-normal">
              Pastikan identitas dan konfirmasi kehadiran terisi sebelum presensi ditutup.
            </p>
          </div>

          <div className="w-full md:w-72 space-y-1.5 bg-black/20 p-4 rounded-2xl border border-[#E1D9F9]/5 shadow-inner shrink-0 min-w-0">
            <label className="flex items-center gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-[#F6C545] font-bold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#F6C545] shrink-0"><path d="M19 4H5C3.89 4 3 4.89 3 6V20C3 21.11 3.89 22 5 22H19C20.11 22 21 21.11 21 20V6C21 4.89 20.11 4H19ZM19 20H5V10H19V20ZM19 8H5V6H19V8Z" fill="currentColor"/></svg>
              DAY:
            </label>
            <div key={selectedDay} className="w-full rounded-xl border border-[#452ABC]/40 bg-[#452ABC]/20 px-3 py-2.5 text-xs font-semibold text-[#F6C545] truncate shadow-inner select-none">
              {osjurDays.find((day) => day.value === selectedDay)?.label || "Loading Timeline..."}
            </div>
          </div>
        </header>

        <nav className="flex flex-nowrap border-b border-[#E1D9F9]/[0.08] bg-[#0A0A0B]/40 p-1.5 sm:p-2 rounded-2xl gap-2 overflow-x-auto shadow-inner backdrop-blur-sm w-full min-w-0 scrollbar-hide pb-2 sm:pb-2">
          
          <button
            type="button"
            onClick={() => { setActiveTab("h1"); setSaveMessage(""); }}
            className={`shrink-0 flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 text-[11px] sm:text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 ${activeTab === "h1" ? "bg-gradient-to-r from-[#F6C545] to-[#EC5C2A] text-[#0A0A0B] shadow-[0_0_15px_rgba(246,197,69,0.4)] border border-[#F6C545] scale-[1.02] z-10" : "bg-black/20 text-[#E1D9F9]/50 border border-[#E1D9F9]/5 hover:bg-[#E1D9F9]/10 opacity-70 hover:opacity-100"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0"><path d="M9 11H7V13H9V11ZM13 11H11V13H13V11ZM17 11H15V13H17V11ZM19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6V20C3.01 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4H19ZM19 20H5V9H19V20Z" fill="currentColor"/></svg>
            📅 H-1 Confirmation
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("dday_awal"); setSaveMessage(""); }}
            className={`shrink-0 flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 text-[11px] sm:text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 ${activeTab === "dday_awal" ? "bg-gradient-to-r from-[#F6C545] to-[#EC5C2A] text-[#0A0A0B] shadow-[0_0_15px_rgba(246,197,69,0.4)] border border-[#F6C545] scale-[1.02] z-10" : "bg-black/20 text-[#E1D9F9]/50 border border-[#E1D9F9]/5 hover:bg-[#E1D9F9]/10 opacity-70 hover:opacity-100"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0"><path d="M12 2L2 22H22L12 2ZM12 6L18.8 19.5H5.2L12 6ZM11 11H13V15H11V11ZM11 16H13V18H11V16Z" fill="currentColor"/></svg>
            🚀 Check-In (Presensi Awal)
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("dday_akhir"); setSaveMessage(""); }}
            className={`shrink-0 flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 text-[11px] sm:text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 ${activeTab === "dday_akhir" ? "bg-gradient-to-r from-[#F6C545] to-[#EC5C2A] text-[#0A0A0B] shadow-[0_0_15px_rgba(246,197,69,0.4)] border border-[#F6C545] scale-[1.02] z-10" : "bg-black/20 text-[#E1D9F9]/50 border border-[#E1D9F9]/5 hover:bg-[#E1D9F9]/10 opacity-70 hover:opacity-100"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0"><path d="M14.5 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V7.5L14.5 2ZM18 20H6V4H13.5V8.5H18V20ZM11 11H13V15H11V11ZM11 16H13V18H11V16Z" fill="currentColor"/></svg>
            🏁 Check-Out (Presensi Akhir)
          </button>
        </nav>

        {isGateClosed && (
          <div className="col-span-full panel rounded-2xl border border-[#EC5C2A]/50 bg-[#EC5C2A]/10 p-4 sm:p-5 text-center shadow-xl animate-pulse w-full min-w-0">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 text-[#EC5C2A]"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 22 12 22ZM13 16H11V14H13V16ZM13 12H11V7H13V12Z" fill="currentColor"/></svg>
              <span className="text-xs sm:text-sm font-bold text-[#EC5C2A] uppercase tracking-wider text-center break-words whitespace-normal">
                ACCESS RESTRICTION ACTUATED: GATE CLOSED
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#E1D9F9]/50 mt-2 sm:mt-1 break-words whitespace-normal px-2">
              Sesi presensi berakhir atau belum dibuka. Anda tidak dapat mengirimkan data kehadiran pada sesi ini.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:gap-8 xl:grid-cols-[1fr_340px] col-span-full items-start w-full min-w-0">
          
          {activeTab === "h1" && (
            <article className="panel rounded-3xl border border-[#E1D9F9]/[0.06] bg-[#0A0A0B]/60 p-4 sm:p-7 space-y-5 shadow-2xl backdrop-blur-sm w-full min-w-0 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F6C545] to-transparent opacity-50"></div>

              <div className="border-b border-[#E1D9F9]/[0.08] pb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-xl sm:text-2xl tracking-wide text-[#F6C545] truncate">Form Konfirmasi Kehadiran Day</h2>
                  <p className="text-[10px] sm:text-[11px] text-[#E1D9F9]/50 mt-0.5 break-words whitespace-normal">Form konfirmasi kehadiran dan kondisi kesehatan</p>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl bg-[#F6C545]/20 border border-[#F6C545]/50 flex items-center justify-center text-[#F6C545]">
                  📅
                </div>
              </div>

              {renderNotificationBanner()}

              <form onSubmit={handleH1Submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 w-full min-w-0">
                  <label className="block space-y-1 min-w-0">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 font-semibold">NIM</span>
                    <input type="text" value={studentNIM} disabled className="w-full min-w-0 rounded-xl border border-[#E1D9F9]/10 bg-[#E1D9F9]/5 px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] font-mono font-bold opacity-40 outline-none" />
                  </label>
                  <label className="block space-y-1 min-w-0">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#F6C545] font-semibold">Nama Lengkap Sesuai Berkas</span>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isGateClosed || isLoading} placeholder="Masukkan nama lengkap..." className="w-full min-w-0 rounded-xl border border-[#E1D9F9]/15 bg-[#0A0A0B]/40 px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545]" required />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 font-semibold">Estimasi Konfirmasi Kehadiran</span>
                  <select value={statusH1} onChange={(e) => setStatusH1(e.target.value)} disabled={isGateClosed || isLoading} className="w-full rounded-xl border border-[#E1D9F9]/15 bg-[#0A0A0B] px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] outline-none cursor-pointer text-ellipsis overflow-hidden">
                    <option value="hadir tepat waktu">Hadir Tepat Waktu</option>
                    <option value="hadir menyusul">Izin Menyusul</option>
                    <option value="izin meninggalkan">Izin Meninggalkan</option>
                    <option value="tidak hadir">Tidak Hadir</option>
                  </select>
                </label>

                {statusH1 !== "hadir tepat waktu" && (
                  <div className="bg-[#EC5C2A]/10 p-4 rounded-xl border border-[#EC5C2A]/30 space-y-1.5 shadow-inner w-full min-w-0 animate-revealDown">
                    <label className="text-[10px] sm:text-xs text-[#EC5C2A] font-bold uppercase tracking-wider flex items-start sm:items-center gap-1.5 break-words whitespace-normal leading-snug">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#EC5C2A] shrink-0 mt-1 sm:mt-0" />
                      <span>🖼️ Upload Bukti Keterangan / Surat Izin (WAJIB)</span>
                    </label>
                    <p className="text-[9px] sm:text-[10px] text-[#E1D9F9]/50 font-medium break-words whitespace-normal leading-relaxed">Karena Anda tidak dapat hadir tepat waktu, Anda diwajibkan melampirkan berkas bukti pendukung (PDF/Foto). Maksimal 5MB.</p>
                    
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setEvidenceFileH1(e.target.files?.[0] || null)} disabled={isGateClosed || isLoading} className="w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[9px] sm:text-[10px] text-[#E1D9F9]/50 cursor-pointer mt-2 block file:mr-2 sm:file:mr-4 file:py-1.5 file:px-2 sm:file:px-3 file:rounded-lg file:border-0 file:text-[9px] sm:file:text-[10px] file:font-bold file:bg-[#EC5C2A] file:text-[#E1D9F9] file:hover:bg-[#EC5C2A]/80 file:transition" />
                  </div>
                )}

                <div className="border-t border-[#E1D9F9]/[0.08] pt-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-[11px] sm:text-xs font-bold text-[#F6C545] uppercase tracking-wider flex items-start gap-1.5 break-words whitespace-normal">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#F6C545] shrink-0 mt-1 sm:mt-0.5" />
                      <span>Kondisi Kesehatan</span>
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-[#E1D9F9]/50 break-words whitespace-normal leading-relaxed pl-3">Isi kondisi kesehatan saat ini</p>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[10px] sm:text-[11px] text-[#E1D9F9]/70 font-medium">Kondisi Saat Ini?</span>
                    <select value={condition} onChange={(e) => setCondition(e.target.value)} disabled={isGateClosed || isLoading} className="w-full rounded-xl border border-[#E1D9F9]/15 bg-[#0A0A0B] px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545] cursor-pointer text-ellipsis overflow-hidden">
                      <option value="Tidak sakit">Sehat</option>
                      <option value="Sedang sakit">Sedang Sakit</option>
                    </select>
                  </label>

                  {condition === "Sedang sakit" && (
                    <div className="bg-black/30 border border-[#452ABC]/30 p-4 rounded-2xl space-y-4 animate-revealUp shadow-inner w-full min-w-0">
                      <div className="grid gap-3 sm:grid-cols-2 w-full min-w-0">
                        <label className="block space-y-1 min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-[#F6C545] uppercase font-bold">Diagnosa / Riwayat Penyakit?</span>
                          <input type="text" value={illnessName} onChange={(e) => setIllnessName(e.target.value)} disabled={isGateClosed || isLoading} placeholder="Asma, Vertigo, Mag Akut..." className="w-full min-w-0 rounded-xl border border-[#E1D9F9]/15 bg-black/20 px-3 py-2 text-[11px] sm:text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545]" required />
                        </label>
                        <label className="block space-y-1 min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-[#F6C545] uppercase font-bold">Gejala yang dialami?</span>
                          <input type="text" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} disabled={isGateClosed || isLoading} placeholder="Nafas pendek, pusing, mual..." className="w-full min-w-0 rounded-xl border border-[#E1D9F9]/15 bg-black/20 px-3 py-2 text-[11px] sm:text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545]" required />
                        </label>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 w-full min-w-0">
                        <label className="block space-y-1 min-w-0">
                          <span className="text-[9px] sm:text-[10px] text-[#F6C545] uppercase font-bold">Sedang Mengonsumsi Obat?</span>
                          <select value={tookMedicine} onChange={(e) => setTookMedicine(e.target.value)} disabled={isGateClosed || isLoading} className="w-full min-w-0 rounded-xl border border-[#E1D9F9]/15 bg-[#0A0A0B] px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] outline-none cursor-pointer text-ellipsis overflow-hidden">
                            <option value="Belum">Belum / Tidak Konsumsi Obat</option>
                            <option value="Sudah">Sudah Konsumsi Obat</option>
                          </select>
                        </label>
                        
                        {tookMedicine === "Sudah" && (
                          <label className="block space-y-1 animate-revealUp min-w-0">
                            <span className="text-[9px] sm:text-[10px] text-[#F6C545] uppercase font-bold">Nama Obat yang Dikonsumsi:</span>
                            <input type="text" value={medicineName} onChange={(e) => setMedicineName(e.target.value)} disabled={isGateClosed || isLoading} placeholder="Ventolin inhaler, Antasida..." className="w-full min-w-0 rounded-xl border border-[#E1D9F9]/15 bg-black/20 px-3 py-2 text-[11px] sm:text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545]" required />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={isGateClosed || isLoading} className="cta-btn w-full sm:w-auto px-6 py-3.5 sm:py-3 text-[11px] sm:text-xs uppercase font-bold tracking-wider cursor-pointer break-words whitespace-normal disabled:opacity-50">
                  {isLoading ? "Mengirim Data... ⏳" : "Submit Konfirmasi H-1"}
                </button>
              </form>
            </article>
          )}

          {activeTab === "dday_awal" && (
            <article className="panel rounded-3xl border border-[#E1D9F9]/[0.06] bg-[#0A0A0B]/60 p-4 sm:p-7 space-y-5 shadow-2xl backdrop-blur-sm w-full min-w-0 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F6C545] to-transparent opacity-50"></div>
              <div className="border-b border-[#E1D9F9]/[0.08] pb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-xl sm:text-2xl tracking-wide text-[#F6C545] truncate">Form Presensi Check-In</h2>
                  <p className="text-[10px] sm:text-[11px] text-[#E1D9F9]/50 mt-0.5 break-words whitespace-normal">Lakukan presensi sesuai instruksi</p>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl bg-[#F6C545]/20 border border-[#F6C545]/50 flex items-center justify-center text-[#F6C545] text-sm sm:text-base">
                  🚀
                </div>
              </div>

              {renderNotificationBanner()}

              <form onSubmit={handleDDayAwalSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 w-full min-w-0">
                  <label className="block space-y-1 min-w-0">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 font-semibold">NIM (Otomatis)</span>
                    <input type="text" value={studentNIM} disabled className="w-full min-w-0 rounded-xl border border-[#E1D9F9]/10 bg-[#E1D9F9]/5 px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] font-mono font-bold opacity-40 outline-none select-none" />
                  </label>
                  <label className="block space-y-1 min-w-0">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#F6C545] font-semibold">Nama Lengkap</span>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isGateClosed || isLoading} placeholder="Ketik nama lengkap..." className="w-full min-w-0 rounded-xl border border-[#E1D9F9]/15 bg-[#0A0A0B]/50 px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545] transition" required />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 font-semibold">Status Kehadiran</span>
                  <select value={statusDDayAwal} onChange={(e) => setStatusDDayAwal(e.target.value)} disabled={isGateClosed || isLoading} className="w-full rounded-xl border border-[#E1D9F9]/15 bg-[#0A0A0B] px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545] cursor-pointer font-medium text-ellipsis overflow-hidden">
                    <option value="hadir tepat waktu">Hadir Tepat Waktu</option>
                    <option value="izin menyusul">Izin Menyusul</option>
                    <option value="izin meninggalkan">Izin Meninggalkan</option>
                    <option value="tidak hadir">Tidak Hadir</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 font-semibold">Catatan / Keterangan Bukti</span>
                  <textarea value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} disabled={isGateClosed || isLoading} placeholder="Isi '-' jika hadir normal. Sebutkan alasan jika terlambat/izin..." className="w-full rounded-xl border border-[#E1D9F9]/15 bg-[#0A0A0B]/50 px-3 py-2 text-[11px] sm:text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545] transition font-body resize-y" rows={3} />
                </label>

                <div className="bg-black/20 p-4 rounded-xl border border-[#EC5C2A]/30 space-y-1.5 shadow-inner w-full min-w-0">
                  <label className="text-[10px] sm:text-xs text-[#EC5C2A] font-bold uppercase tracking-wider flex items-start sm:items-center gap-1.5 break-words whitespace-normal leading-snug">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#EC5C2A] shrink-0 mt-1 sm:mt-0" />
                    <span>🖼️ Bukti Dokumentasi (WAJIB DIISI)</span>
                  </label>
                  <p className="text-[9px] sm:text-[10px] text-[#E1D9F9]/50 font-medium break-words whitespace-normal leading-relaxed">Form presensi akan ditolak sistem jika belum melampirkan foto dokumentasi diri di lokasi. Maksimal 5MB.</p>
                  
                  <input type="file" accept="image/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} disabled={isGateClosed || isLoading} className="w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[9px] sm:text-[10px] text-[#E1D9F9]/50 cursor-pointer mt-2 block file:mr-2 sm:file:mr-4 file:py-1.5 file:px-2 sm:file:px-3 file:rounded-lg file:border-0 file:text-[9px] sm:file:text-[10px] file:font-bold file:bg-[#452ABC] file:text-[#F6C545] file:hover:bg-[#452ABC]/80 file:transition" />
                </div>

                <button type="submit" disabled={isGateClosed || isLoading} className="cta-btn w-full sm:w-auto px-6 py-3.5 sm:py-3 text-[11px] sm:text-xs uppercase font-bold shadow-lg tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer break-words whitespace-normal">
                  {isLoading ? "Mengirim Data... ⏳" : "Submit Presensi Awal"}
                </button>
              </form>
            </article>
          )}

          {activeTab === "dday_akhir" && (
            <article className="panel rounded-3xl border border-[#E1D9F9]/[0.06] bg-[#0A0A0B]/60 p-4 sm:p-7 space-y-5 shadow-2xl backdrop-blur-sm w-full min-w-0 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F6C545] to-transparent opacity-50"></div>
              <div className="border-b border-[#E1D9F9]/[0.08] pb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-xl sm:text-2xl tracking-wide text-[#F6C545] truncate">Form Presensi Check-Out & Evaluasi</h2>
                  <p className="text-[10px] sm:text-[11px] text-[#E1D9F9]/50 mt-0.5 break-words whitespace-normal">Sesi konfirmasi kepulangan dan pengisian lembar umpan balik harian.</p>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl bg-[#F6C545]/20 border border-[#F6C545]/50 flex items-center justify-center text-[#F6C545]">
                  🏁
                </div>
              </div>

              {renderNotificationBanner()}

              <form onSubmit={handleDDayAkhirSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 w-full min-w-0">
                  <label className="block space-y-1 min-w-0">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 font-semibold">NIM (Otomatis)</span>
                    <input type="text" value={studentNIM} disabled className="w-full min-w-0 rounded-xl border border-[#E1D9F9]/10 bg-[#E1D9F9]/5 px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] font-mono font-bold opacity-40 outline-none" />
                  </label>
                  <label className="block space-y-1 min-w-0">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#F6C545] font-semibold">Nama Lengkap</span>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isGateClosed || isLoading} placeholder="Masukkan nama lengkap maba..." className="w-full min-w-0 rounded-xl border border-[#E1D9F9]/15 bg-[#0A0A0B]/50 px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545]" required />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 font-semibold">Status Konfirmasi Checkout</span>
                  <select value={statusDDayAkhir} onChange={(e) => setStatusDDayAkhir(e.target.value)} disabled={isGateClosed || isLoading} className="w-full rounded-xl border border-[#E1D9F9]/15 bg-[#0A0A0B] px-3 py-2.5 text-[11px] sm:text-xs text-[#E1D9F9] outline-none cursor-pointer text-ellipsis overflow-hidden">
                    <option value="hadir">Mengikuti Seluruh Rangkaian Acara Hari Ini</option>
                    <option value="tidak hadir">Izin Meninggalkan</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] sm:text-xs text-[#F6C545] font-bold uppercase tracking-wider flex items-start gap-1.5 break-words whitespace-normal">
                    <span className="mt-0.5">💬</span> 
                    <span>Lembar Feedback, Evaluasi, & Insight Esensi Hari Ini</span>
                  </span>
                  <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} disabled={isGateClosed || isLoading} placeholder="Tuliskan kritik, saran, hambatan lapangan, atau intisari pemahaman materi yang Anda petik hari ini..." className="w-full rounded-xl border border-[#E1D9F9]/15 bg-[#0A0A0B]/50 px-3 py-2 text-[11px] sm:text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545] transition font-body resize-y" rows={4} required />
                </label>

                <button type="submit" disabled={isGateClosed || isLoading} className="cta-btn w-full sm:w-auto px-6 py-3.5 sm:py-3 text-[11px] sm:text-xs uppercase font-bold tracking-wider cursor-pointer break-words whitespace-normal disabled:opacity-50">
                  {isLoading ? "Mengirim Data... ⏳" : "Submit Check-Out"}
                </button>
              </form>
            </article>
          )}

          <aside className="panel rounded-3xl border border-[#E1D9F9]/[0.06] bg-[#0A0A0B]/60 p-5 space-y-4 shadow-2xl backdrop-blur-sm self-start w-full xl:w-80 min-w-0">
            <div className="border-b border-[#E1D9F9]/[0.08] pb-2">
              <h3 className="font-heading text-lg sm:text-xl text-[#F6C545] uppercase tracking-wider break-words whitespace-normal leading-tight">Live Metrics Channel</h3>
              <p className="text-[8px] sm:text-[9px] font-mono text-[#E1D9F9]/50 uppercase mt-1 break-words whitespace-normal">Koleksi Log: {selectedDay}_{activeTab}</p>
            </div>
            
            <div className="text-[11px] sm:text-xs space-y-3 text-[#E1D9F9]/80">
              {activeTab === "dday_awal" && (
                <>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#E1D9F9]/5 border border-[#E1D9F9]/5 gap-2"><span className="truncate">Hadir Normal:</span><span className="text-[#F6C545] font-bold font-mono shrink-0">{filteredDDayAwalMetrics.hadir}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#E1D9F9]/5 border border-[#E1D9F9]/5 gap-2"><span className="truncate">Terlambat/Menyusul:</span><span className="text-[#F6C545] font-bold font-mono shrink-0">{filteredDDayAwalMetrics.menyusul}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#E1D9F9]/5 border border-[#E1D9F9]/5 gap-2"><span className="truncate">Izin Keluar:</span><span className="text-[#F6C545] font-bold font-mono shrink-0">{filteredDDayAwalMetrics.meninggalkan}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#E1D9F9]/5 border border-[#E1D9F9]/5 gap-2"><span className="truncate">Absen/Sakit:</span><span className="text-[#F6C545] font-bold font-mono shrink-0">{filteredDDayAwalMetrics.tidakHadir}</span></div>
                </>
              )}
              {activeTab === "dday_akhir" && (
                <>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#E1D9F9]/5 border border-[#E1D9F9]/5 gap-2"><span className="truncate">Checkout Sukses:</span><span className="text-[#F6C545] font-bold font-mono shrink-0">{filteredDDayAkhirMetrics.hadir}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#E1D9F9]/5 border border-[#E1D9F9]/5 gap-2"><span className="truncate">Keluar Lapangan:</span><span className="text-[#F6C545] font-bold font-mono shrink-0">{filteredDDayAkhirMetrics.tidakHadir}</span></div>
                </>
              )}
              {activeTab === "h1" && (
                <>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#E1D9F9]/5 border border-[#E1D9F9]/5 gap-2"><span className="truncate">Hadir Tepat Waktu:</span><span className="text-[#F6C545] font-bold font-mono shrink-0">{filteredH1Metrics.tepatWaktu}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#E1D9F9]/5 border border-[#E1D9F9]/5 gap-2"><span className="truncate">Hadir Menyusul:</span><span className="text-[#F6C545] font-bold font-mono shrink-0">{filteredH1Metrics.menyusul}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#E1D9F9]/5 border border-[#E1D9F9]/5 gap-2"><span className="truncate">Izin Meninggalkan:</span><span className="text-[#F6C545] font-bold font-mono shrink-0">{filteredH1Metrics.izin}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[#E1D9F9]/5 border border-[#E1D9F9]/5 gap-2"><span className="truncate">Tidak Hadir:</span><span className="text-[#F6C545] font-bold font-mono shrink-0">{filteredH1Metrics.tidakHadir}</span></div>
                </>
              )}
              
              <div className="pt-3 text-[9px] sm:text-[10px] text-[#E1D9F9]/50 border-t border-[#E1D9F9]/[0.08] flex justify-between items-center gap-2">
                <span className="truncate">Jumlah Angkatan:</span>
                <span className="font-mono font-bold text-[#E1D9F9] bg-[#452ABC]/30 px-2 py-0.5 rounded border border-[#452ABC]/50 shrink-0">{expectedParticipants} Org</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}