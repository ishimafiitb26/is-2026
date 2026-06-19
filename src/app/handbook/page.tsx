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
  taskFileUrl?: string;
  fileName?: string;
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

export default function ExploreAreaPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<"handbook" | "tasks">("handbook");
  
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
  const [submissionNote, setSubmissionNote] = useState<string>("");
  const [isUploadingSub, setIsUploadingSub] = useState<boolean>(false);
  const [subMessage, setSubMessage] = useState<string>("");

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

  const handleTaskSubmitAction = async (e: FormEvent, targetTask: TaskStructure) => {
    e.preventDefault();
    if (!user || !submissionFile) return;

    setIsUploadingSub(true);
    setSubMessage("Uploading answer artifact token to central base...");

    try {
      const uploadResult = await uploadToCloudinary(submissionFile);

      await addDoc(taskSubmissionsCollectionRef, {
        taskId: targetTask.taskId,
        taskTitle: targetTask.title,
        note: submissionNote.trim() || "-",
        fileUrl: uploadResult.secure_url,
        filePublicId: uploadResult.public_id,
        fileName: submissionFile.name,
        submittedBy: user.email,
        createdAt: getCurrentTimestamp()
      });

      setSubMessage("Misi terkunci! Lembar jawaban aman disimpan.");
      setSubmissionFile(null);
      setSubmissionNote("");
      setTimeout(() => {
        setActiveSubmitTaskId(null);
        setSubMessage("");
      }, 1500);
    } catch (err) {
      setSubMessage("Transmisi data gagal. Cek koneksi.");
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
              return (
                <article 
                  key={task.id} 
                  className={`panel p-5 space-y-4 border transition duration-300 ${
                    hasFinished 
                      ? "border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-[#0F282F]/90 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                      : "border-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-[#D5C757] uppercase tracking-wider">{task.taskId}</span>
                    {hasFinished && <span className="status-pill border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">✓ Submitted</span>}
                  </div>
                  <div>
                    <h3 className="font-heading text-2xl text-[#F2EDEC]">{task.title}</h3>
                    <p className="text-xs text-[#D7DCD5] mt-1 whitespace-pre-wrap">{task.detail}</p>
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
                    <p className="text-xs text-[#CE4A2D] font-bold">Target Deadline: {task.deadline}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubmitTaskId(activeSubmitTaskId === task.taskId ? null : task.taskId);
                        setSubMessage("");
                      }}
                      className={`text-xs px-5 py-2 font-bold rounded-xl transition ${
                        hasFinished 
                          ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/50" 
                          : "cta-btn"
                      }`}
                    >
                      {activeSubmitTaskId === task.taskId ? "Close Form" : hasFinished ? "Kirim Ulang Jawaban" : "Kirim Jawaban"}
                    </button>
                  </div>

                  {/* LACI FORM SUBMISSION */}
                  {activeSubmitTaskId === task.taskId && (
                    <div className="bg-black/30 border border-white/10 rounded-xl p-4 mt-4 animate-revealUp">
                      <h4 className="text-sm font-bold text-[#F2EDEC] mb-3">Upload Lembar Jawaban: {task.taskId}</h4>
                      <form onSubmit={(e) => handleTaskSubmitAction(e, task)} className="space-y-3">
                        <div>
                          <label className="block text-[11px] text-[#D5C757] mb-1">Pilih File Jawaban (PDF/Image/Archive)</label>
                          <input 
                            type="file" 
                            onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                            className="w-full text-xs text-[#aaa391] bg-[#0F282F]/50 rounded-xl p-2 border border-white/5"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#D5C757] mb-1">Catatan Tambahan Opsional untuk Panitia</label>
                          <textarea
                            value={submissionNote}
                            onChange={(e) => setSubmissionNote(e.target.value)}
                            placeholder="Tulis nama, kelompok, atau link cadangan di sini..."
                            className="w-full bg-[#0F282F]/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F2EDEC] outline-none"
                            rows={2}
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={isUploadingSub}
                          className="w-full py-2 bg-[#D5C757] text-[#0F282F] hover:bg-[#e8da6f] font-bold text-xs rounded-xl uppercase transition disabled:opacity-40"
                        >
                          {isUploadingSub ? "Transmitting Artifact Packet..." : "Lock and Submit Mission"}
                        </button>
                      </form>
                      {subMessage && <p className="text-xs font-mono text-[#D5C757] mt-3 text-center">{subMessage}</p>}
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