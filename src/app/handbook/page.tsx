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

function NativePdfViewer({ fileUrl, title }: { fileUrl: string; title: string }) {
  return (
    <div className="w-full mt-3 rounded-xl overflow-hidden border border-[#452ABC]/30 bg-black/40 p-1 shadow-2xl">
      <iframe
        src={`${fileUrl}#toolbar=0&navpanes=0`}
        className="w-full h-[550px] rounded-lg bg-[#0A0A0B]"
        title={title}
      />
      <div className="p-2 text-center bg-black/20 rounded-b-lg border-t border-[#E1D9F9]/5">
        <p className="text-[11px] text-[#E1D9F9]/50">
          Pratinjau diatur otomatis oleh sistem render browser bawaan device Anda.
        </p>
      </div>
    </div>
  );
}

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
  
  const [currentTime, setCurrentTime] = useState<number>(0);

  const [handbooks, setHandbooks] = useState<HandbookStructure[]>([]);
  const [tasks, setTasks] = useState<TaskStructure[]>([]);
  const [submittedTaskIds, setSubmittedTaskIds] = useState<string[]>([]);

  const [activeHbPdfId, setActiveHbPdfId] = useState<string | null>(null);
  const [activeTaskPdfId, setActiveTaskPdfId] = useState<string | null>(null);
  const [activeSubmitTaskId, setActiveSubmitTaskId] = useState<string | null>(null);

  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionLink, setSubmissionLink] = useState<string>("");
  const [submissionNote, setSubmissionNote] = useState<string>("");
  const [submissionType, setSubmissionType] = useState<"image" | "document" | "link">("image");
  const [isUploadingSub, setIsUploadingSub] = useState<boolean>(false);
  const [subMessage, setSubMessage] = useState<string>("");

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
      console.debug(err.message);
    };

    const unsubscribeHandbooks = onSnapshot(query(collection(db, "handbooks"), orderBy("createdAt", "desc")), (snapshot) => {
      setHandbooks(snapshot.docs.map((d) => ({
        id: d.id,
        title: d.data().title || "",
        fileName: d.data().fileName || "",
        fileUrl: d.data().fileUrl || ""
      })));
    }, safeErrorHandler);

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

  const handleToggleSubmitForm = (task: TaskStructure) => {
    if (activeSubmitTaskId === task.taskId) {
      setActiveSubmitTaskId(null);
    } else {
      setActiveSubmitTaskId(task.taskId);
      setSubmissionFile(null);
      setSubmissionLink("");
      setSubmissionNote("");
      setSubMessage("");
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

    const coreDeadline = targetTask.isoDeadline ? new Date(targetTask.isoDeadline).getTime() : 0;
    if (coreDeadline !== 0 && currentTime > coreDeadline) {
      setSubMessage("❌ Gagal: Batas waktu pengumpulan misi ini telah lewat!");
      return;
    }

    if ((submissionType === "image" || submissionType === "document") && !submissionFile) {
      setSubMessage("❌ Gagal: Wajib melampirkan berkas file!");
      return;
    }
    if (submissionType === "link" && !submissionLink.trim()) {
      setSubMessage("❌ Gagal: Wajib mengisi tautan link!");
      return;
    }

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

      const studentNIM = user?.email ? user.email.split("@")[0] : "";

      await addDoc(taskSubmissionsCollectionRef, {
        taskId: targetTask.taskId,
        taskTitle: targetTask.title,
        nim: studentNIM,
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
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0A0A0B]" />
        <div
          className="absolute -left-20 -top-16 h-80 w-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(69,42,188,0.16) 0%, rgba(246,197,69,0.08) 45%, transparent 72%)",
            filter: "blur(45px)",
          }}
        />
        <div
          className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(236,92,42,0.14) 0%, rgba(236,92,42,0.07) 45%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute right-[10%] top-[30%] h-52 w-52 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(246,197,69,0.08) 0%, transparent 65%)",
            filter: "blur(35px)",
          }}
        />
        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          {([
            [6,9,.4,.15],[14,28,.3,.18],[24,14,.5,.1],[35,48,.4,.14],[44,20,.3,.2],
            [58,62,.4,.12],[68,12,.5,.16],[77,40,.3,.13],[85,68,.4,.1],[93,22,.5,.18],
            [9,60,.4,.11],[20,78,.3,.14],[50,85,.4,.1],[72,80,.5,.13],
          ] as [number,number,number,number][]).map(([x,y,r,o],i) => (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="white" opacity={o} />
          ))}
          <circle cx="90%" cy="8%" r="2" fill="#F6C545" opacity=".7" />
          <circle cx="90%" cy="8%" r="6" fill="#F6C545" opacity=".07" />
          <g><circle cx="12%" cy="40%" r="1.6" fill="#452ABC" opacity=".3" /><circle cx="12%" cy="40%" r="5" fill="#452ABC" opacity=".05" /></g>
          <g><circle cx="80%" cy="55%" r="1.8" fill="#EC5C2A" opacity=".25" /><circle cx="80%" cy="55%" r="5" fill="#EC5C2A" opacity=".04" /></g>
        </svg>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(225,217,249,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(225,217,249,0.02) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(circle at 50% 20%, black 15%, transparent 70%)",
          }}
        />
      </div>

      <section className="relative space-y-6 p-2 sm:p-4">
        <header className="panel p-6">
          <h1 className="font-heading text-4xl text-[#E1D9F9] tracking-wider">{t("Explore Area Command")}</h1>
          <div className="mt-4 flex border-b border-[#E1D9F9]/[0.08] gap-2">
            <button 
              type="button"
              onClick={() => setCurrentTab("handbook")} 
              className={`px-4 py-2 text-sm font-bold border-b-2 transition ${currentTab === "handbook" ? "border-[#F6C545] text-[#F6C545]" : "border-transparent text-[#E1D9F9]/50"}`}
            >
              📘 Digital Handbooks
            </button>
            <button 
              type="button"
              onClick={() => setCurrentTab("tasks")} 
              className={`px-4 py-2 text-sm font-bold border-b-2 transition ${currentTab === "tasks" ? "border-[#F6C545] text-[#F6C545]" : "border-transparent text-[#E1D9F9]/50"}`}
            >
              📝 Missions & Tasks
            </button>
          </div>
        </header>

        {currentTab === "handbook" ? (
          <div className="grid gap-4 md:grid-cols-1">
            {handbooks.length > 0 ? (
              handbooks.map((hb) => (
                <article key={hb.id} className="panel p-5 space-y-4 border border-[#E1D9F9]/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-heading text-2xl text-[#E1D9F9]">{hb.title}</h3>
                      <p className="text-xs text-[#E1D9F9]/50">Dokumen Panduan: {hb.fileName}</p>
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

                  {activeHbPdfId === hb.id && hb.fileUrl && (
                    <NativePdfViewer fileUrl={hb.fileUrl} title={hb.title} />
                  )}
                </article>
              ))
            ) : (
              <p className="text-xs text-[#E1D9F9]/50 p-3 italic">Belum ada panduan manual resmi yang diterbitkan panitia.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-1">
            {tasks.length > 0 ? (
              tasks.map((task) => {
                const hasFinished = submittedTaskIds.includes(task.taskId);
                const coreDeadline = task.isoDeadline ? new Date(task.isoDeadline).getTime() : 0;
                const isTaskGateClosed = coreDeadline !== 0 && currentTime > coreDeadline;

                return (
                  <article 
                    key={task.id} 
                    className={`panel p-5 space-y-4 border transition duration-300 ${
                      hasFinished 
                        ? "border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-[#0A0A0B]/90 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                        : isTaskGateClosed
                        ? "border-[#EC5C2A]/40 bg-gradient-to-b from-[#EC5C2A]/10 to-[#0A0A0B]/90 grayscale-[0.2]"
                        : "border-[#E1D9F9]/5"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-[#F6C545] uppercase tracking-wider">{task.taskId}</span>
                      <div className="flex gap-2">
                        {isTaskGateClosed && <span className="status-pill border-[#EC5C2A]/50 bg-[#EC5C2A]/20 text-[#EC5C2A] text-[10px] font-bold">🔒 CLOSED</span>}
                        {hasFinished && <span className="status-pill border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">✓ Submitted</span>}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-heading text-2xl text-[#E1D9F9]">{task.title}</h3>
                      <p 
                        className="text-xs text-[#E1D9F9]/80 mt-2 whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(task.detail) }}
                      />
                    </div>

                    {task.taskFileUrl && (
                      <div className="bg-[#0A0A0B]/60 border border-[#452ABC]/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="truncate">
                          <p className="text-[#F6C545] font-semibold">Attached Brief File:</p>
                          <p className="text-[#E1D9F9]/80 truncate mt-0.5">{task.fileName || "Briefing Document"}</p>
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
                            className="px-3 py-1.5 bg-[#452ABC]/40 hover:bg-[#452ABC]/65 border border-[#E1D9F9]/10 text-[#E1D9F9] rounded-lg text-[11px] text-center font-medium transition"
                          >
                            📥 Download Brief
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {activeTaskPdfId === task.taskId && task.taskFileUrl && (
                      <NativePdfViewer fileUrl={task.taskFileUrl} title={task.title} />
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-[#E1D9F9]/5 gap-3">
                      <p className={`text-xs font-bold ${isTaskGateClosed ? 'text-[#EC5C2A]' : 'text-[#F6C545]'}`}>
                        Target Deadline: {task.deadline}
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => handleToggleSubmitForm(task)}
                        disabled={isTaskGateClosed}
                        className={`text-xs px-5 py-2 font-bold rounded-xl transition ${
                          isTaskGateClosed
                            ? "bg-black/40 text-[#E1D9F9]/30 cursor-not-allowed"
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

                    {activeSubmitTaskId === task.taskId && !isTaskGateClosed && (
                      <div className="bg-black/30 border border-[#E1D9F9]/10 rounded-xl p-4 mt-4 animate-revealUp">
                        <h4 className="text-sm font-bold text-[#E1D9F9] mb-3">Upload Lembar Jawaban: {task.taskId}</h4>
                        <form onSubmit={(e) => handleTaskSubmitAction(e, task)} className="space-y-3">
                          
                          <div>
                            <label className="block text-[11px] text-[#F6C545] mb-1">Pilih Format Media Pengumpulan</label>
                            <select
                              value={submissionType || "image"}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { 
                                setSubmissionType(e.target.value as "image" | "document" | "link");
                                setSubmissionFile(null); 
                                setSubmissionLink(""); 
                              }}
                              disabled={task.expectedFormat !== undefined && task.expectedFormat !== "all"}
                              className="w-full bg-[#0A0A0B]/80 border border-[#E1D9F9]/10 rounded-xl px-3 py-2 text-xs text-[#E1D9F9] outline-none cursor-pointer disabled:opacity-60"
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

                          {submissionType === "link" ? (
                            <div>
                              <label className="block text-[11px] text-[#F6C545] mb-1">Masukkan Link URL Pengerjaan Tugas (Wajib)</label>
                              <input
                                type="url"
                                value={submissionLink || ""}
                                onChange={(e) => setSubmissionLink(e.target.value)}
                                placeholder="https://drive.google.com/drive/folders/..."
                                className="w-full bg-[#0A0A0B]/50 border border-[#E1D9F9]/10 rounded-xl px-3 py-2 text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545]"
                                required
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[11px] text-[#F6C545] mb-1">Pilih File Berkas Jawaban (Maks 5MB)</label>
                              <input 
                                type="file" 
                                accept={submissionType === "image" ? "image/*" : ".pdf,.doc,.docx"}
                                onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                                className="w-full text-xs text-[#E1D9F9]/50 bg-[#0A0A0B]/50 rounded-xl p-2 border border-[#E1D9F9]/5 file:rounded file:border-0 file:bg-[#452ABC] file:text-[#E1D9F9] file:px-2 file:py-0.5 file:text-xs file:cursor-pointer"
                                required
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] text-[#F6C545] mb-1">Catatan Tambahan Opsional untuk Panitia</label>
                            <textarea
                              value={submissionNote || ""}
                              onChange={(e) => setSubmissionNote(e.target.value)}
                              placeholder="Tulis nama, kelompok, atau pesan tambahan di sini..."
                              className="w-full bg-[#0A0A0B]/50 border border-[#E1D9F9]/10 rounded-xl px-3 py-2 text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545]"
                              rows={2}
                            />
                          </div>

                          <button 
                            type="submit" 
                            disabled={isUploadingSub}
                            className="w-full py-2.5 bg-[#F6C545] text-[#0A0A0B] hover:bg-[#EC5C2A] font-bold text-xs rounded-xl uppercase transition disabled:opacity-40"
                          >
                            {isUploadingSub ? "Transmitting Artifact Packet... ⏳" : "Lock and Submit Mission"}
                          </button>
                        </form>
                        
                        {subMessage && (
                          <div className={`mt-3 p-3 rounded-lg text-center font-bold text-[11px] sm:text-xs tracking-wider animate-revealDown ${subMessage.startsWith("✅") ? 'text-emerald-400 bg-emerald-900/40 border border-emerald-500' : 'text-[#EC5C2A] bg-[#EC5C2A]/20 border border-[#EC5C2A]'}`}>
                            {subMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="text-xs text-[#E1D9F9]/50 p-3 italic">Belum ada daftar tugas resmi panitia.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
