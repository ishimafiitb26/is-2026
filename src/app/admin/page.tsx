"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDoc, doc, onSnapshot, setDoc, addDoc, query, orderBy, collection } from "firebase/firestore";
import { useI18n } from "@/components/I18nProvider";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { uploadDocumentToCloudinary } from "@/lib/cloudinary";
import {
  eventMetaRef,
  getCurrentTimestamp,
  reflectionPromptsCollectionRef,
  tasksCollectionRef,
  taskSubmissionsCollectionRef,
  announcementsCollectionRef,
  type EventMeta,
  type ReflectionPrompt,
  type Task,
  type TaskSubmission,
  type Announcement,
} from "@/lib/engagement";

const fallbackPrompts = [
  "What is one small win from today?",
  "What part of the process feels heavy right now?",
  "What kind of support would help your group this week?",
];

interface HandbookUploadRecord {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
}

export default function AdminPage() {
  const { t } = useI18n();
  const { user, role, loading } = useAuth();
  const router = useRouter();

  // State global dashboard config
  const [targetInput, setTargetInput] = useState<string>("12");
  const [briefingInput, setBriefingInput] = useState<string>("");
  const [countdownInput, setCountdownInput] = useState<string>("");
  const [scheduleInput, setScheduleInput] = useState<string>("");

  const [prompts, setPrompts] = useState<Array<{ id: string; text: string; order: number }>>([]);
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [adminMessage, setAdminMessage] = useState<string>("");

  // Task management state
  const [tasks, setTasks] = useState<Array<{ id: string } & Task>>([]);
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [newTaskDetail, setNewTaskDetail] = useState<string>("");
  const [newTaskDeadline, setNewTaskDeadline] = useState<string>("");
  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);

  // Dedicated Handbook Upload State
  const [handbooks, setHandbooks] = useState<HandbookUploadRecord[]>([]);
  const [newHandbookTitle, setNewHandbookTitle] = useState<string>("");
  const [handbookDocFile, setHandbookDocFile] = useState<File | null>(null);
  const [isUploadingHandbook, setIsUploadingHandbook] = useState<boolean>(false);

  // Announcements management state
  const [announcements, setAnnouncements] = useState<Array<{ id: string } & Announcement>>([]);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState<string>("");
  const [newAnnouncementContent, setNewAnnouncementContent] = useState<string>("");
  const [newAnnouncementLinks, setNewAnnouncementLinks] = useState<Array<{ label: string; url: string }>>([]);
  const [newLinkLabel, setNewLinkLabel] = useState<string>("");
  const [newLinkUrl, setNewLinkUrl] = useState<string>("");

  // Submissions management state
  const [submissions, setSubmissions] = useState<Array<{ id: string } & TaskSubmission>>([]);

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.push("/");
    }
  }, [role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;

    const safeErrorHandler = (error: Error) => {
      console.debug("Secure administrator synchronization bypass check:", error.message);
    };

    const unsubscribeMeta = onSnapshot(eventMetaRef, (document) => {
      if (document.exists()) {
        const meta = document.data() as EventMeta & { latestBriefing?: string; countdownText?: string; todaySchedule?: string };
        setTargetInput(String(meta.expectedParticipants || 0));
        setBriefingInput(meta.latestBriefing || "");
        setCountdownInput(meta.countdownText || "");
        setScheduleInput(meta.todaySchedule || "");
      }
    }, safeErrorHandler);

    const unsubscribePrompts = onSnapshot(reflectionPromptsCollectionRef, (snapshot) => {
      const rows = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as ReflectionPrompt),
      }));
      setPrompts(rows.sort((left, right) => left.order - right.order));
    }, safeErrorHandler);

    const unsubscribeTasks = onSnapshot(query(tasksCollectionRef, orderBy("createdAt", "desc")), (snapshot) => {
      const rows = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as Task),
      }));
      setTasks(rows);
    }, safeErrorHandler);

    const unsubscribeHandbooks = onSnapshot(query(collection(db, "handbooks"), orderBy("createdAt", "desc")), (snapshot) => {
      setHandbooks(snapshot.docs.map((entry) => ({
        id: entry.id,
        title: entry.data().title || "",
        fileName: entry.data().fileName || "",
        fileUrl: entry.data().fileUrl || ""
      })));
    }, safeErrorHandler);

    const unsubscribeAnnouncements = onSnapshot(query(announcementsCollectionRef, orderBy("createdAt", "desc")), (snapshot) => {
      const rows = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as Announcement),
      }));
      setAnnouncements(rows);
    }, safeErrorHandler);

    const unsubscribeSubmissions = onSnapshot(query(taskSubmissionsCollectionRef, orderBy("createdAt", "desc")), (snapshot) => {
      const rows = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as TaskSubmission),
      }));
      setSubmissions(rows);
    }, safeErrorHandler);

    return () => {
      unsubscribeMeta();
      unsubscribePrompts();
      unsubscribeTasks();
      unsubscribeHandbooks();
      unsubscribeAnnouncements();
      unsubscribeSubmissions();
    };
  }, [role]);

  if (loading || role !== "admin") {
    return <div className="text-center py-8 text-[#D7DCD5]">Verifying Security Access...</div>;
  }

  const saveGlobalConfig = async () => {
    const nextTarget = Number(targetInput);
    if (Number.isNaN(nextTarget) || nextTarget < 0) {
      setAdminMessage(t("Target must be 0 or more."));
      return;
    }
    await setDoc(eventMetaRef, {
      expectedParticipants: nextTarget,
      latestBriefing: briefingInput.trim(),
      countdownText: countdownInput.trim(),
      todaySchedule: scheduleInput.trim(),
      updatedAt: getCurrentTimestamp(),
    }, { merge: true });
    setAdminMessage(t("Global system config metrics deployed."));
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
    await setDoc(doc(db, "reflection_prompts", id), { text, order, updatedAt: getCurrentTimestamp() }, { merge: true });
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

  const addTask = async () => {
    const title = newTaskTitle.trim();
    const detail = newTaskDetail.trim();
    const deadline = newTaskDeadline.trim();
    if (!title || !detail || !deadline) return;

    setIsCreatingTask(true);
    setAdminMessage(t("Creating task..."));

    try {
      let taskFileUrl = "";
      let taskFilePublicId = "";
      let fileName = "";

      if (taskFile) {
        const taskUpload = await uploadDocumentToCloudinary(taskFile, "tasks");
        taskFileUrl = taskUpload.secure_url;
        taskFilePublicId = taskUpload.public_id;
        fileName = taskFile.name;
      }

      await addDoc(tasksCollectionRef, {
        taskId: `TASK-${String(tasks.length + 1).padStart(2, "0")}`,
        title,
        detail,
        deadline,
        isActive: true,
        taskFileUrl,
        taskFilePublicId,
        fileName,
        createdAt: getCurrentTimestamp(),
        createdBy: user?.email || "admin",
      });

      setNewTaskTitle("");
      setNewTaskDetail("");
      setNewTaskDeadline("");
      setTaskFile(null);
      setAdminMessage(t("Task created successfully!"));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown transfer failure.";
      setAdminMessage(`Failed to create task: ${errorMessage}`);
    } finally {
      // SEKARANG SUDAH ADA FINALLY - JAMINAN AMAN DARI GARIS MERAH
      setIsCreatingTask(false);
    }
  };

  const handleUploadHandbook = async () => {
    const title = newHandbookTitle.trim();
    if (!title || !handbookDocFile) return;

    setIsUploadingHandbook(true);
    setAdminMessage(t("Uploading handbook..."));

    try {
      const upload = await uploadDocumentToCloudinary(handbookDocFile, "handbooks");
      await addDoc(collection(db, "handbooks"), {
        title,
        fileUrl: upload.secure_url,
        filePublicId: upload.public_id,
        fileName: handbookDocFile.name,
        createdAt: getCurrentTimestamp(),
        uploadedBy: user?.email || "admin"
      });
      setNewHandbookTitle("");
      setHandbookDocFile(null);
      setAdminMessage(t("Handbook uploaded successfully!"));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Unknown binary piping failure.";
      setAdminMessage(`Failed to upload handbook: ${errorMessage}`);
    } finally {
      // SEKARANG SUDAH ADA FINALLY - JAMINAN AMAN DARI GARIS MERAH
      setIsUploadingHandbook(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    const taskDoc = tasks.find((t) => t.taskId === taskId);
    if (taskDoc) {
      await deleteDoc(doc(db, "tasks", taskDoc.id));
      setAdminMessage(t("Task deleted."));
    }
  };

  const deleteHandbookAction = async (id: string) => {
    if (confirm("Delete this handbook?")) {
      await deleteDoc(doc(db, "handbooks", id));
      setAdminMessage(t("Handbook deleted."));
    }
  };

  // DEFINISI FUNGSI ADDLINK DAN REMOVELINK DIMASUKKAN KEMBALI
  const addLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    setNewAnnouncementLinks([...newAnnouncementLinks, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }]);
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

    const payload: Record<string, unknown> = {
      title,
      content,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      createdBy: user?.email || "admin",
      updatedBy: user?.email || "admin",
    };

    if (newAnnouncementLinks.length > 0) {
      payload.links = newAnnouncementLinks;
    }

    await addDoc(announcementsCollectionRef, payload);
    setNewAnnouncementTitle("");
    setNewAnnouncementContent("");
    setNewAnnouncementLinks([]);
    setAdminMessage(t("Announcement created."));
  };

  const deleteAnnouncement = async (announcementId: string) => {
    if (confirm("Delete this announcement?")) {
      await deleteDoc(doc(db, "announcements", announcementId));
      setAdminMessage(t("Announcement deleted."));
    }
  };

  return (
    <section className="space-y-6">
      <header className="panel p-6">
        <p className="status-pill">Terminal Console</p>
        <h1 className="mt-2 font-heading text-4xl text-[#f7f0e8]">{t("Admin Controls")}</h1>
      </header>

      <article className="panel p-6 space-y-4">
        <h2 className="font-heading text-2xl text-[#D5C757]">Global Dashboard Config</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <input value={targetInput} onChange={(e) => setTargetInput(e.target.value)} type="number" placeholder="Target Peserta" className="rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-sm text-[#F2EDEC]" />
          <input value={briefingInput} onChange={(e) => setBriefingInput(e.target.value)} placeholder="Latest Briefing Text" className="rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-sm text-[#F2EDEC]" />
          <input value={countdownInput} onChange={(e) => setCountdownInput(e.target.value)} placeholder="Countdown Text" className="rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-sm text-[#F2EDEC]" />
          <input value={scheduleInput} onChange={(e) => setScheduleInput(e.target.value)} placeholder="Today Schedule Text" className="rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-sm text-[#F2EDEC]" />
        </div>
        <button onClick={saveGlobalConfig} className="cta-btn px-6 py-2 text-xs uppercase">Deploy System Config</button>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5 space-y-3">
          <h2 className="font-heading text-2xl text-[#f7f0e8]">{t("Task Management")}</h2>
          <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder={t("Task Title")} className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-xs text-[#F2EDEC] outline-none" />
          <textarea value={newTaskDetail} onChange={(e) => setNewTaskDetail(e.target.value)} placeholder={t("Task Details")} className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-xs text-[#F2EDEC] outline-none" rows={3} />
          <input value={newTaskDeadline} onChange={(e) => setNewTaskDeadline(e.target.value)} placeholder="Deadline Timeline Mapping" className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-xs text-[#F2EDEC] outline-none" />
          <div className="pt-2">
            <label className="block text-xs text-[#D5C757] mb-1">📄 {t("Task File (PDF/DOC)")}</label>
            <input type="file" onChange={(e) => setTaskFile(e.target.files?.[0] || null)} className="w-full text-xs text-[#aaa391]" />
          </div>
          <button onClick={addTask} disabled={isCreatingTask} className="cta-btn w-full py-2.5 text-xs uppercase">{isCreatingTask ? "Creating..." : "Create Task"}</button>
          
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
            {tasks.map((t) => (
              <div key={t.id} className="p-3 bg-black/15 border border-white/10 rounded-xl flex justify-between items-center">
                <span className="text-xs font-medium text-[#F2EDEC]">{t.taskId} - {t.title}</span>
                <button onClick={() => deleteTask(t.taskId)} className="text-xs text-[#CE4A2D] font-bold">Delete</button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 space-y-3">
          <h2 className="font-heading text-2xl text-[#D5C757]">Handbook Upload Center</h2>
          <input value={newHandbookTitle} onChange={(e) => setNewHandbookTitle(e.target.value)} placeholder="Handbook Document Title" className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-xs text-[#F2EDEC] outline-none" />
          <div className="pt-2">
            <label className="block text-xs text-[#D5C757] mb-1">📘 File Handbook (Wajib PDF/DOCX)</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setHandbookDocFile(e.target.files?.[0] || null)} className="w-full text-xs text-[#aaa391]" />
          </div>
          <button onClick={handleUploadHandbook} disabled={isUploadingHandbook} className="cta-btn w-full py-2.5 text-xs uppercase bg-teal-800">{isUploadingHandbook ? "Uploading..." : "Inject Handbook Document"}</button>
          
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
            {handbooks.map((hb) => (
              <div key={hb.id} className="p-3 bg-black/15 border border-white/10 rounded-xl flex justify-between items-center">
                <span className="text-xs text-[#F2EDEC] truncate max-w-[200px]">{hb.title}</span>
                <button onClick={() => deleteHandbookAction(hb.id)} className="text-xs text-[#CE4A2D] font-bold">Delete</button>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5 space-y-3">
          <h2 className="font-heading text-2xl text-[#f7f0e8]">{t("Reflection Prompts")}</h2>
          <div className="mt-4 flex gap-2">
            <input value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-xs text-[#f7f0e8] outline-none" placeholder={t("Add new prompt")} />
            <button onClick={addPrompt} className="cta-btn px-4 py-2 text-xs">{t("Add")}</button>
          </div>
          <button onClick={seedDefaultPrompts} className="nav-chip mt-3 text-xs">{t("Seed default prompts")}</button>
          <div className="mt-4 space-y-2">
            {prompts.map((p) => (
              <PromptEditor key={p.id} id={p.id} text={p.text} order={p.order} onSave={updatePrompt} onDelete={removePrompt} />
            ))}
          </div>
        </article>

        <article className="panel p-5 space-y-4">
          <h2 className="font-heading text-2xl text-[#f7f0e8]">{t("Announcements & Dashboard Info")}</h2>
          <input value={newAnnouncementTitle} onChange={(e) => setNewAnnouncementTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-xs text-[#f7f0e8] outline-none" />
          <textarea value={newAnnouncementContent} onChange={(e) => setNewAnnouncementContent(e.target.value)} placeholder="Content" className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-2 text-xs text-[#f7f0e8] outline-none" rows={3} />
          <div className="flex gap-2 items-center">
            <input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="Link Label" className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-1 text-xs text-[#f7f0e8]" />
            <input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="Link URL" className="w-full rounded-xl border border-white/15 bg-[#0F282F]/50 px-3 py-1 text-xs text-[#f7f0e8]" />
            <button onClick={addLink} className="nav-chip text-xs shrink-0">Attach</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {newAnnouncementLinks.map((link, idx) => (
              <span key={idx} className="status-pill text-[10px]">{link.label} <button type="button" onClick={() => removeLink(idx)} className="text-[#CE4A2D] ml-1 font-bold">x</button></span>
            ))}
          </div>
          <button onClick={addAnnouncement} className="cta-btn w-full py-2 text-xs uppercase">Broadcast Announcement</button>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {announcements.map((a) => (
              <div key={a.id} className="p-2 bg-black/10 border border-white/5 rounded-lg flex justify-between items-center text-xs">
                <span className="text-[#F2EDEC] truncate max-w-[200px]">{a.title}</span>
                <button onClick={() => deleteAnnouncement(a.id)} className="text-[#CE4A2D] font-bold">Delete</button>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="panel p-5">
        <h2 className="font-heading text-2xl text-[#f7f0e8]">{t("Submissions & Grading")}</h2>
        <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
          {submissions.length > 0 ? (
            submissions.map((sub) => (
              <div key={sub.id} className="p-4 bg-black/20 rounded-xl border border-white/15 flex justify-between items-center gap-4">
                <div>
                  <p className="text-xs font-bold text-[#D5C757]">{sub.taskId} • {sub.taskTitle}</p>
                  <p className="text-xs text-[#F2EDEC] mt-1">Note: {sub.note || "-"}</p>
                  {sub.fileUrl && <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-teal-400 underline mt-1 block">View Document Artifact</a>}
                </div>
                <span className="status-pill text-[10px]">Received</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-[#aaa391]">{t("No submissions yet.")}</p>
          )}
        </div>
      </article>

      {adminMessage && <p className="panel p-3 text-xs text-[#D5C757] font-mono text-center">{adminMessage}</p>}
    </section>
  );
}

function PromptEditor({ id, text, order, onSave, onDelete }: { id: string; text: string; order: number; onSave: (id: string, text: string, order: number) => Promise<void>; onDelete: (id: string) => Promise<void>; }) {
  const [draftText, setDraftText] = useState(text);
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-3 flex gap-2 items-center">
      <input value={draftText} onChange={(e) => setDraftText(e.target.value)} className="w-full bg-[#0F282F]/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-[#f7f0e8]" />
      <button type="button" onClick={() => onSave(id, draftText.trim(), order)} className="text-xs text-[#D5C757] font-bold">Save</button>
      <button type="button" onClick={() => onDelete(id)} className="text-xs text-[#CE4A2D] font-bold">Delete</button>
    </div>
  );
}