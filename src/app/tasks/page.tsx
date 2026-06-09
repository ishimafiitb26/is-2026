"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { addDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { getCurrentTimestamp, taskSubmissionsCollectionRef, tasksCollectionRef, type TaskSubmission, type Task } from "../../lib/engagement";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { useI18n } from "../../components/I18nProvider";
import { useAuth } from "../../components/AuthProvider";
import PDFViewer from "../../components/PDFViewer";

function toCsv(rows: TaskSubmission[]) {
  const headers = ["taskId", "taskTitle", "note", "fileUrl", "fileName", "createdAt"];
  const lines = rows.map((row) => [
    row.taskId,
    row.taskTitle,
    row.note,
    row.fileUrl ?? "",
    row.fileName ?? "",
    row.createdAt?.toDate?.().toISOString?.() ?? "",
  ]);

  return [headers, ...lines]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export default function TasksPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [note, setNote] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);

  // Subscribe to tasks collection
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

    const tasksQuery = query(tasksCollectionRef, orderBy("createdAt", "desc"));
    return onSnapshot(tasksQuery, (snapshot) => {
      const fetchedTasks = snapshot.docs.map((doc) => doc.data() as Task);
      setTasks(fetchedTasks);
      if (fetchedTasks.length > 0 && !selectedTask) {
        setSelectedTask(fetchedTasks[0].taskId);
      }
    }, onError);
  }, [selectedTask, user]);

  // Subscribe to submissions collection
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

    const submissionQuery = query(taskSubmissionsCollectionRef, orderBy("createdAt", "desc"));
    return onSnapshot(submissionQuery, (snapshot) => {
      setSubmissions(snapshot.docs.map((entry) => entry.data() as TaskSubmission));
    }, onError);
  }, [user]);

  const activeTask = useMemo(() => {
    if (tasks.length === 0) return null;
    return tasks.find((task) => task.taskId === selectedTask) ?? tasks[0];
  }, [selectedTask, tasks]);

  const exportCsv = () => {
    const csv = toCsv(submissions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "task-submissions.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTask) {
      setSaveMessage("No task selected");
      return;
    }
    setSaveMessage("Saving submission...");

    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;

      if (evidenceFile) {
        const upload = await uploadToCloudinary(evidenceFile);
        fileUrl = upload.secure_url;
        fileName = evidenceFile.name;
      }

      await addDoc(taskSubmissionsCollectionRef, {
        taskId: activeTask.taskId,
        taskTitle: activeTask.title,
        note: note.trim() || "-",
        fileUrl,
        fileName,
        createdAt: getCurrentTimestamp(),
      });

      setSaveMessage("Submission saved to Firebase.");
      setEvidenceFile(null);
      setNote("");
    } catch (error) {
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

        <article className="panel p-5">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Task Brief")}</h2>
          {activeTask ? (
            <>
              <p className="mt-3 text-[#ddd8cb]">{activeTask.detail}</p>

              {/* Files Section */}
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
                  <li>• {t("Keep file names short and readable.")}</li>
                  <li>• {t("If late, notify the committee through the attendance page.")}</li>
                </ul>
              </div>
            </>
          ) : (
            <p className="mt-3 text-[#aaa391]">{t("No tasks available. Check back later!")}</p>
          )}
        </article>
      </div>

      <article className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Submit Your Work")}</h2>
          <button type="button" onClick={exportCsv} className="nav-chip px-4 py-2">{t("Export CSV")}</button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm text-[#d8d3c6]">{t("Select Task")}</span>
            <select
              value={selectedTask}
              onChange={(event) => setSelectedTask(event.target.value)}
              className="w-full rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-[#f7f0e8] outline-none focus:border-[#d8a75b]"
            >
              {tasks.map((task) => (
                <option key={task.taskId} value={task.taskId} className="bg-[#2d1b16] text-[#f7f0e8]">
                  {task.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-[#d8d3c6]">{t("Short Note")}</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder={t("Add a short message for the committee...")}
              className="w-full rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-[#f7f0e8] outline-none placeholder:text-[#aaa391] focus:border-[#d8a75b]"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-[#d8d3c6]">{t("Upload File")}</span>
            <input
              type="file"
              onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-[#d8d3c6] file:mr-4 file:rounded-full file:border-0 file:bg-[#d8a75b] file:px-4 file:py-2 file:font-semibold file:text-[#1b1f1d]"
            />
            <p className="text-xs text-[#c7c3b8]">Selected file: {evidenceFile?.name ?? t("No file chosen yet")}</p>
          </label>

          <button type="submit" className="cta-btn px-4 py-2">{t("Submit Task")}</button>
        </form>

        {saveMessage ? (
          <p className="mt-3 rounded-lg border border-[#d8a75b]/40 bg-[#d8a75b]/12 px-3 py-2 text-sm text-[#f7f0e8]">{saveMessage}</p>
        ) : null}
      </article>
    </section>
  );
}
