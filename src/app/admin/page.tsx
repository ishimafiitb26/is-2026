"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDoc, doc, onSnapshot, setDoc, addDoc, query, orderBy } from "firebase/firestore";
import { useI18n } from "../../components/I18nProvider";
import { useAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import { uploadDocumentToCloudinary } from "../../lib/cloudinary";
import {
  eventMetaRef,
  getCurrentTimestamp,
  reflectionPromptsCollectionRef,
  tasksCollectionRef,
  taskSubmissionsCollectionRef,
  assessmentsCollectionRef,
  announcementsCollectionRef,
  type EventMeta,
  type ReflectionPrompt,
  type Task,
  type TaskSubmission,
  type Assessment,
  type Announcement,
} from "../../lib/engagement";

const fallbackPrompts = [
  "What is one small win from today?",
  "What part of the process feels heavy right now?",
  "What kind of support would help your group this week?",
];

export default function AdminPage() {
  const { t } = useI18n();
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [targetInput, setTargetInput] = useState("12");
  const [prompts, setPrompts] = useState<Array<{ id: string; text: string; order: number }>>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [adminMessage, setAdminMessage] = useState("");

  // Task management state
  const [tasks, setTasks] = useState<Array<{ id: string } & Task>>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDetail, setNewTaskDetail] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [handbookFile, setHandbookFile] = useState<File | null>(null);
  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Announcements management state
  const [announcements, setAnnouncements] = useState<Array<{ id: string } & Announcement>>([]);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
  const [newAnnouncementContent, setNewAnnouncementContent] = useState("");
  const [newAnnouncementLinks, setNewAnnouncementLinks] = useState<Array<{ label: string; url: string }>>([]);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  // Assessment management state
  const [submissions, setSubmissions] = useState<Array<{ id: string } & TaskSubmission>>([]);
  const [assessments, setAssessments] = useState<Array<{ id: string } & Assessment>>([]);

  // Protect: only admin can access this page
  useEffect(() => {
    if (!loading && role !== "admin") {
      router.push("/");
    }
  }, [role, loading, router]);

  useEffect(() => {
    // Only subscribe to Firestore when user is admin (already protected at top of page)
    if (role !== "admin") return;

    const onError = (error: Error) => {
      // Silently handle permission errors - they'll be caught by Firestore rules
      if (error.message.includes("permission")) {
        console.debug("Firestore permission check:", error.message);
      } else {
        console.error("Firestore error:", error);
      }
    };

    const unsubscribeMeta = onSnapshot(eventMetaRef, (document) => {
      const meta = document.data() as EventMeta | undefined;
      if (typeof meta?.expectedParticipants === "number") {
        setTargetInput(String(meta.expectedParticipants));
      }
    }, onError);

    const unsubscribePrompts = onSnapshot(reflectionPromptsCollectionRef, (snapshot) => {
      const rows = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as ReflectionPrompt),
      }));
      setPrompts(rows.sort((left, right) => left.order - right.order));
    }, onError);

    const unsubscribeTasks = onSnapshot(query(tasksCollectionRef, orderBy("createdAt", "desc")), (snapshot) => {
      const rows = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as Task),
      }));
      setTasks(rows);
    }, onError);

    const unsubscribeAnnouncements = onSnapshot(query(announcementsCollectionRef, orderBy("createdAt", "desc")), (snapshot) => {
      const rows = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as Announcement),
      }));
      setAnnouncements(rows);
    }, onError);

    const unsubscribeSubmissions = onSnapshot(query(taskSubmissionsCollectionRef, orderBy("createdAt", "desc")), (snapshot) => {
      const rows = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as TaskSubmission),
      }));
      setSubmissions(rows);
    }, onError);

    const unsubscribeAssessments = onSnapshot(query(assessmentsCollectionRef, orderBy("gradedAt", "desc")), (snapshot) => {
      const rows = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as Assessment),
      }));
      setAssessments(rows);
    }, onError);

    return () => {
      unsubscribeMeta();
      unsubscribePrompts();
      unsubscribeTasks();
      unsubscribeAnnouncements();
      unsubscribeSubmissions();
      unsubscribeAssessments();
    };
  }, [role]);

  if (loading) {
    return <div className="text-center py-8 text-[#c8b0a0]">Loading...</div>;
  }

  if (role !== "admin") {
    return (
      <div className="bg-red-900/20 border border-red-600/50 rounded p-4 text-red-200">
        <p>This page is for administrators only.</p>
      </div>
    );
  }

  const saveTarget = async () => {
    const nextTarget = Number(targetInput);
    if (Number.isNaN(nextTarget) || nextTarget < 0) {
      setAdminMessage(t("Target must be 0 or more."));
      return;
    }

    await setDoc(eventMetaRef, {
      expectedParticipants: nextTarget,
      updatedAt: getCurrentTimestamp(),
    });
    setAdminMessage(t("Committee target updated."));
  };

  const addPrompt = async () => {
    const text = newPrompt.trim();
    if (!text) return;
    const nextOrder = prompts.length ? Math.max(...prompts.map((item) => item.order)) + 1 : 1;
    const id = crypto.randomUUID();
    await setDoc(doc(db, "reflection_prompts", id), {
      text,
      order: nextOrder,
      updatedAt: getCurrentTimestamp(),
    });
    setNewPrompt("");
    setAdminMessage(t("Prompt added."));
  };

  const updatePrompt = async (id: string, text: string, order: number) => {
    await setDoc(
      doc(db, "reflection_prompts", id),
      { text, order, updatedAt: getCurrentTimestamp() },
      { merge: true },
    );
    setAdminMessage(t("Prompt saved."));
  };

  const removePrompt = async (id: string) => {
    await deleteDoc(doc(db, "reflection_prompts", id));
    setAdminMessage(t("Prompt deleted."));
  };

  const seedDefaultPrompts = async () => {
    const writes = fallbackPrompts.map((text, index) =>
      setDoc(doc(db, "reflection_prompts", `seed-${index + 1}`), {
        text,
        order: index + 1,
        updatedAt: getCurrentTimestamp(),
      }),
    );
    await Promise.all(writes);
    setAdminMessage(t("Default prompts seeded."));
  };

  // Task management handlers
  const addTask = async () => {
    const title = newTaskTitle.trim();
    const detail = newTaskDetail.trim();
    const deadline = newTaskDeadline.trim();
    if (!title || !detail || !deadline) return;

    setIsCreatingTask(true);
    setAdminMessage(t("Creating task..."));

    try {
      let handbookUrl: string | undefined;
      let handbookPublicId: string | undefined;
      let taskFileUrl: string | undefined;
      let taskFilePublicId: string | undefined;
      let fileName: string | undefined;

      // Upload handbook if provided
      if (handbookFile) {
        const handbookUpload = await uploadDocumentToCloudinary(handbookFile, "tasks/handbooks");
        handbookUrl = handbookUpload.secure_url;
        handbookPublicId = handbookUpload.public_id;
      }

      // Upload task file if provided
      if (taskFile) {
        const taskUpload = await uploadDocumentToCloudinary(taskFile, "tasks/files");
        taskFileUrl = taskUpload.secure_url;
        taskFilePublicId = taskUpload.public_id;
        fileName = taskFile.name;
      }

      const taskId = `TASK-${String(tasks.length + 1).padStart(2, "0")}`;
      await addDoc(tasksCollectionRef, {
        taskId,
        title,
        detail,
        deadline,
        isActive: true,
        handbookUrl,
        handbookPublicId,
        taskFileUrl,
        taskFilePublicId,
        fileName,
        createdAt: getCurrentTimestamp(),
        createdBy: user?.email,
      });

      setNewTaskTitle("");
      setNewTaskDetail("");
      setNewTaskDeadline("");
      setHandbookFile(null);
      setTaskFile(null);
      setAdminMessage(t("Task created successfully!"));
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : t("Failed to create task."));
    } finally {
      setIsCreatingTask(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    const taskDoc = tasks.find((t) => t.taskId === taskId);
    if (taskDoc) {
      await deleteDoc(doc(db, "tasks", taskDoc.id));
      setAdminMessage(t("Task deleted."));
    }
  };

  // Announcements management handlers
  const addLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    setNewAnnouncementLinks([...newAnnouncementLinks, { label: newLinkLabel, url: newLinkUrl }]);
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const removeLink = (index: number) => {
    setNewAnnouncementLinks(newAnnouncementLinks.filter((_, i) => i !== index));
  };

  const addAnnouncement = async () => {
    const title = newAnnouncementTitle.trim();
    const content = newAnnouncementContent.trim();
    if (!title || !content) return;

    await addDoc(announcementsCollectionRef, {
      title,
      content,
      links: newAnnouncementLinks.length > 0 ? newAnnouncementLinks : undefined,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      createdBy: user?.email,
      updatedBy: user?.email,
    });
    setNewAnnouncementTitle("");
    setNewAnnouncementContent("");
    setNewAnnouncementLinks([]);
    setAdminMessage(t("Announcement created."));
  };

  const updateAnnouncement = async (announcementId: string) => {
    const announcement = announcements.find((a) => a.id === announcementId);
    if (announcement) {
      const newTitle = prompt("Edit title:", announcement.title);
      if (newTitle === null) return;
      
      const newContent = prompt("Edit content:", announcement.content);
      if (newContent === null) return;

      await setDoc(
        doc(db, "announcements", announcementId),
        { 
          title: newTitle, 
          content: newContent, 
          updatedAt: getCurrentTimestamp(), 
          updatedBy: user?.email 
        },
        { merge: true },
      );
      setAdminMessage(t("Announcement updated."));
    }
  };

  const deleteAnnouncement = async (announcementId: string) => {
    if (confirm("Delete this announcement?")) {
      await deleteDoc(doc(db, "announcements", announcementId));
      setAdminMessage(t("Announcement deleted."));
    }
  };

  // Admin page - role-based access already checked at top
  return (
    <section className="space-y-4">
      <header className="panel p-6 sm:p-8">
        <p className="status-pill">Admin</p>
        <h1 className="mt-3 font-heading text-5xl tracking-wider text-[#f7f0e8]">{t("Admin Controls")}</h1>
        <p className="mt-3 max-w-2xl text-[#dfcbbd]">{t("Manage committee target and reflection prompts from this page only.")}</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="panel p-5 sm:p-6">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Committee Target")}</h2>
          <p className="mt-2 text-sm text-[#dfcbbd]">{t("Used by attendance and H-1 pages for automatic not-confirmed counters.")}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="number"
              min={0}
              value={targetInput}
              onChange={(event) => setTargetInput(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
            />
            <button type="button" onClick={saveTarget} className="cta-btn px-4 py-3">{t("Save target")}</button>
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Reflection Prompts")}</h2>
          <div className="mt-4 flex gap-2">
            <input
              value={newPrompt}
              onChange={(event) => setNewPrompt(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
              placeholder={t("Add new prompt")}
            />
            <button type="button" onClick={addPrompt} className="cta-btn px-4 py-3">{t("Add")}</button>
          </div>
          <button type="button" onClick={seedDefaultPrompts} className="nav-chip mt-3 px-4 py-2">{t("Seed default prompts")}</button>

          <div className="mt-4 space-y-3">
            {prompts.map((prompt) => (
              <PromptEditor
                key={prompt.id}
                id={prompt.id}
                text={prompt.text}
                order={prompt.order}
                onSave={updatePrompt}
                onDelete={removePrompt}
              />
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5 sm:p-6">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Task Management")}</h2>
          <p className="mt-2 text-sm text-[#dfcbbd]">{t("Create and manage public tasks for submissions.")}</p>
          <div className="mt-4 space-y-3">
            <input
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder={t("Task Title")}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
            />
            <textarea
              value={newTaskDetail}
              onChange={(event) => setNewTaskDetail(event.target.value)}
              placeholder={t("Task Details")}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
            />
            <input
              value={newTaskDeadline}
              onChange={(event) => setNewTaskDeadline(event.target.value)}
              placeholder={t("Deadline (e.g. Day 3 - 20:00)")}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
            />

            <div className="space-y-2 border-t border-white/10 pt-3">
              <label className="block space-y-1">
                <span className="text-xs text-[#d8a75b]">📘 {t("Handbook (PDF/DOC)")} - {t("Optional")}</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(event) => setHandbookFile(event.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs text-[#aaa391] file:rounded file:border-0 file:bg-[#c18f63] file:px-2 file:py-1 file:text-xs file:text-black file:cursor-pointer"
                />
                {handbookFile && <p className="text-xs text-[#d8a75b]">✓ {handbookFile.name}</p>}
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-[#d8a75b]">📄 {t("Task File (PDF/DOC)")} - {t("Optional")}</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.zip,.rar"
                  onChange={(event) => setTaskFile(event.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs text-[#aaa391] file:rounded file:border-0 file:bg-[#c18f63] file:px-2 file:py-1 file:text-xs file:text-black file:cursor-pointer"
                />
                {taskFile && <p className="text-xs text-[#d8a75b]">✓ {taskFile.name}</p>}
              </label>
            </div>

            <button
              type="button"
              onClick={addTask}
              disabled={isCreatingTask}
              className="cta-btn w-full px-4 py-3 disabled:opacity-50"
            >
              {isCreatingTask ? t("Creating...") : t("Create Task")}
            </button>
          </div>

          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-white/15 bg-black/15 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[#c7c3b8]">{task.taskId}</p>
                <h3 className="mt-1 text-sm text-[#f7f0e8]">{task.title}</h3>
                <p className="mt-1 text-xs text-[#aaa391]">{t("Deadline: ")}{task.deadline}</p>
                {(task.handbookUrl || task.taskFileUrl) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {task.handbookUrl && <span className="text-xs text-[#d8a75b]">📘 Handbook</span>}
                    {task.taskFileUrl && <span className="text-xs text-[#d8a75b]">📄 Task File</span>}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => deleteTask(task.taskId)}
                  className="nav-chip mt-2 px-3 py-1 text-xs text-[#ffb9a9]"
                >
                  {t("Delete")}
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Announcements & Dashboard Info")}</h2>
          <p className="mt-2 text-sm text-[#dfcbbd]">{t("Create announcements to display on dashboard.")}</p>
          <div className="mt-4 space-y-3">
            <input
              value={newAnnouncementTitle}
              onChange={(event) => setNewAnnouncementTitle(event.target.value)}
              placeholder={t("Announcement Title")}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
            />
            <textarea
              value={newAnnouncementContent}
              onChange={(event) => setNewAnnouncementContent(event.target.value)}
              placeholder={t("Announcement Content")}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
              rows={4}
            />
            
            <div className="border-t border-white/10 pt-3">
              <p className="text-sm text-[#d7bfaf]">{t("Links (Optional)")}</p>
              <div className="mt-2 space-y-2">
                {newAnnouncementLinks.map((link, index) => (
                  <div key={index} className="flex gap-2 items-center text-sm">
                    <span className="text-[#d8a75b] flex-1 truncate">{link.label}</span>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="nav-chip px-2 py-1 text-xs text-[#ffb9a9]"
                    >
                      {t("Remove")}
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={newLinkLabel}
                  onChange={(event) => setNewLinkLabel(event.target.value)}
                  placeholder={t("Link Label")}
                  className="flex-1 rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-sm text-[#f7f0e8] outline-none focus:border-[#c18f63]"
                />
                <input
                  value={newLinkUrl}
                  onChange={(event) => setNewLinkUrl(event.target.value)}
                  placeholder={t("Link URL")}
                  className="flex-1 rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-sm text-[#f7f0e8] outline-none focus:border-[#c18f63]"
                />
                <button type="button" onClick={addLink} className="nav-chip px-3 py-1 text-sm">{t("Add Link")}</button>
              </div>
            </div>

            <button
              type="button"
              onClick={addAnnouncement}
              className="cta-btn w-full px-4 py-3"
            >
              {t("Create Announcement")}
            </button>
          </div>

          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-lg border border-white/15 bg-black/15 p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[#f7f0e8]">{announcement.title}</h3>
                    <p className="mt-1 text-xs text-[#aaa391]">{announcement.content.substring(0, 100)}...</p>
                    {announcement.links && announcement.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {announcement.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#d8a75b] hover:underline"
                          >
                            [{link.label}]
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => updateAnnouncement(announcement.id)}
                      className="nav-chip px-2 py-1 text-xs text-[#d8a75b]"
                    >
                      {t("Edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="nav-chip px-2 py-1 text-xs text-[#ffb9a9]"
                    >
                      {t("Delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="panel p-5 sm:p-6">
        <h2 className="font-heading text-3xl tracking-wider text-[#f7f0e8]">{t("Submissions & Grading")}</h2>
        <p className="mt-2 text-sm text-[#dfcbbd]">{t("Review task submissions and assign grades.")}</p>
        
        <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
          {submissions.length > 0 ? (
            submissions.map((submission) => {
              const existingAssessment = assessments.find((a) => a.submissionId === submission.id);
              return (
                <div key={submission.id} className="rounded-lg border border-white/15 bg-black/15 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-[#c7c3b8]">{submission.taskId} • {submission.taskTitle}</p>
                      <p className="mt-1 text-sm text-[#f7f0e8]">{t("Notes: ")}{submission.note}</p>
                      {submission.fileUrl && (
                        <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-[#d8a75b] hover:underline">
                          {submission.fileName || "View File"}
                        </a>
                      )}
                    </div>
                    {existingAssessment ? (
                      <div className="text-sm text-[#d8a75b]">
                        Score: {existingAssessment.score} / 100
                      </div>
                    ) : (
                      <span className="text-xs text-[#aaa391]">{t("Not graded")}</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-[#aaa391]">{t("No submissions yet.")}</p>
          )}
        </div>
      </article>

      {adminMessage ? (
        <p className="rounded-xl border border-[#c18f63]/40 bg-[#c18f63]/12 px-4 py-3 text-sm text-[#f7f0e8]">{adminMessage}</p>
      ) : null}
    </section>
  );
}

function PromptEditor({
  id,
  text,
  order,
  onSave,
  onDelete,
}: {
  id: string;
  text: string;
  order: number;
  onSave: (id: string, text: string, order: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [draftText, setDraftText] = useState(text);
  const [draftOrder, setDraftOrder] = useState(order);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <input
        value={draftText}
        onChange={(event) => setDraftText(event.target.value)}
        className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
      />
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          value={draftOrder}
          min={1}
          onChange={(event) => setDraftOrder(Number(event.target.value))}
          className="w-24 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-[#f7f0e8] outline-none focus:border-[#c18f63]"
        />
        <button type="button" onClick={() => onSave(id, draftText.trim(), draftOrder)} className="nav-chip px-3 py-2">{t("Save")}</button>
        <button type="button" onClick={() => onDelete(id)} className="nav-chip px-3 py-2 text-[#ffb9a9]">{t("Delete")}</button>
      </div>
    </div>
  );
}
