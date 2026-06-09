import { collection, doc, serverTimestamp, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export type AttendanceStatus = "hadir" | "menyusul" | "meninggalkan" | "tidak hadir";
export type H1Status = "hadir tepat waktu" | "hadir menyusul" | "izin meninggalkan" | "tidak hadir";

export type AttendanceRecord = {
  fullName: string;
  status: AttendanceStatus;
  evidenceText: string;
  evidenceUrl?: string;
  evidencePublicId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type H1ConfirmationRecord = {
  fullName: string;
  status: H1Status;
  reason: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type EventMeta = {
  expectedParticipants?: number;
  updatedAt?: Timestamp;
};

export type ReflectionPrompt = {
  text: string;
  order: number;
  updatedAt?: Timestamp;
};

export type ReflectionNote = {
  alias: string;
  message: string;
  x: number;
  y: number;
  rotate: number;
  createdAt?: Timestamp;
  userId?: string;
};

export type TaskSubmission = {
  taskId: string;
  taskTitle: string;
  note: string;
  fileUrl?: string;
  fileName?: string;
  createdAt?: Timestamp;
};

export type Task = {
  taskId: string;
  title: string;
  detail: string;
  deadline: string;
  isActive: boolean;
  handbookUrl?: string;
  handbookPublicId?: string;
  taskFileUrl?: string;
  taskFilePublicId?: string;
  fileName?: string;
  createdAt?: Timestamp;
  createdBy?: string;
};

export type TeamTask = {
  taskId: string;
  owner: "Lead" | "Frontend Staff" | "Data Staff";
  title: string;
  due: string;
  status: "Not Started" | "In Progress" | "Done";
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
};

export type Assessment = {
  submissionId: string;
  taskId: string;
  taskTitle: string;
  score: number;
  feedback: string;
  gradedBy: string;
  gradedAt?: Timestamp;
  revision: boolean;
};

export type Announcement = {
  title: string;
  content: string;
  links?: Array<{ label: string; url: string }>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  updatedBy?: string;
};

export const attendanceCollectionRef = collection(db, "attendance_records");
export const h1CollectionRef = collection(db, "h1_confirmations");
export const eventMetaRef = doc(db, "event_meta", "current");
export const reflectionPromptsCollectionRef = collection(db, "reflection_prompts");
export const reflectionNotesCollectionRef = collection(db, "reflection_notes");
export const taskSubmissionsCollectionRef = collection(db, "task_submissions");
export const tasksCollectionRef = collection(db, "tasks");
export const teamTasksCollectionRef = collection(db, "team_tasks");
export const assessmentsCollectionRef = collection(db, "assessments");
export const announcementsCollectionRef = collection(db, "announcements");

export function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function attendanceDocRef(fullName: string) {
  return doc(db, "attendance_records", normalizeName(fullName));
}

export function h1DocRef(fullName: string) {
  return doc(db, "h1_confirmations", normalizeName(fullName));
}

export function taskDocRef(taskId: string) {
  return doc(db, "tasks", taskId);
}

export function teamTaskDocRef(taskId: string) {
  return doc(db, "team_tasks", taskId);
}

export function assessmentDocRef(submissionId: string) {
  return doc(db, "assessments", submissionId);
}

export async function uploadEvidenceToCloudinary(file: File, folder: string) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload evidence to Cloudinary.");
  }

  return (await response.json()) as {
    secure_url: string;
    public_id: string;
  };
}

export function getCurrentTimestamp() {
  return serverTimestamp();
}