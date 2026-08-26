"use client";

import React, { useEffect, useState, FormEvent, useMemo } from "react";
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

interface AdminEventMeta {
  expectedParticipants?: number;
  latestBriefing?: string;
  countdownText?: string;
  todaySchedule?: string;
  activeOsjurDay?: string;
  [key: string]: string | number | boolean | object | undefined | null;
}

interface AdminTask extends Task {
  isoDeadline?: string;
  taskFileUrl?: string;
  taskFilePublicId?: string;
  fileName?: string;
}

interface HandbookUploadRecord {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  filePublicId?: string;
}

interface AdminAnnouncement extends Announcement {
  posterUrl?: string;
  links?: Array<{ label: string; url: string }>;
}

interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
}

interface AdminSubmission extends Omit<TaskSubmission, 'createdAt'> {
  nim?: string;
  submittedBy?: string;
  submissionType?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt?: FirestoreTimestamp | Date | null | undefined;
}

interface AttendanceViewRow {
  nim?: string;
  fullName?: string;
  status?: string;
  evidenceText?: string;
  feedback?: string;
  condition?: string;
  illnessName?: string;
  symptoms?: string;
  tookMedicine?: string;
  medicineName?: string;
  evidenceUrl?: string;
  reasonText?: string; 
  createdAt?: FirestoreTimestamp | Date | null | undefined;
}

const formatTime = (ts: FirestoreTimestamp | Date | null | undefined): string => {
  if (!ts) return "-";
  
  if (ts instanceof Date) {
    return ts.toLocaleString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + " WIB";
  }

  if (typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === "function") {
    return ts.toDate().toLocaleString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + " WIB";
  }

  if (typeof ts === 'object' && 'seconds' in ts && typeof ts.seconds === 'number') {
    return new Date(ts.seconds * 1000).toLocaleString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + " WIB";
  }

  return "-";
};

export default function AdminPage() {
  const { t } = useI18n();
  const { role, loading, user } = useAuth();
  const router = useRouter();

  const [isFirstMetaLoad, setIsFirstMetaLoad] = useState<boolean>(true);

  const [targetInput, setTargetInput] = useState<string>("12");
  const [briefingInput, setBriefingInput] = useState<string>("");
  const [countdownInput, setCountdownInput] = useState<string>("");
  const [scheduleInput, setScheduleInput] = useState<string>("");

  const [activeOsjurDay, setActiveOsjurDay] = useState<string>("fase2_1");

  const [targetDeadlineDay, setTargetDeadlineDay] = useState<string>("fase2_1");
  
  const [currentH1Open, setCurrentH1Open] = useState<string>("");
  const [currentAwalOpen, setCurrentAwalOpen] = useState<string>("");
  const [currentAkhirOpen, setCurrentAkhirOpen] = useState<string>("");

  const [currentH1Deadline, setCurrentH1Deadline] = useState<string>("");
  const [currentAwalDeadline, setCurrentAwalDeadline] = useState<string>("");
  const [currentAkhirDeadline, setCurrentAkhirDeadline] = useState<string>("");

  const [prompts, setPrompts] = useState<Array<{ id: string; text: string; order: number }>>([]);
  const [newPrompt, setNewPrompt] = useState<string>("");
  
  const [adminMessage, setAdminMessage] = useState<string>("");

  const [tasks, setTasks] = useState<Array<{ id: string } & AdminTask>>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [newTaskDetail, setNewTaskDetail] = useState<string>("");
  const [newTaskDeadline, setNewTaskDeadline] = useState<string>("");
  const [newTaskIsoDeadline, setNewTaskIsoDeadline] = useState<string>("");
  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);

  const [handbooks, setHandbooks] = useState<HandbookUploadRecord[]>([]);
  const [editingHandbookId, setEditingHandbookId] = useState<string | null>(null);
  const [newHandbookTitle, setNewHandbookTitle] = useState<string>("");
  const [handbookDocFile, setHandbookDocFile] = useState<File | null>(null);
  const [isUploadingHandbook, setIsUploadingHandbook] = useState<boolean>(false);

  const [announcements, setAnnouncements] = useState<Array<{ id: string } & AdminAnnouncement>>([]);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState<string>("");
  const [newAnnouncementContent, setNewAnnouncementContent] = useState<string>("");
  const [newAnnouncementLinks, setNewAnnouncementLinks] = useState<Array<{ label: string; url: string }>>([]);
  const [newLinkLabel, setNewLinkLabel] = useState<string>("");
  const [newLinkUrl, setNewLinkUrl] = useState<string>("");
  const [announcementPosterFile, setAnnouncementPosterFile] = useState<File | null>(null);

  const [attendanceDayFilter, setAttendanceDayFilter] = useState<string>("fase2_1");
  const [attendanceTabFilter, setAttendanceTabFilter] = useState<"awal" | "akhir" | "h1">("awal");
  const [adminAttendanceRecords, setAdminAttendanceRecords] = useState<AttendanceViewRow[]>([]);

  const [submissions, setSubmissions] = useState<Array<{ id: string } & AdminSubmission>>([]);
  const [submissionTaskFilter, setSubmissionTaskFilter] = useState<string>("all");
  
  const [masterMeta, setMasterMeta] = useState<AdminEventMeta | null>(null);

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.push("/");
    }
  }, [role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;

    return onSnapshot(eventMetaRef, (document) => {
      if (document.exists()) {
        const meta = document.data() as AdminEventMeta;
        setMasterMeta(meta);
        setTargetInput(String(meta.expectedParticipants || 0));
        setBriefingInput(meta.latestBriefing || "");
        setCountdownInput(meta.countdownText || "");
        setScheduleInput(meta.todaySchedule || "");
        setActiveOsjurDay(meta.activeOsjurDay || "fase2_1");

        if (isFirstMetaLoad && meta.activeOsjurDay) {
          setTargetDeadlineDay(meta.activeOsjurDay);
          setAttendanceDayFilter(meta.activeOsjurDay);
          setIsFirstMetaLoad(false);
        }
      }
    });
  }, [role, isFirstMetaLoad]);

  useEffect(() => {
    if (!masterMeta) return;

    const h1OpenVal = masterMeta[`${targetDeadlineDay}_h1_open`];
    const awalOpenVal = masterMeta[`${targetDeadlineDay}_dday_awal_open`];
    const akhirOpenVal = masterMeta[`${targetDeadlineDay}_dday_akhir_open`];

    const h1Val = masterMeta[`${targetDeadlineDay}_h1_deadline`];
    const awalVal = masterMeta[`${targetDeadlineDay}_dday_awal_deadline`];
    const akhirVal = masterMeta[`${targetDeadlineDay}_dday_akhir_deadline`];

    const timer = setTimeout(() => {
      setCurrentH1Open(typeof h1OpenVal === "string" ? h1OpenVal : "");
      setCurrentAwalOpen(typeof awalOpenVal === "string" ? awalOpenVal : "");
      setCurrentAkhirOpen(typeof akhirOpenVal === "string" ? akhirOpenVal : "");

      setCurrentH1Deadline(typeof h1Val === "string" ? h1Val : "");
      setCurrentAwalDeadline(typeof awalVal === "string" ? awalVal : "");
      setCurrentAkhirDeadline(typeof akhirVal === "string" ? akhirVal : "");
    }, 0);

    return () => clearTimeout(timer);
  }, [masterMeta, targetDeadlineDay]);

  useEffect(() => {
    if (role !== "admin") return;
    
    const isAktif = attendanceDayFilter.startsWith("fase2_") || attendanceDayFilter.startsWith("fase3_");
    const targetDayNumber = attendanceDayFilter.split("_").pop();
    const prefix = isAktif ? "fase2_" : "";

    let collectionName = `${prefix}attendance_day_${targetDayNumber}`;
    if (attendanceTabFilter === "akhir") collectionName = `${prefix}attendance_akhir_day_${targetDayNumber}`;
    if (attendanceTabFilter === "h1") collectionName = `${prefix}h1_confirmations_day_${targetDayNumber}`;

    return onSnapshot(collection(db, collectionName), (snapshot) => {
      setAdminAttendanceRecords(snapshot.docs.map((docItem) => docItem.data() as AttendanceViewRow));
    });
  }, [role, attendanceDayFilter, attendanceTabFilter]);

  useEffect(() => {
    if (role !== "admin") return;
    
    const unsubPrompts = onSnapshot(reflectionPromptsCollectionRef, (snapshot) => {
      setPrompts(snapshot.docs.map((e) => ({ id: e.id, ...(e.data() as ReflectionPrompt) })).sort((l, r) => l.order - r.order));
    });
    const unsubTasks = onSnapshot(query(tasksCollectionRef, orderBy("createdAt", "desc")), (snapshot) => {
      setTasks(snapshot.docs.map((e) => ({ id: e.id, ...(e.data() as AdminTask) })));
    });
    const unsubHandbooks = onSnapshot(query(collection(db, "handbooks"), orderBy("createdAt", "desc")), (snapshot) => {
      setHandbooks(snapshot.docs.map((e) => ({ id: e.id, title: e.data().title || "", fileName: e.data().fileName || "", fileUrl: e.data().fileUrl || "" })));
    });
    const unsubAnnouncements = onSnapshot(query(announcementsCollectionRef, orderBy("createdAt", "desc")), (snapshot) => {
      setAnnouncements(snapshot.docs.map((e) => ({ id: e.id, ...(e.data() as AdminAnnouncement) })));
    });
    const unsubSubmissions = onSnapshot(query(taskSubmissionsCollectionRef, orderBy("createdAt", "desc")), (snapshot) => {
      setSubmissions(snapshot.docs.map((e) => ({ id: e.id, ...(e.data() as AdminSubmission) })));
    });

    return () => {
      unsubPrompts(); unsubTasks(); unsubHandbooks(); unsubAnnouncements(); unsubSubmissions();
    };
  }, [role]);

  const filteredSubmissions = useMemo(() => {
    if (submissionTaskFilter === "all") return submissions;
    return submissions.filter((sub) => sub.taskId === submissionTaskFilter);
  }, [submissions, submissionTaskFilter]);

  const downloadSubmissionsCsv = () => {
    const headers = ["NIM", "Task ID", "Note/Message", "File URL", "Waktu Pengumpulan"];
    const rows = filteredSubmissions.map((s) => {
      const rescuedNIM = s.nim || (s.submittedBy ? s.submittedBy.split("@")[0] : "N/A");
      return [
        rescuedNIM,
        s.taskId || "N/A",
        s.note || "-",
        s.fileUrl || "",
        formatTime(s.createdAt)
      ];
    });

    const csvContent = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const safeName = submissionTaskFilter === "all" ? "semua_tugas" : submissionTaskFilter;
    link.download = `rekap_tugas_${safeName}_${Date.now()}.csv`;
    link.click();
  };

  const downloadAttendanceCsv = () => {
    const headers = ["NIM", "Nama Lengkap", "Status", "Catatan/Kondisi", "", "Link File"];
    const rows = adminAttendanceRecords.map((r) => {
      let detail = r.evidenceText || r.feedback || "-";
      
      if (attendanceTabFilter === "h1") {
        const parts = [] as string[]; 
        
        if (r.reasonText && r.reasonText !== "-") parts.push(`Alasan: ${r.reasonText}`);
        if (r.condition === "Sedang sakit") {
          parts.push(`Sakit: ${r.illnessName} | Gejala: ${r.symptoms} | Obat: ${r.tookMedicine} (${r.medicineName})`);
        } else {
          parts.push(`Kondisi: ${r.condition || "-"}`);
        }
        detail = parts.length > 0 ? parts.join(" || ") : "-";
      }

      return [
        r.nim || "N/A", 
        r.fullName || "N/A", 
        r.status || "N/A", 
        detail, 
        formatTime(r.createdAt), 
        r.evidenceUrl || "-"
      ];
    });

    const csvContent = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `recap_attendance_${attendanceDayFilter}_${attendanceTabFilter}.csv`;
    link.click();
  };

  const saveGlobalConfig = async () => {
    const nextTarget = Number(targetInput);
    if (Number.isNaN(nextTarget) || nextTarget < 0) {
      setAdminMessage(t("Target must be 0 or more."));
      return;
    }
    
    const updatePayload: Record<string, string | number | boolean | object | undefined | null> = {
      expectedParticipants: nextTarget,
      latestBriefing: briefingInput.trim(),
      countdownText: countdownInput.trim(),
      todaySchedule: scheduleInput.trim(),
      activeOsjurDay: activeOsjurDay,
      updatedAt: getCurrentTimestamp(),
    };

    updatePayload[`${targetDeadlineDay}_h1_open`] = currentH1Open;
    updatePayload[`${targetDeadlineDay}_dday_awal_open`] = currentAwalOpen;
    updatePayload[`${targetDeadlineDay}_dday_akhir_open`] = currentAkhirOpen;

    updatePayload[`${targetDeadlineDay}_h1_deadline`] = currentH1Deadline;
    updatePayload[`${targetDeadlineDay}_dday_awal_deadline`] = currentAwalDeadline;
    updatePayload[`${targetDeadlineDay}_dday_akhir_deadline`] = currentAkhirDeadline;

    await setDoc(eventMetaRef, updatePayload, { merge: true });
    setAdminMessage(t("Global system config metrics deployed."));
  };

  const addPrompt = async () => {
    const text = newPrompt.trim();
    if (!text) return;
    const secureId = `PROMPT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await setDoc(doc(db, "reflection_prompts", secureId), {
      text,
      order: prompts.length ? Math.max(...prompts.map((item) => item.order)) + 1 : 1,
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

  const handleSaveTaskAction = async () => {
    const title = newTaskTitle.trim();
    const detail = newTaskDetail.trim();
    const deadline = newTaskDeadline.trim();
    if (!title || !detail || !deadline) return;

    setIsCreatingTask(true);
    setAdminMessage(t("Processing task deployment..."));

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

      if (editingTaskId) {
        const currentTask = tasks.find((tk) => tk.id === editingTaskId);
        await setDoc(doc(db, "tasks", editingTaskId), {
          title,
          detail,
          deadline,
          isoDeadline: newTaskIsoDeadline,
          taskFileUrl: taskFileUrl || currentTask?.taskFileUrl || "",
          taskFilePublicId: taskFilePublicId || currentTask?.taskFilePublicId || "",
          fileName: fileName || currentTask?.fileName || "",
          updatedAt: getCurrentTimestamp(),
        }, { merge: true });
        setAdminMessage("Tugas berhasil diperbarui.");
      } else {
        const secureUniqueId = `TASK-${Date.now().toString().slice(-6)}`;
        await setDoc(doc(db, "tasks", secureUniqueId), {
          taskId: secureUniqueId,
          title,
          detail,
          deadline,
          isoDeadline: newTaskIsoDeadline,
          isActive: true,
          taskFileUrl,
          taskFilePublicId,
          fileName,
          createdAt: getCurrentTimestamp(),
          createdBy: user?.email || "admin",
        });
        setAdminMessage("Tugas unik baru berhasil dirilis.");
      }

      setNewTaskTitle(""); setNewTaskDetail(""); setNewTaskDeadline(""); setNewTaskIsoDeadline(""); setTaskFile(null); setEditingTaskId(null);
    } catch (error: unknown) {
      setAdminMessage(`Failure: ${error instanceof Error ? error.message : "Error"}`);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleSaveHandbookAction = async () => {
    const title = newHandbookTitle.trim();
    if (!title) return;

    setIsUploadingHandbook(true);
    setAdminMessage(t("Uploading handbook..."));

    try {
      let fileUrl = "";
      let filePublicId = "";
      let fileName = "";

      if (handbookDocFile) {
        const upload = await uploadDocumentToCloudinary(handbookDocFile, "handbooks");
        fileUrl = upload.secure_url;
        filePublicId = upload.public_id;
        fileName = handbookDocFile.name;
      }

      if (editingHandbookId) {
        const currentHb = handbooks.find((h) => h.id === editingHandbookId);
        await setDoc(doc(db, "handbooks", editingHandbookId), {
          title,
          fileUrl: fileUrl || currentHb?.fileUrl || "",
          filePublicId: filePublicId || currentHb?.filePublicId || "",
          fileName: fileName || currentHb?.fileName || "",
          updatedAt: getCurrentTimestamp()
        }, { merge: true });
        setAdminMessage("Handbook berhasil diperbarui.");
      } else {
        if (!handbookDocFile) return;
        await addDoc(collection(db, "handbooks"), {
          title, fileUrl, filePublicId, fileName,
          createdAt: getCurrentTimestamp(), uploadedBy: user?.email || "admin"
        });
        setAdminMessage("Handbook baru ditambahkan.");
      }
      setNewHandbookTitle(""); setHandbookDocFile(null); setEditingHandbookId(null);
    } catch (e: unknown) {
      setAdminMessage("Gagal memproses handbook.");
    } finally {
      setIsUploadingHandbook(false);
    }
  };

  const addLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    setNewAnnouncementLinks([...newAnnouncementLinks, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }]);
    setNewLinkLabel(""); setNewLinkUrl("");
  };

  const removeLink = (index: number) => {
    setNewAnnouncementLinks(newAnnouncementLinks.filter((_, i) => i !== index));
  };

  const handleSaveAnnouncementAction = async () => {
    const title = newAnnouncementTitle.trim();
    const content = newAnnouncementContent.trim();
    if (!title || !content) return;

    setAdminMessage("Uploading announcement payload...");

    try {
      let posterUrl = "";
      if (announcementPosterFile) {
        const upload = await uploadDocumentToCloudinary(announcementPosterFile, "announcements");
        posterUrl = upload.secure_url;
      }

      if (editingAnnId) {
        const currentAnn = announcements.find((a) => a.id === editingAnnId);
        await setDoc(doc(db, "announcements", editingAnnId), {
          title, content,
          posterUrl: posterUrl || currentAnn?.posterUrl || "",
          links: newAnnouncementLinks, updatedAt: getCurrentTimestamp(),
        }, { merge: true });
        setAdminMessage("Pengumuman berhasil diperbarui.");
      } else {
        await addDoc(announcementsCollectionRef, {
          title, content, posterUrl, links: newAnnouncementLinks,
          createdAt: getCurrentTimestamp(),
        });
        setAdminMessage("Pengumuman interaktif berhasil disiarkan.");
      }

      setNewAnnouncementTitle(""); setNewAnnouncementContent(""); setNewAnnouncementLinks([]); setAnnouncementPosterFile(null); setEditingAnnId(null);
    } catch (err) {
      setAdminMessage("Failed to broadcast announcement. Periksa berkas!");
    }
  };

  const deleteTask = async (id: string) => {
    if (confirm("Hapus tugas ini?")) {
      await deleteDoc(doc(db, "tasks", id));
      setAdminMessage(t("Task deleted."));
    }
  };

  const deleteHandbookAction = async (id: string) => {
    if (confirm("Delete this handbook?")) {
      await deleteDoc(doc(db, "handbooks", id));
      setAdminMessage(t("Handbook deleted."));
    }
  };

  const deleteAnnouncement = async (announcementId: string) => {
    if (confirm("Delete this announcement?")) {
      await deleteDoc(doc(db, "announcements", announcementId));
      setAdminMessage(t("Announcement deleted."));
    }
  };

  return (
    <section className="space-y-6 p-4 sm:p-6 lg:p-8 bg-[#0A0A0B] min-h-screen text-[#E1D9F9] w-full max-w-full overflow-x-hidden">
      <header className="panel p-6 rounded-2xl border border-[#452ABC]/40">
        <p className="status-pill">Terminal Console</p>
        <h1 className="mt-2 font-heading text-4xl text-[#E1D9F9]">{t("Admin Controls")}</h1>
      </header>

      {adminMessage && (
        <div className="panel p-4 border border-[#F6C545]/40 bg-[#F6C545]/10 rounded-xl text-center font-mono text-xs text-[#F6C545] animate-revealUp">
          🔔 SYSTEM FEEDBACK: {adminMessage}
        </div>
      )}

      <article className="panel p-6 space-y-4 rounded-2xl border border-[#452ABC]/30">
        <h2 className="font-heading text-2xl text-[#F6C545]">PENGATURAN PRESENSI</h2>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-[#E1D9F9]/50">Target Total Quota Peserta</span>
            <input value={targetInput} onChange={(e) => setTargetInput(e.target.value)} type="number" className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#452ABC]">Set Hari Presensi Aktif untuk Peserta Saat Ini</span>
            <select value={activeOsjurDay} onChange={(e) => setActiveOsjurDay(e.target.value)} className="w-full rounded-xl border border-[#452ABC]/50 bg-[#0A0A0B]/80 px-3 py-2 text-sm text-[#452ABC] font-bold outline-none cursor-pointer">
              <option value="fase2_1">Fase 2 - Day 1</option>
              <option value="fase2_2">Fase 2 - Day 2</option>
              <option value="fase3_5">Fase 3 - Day 5</option>
              <option value="fase2_4">Fase 2 - Day 4</option>
              <option value="fase2_5">Fase 2 - Day 5</option>
              <option value="fase2_6">Fase 2 - Day 6</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-[#E1D9F9]/50">Latest Briefing Text</span>
            <input value={briefingInput} onChange={(e) => setBriefingInput(e.target.value)} type="text" className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-[#E1D9F9]/50">Today Schedule Text</span>
            <input value={scheduleInput} onChange={(e) => setScheduleInput(e.target.value)} type="text" className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-sm text-white" />
          </label>
          
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs text-[#E1D9F9]/50">Countdown Text</span>
            <input value={countdownInput} onChange={(e) => setCountdownInput(e.target.value)} placeholder="Contoh: 08:00 WIB" type="text" className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-sm text-white" />
          </label>
        </div>

        <div className="border-t border-[#E1D9F9]/10 pt-4 mt-2 space-y-3">
          <h3 className="text-xs font-bold text-[#F6C545]">AKSES ADMIN</h3>
          
          <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
            <label className="block space-y-1 max-w-sm">
              <span className="text-[11px] text-[#E1D9F9]/50 uppercase tracking-wider">Pilih Hari Yang Ingin Diatur:</span>
              <select value={targetDeadlineDay} onChange={(e) => setTargetDeadlineDay(e.target.value)} className="w-full bg-[#0A0A0B] border border-white/10 text-white text-xs p-2.5 rounded-lg font-bold cursor-pointer outline-none focus:border-[#F6C545]">
                <option value="fase2_1">Fase 2 - Day 1</option>
                <option value="fase2_2">Fase 2 - Day 2</option>
                <option value="fase3_5">Fase 3 - Day 5</option>
                <option value="fase2_4">Fase 2 - Day 4</option>
                <option value="fase2_5">Fase 2 - Day 5</option>
                <option value="fase2_6">Fase 2 - Day 6</option>
              </select>
            </label>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              <div className="bg-[#0A0A0B]/50 border border-white/10 p-3 rounded-xl space-y-3 shadow-inner">
                <span className="text-[#F6C545] text-[11px] font-bold uppercase tracking-wider border-b border-white/10 pb-1 block">H-1 Confirmation</span>
                <label className="block space-y-1"><span className="text-[10px] text-[#452ABC] font-bold">Waktu Buka (Open)</span><input type="datetime-local" value={currentH1Open} onChange={(e) => setCurrentH1Open(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs p-2 rounded-lg font-mono outline-none focus:border-[#452ABC]" /></label>
                <label className="block space-y-1"><span className="text-[10px] text-[#EC5C2A] font-bold">Waktu Tutup (Close)</span><input type="datetime-local" value={currentH1Deadline} onChange={(e) => setCurrentH1Deadline(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs p-2 rounded-lg font-mono outline-none focus:border-[#EC5C2A]" /></label>
              </div>
              
              <div className="bg-[#0A0A0B]/50 border border-white/10 p-3 rounded-xl space-y-3 shadow-inner">
                <span className="text-[#F6C545] text-[11px] font-bold uppercase tracking-wider border-b border-white/10 pb-1 block">Check-In Awal</span>
                <label className="block space-y-1"><span className="text-[10px] text-[#452ABC] font-bold">Waktu Buka (Open)</span><input type="datetime-local" value={currentAwalOpen} onChange={(e) => setCurrentAwalOpen(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs p-2 rounded-lg font-mono outline-none focus:border-[#452ABC]" /></label>
                <label className="block space-y-1"><span className="text-[10px] text-[#EC5C2A] font-bold">Waktu Tutup (Close)</span><input type="datetime-local" value={currentAwalDeadline} onChange={(e) => setCurrentAwalDeadline(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs p-2 rounded-lg font-mono outline-none focus:border-[#EC5C2A]" /></label>
              </div>

              <div className="bg-[#0A0A0B]/50 border border-white/10 p-3 rounded-xl space-y-3 shadow-inner">
                <span className="text-[#F6C545] text-[11px] font-bold uppercase tracking-wider border-b border-white/10 pb-1 block">Check-Out Akhir</span>
                <label className="block space-y-1"><span className="text-[10px] text-[#452ABC] font-bold">Waktu Buka (Open)</span><input type="datetime-local" value={currentAkhirOpen} onChange={(e) => setCurrentAkhirOpen(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs p-2 rounded-lg font-mono outline-none focus:border-[#452ABC]" /></label>
                <label className="block space-y-1"><span className="text-[10px] text-[#EC5C2A] font-bold">Waktu Tutup (Close)</span><input type="datetime-local" value={currentAkhirDeadline} onChange={(e) => setCurrentAkhirDeadline(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white text-xs p-2 rounded-lg font-mono outline-none focus:border-[#EC5C2A]" /></label>
              </div>
            </div>
          </div>
        </div>

        <button onClick={saveGlobalConfig} className="cta-btn px-6 py-2.5 text-xs uppercase font-bold w-full sm:w-auto mt-2">Save</button>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5 space-y-3 rounded-2xl border border-[#452ABC]/30">
          <h2 className="font-heading text-2xl text-[#E1D9F9]">{editingTaskId ? "Edit Mission Task" : t("Task Management")}</h2>
          <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task Title" className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-xs text-white outline-none" />
          <textarea value={newTaskDetail} onChange={(e) => setNewTaskDetail(e.target.value)} placeholder="Task Details" className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-xs text-white outline-none" rows={3} />
          
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[11px] text-[#E1D9F9]/50">Display Timeline Teks</span>
              <input value={newTaskDeadline} onChange={(e) => setNewTaskDeadline(e.target.value)} placeholder="Day 3 - 20:00" className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-xs text-white" />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-[#EC5C2A] font-semibold">Real-time Deadline</span>
              <input type="datetime-local" value={newTaskIsoDeadline} onChange={(e) => setNewTaskIsoDeadline(e.target.value)} className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-xs text-white font-mono outline-none" />
            </label>
          </div>

          <div className="pt-1">
            <label className="block text-xs text-[#F6C545] mb-1">📄 {t("Task File (PDF/DOC)")}</label>
            <input type="file" onChange={(e) => setTaskFile(e.target.files?.[0] || null)} className="w-full text-xs text-[#E1D9F9]/50" />
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleSaveTaskAction} disabled={isCreatingTask} className="cta-btn w-full py-2.5 text-xs uppercase bg-[#452ABC]">{editingTaskId ? "Update" : "Submit"}</button>
            {editingTaskId && <button type="button" onClick={() => { setEditingTaskId(null); setNewTaskTitle(""); setNewTaskDetail(""); setNewTaskDeadline(""); setNewTaskIsoDeadline(""); }} className="nav-chip text-xs">Batal</button>}
          </div>
          
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
            {tasks.map((tk) => (
              <div key={tk.id} className="p-3 bg-black/15 border border-white/10 rounded-xl flex justify-between items-center text-xs">
                <span className="font-medium text-[#E1D9F9] truncate max-w-[200px]">{tk.taskId} - {tk.title}</span>
                <div className="flex gap-3">
                  <button onClick={() => { setEditingTaskId(tk.id); setNewTaskTitle(tk.title); setNewTaskDetail(tk.detail); setNewTaskDeadline(tk.deadline); setNewTaskIsoDeadline(tk.isoDeadline || ""); }} className="text-[#452ABC] font-bold">Edit</button>
                  <button onClick={() => deleteTask(tk.id)} className="text-[#EC5C2A] font-bold">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 space-y-3 rounded-2xl border border-[#452ABC]/30">
          <h2 className="font-heading text-2xl text-[#F6C545]">{editingHandbookId ? "Edit Handbook" : "Handbook Upload Center"}</h2>
          <input value={newHandbookTitle} onChange={(e) => setNewHandbookTitle(e.target.value)} placeholder="Handbook Document Title" className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-xs text-white outline-none" />
          <div className="pt-2">
            <label className="block text-xs text-[#F6C545] mb-1">File Handbook (PDF/DOCX)</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setHandbookDocFile(e.target.files?.[0] || null)} className="w-full text-xs text-[#E1D9F9]/50" />
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleSaveHandbookAction} disabled={isUploadingHandbook} className="cta-btn w-full py-2.5 text-xs uppercase bg-[#452ABC]">{editingHandbookId ? "Update" : "Submit"}</button>
            {editingHandbookId && <button type="button" onClick={() => { setEditingHandbookId(null); setNewHandbookTitle(""); }} className="nav-chip text-xs">Batal</button>}
          </div>
          
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
            {handbooks.map((hb) => (
              <div key={hb.id} className="p-3 bg-black/15 border border-white/10 rounded-xl flex justify-between items-center text-xs">
                <span className="text-[#E1D9F9] truncate max-w-[200px]">{hb.title}</span>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setEditingHandbookId(hb.id); setNewHandbookTitle(hb.title); }} className="text-[#452ABC] font-bold">Edit</button>
                  <button onClick={() => deleteHandbookAction(hb.id)} className="text-xs text-[#EC5C2A] font-bold">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">        
        <article className="panel p-5 space-y-4 rounded-2xl border border-[#452ABC]/30">
          <h2 className="font-heading text-2xl text-white">{editingAnnId ? "Edit Broadcast" : "Broadcast Feeds"}</h2>
          
          <div className="bg-black/30 border border-[#F6C545]/30 p-2 rounded-lg text-[10px] font-mono text-[#F6C545] space-y-0.5">
            <p className="font-bold">📋 NOTASI MARKDOWN:</p>
            <p>• Ketik <span className="text-white">*teks tebal*</span> ➔ <b>Tebal</b></p>
            <p>• Ketik <span className="text-white">_teks miring_</span> ➔ <i>Miring</i></p>
            <p>• Ketik <span className="text-white">~teks garis bawah~</span> ➔ <u>Garis Bawah</u></p>
          </div>

          <input value={newAnnouncementTitle} onChange={(e) => setNewAnnouncementTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-xs text-white" />
          <textarea value={newAnnouncementContent} onChange={(e) => setNewAnnouncementContent(e.target.value)} placeholder="Ketik pengumuman yang akan diunggah" className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-xs text-white font-mono" rows={3} />
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setAnnouncementPosterFile(e.target.files?.[0] || null)} className="w-full text-xs text-[#E1D9F9]/50" />
          
          <div className="flex gap-2">
            <input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="Label" className="w-1/3 bg-[#0A0A0B] rounded-lg p-2 text-xs text-white border border-white/10" />
            <input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="URL" className="w-2/3 bg-[#0A0A0B] rounded-lg p-2 text-xs text-white border border-white/10" />
            <button type="button" onClick={addLink} className="nav-chip text-xs">Attach</button>
          </div>
          
          {newAnnouncementLinks.length > 0 && (
            <div className="mt-2 p-3 bg-black/20 rounded-xl border border-white/5 space-y-2 animate-revealUp">
              <p className="text-[10px] text-[#F6C545] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>🔗</span> Attached Links Preview:
              </p>
              {newAnnouncementLinks.map((link, index) => (
                <div key={index} className="flex justify-between items-center bg-[#0A0A0B] border border-white/10 p-2 rounded-lg text-[11px] text-white">
                  <span className="truncate flex-1">[{link.label}] - {link.url}</span>
                  <button type="button" onClick={() => removeLink(index)} className="text-[#EC5C2A] font-bold px-2.5 py-1 hover:bg-[#EC5C2A]/20 rounded-lg transition ml-2 shrink-0">X</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={handleSaveAnnouncementAction} className="cta-btn w-full py-2.5 text-xs uppercase font-bold">{editingAnnId ? "Update" : "Publish"}</button>
            {editingAnnId && <button type="button" onClick={() => { setEditingAnnId(null); setNewAnnouncementTitle(""); setNewAnnouncementContent(""); setNewAnnouncementLinks([]); }} className="nav-chip text-xs">Batal</button>}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pt-2 border-t border-white/10">
            {announcements.map((a) => (
              <div key={a.id} className="p-3 bg-black/10 border border-white/5 rounded-xl flex justify-between items-center text-xs text-white">
                <span className="truncate max-w-[200px]">{a.title}</span>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setEditingAnnId(a.id); setNewAnnouncementTitle(a.title); setNewAnnouncementContent(a.content); setNewAnnouncementLinks(a.links || []); }} className="text-[#452ABC] font-bold">Edit</button>
                  <button onClick={() => deleteAnnouncement(a.id)} className="text-[#EC5C2A] font-bold">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 space-y-3 rounded-2xl border border-[#452ABC]/30">
          <h2 className="font-heading text-2xl text-white">{t("Reflection Prompts")}</h2>
          <div className="mt-4 flex gap-2">
            <input value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} className="w-full rounded-xl border border-white/15 bg-[#0A0A0B]/50 px-3 py-2 text-xs text-white outline-none" placeholder={t("Add new prompt")} />
            <button onClick={addPrompt} className="cta-btn px-4 py-2 text-xs">{t("Add")}</button>
          </div>
          <button onClick={seedDefaultPrompts} className="nav-chip mt-3 text-xs">{t("Seed default prompts")}</button>
          <div className="mt-4 space-y-2">
            {prompts.map((p) => (
              <PromptEditor key={p.id} id={p.id} text={p.text} order={p.order} onSave={updatePrompt} onDelete={removePrompt} />
            ))}
          </div>
        </article>
      </div>

      <article className="panel p-5 rounded-2xl border border-[#452ABC]/30">
        <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3 flex-wrap gap-2">
          <h2 className="font-heading text-xl text-white">{t("Submissions & Grading")}</h2>
          <div className="flex gap-2 items-center">
            <button type="button" onClick={downloadSubmissionsCsv} className="nav-chip text-xs bg-[#452ABC] text-white font-bold px-3 py-1.5 hover:bg-[#452ABC]/80 transition">+ Export Filtered CSV</button>
            
            <select value={submissionTaskFilter} onChange={(e) => setSubmissionTaskFilter(e.target.value)} className="bg-[#0A0A0B] text-xs text-white p-2 rounded-lg border border-white/10 cursor-pointer max-w-[150px] sm:max-w-[200px] truncate">
              <option value="all">Semua Tugas</option>
              {tasks.map((tk) => (
                <option key={tk.id} value={tk.taskId}>{tk.taskId} - {tk.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto text-xs text-white pr-2">
          {filteredSubmissions.length > 0 ? (
            filteredSubmissions.map((sub) => (
              <div key={sub.id} className="p-3 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center hover:bg-black/40 transition">
                <div className="truncate">
                  <p className="font-bold text-[#F6C545] truncate">{sub.taskId} • {sub.taskTitle}</p>
                  <p className="font-mono text-[10px] text-[#E1D9F9]/50 mt-0.5">NIM Peserta: {sub.nim || (sub.submittedBy ? sub.submittedBy.split("@")[0] : "N/A")}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
                  <div className="flex gap-2 items-center mt-1 sm:mt-0">
                    <span className="text-[10px] text-[#E1D9F9]/50 font-mono shrink-0 hidden sm:inline-block mr-1">{formatTime(sub.createdAt)}</span>
                    {sub.submissionType && (
                      <span className="text-[9px] uppercase border border-white/20 px-1.5 py-0.5 rounded text-[#E1D9F9]/50">{sub.submissionType}</span>
                    )}
                    <span className="status-pill text-[10px]">Received</span>
                  </div>
                  {sub.fileUrl && (
                    <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] bg-[#452ABC] px-3 py-1 rounded hover:bg-[#452ABC]/80 transition text-[#E1D9F9]">
                      Buka {sub.submissionType === "link" ? "Tautan" : "File"}
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="p-4 text-center text-[#E1D9F9]/50 italic bg-black/10 rounded-lg border border-white/5">
              Belum ada penugasan masuk untuk filter ID tugas ini.
            </p>
          )}
        </div>
      </article>

      <article className="panel p-5 space-y-4 rounded-2xl border border-[#452ABC]/30">
        <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-white/10 pb-3 gap-3">
          <h2 className="font-heading text-xl text-[#F6C545]">Live Attendance Submission</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button type="button" onClick={downloadAttendanceCsv} className="w-full sm:w-auto nav-chip text-xs bg-[#452ABC] text-white font-bold px-3 py-2 sm:py-1.5 hover:bg-[#452ABC]/80 transition">
              + Export Filtered Attendance CSV
            </button>
            <div className="flex gap-2 w-full sm:w-auto">
              <select value={attendanceDayFilter} onChange={(e) => setAttendanceDayFilter(e.target.value)} className="flex-1 sm:w-auto bg-[#0A0A0B] text-xs text-white p-2 rounded-lg border border-white/10 cursor-pointer outline-none focus:border-[#F6C545]">
                <optgroup label="FASE 2 & 3 (Aktif)">
                  <option value="fase2_1">Fase 2 - Day 1</option>
                  <option value="fase2_2">Fase 2 - Day 2</option>
                  <option value="fase3_5">Fase 3 - Day 5</option>
                  <option value="fase2_4">Fase 2 - Day 4</option>
                  <option value="fase2_5">Fase 2 - Day 5</option>
                  <option value="fase2_6">Fase 2 - Day 6</option>
                </optgroup>
                <optgroup label="FASE 1 (Arsip)">
                  <option value="day_1">Fase 1 - Day 1</option>
                  <option value="day_2">Fase 1 - Day 2</option>
                  <option value="day_3">Fase 1 - Day 3</option>
                  <option value="day_4">Fase 1 - Day 4</option>
                  <option value="day_5">Fase 1 - Day 5</option>
                  <option value="day_6">Fase 1 - Day 6</option>
                </optgroup>
              </select>
              <select value={attendanceTabFilter} onChange={(e) => setAttendanceTabFilter(e.target.value as "awal" | "akhir" | "h1")} className="flex-1 sm:w-auto bg-[#0A0A0B] text-xs text-white p-2 rounded-lg border border-white/10 cursor-pointer outline-none focus:border-[#F6C545]">
                <option value="awal">Check-In</option> <option value="akhir">Check-Out</option> <option value="h1">H-1</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/10 text-xs text-white shadow-inner">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-white/5 text-[#F6C545] border-b border-white/10 whitespace-nowrap">
                <th className="p-3">NIM Data Token</th>
                <th className="p-3">Nama Peserta</th>
                <th className="p-3">Status Indeks</th>
                <th className="p-3">Detail (Catatan/Medis)</th>
                <th className="p-3">Waktu Perekaman</th>
                <th className="p-3">Bukti File</th>
              </tr>
            </thead>
            <tbody>
              {adminAttendanceRecords.length > 0 ? (
                adminAttendanceRecords.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="p-3 font-mono text-[#452ABC] font-bold whitespace-nowrap">{row.nim}</td>
                    <td className="p-3 font-medium min-w-[150px]">{row.fullName}</td>
                    <td className="p-3 whitespace-nowrap"><span className="px-2 py-0.5 rounded bg-white/10 text-[10px] uppercase font-bold">{row.status}</span></td>
                    
                    <td className="p-3 min-w-[200px] break-words whitespace-normal text-[10px] sm:text-[11px] text-[#E1D9F9]/50">
                      {attendanceTabFilter === "awal" && (row.evidenceText || "-")}
                      {attendanceTabFilter === "akhir" && (row.feedback || "-")}
                      
                      {attendanceTabFilter === "h1" && (
                        <>
                          {row.reasonText && row.reasonText !== "-" && (
                            <span className="block mb-1 border-b border-white/5 pb-1">
                              <b className="text-[#F6C545]">Alasan:</b> {row.reasonText}
                            </span>
                          )}
                          <span className="block">
                            <b className={row.condition === "Sedang sakit" ? "text-[#EC5C2A]" : "text-[#452ABC]"}>Medis:</b>{" "}
                            {row.condition === "Sedang sakit" 
                              ? `${row.illnessName} | Gejala: ${row.symptoms} | Obat: ${row.tookMedicine} (${row.medicineName})`
                              : (row.condition || "-")
                            }
                          </span>
                        </>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono text-[10px] text-[#E1D9F9]/50">{formatTime(row.createdAt)}</span>
                    </td>
                    
                    <td className="p-3 whitespace-nowrap">
                      {row.evidenceUrl && row.evidenceUrl !== "-" ? (
                        <a href={row.evidenceUrl} target="_blank" rel="noreferrer" className="nav-chip px-2.5 py-1.5 text-[9px] font-bold">Lihat Bukti</a>
                      ) : (
                        <span className="text-[#E1D9F9]/50 text-[10px] pl-2">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="p-4 text-center text-[#E1D9F9]/50 italic">Belum ada data yang masuk.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function PromptEditor({ id, text, order, onSave, onDelete }: { id: string; text: string; order: number; onSave: (id: string, text: string, order: number) => Promise<void>; onDelete: (id: string) => Promise<void>; }) {
  const [draftText, setDraftText] = useState(text);
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-2 flex gap-2 items-center animate-revealUp">
      <input value={draftText} onChange={(e) => setDraftText(e.target.value)} className="w-full bg-[#0A0A0B]/50 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none" />
      <button type="button" onClick={() => onSave(id, draftText.trim(), order)} className="text-xs text-[#F6C545] font-bold">Save</button>
      <button type="button" onClick={() => onDelete(id)} className="text-xs text-[#EC5C2A] font-bold">Delete</button>
    </div>
  );
}