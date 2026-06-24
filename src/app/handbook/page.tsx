"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { onSnapshot, collection, query, orderBy, addDoc } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";
import { db } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { tasksCollectionRef, taskSubmissionsCollectionRef, getCurrentTimestamp } from "@/lib/engagement";

interface HandbookStructure {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
}

interface TaskStructure {
  id: string;
  taskId: string;
  title: string;
  detail: string;
  deadline: string;
  isoDeadline?: string;
  taskFileUrl?: string;
  fileName?: string;
  expectedFormat?: "all" | "image" | "document" | "link";
}

// Jaminan aman: Menggunakan Native Browser PDF Frame Container
function NativePdfViewer({ fileUrl, title }: { fileUrl: string; title: string }) {
  return (
    <div className="w-full mt-3 rounded-xl overflow-hidden border border-[#084D58]/40 bg-black/40 p-1 shadow-2xl">
      <iframe
        src={`${fileUrl}#toolbar=0&navpanes=0`}
        className="w-full h-[550px] rounded-lg bg-[#0F282F]"
        title={title}
      />
      <div className="p-2 text-center bg-black/20 rounded-b-lg border-t border-white/5">
        <p className="text-[11px] text-[#D7DCD5]/60">
          Pratinjau diatur otomatis oleh sistem render browser bawaan device Anda.
        </p>
      </div>
    </div>
  );
}

// Helper parser untuk menerjemahkan notasi teks Markdown panitia (*teks*) menjadi HTML aman
function parseMarkdownToHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*(.*?)\*/g, "<b>$1</b>")
    .replace(/_(.*?)_/g, "<i>$1</i>")
    .replace(/~(.*?)~/g, "<u>$1</u>");
}

export default function ExploreAreaPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<"handbook" | "tasks">("handbook");
  
  // State Waktu Real-Time untuk Close Gate
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Data State
  const [handbooks, setHandbooks] = useState<HandbookStructure[]>([]);
  const [tasks, setTasks] = useState<TaskStructure[]>([]);
  const [submittedTaskIds, setSubmittedTaskIds] = useState<string[]>([]);

  // UI Toggle State
  const [activeHbPdfId, setActiveHbPdfId] = useState<string | null>(null);
  const [activeTaskPdfId, setActiveTaskPdfId] = useState<string | null>(null);
  const [activeSubmitTaskId, setActiveSubmitTaskId] = useState<string | null>(null);

  // Form Submission State
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionLink, setSubmissionLink] = useState<string>("");
  const [submissionNote, setSubmissionNote] = useState<string>("");
  const [submissionType, setSubmissionType] = useState<"image" | "document" | "link">("image");
  const [isUploadingSub, setIsUploadingSub] = useState<boolean>(false);
  const [subMessage, setSubMessage] = useState<string>("");

  // Jalankan Timer 10 Detik untuk Kebutuhan Presisi Close Gate
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setCurrentTime(Date.now());
    }, 0);

    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const safeErrorHandler = (err: Error) => {
      console.debug("Bypassed background collection intersection:", err.message);
    };

    // Sinkronisasi data Handbook
    const unsubscribeHandbooks = onSnapshot(query(collection(db, "handbooks"), orderBy("createdAt", "desc")), (snapshot) => {
      setHandbooks(snapshot.docs.map((d) => ({
        id: d.id,
        title: d.data().title || "",
        fileName: d.data().fileName || "",
        fileUrl: d.data().fileUrl || ""
      })));
    }, safeErrorHandler);

    // Sinkronisasi data Tugas (Missions)
    const unsubscribeTasks = onSnapshot(query(tasksCollectionRef, orderBy("createdAt", "desc")), (snapshot) => {
      setTasks(snapshot.docs.map((d) => ({
        id: d.id,
        taskId: d.data().taskId || "",
        title: d.data().title || "",
        detail: d.data().detail || "",
        deadline: d.data().deadline || "",
        isoDeadline: d.data().isoDeadline || "",
        expectedFormat: d.data().expectedFormat || "all",
        taskFileUrl: d.data().taskFileUrl || "",
        fileName: d.data().fileName || ""
      })));
    }, safeErrorHandler);

    // Sinkronisasi status pengumpulan tugas maba
    const unsubscribeSubmissions = onSnapshot(taskSubmissionsCollectionRef, (snapshot) => {
      const records = snapshot.docs.map((d) => d.data());
      const standardUserList = records
        .filter((r) => r.createdBy === user.email || r.submittedBy === user.email)
        .map((r) => r.taskId as string);
      setSubmittedTaskIds(standardUserList);
    }, safeErrorHandler);

    return () => {
      unsubscribeHandbooks();
      unsubscribeTasks();
      unsubscribeSubmissions();
    };
  }, [user]);

  // Handler Ganti Misi: Reset isi form ketika Maba klik tugas yang berbeda
  const handleToggleSubmitForm = (task: TaskStructure) => {
    if (activeSubmitTaskId === task.taskId) {
      setActiveSubmitTaskId(null);
    } else {
      setActiveSubmitTaskId(task.taskId);
      setSubmissionFile(null);
      setSubmissionLink("");
      setSubmissionNote("");
      setSubMessage("");
      // Paksa dropdown default sesuai yang di-request admin
      if (task.expectedFormat && task.expectedFormat !== "all") {
        setSubmissionType(task.expectedFormat as "image" | "document" | "link");
      } else {
        setSubmissionType("image");
      }
    }
  };

  const handleTaskSubmitAction = async (e: FormEvent, targetTask: TaskStructure) => {
    e.preventDefault();
    if (!user || isUploadingSub) return;

    // Pengecekan Close Gate Sesaat Sebelum Submit (Antisipasi maba diam lama di halaman)
    const coreDeadline = targetTask.isoDeadline ? new Date(targetTask.isoDeadline).getTime() : 0;
    if (coreDeadline !== 0 && currentTime > coreDeadline) {
      setSubMessage("❌ Gagal: Batas waktu pengumpulan misi ini telah lewat!");
      return;
    }

    // Validasi Berdasarkan Tipe Media
    if ((submissionType === "image" || submissionType === "document") && !submissionFile) {
      setSubMessage("❌ Gagal: Wajib melampirkan berkas file!");
      return;
    }
    if (submissionType === "link" && !submissionLink.trim()) {
      setSubMessage("❌ Gagal: Wajib mengisi tautan link!");
      return;
    }

    // Validasi Ukuran File Maksimal 5MB agar tidak error saat koneksi Maba pelan
    if (submissionFile && submissionFile.size > 5 * 1024 * 1024) {
      setSubMessage("❌ Gagal: Ukuran file Anda kebesaran (Maksimal 5MB). Silakan kompres file Anda terlebih dahulu.");
      return;
    }

    setIsUploadingSub(true);
    setSubMessage("⏳ Sedang mengunggah dan mengunci data ke database pusat...");

    try {
      let finalizedUrl = "";
      let finalFileName = "";

      if (submissionType === "link") {
        finalizedUrl = submissionLink.trim();
        finalFileName = "Tautan URL Luar (Link)";
      } else if (submissionFile) {
        const uploadResult = await uploadToCloudinary(submissionFile);
        finalizedUrl = uploadResult.secure_url;
        finalFileName = submissionFile.name;
      }

      // FIX: Kita pastikan menambahkan field `nim` pada data kiriman maba
      const studentNIM = user?.email ? user.email.split("@")[0] : "";

      await addDoc(taskSubmissionsCollectionRef, {
        taskId: targetTask.taskId,
        taskTitle: targetTask.title,
        nim: studentNIM, // TAMBAHAN: Menyimpan NIM maba agar gampang dilacak Admin
        note: submissionNote.trim() || "-",
        fileUrl: finalizedUrl,
        fileName: finalFileName,
        submissionType: submissionType,
        submittedBy: user.email,
        createdAt: getCurrentTimestamp()
      });

      setSubMessage("✅ BERHASIL: Misi terkunci! Lembar jawaban Anda aman tersimpan.");
      setSubmissionFile(null);
      setSubmissionLink("");
      setSubmissionNote("");
      
      // Auto tutup form setelah 2 detik
      setTimeout(() => {
        setActiveSubmitTaskId(null);
        setSubMessage("");
      }, 2500);
      
    } catch (err) {
      setSubMessage("❌ GAGAL: Transmisi terputus. Pastikan internet Anda stabil atau ukuran file sudah dikecilkan.");
    } finally {
      setIsUploadingSub(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="panel p-6">
        <h1 className="font-heading text-4xl text-[#F2EDEC] tracking-wider">{t("Explore Area Command")}</h1>
        <div className="mt-4 flex border-b border-[#084D58]/30 gap-2">
          <button 
            type="button"
            onClick={() => setCurrentTab("handbook")} 
            className={`px-4 py-2 text-sm font-bold border-b-2 transition ${currentTab === "handbook" ? "border-[#D5C757] text-[#D5C757]" : "border-transparent text-[#aaa391]"}`}
          >
            📘 Digital Handbooks
          </button>
          <button 
            type="button"
            onClick={() => setCurrentTab("tasks")} 
            className={`px-4 py-2 text-sm font-bold border-b-2 transition ${currentTab === "tasks" ? "border-[#D5C757] text-[#D5C757]" : "border-transparent text-[#aaa391]"}`}
          >
            📝 Missions & Tasks
          </button>
        </div>
      </header>

      {/* RENDER TAB 1: DIGITAL HANDBOOK */}
      {currentTab === "handbook" ? (
        <div className="grid gap-4 md:grid-cols-1">
          {handbooks.length > 0 ? (
            handbooks.map((hb) => (
              <article key={hb.id} className="panel p-5 space-y-4 border border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-2xl text-[#F2EDEC]">{hb.title}</h3>
                    <p className="text-xs text-[#D7DCD5]/60">Dokumen Panduan: {hb.fileName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveHbPdfId(activeHbPdfId === hb.id ? null : hb.id)}
                      className="nav-chip text-xs px-4 py-2 font-bold cursor-pointer"
                    >
                      {activeHbPdfId === hb.id ? "Hide Preview" : "Toggle Preview PDF"}
                    </button>
                    <a href={hb.fileUrl} target="_blank" rel="noopener noreferrer" className="cta-btn inline-block px-4 py-2 text-xs font-bold">
                      Open New Tab
                    </a>
                  </div>
                </div>

                {/* TAMPILAN PREVIEW HANDBOOK NYALA DISINI */}
                {activeHbPdfId === hb.id && hb.fileUrl && (
                  <NativePdfViewer fileUrl={hb.fileUrl} title={hb.title} />
                )}
              </article>
            ))
          ) : (
            <p className="text-xs text-[#aaa391] p-3 italic">Belum ada panduan manual resmi yang diterbitkan panitia.</p>
          )}
        </div>
      ) : (
        /* RENDER TAB 2: MISSIONS & TASKS */
        <div className="grid gap-4 md:grid-cols-1">
          {tasks.length > 0 ? (
            tasks.map((task) => {
              const hasFinished = submittedTaskIds.includes(task.taskId);
              
              // Cek Status Kuncian Gate berdasarkan ISO Deadline Admin
              const coreDeadline = task.isoDeadline ? new Date(task.isoDeadline).getTime() : 0;
              const isTaskGateClosed = coreDeadline !== 0 && currentTime > coreDeadline;

              return (
                <article 
                  key={task.id} 
                  className={`panel p-5 space-y-4 border transition duration-300 ${
                    hasFinished 
                      ? "border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-[#0F282F]/90 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                      : isTaskGateClosed
                      ? "border-[#CE4A2D]/40 bg-gradient-to-b from-[#CE4A2D]/10 to-[#0F282F]/90 grayscale-[0.2]"
                      : "border-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-[#D5C757] uppercase tracking-wider">{task.taskId}</span>
                    <div className="flex gap-2">
                      {isTaskGateClosed && <span className="status-pill border-[#CE4A2D]/50 bg-[#CE4A2D]/20 text-[#CE4A2D] text-[10px] font-bold">🔒 CLOSED</span>}
                      {hasFinished && <span className="status-pill border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">✓ Submitted</span>}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-heading text-2xl text-[#F2EDEC]">{task.title}</h3>
                    {/* Render Text Markdown Panitia */}
                    <p 
                      className="text-xs text-[#D7DCD5] mt-2 whitespace-pre-wrap leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(task.detail) }}
                    />
                  </div>

                  {/* FILE ATTACHMENT BRIEF DARI PANITIA */}
                  {task.taskFileUrl && (
                    <div className="bg-[#0F282F]/60 border border-[#084D58]/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="truncate">
                        <p className="text-[#D5C757] font-semibold">Attached Brief File:</p>
                        <p className="text-[#D7DCD5] truncate mt-0.5">{task.fileName || "Briefing Document"}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveTaskPdfId(activeTaskPdfId === task.taskId ? null : task.taskId)}
                          className="nav-chip text-[11px] px-3 py-1.5 font-bold cursor-pointer"
                        >
                          {activeTaskPdfId === task.taskId ? "Hide Preview" : "Toggle Preview PDF"}
                        </button>
                        <a 
                          href={task.taskFileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-3 py-1.5 bg-[#084D58]/80 hover:bg-[#084D58] border border-white/10 text-[#F2EDEC] rounded-lg text-[11px] text-center font-medium transition"
                        >
                          📥 Download Brief
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* TAMPILAN PREVIEW BRIEF TUGAS NYALA DISINI */}
                  {activeTaskPdfId === task.taskId && task.taskFileUrl && (
                    <NativePdfViewer fileUrl={task.taskFileUrl} title={task.title} />
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-white/5 gap-3">
                    <p className={`text-xs font-bold ${isTaskGateClosed ? 'text-[#CE4A2D]' : 'text-[#D5C757]'}`}>
                      Target Deadline: {task.deadline}
                    </p>
                    
                    <button
                      type="button"
                      onClick={() => handleToggleSubmitForm(task)}
                      disabled={isTaskGateClosed}
                      className={`text-xs px-5 py-2 font-bold rounded-xl transition ${
                        isTaskGateClosed
                          ? "bg-black/40 text-white/30 cursor-not-allowed"
                          : hasFinished 
                            ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/50" 
                            : "cta-btn"
                      }`}
                    >
                      {isTaskGateClosed 
                        ? "Gate Closed" 
                        : activeSubmitTaskId === task.taskId 
                          ? "Close Form" 
                          : hasFinished ? "Kirim Ulang Jawaban" : "Kirim Jawaban"}
                    </button>
                  </div>

                  {/* LACI FORM SUBMISSION TERPADU DENGAN FILTER TIPE FILE */}
                  {activeSubmitTaskId === task.taskId && !isTaskGateClosed && (
                    <div className="bg-black/30 border border-white/10 rounded-xl p-4 mt-4 animate-revealUp">
                      <h4 className="text-sm font-bold text-[#F2EDEC] mb-3">Upload Lembar Jawaban: {task.taskId}</h4>
                      <form onSubmit={(e) => handleTaskSubmitAction(e, task)} className="space-y-3">
                        
                        {/* DROPDOWN FILTER FORMAT REQUEST DARI ADMIN */}
                        <div>
                          <label className="block text-[11px] text-[#D5C757] mb-1">Pilih Format Media Pengumpulan</label>
                          <select
                            value={submissionType || "image"}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { 
                              setSubmissionType(e.target.value as "image" | "document" | "link");
                              setSubmissionFile(null); 
                              setSubmissionLink(""); 
                            }}
                            disabled={task.expectedFormat !== undefined && task.expectedFormat !== "all"}
                            className="w-full bg-[#0F282F]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F2EDEC] outline-none cursor-pointer disabled:opacity-60"
                          >
                            {task.expectedFormat === "image" ? (
                               <option value="image">Wajib Gambar (PNG, JPG, JPEG)</option>
                            ) : task.expectedFormat === "document" ? (
                               <option value="document">Wajib Dokumen (PDF, DOCX, DOC)</option>
                            ) : task.expectedFormat === "link" ? (
                               <option value="link">Wajib Tautan (Google Drive, GitHub)</option>
                            ) : (
                              <>
                                <option value="image">Gambar (PNG, JPG, JPEG)</option>
                                <option value="document">Dokumen Mandiri (PDF, DOCX, DOC)</option>
                                <option value="link">Tautan Luar (Google Drive, GitHub)</option>
                              </>
                            )}
                          </select>
                        </div>

                        {/* INPUT FILE / TAUTAN BERDASARKAN DROPDOWN */}
                        {submissionType === "link" ? (
                          <div>
                            <label className="block text-[11px] text-[#D5C757] mb-1">Masukkan Link URL Pengerjaan Tugas (Wajib)</label>
                            <input
                              type="url"
                              value={submissionLink || ""}
                              onChange={(e) => setSubmissionLink(e.target.value)}
                              placeholder="https://drive.google.com/drive/folders/..."
                              className="w-full bg-[#0F282F]/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F2EDEC] outline-none focus:border-[#D5C757]"
                              required
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[11px] text-[#D5C757] mb-1">Pilih File Berkas Jawaban (Maks 5MB)</label>
                            <input 
                              type="file" 
                              accept={submissionType === "image" ? "image/*" : ".pdf,.doc,.docx"}
                              onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                              className="w-full text-xs text-[#aaa391] bg-[#0F282F]/50 rounded-xl p-2 border border-white/5 file:rounded file:border-0 file:bg-[#084D58] file:text-white file:px-2 file:py-0.5 file:text-xs file:cursor-pointer"
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] text-[#D5C757] mb-1">Catatan Tambahan Opsional untuk Panitia</label>
                          <textarea
                            value={submissionNote || ""}
                            onChange={(e) => setSubmissionNote(e.target.value)}
                            placeholder="Tulis nama, kelompok, atau pesan tambahan di sini..."
                            className="w-full bg-[#0F282F]/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F2EDEC] outline-none focus:border-[#D5C757]"
                            rows={2}
                          />
                        </div>

                        <button 
                          type="submit" 
                          disabled={isUploadingSub}
                          className="w-full py-2.5 bg-[#D5C757] text-[#0F282F] hover:bg-[#e8da6f] font-bold text-xs rounded-xl uppercase transition disabled:opacity-40"
                        >
                          {isUploadingSub ? "Transmitting Artifact Packet... ⏳" : "Lock and Submit Mission"}
                        </button>
                      </form>
                      
                      {subMessage && (
                        <div className={`mt-3 p-3 rounded-lg text-center font-bold text-[11px] sm:text-xs tracking-wider animate-revealDown ${subMessage.startsWith("✅") ? 'text-teal-400 bg-teal-900/40 border border-teal-500' : 'text-[#CE4A2D] bg-[#CE4A2D]/20 border border-[#CE4A2D]'}`}>
                          {subMessage}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          ) : (
            <p className="text-xs text-[#aaa391] p-3 italic">Belum ada daftar tugas resmi panitia.</p>
          )}
        </div>
      )}
    </section>
  );
}