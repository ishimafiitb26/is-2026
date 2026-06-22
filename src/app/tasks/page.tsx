"use client";

import React, { FormEvent, useMemo, useState, useEffect } from "react";
import { doc, setDoc, onSnapshot, orderBy, query, collection } from "firebase/firestore";
import { getCurrentTimestamp, tasksCollectionRef, type Task } from "../../lib/engagement";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { useI18n } from "../../components/I18nProvider";
import { useAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import PDFViewer from "../../components/PDFViewer";

// Mendefinisikan tipe data perluasan properti tugas secara ketat agar lolos sensor strict linter
interface ExtendedTask extends Task {
  isoDeadline?: string;
}

interface TaskSubmissionRow {
  taskId?: string;
  taskTitle?: string;
  nim?: string;
  note?: string;
  fileUrl?: string;
  fileName?: string;
  submissionType?: "image" | "document" | "link";
  createdAt?: { toDate: () => Date } | unknown;
}

function toCsv(rows: TaskSubmissionRow[]) {
  const headers = ["taskId", "taskTitle", "note", "fileUrl", "fileName", "createdAt"];
  const lines = rows.map((row) => {
    let dateStr = "";
    if (row.createdAt && typeof row.createdAt === "object" && "toDate" in row.createdAt) {
      const timestampObject = row.createdAt as { toDate: () => Date };
      dateStr = timestampObject.toDate().toISOString();
    }
    return [
      row.taskId || "",
      row.taskTitle || "",
      row.note || "",
      row.fileUrl ?? "",
      row.fileName ?? "",
      dateStr,
    ];
  });

  return [headers, ...lines]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export default function TasksPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  
  // SOLUSI SAKRAL: Mengunci opsi tipe data pilihan menggunakan enum literal string (ZERO ANY)
  const [submissionType, setSubmissionType] = useState<"image" | "document" | "link">("image");
  const [submissionLink, setSubmissionLink] = useState<string>("");
  
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [submissions, setSubmissions] = useState<TaskSubmissionRow[]>([]);

  const studentNIM = user?.email ? user.email.split("@")[0] : "";

  // Subscribe real-time list tugas dari panitia
  useEffect(() => {
    if (!user) return;

    const tasksQuery = query(tasksCollectionRef, orderBy("createdAt", "desc"));
    return onSnapshot(tasksQuery, (snapshot) => {
      const fetchedTasks = snapshot.docs.map((d) => d.data() as ExtendedTask);
      setTasks(fetchedTasks);
      if (fetchedTasks.length > 0 && !selectedTask) {
        setSelectedTask(fetchedTasks[0].taskId);
      }
    }, (err: { message: string }) => console.debug(err.message));
  }, [selectedTask, user]);

  // Subscribe real-time status jawaban berdasarkan ID tugas yang sedang aktif diklik
  useEffect(() => {
    if (!user || !selectedTask) return;
    return onSnapshot(collection(db, `submissions_${selectedTask}`), (snapshot) => {
      setSubmissions(snapshot.docs.map((entry) => entry.data() as TaskSubmissionRow));
    }, (err: { message: string }) => console.debug(err.message));
  }, [user, selectedTask]);

  const activeTask = useMemo<ExtendedTask | null>(() => {
    if (tasks.length === 0) return null;
    return tasks.find((task) => task.taskId === selectedTask) ?? tasks[0];
  }, [selectedTask, tasks]);

  // SOLUSI DEADLINE FIXED: Konversi penutupan gerbang akurat mencocokkan ISO string dengan penanggalan device
  const isTaskGateClosed = useMemo<boolean>(() => {
    if (!activeTask || !activeTask.isoDeadline) return false;
    const coreDeadline = new Date(activeTask.isoDeadline);
    if (isNaN(coreDeadline.getTime())) return false;
    return new Date() > coreDeadline;
  }, [activeTask]);

  // Menentukan secara dinamis apakah NIM milik maba ini sudah mengirimkan tugas di koleksi ini sebelumnya
  const hasSubmitted = useMemo<boolean>(() => {
    return submissions.some((sub) => sub.nim === studentNIM);
  }, [submissions, studentNIM]);

  const exportCsv = () => {
    const csv = toCsv(submissions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `submissions_${selectedTask || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isTaskGateClosed) return;
    if (!activeTask || !studentNIM) return;

    // VALIDASI ASINKRONUS: Menolak kiriman jika ada form media pengumpulan yang dikosongkan maba
    if ((submissionType === "image" || submissionType === "document") && !evidenceFile) {
      setSaveMessage("Gagal: Anda wajib melampirkan berkas dokumen tugas terlebih dahulu!");
      return;
    }
    if (submissionType === "link" && !submissionLink.trim()) {
      setSaveMessage("Gagal: Kolom kolom isian link tautan tugas tidak boleh kosong!");
      return;
    }

    setSaveMessage("Mengunci berkas pengumpulan ke database cloud...");

    try {
      let finalizedUrl = "";
      let finalFileName = "";

      if (submissionType === "link") {
        finalizedUrl = submissionLink.trim();
        finalFileName = "Tautan URL Luar (Link)";
      } else if (evidenceFile) {
        const upload = await uploadToCloudinary(evidenceFile);
        finalizedUrl = upload.secure_url;
        finalFileName = evidenceFile.name;
      }

      await setDoc(doc(db, `submissions_${activeTask.taskId}`, studentNIM), {
        taskId: activeTask.taskId,
        taskTitle: activeTask.title,
        nim: studentNIM,
        note: note.trim() || "-",
        fileUrl: finalizedUrl,
        fileName: finalFileName,
        submissionType,
        createdAt: getCurrentTimestamp(),
      });

      setSaveMessage("Tugas berhasil dikunci! Data lama otomatis diperbarui ke revisi terbaru.");
      setEvidenceFile(null);
      setSubmissionLink("");
      setNote("");
    } catch (error: unknown) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save submission.");
    }
  };

  return (
    <section className="space-y-4">
      <header className="panel p-6 sm:p-8">
        <p className="status-pill">{t("Tasks Center")}</p>
        <h1 className="mt-3 font-heading text-5xl tracking-wider text-[#f7f0e8]">{t("Task Info & Submission")}</h1>
        <p className="mt-3 max-w-2xl text-[#e2ded2]">{t("Check active assignments, read the brief, and submit your work in one place.")}</p>
      </header>

      {/* RENDER BOX LOCK BANNER WARNA MERAH JIKA DEADLINE TELAH LEWAT */}
      {isTaskGateClosed && (
        <div className="panel p-4 border border-[#CE4A2D]/40 bg-[#CE4A2D]/10 text-center rounded-xl animate-revealUp">
          <p className="text-sm font-bold text-[#CE4A2D] uppercase tracking-wider">🔒 MISSION CLOSED - Batas Pengumpulan Habis</p>
          <p className="text-xs text-[#aaa391] mt-1">Gerbang pengumpulan berkas otomatis dikunci sistem karena melewati batas waktu panitiapusat.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-5">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Current Tasks")}</h2>
          <div className="mt-4 space-y-3">
            {tasks.map((task) => (
              <button
                key={task.taskId}
                type="button"
                onClick={() => setSelectedTask(task.taskId)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedTask === task.taskId
                    ? "border-[#d8a75b] bg-[#d8a75b]/15"
                    : "border-white/15 bg-white/5 hover:border-white/30"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.08em] text-[#c7c3b8]">{task.taskId}</p>
                <h3 className="mt-1 text-xl text-[#f7f0e8]">{task.title}</h3>
                <p className="mt-1 text-sm text-[#d8a75b]">{t("Deadline: ")}{task.deadline}</p>
              </button>
            ))}
          </div>
        </article>

        {/* PEMANDU DESAIN PANEL BRIEF DENGAN PDFVIEWER ASLI BAWAAN KAMU */}
        <article className="panel p-5">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Task Brief")}</h2>
          {activeTask ? (
            <>
              <p className="mt-3 text-[#ddd8cb] whitespace-pre-wrap">{activeTask.detail}</p>

              {(activeTask.handbookUrl || activeTask.taskFileUrl) && (
                <div className="mt-4 space-y-3 border-t border-white/15 pt-4">
                  <p className="text-sm font-medium text-[#d8a75b]">{t("Task Resources")}</p>
                  {activeTask.handbookUrl && (
                    <PDFViewer
                      fileUrl={activeTask.handbookUrl}
                      fileName={t("Handbook")}
                      title="📘 Handbook"
                    />
                  )}
                  {activeTask.taskFileUrl && (
                    <PDFViewer
                      fileUrl={activeTask.taskFileUrl}
                      fileName={activeTask.fileName || t("Task File")}
                      title="📄 Task File"
                    />
                  )}
                </div>
              )}

              <div className="mt-4 rounded-xl border border-white/15 bg-black/15 p-4 text-sm text-[#ddd8cb]">
                <p className="text-[#d8a75b]">{t("Submission rules")}</p>
                <ul className="mt-2 space-y-1">
                  <li>• {t("Use the correct task ID in your note.")}</li>
                  <li>• Identitas pengumpulan terkunci aman terikat NIM Anda.</li>
                  <li>• Kirim ulang berkas otomatis menimpa jawaban lama (revisi terupdate).</li>
                </ul>
              </div>
            </>
          ) : (
            <p className="mt-3 text-[#aaa391]">{t("No tasks available. Check back later!")}</p>
          )}
        </article>
      </div>

      {/* KOMPONEN INPUT FORM PENGERJAAN MABA */}
      <article className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Submit Your Work")}</h2>
          <button type="button" onClick={exportCsv} className="nav-chip px-4 py-2">{t("Export CSV")}</button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm text-[#d8d3c6]">NIM Anda (Identitas Terkunci)</span>
            <input type="text" value={studentNIM} disabled className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[#f7f0e8] font-mono font-bold opacity-50 outline-none" />
          </label>

          {/* PERBAIKAN TOTAL: Menyingkirkan "as any" dan memetakan langsung tipe data ke state setter */}
          <label className="block space-y-1">
            <span className="text-sm text-[#d8d3c6]">Pilih Format Media Pengumpulan</span>
            <select
              value={submissionType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { 
                const chosenFormat = e.target.value;
                if (chosenFormat === "image" || chosenFormat === "document" || chosenFormat === "link") {
                  setSubmissionType(chosenFormat);
                }
                setEvidenceFile(null); 
                setSubmissionLink(""); 
              }}
              disabled={isTaskGateClosed}
              className="notranslate w-full rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-[#f7f0e8] outline-none cursor-pointer"
            >
              <option value="image">Gambar / File Foto (PNG, JPG, JPEG)</option>
              <option value="document">Dokumen File Mandiri (PDF, DOCX, DOC)</option>
              <option value="link">Tautan Luar / Link URL (Google Drive, GitHub, Notion)</option>
            </select>
          </label>

          {/* RENDER COMPONENT SECARA KONDISIONAL BERDASARKAN TIPE MEDIA */}
          {submissionType === "link" ? (
            <label className="block space-y-1 animate-revealUp">
              <span className="text-sm text-[#D5C757]">Masukkan Link URL Pengerjaan Tugas (Wajib Diisi)</span>
              <input
                type="url"
                value={submissionLink}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubmissionLink(e.target.value)}
                disabled={isTaskGateClosed}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-white outline-none focus:border-[#d8a75b]"
              />
            </label>
          ) : (
            <label className="block space-y-1 animate-revealUp">
              <span className="text-sm text-[#d8a75b]">Unggah Lampiran Berkas File Tugas (Wajib Diisi)</span>
              <input
                type="file"
                accept={submissionType === "image" ? "image/*" : ".pdf,.doc,.docx"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEvidenceFile(e.target.files?.[0] ?? null)}
                disabled={isTaskGateClosed}
                className="w-full rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-[#d8d3c6] cursor-pointer file:rounded file:border-0 file:bg-[#084D58] file:text-white file:px-2 file:py-0.5 file:text-xs"
              />
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-sm text-[#d8a75b]">{t("Short Note")}</span>
            <textarea
              value={note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              disabled={isTaskGateClosed}
              rows={3}
              placeholder={t("Add a short message for the committee...")}
              className="w-full rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-[#f7f0e8] outline-none"
            />
          </label>

          {/* TOMBOL BERGANTI SECARA ADAPTIF DAN OTOMATIS BERDASARKAN HASIL SCAN REAL-TIME DATABASE */}
          <button type="submit" disabled={isTaskGateClosed} className="cta-btn px-4 py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {hasSubmitted ? "Kirim Ulang Jawaban (Revisi)" : "Kirim Jawaban Utama"}
          </button>
        </form>

        {saveMessage ? (
          <p className="mt-3 rounded-lg border border-[#d8a75b]/40 bg-[#d8a75b]/12 px-3 py-2 text-sm text-[#f7f0e8]">{saveMessage}</p>
        ) : null}
      </article>
    </section>
  );
}