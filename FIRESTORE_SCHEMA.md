# Firestore Schema & Collections Structure

## Overview
Portal ini menggunakan Firestore sebagai database utama dengan real-time updates. Berikut adalah struktur lengkap collections, fields, dan tipe data.

---

## 📚 Collections

### 1. **tasks** (Admin manages)
Daftar tugas yang tersedia untuk peserta.

```
tasks/
├── TASK-001/
│   ├── taskId: string (unique) = "TASK-001"
│   ├── title: string = "Maze Brief Reflection"
│   ├── detail: string = "Write a short reflection..."
│   ├── deadline: string = "Day 3 - 20:00"
│   ├── createdAt: timestamp
│   ├── createdBy: string (admin email)
│   └── isActive: boolean = true
│
├── TASK-002/
│   └── ... (similar structure)
```

**Firestore Rules:**
- Only admin can create/edit
- All users can read
- Peserta submit via `taskSubmissions` collection

---

### 2. **taskSubmissions** (Real-time from Tasks page)
Submissions dari peserta untuk setiap task.

```
taskSubmissions/
├── doc_id_1/
│   ├── taskId: string = "TASK-001"
│   ├── taskTitle: string = "Maze Brief Reflection"
│   ├── note: string = "My reflection notes..."
│   ├── fileUrl: string (Cloudinary URL) = "https://res.cloudinary.com/..."
│   ├── fileName: string = "reflection.pdf"
│   ├── submittedBy: string (peserta name/email)
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── status: string = "submitted" | "graded" | "revision"
│
├── doc_id_2/
│   └── ... (similar structure)
```

**Firestore Rules:**
- Any user can create submissions
- Only admin can update status
- Users can read own submissions + all tasks

---

### 3. **assessments** (Admin grades submissions)
Nilai/feedback untuk task submissions.

```
assessments/
├── assess_id_1/
│   ├── submissionId: string (ref to taskSubmissions doc)
│   ├── taskId: string = "TASK-001"
│   ├── taskTitle: string
│   ├── score: number (0-100)
│   ├── feedback: string = "Great work! Just fix the formatting..."
│   ├── gradedBy: string (admin email)
│   ├── gradedAt: timestamp
│   └── revision: boolean = false
│
├── assess_id_2/
│   └── ... (similar structure)
```

**Firestore Rules:**
- Only admin can create/edit
- Users can read own grades

---

### 4. **attendanceRecords** (Real-time from Attendance page)
Status kehadiran peserta.

```
attendanceRecords/
├── doc_id_1/
│   ├── fullName: string = "Nama Peserta"
│   ├── status: string = "hadir" | "menyusul" | "meninggalkan" | "tidak hadir"
│   ├── evidenceText: string = "Hadir di tempat..."
│   ├── evidenceFileUrl: string (Cloudinary URL)
│   ├── evidenceFileName: string
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── normalizedName: string (untuk dedup)
│
├── doc_id_2/
│   └── ... (similar structure)
```

**Firestore Rules:**
- Any user can submit attendance
- All users can read all records
- Admin can update statuses

---

### 5. **h1Confirmations** (Real-time from H-1 Confirmation page)
Konfirmasi kehadiran untuk hari berikutnya.

```
h1Confirmations/
├── [fullName]/
│   ├── fullName: string
│   ├── status: string = "hadir tepat waktu" | "hadir menyusul" | "izin meninggalkan" | "tidak hadir"
│   ├── reason: string = "-" | "reason text"
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── normalizedName: string
│
└── ... (document id = fullName)
```

**Firestore Rules:**
- Any user can submit H-1 confirmation
- Users can update own confirmation
- Admin can read all

---

### 6. **reflectionNotes** (Real-time from Reflection Board)
Catatan refleksi pseudo-anonymous dari peserta.

```
reflectionNotes/
├── doc_id_1/
│   ├── alias: string = "Group Nova"
│   ├── message: string = "The checklist helps us..."
│   ├── userId: string (unique anonymous ID)
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── isEdited: boolean = false
│
├── doc_id_2/
│   └── ... (similar structure)
```

**Firestore Rules:**
- Any user can create notes
- Users can only edit own notes (check userId)
- All users can read all notes

---

### 7. **reflectionPrompts** (Admin manages, shown on Reflection Board)
Prompt/pertanyaan untuk refleksi peserta.

```
reflectionPrompts/
├── prompt_1/
│   ├── text: string = "What is one small win from today?"
│   ├── order: number = 1
│   ├── isActive: boolean = true
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── createdBy: string (admin email)
│
├── prompt_2/
│   └── ... (similar structure)
```

**Firestore Rules:**
- Only admin can create/edit/delete
- All users can read active prompts

---

### 8. **teamTasks** (Internal Webdev tracking - ADMIN ONLY)
Task board internal tim webdev, peserta tidak boleh lihat.

```
teamTasks/
├── team_task_1/
│   ├── taskId: string = "T-01"
│   ├── owner: string = "Lead" | "Frontend Staff" | "Data Staff"
│   ├── title: string = "Auth flow and route guard"
│   ├── due: string = "Day 4"
│   ├── status: string = "Not Started" | "In Progress" | "Done"
│   ├── description: string = "Setup Firebase Auth..."
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── updatedBy: string (admin email)
│
├── team_task_2/
│   └── ... (similar structure)
```

**Firestore Rules:**
- Only users with admin role can access (read/create/edit/delete)
- Peserta completely blocked dari collection ini

---

### 9. **eventMeta** (Settings & counts)
Metadata event dan jumlah harapan peserta.

```
eventMeta/ (single document: "current")
├── expectedParticipants: number = 50
├── eventStartDate: timestamp = 2026-06-15
├── eventEndDate: timestamp = 2026-06-21
├── committeeTarget: number = 10 (untuk auto-count H-1 not confirmed)
├── totalSubmissions: number (auto-updated)
├── lastUpdated: timestamp
└── updatedBy: string (admin email)
```

**Firestore Rules:**
- Only admin can edit
- All users can read

---

### 10. **adminSettings** (Admin-only config)
Konfigurasi internal admin saja.

```
adminSettings/ (single document: "settings")
├── seedPrompts: array<string> = [
│   "What is one small win from today?",
│   "What part of the process feels heavy right now?",
│   "What kind of support would help your group this week?"
│ ]
├── defaultCommitteeTarget: number = 10
├── seedPromptsExecutedAt: timestamp
└── lastConfigUpdated: timestamp
```

**Firestore Rules:**
- Only admin can read/write
- Completely hidden from peserta

---

## 📊 Data Flow Diagram

```
ADMIN PAGE (/admin)
├─ Create Tasks → tasks collection
├─ Manage Prompts → reflectionPrompts collection
├─ Set Committee Target → eventMeta collection
└─ Grade Submissions → assessments collection

TASKS PAGE (/tasks)
├─ Read tasks collection (real-time)
└─ Submit → taskSubmissions collection
        ↓
ADMIN grades submission
        ↓
assessments collection updated

ATTENDANCE PAGE (/attendance)
├─ Submit attendance → attendanceRecords collection
└─ Read all records (real-time)

H-1 CONFIRMATION PAGE (/h1-confirmation)
├─ Submit H-1 → h1Confirmations collection
└─ Read confirmations (real-time)

REFLECTION BOARD PAGE (/reflection-board)
├─ Read prompts from reflectionPrompts (real-time)
├─ Create notes → reflectionNotes collection
└─ Read all notes (real-time)

PORTAL PAGE (/portal)
├─ Read tasks (summary view)
└─ Read teamTasks (ADMIN ONLY - hidden from peserta)

HOME PAGE (/)
├─ Read taskSubmissions count
├─ Read attendanceRecords count
└─ Read h1Confirmations count
```

---

## 🔐 Security Rules Summary

| Collection | Admin | Peserta | Notes |
|-----------|-------|---------|-------|
| tasks | RWD | R | Only admin publishes |
| taskSubmissions | RWD | C,R (own) | Peserta submit, admin grades |
| assessments | RWD | R (own) | Grades only visible to student |
| attendanceRecords | RWD | C,R | Peserta submit, admin reviews |
| h1Confirmations | RWD | C,RU (own) | Peserta confirm own |
| reflectionNotes | RWD | C,R,D (own) | Peserta own notes only |
| reflectionPrompts | RWD | R | Admin manages prompts |
| teamTasks | RWD | NONE | Completely hidden |
| eventMeta | RWD | R | Settings read-only |
| adminSettings | RWD | NONE | Admin only |

**Legend:** R=Read, W=Write, D=Delete, U=Update, C=Create

---

## 🚀 Implementation Checklist

- [ ] Create Firestore collections manually in console
- [ ] Set up security rules in Firebase
- [ ] Update Tasks page to fetch from `tasks` collection
- [ ] Update Portal to fetch team tasks from `teamTasks` collection
- [ ] Add Task management to Admin page (CRUD)
- [ ] Add Assessment/Grading UI to Admin page
- [ ] Add TeamTask management to Admin page
- [ ] Test real-time updates
- [ ] Test security rules

---

## 📝 Notes

- Use Firestore timestamps (NOT JavaScript Date)
- Always normalize names for deduplication (attendanceRecords, h1Confirmations)
- Cloudinary URLs stored as strings, never embed file binary
- All timestamps use server-side writes for consistency
- Implement optimistic UI updates for better UX
- Cache read-only collections client-side when possible

