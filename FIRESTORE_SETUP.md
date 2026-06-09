# Firebase Firestore Setup Guide - IS-2026

## 📋 Table of Contents
1. [Firebase Console Setup](#firebase-console-setup)
2. [Seed Sample Data](#seed-sample-data)
3. [Security Rules Deployment](#security-rules-deployment)
4. [Admin Email Configuration](#admin-email-configuration)
5. [Testing Checklist](#testing-checklist)

---

## 🔧 Firebase Console Setup

### Step 1: Navigate to Firestore Database
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **is-2026**
3. Go to **Build** → **Firestore Database**
4. Ensure database is in **production mode** (not test mode)

### Step 2: Create Collections (Manual or Automatic)
The following collections will be **auto-created** when first documents are added:
- `reflection_prompts` ✅
- `reflection_notes` ✅  
- `attendance_records` ✅
- `h1_confirmations` ✅
- `task_submissions` ✅
- `tasks` → **CREATE NOW** (Step 3)
- `team_tasks` → **CREATE NOW** (Step 3)
- `assessments` → **CREATE NOW** (Step 3)
- `event_meta` ✅ (already has "current" document)
- `admin_emails` → **CREATE NOW** (Step 5)

---

## 📝 Seed Sample Data

### Tasks Collection

Create sample tasks using Firebase Console or CLI:

```firestore
Collection: tasks
Documents:

1. TASK-01
   taskId: "TASK-01"
   title: "Maze Brief Reflection"
   detail: "Write a short reflection about the opening session and upload a PDF or image."
   deadline: "Day 3 - 20:00"
   isActive: true
   createdAt: <server-timestamp>
   createdBy: "admin@is2026.com"

2. TASK-02
   taskId: "TASK-02"
   title: "Group Identity Card"
   detail: "Create a visual group identity card with member names and mentor code."
   deadline: "Day 5 - 18:00"
   isActive: true
   createdAt: <server-timestamp>
   createdBy: "admin@is2026.com"

3. TASK-03
   taskId: "TASK-03"
   title: "Challenge Submission"
   detail: "Submit the final challenge answer using the provided template."
   deadline: "Day 7 - 21:00"
   isActive: true
   createdAt: <server-timestamp>
   createdBy: "admin@is2026.com"
```

### Team Tasks Collection

Create sample team tasks:

```firestore
Collection: team_tasks
Documents:

1. T-01
   taskId: "T-01"
   owner: "Lead"
   title: "Auth flow and route guard"
   due: "Day 4"
   status: "In Progress"
   createdAt: <server-timestamp>
   updatedAt: <server-timestamp>
   updatedBy: "lead@is2026.com"
   description: "Implement Firebase Auth and protected routes"

2. T-02
   taskId: "T-02"
   owner: "Lead"
   title: "Firebase and Cloudinary integration"
   due: "Day 3"
   status: "Done"
   createdAt: <server-timestamp>
   updatedAt: <server-timestamp>
   updatedBy: "lead@is2026.com"
   description: "Complete setup of Firebase services"

3. T-03
   taskId: "T-03"
   owner: "Frontend Staff"
   title: "Slice Journey Map and FAQ UI"
   due: "Day 5"
   status: "In Progress"
   createdAt: <server-timestamp>
   updatedAt: <server-timestamp>
   updatedBy: "frontend@is2026.com"
   description: "Build responsive UI components"

4. T-04
   taskId: "T-04"
   owner: "Frontend Staff"
   title: "Empty and loading states polish"
   due: "Day 7"
   status: "Not Started"
   createdAt: <server-timestamp>
   updatedAt: <server-timestamp>
   updatedBy: "frontend@is2026.com"
   description: "Fine-tune edge cases and loading UX"

5. T-05
   taskId: "T-05"
   owner: "Data Staff"
   title: "Firestore schema and data dictionary"
   due: "Day 4"
   status: "In Progress"
   createdAt: <server-timestamp>
   updatedAt: <server-timestamp>
   updatedBy: "data@is2026.com"
   description: "Document all collections and fields"

6. T-06
   taskId: "T-06"
   owner: "Data Staff"
   title: "Python script for bulk account injection"
   due: "Day 6"
   status: "Not Started"
   createdAt: <server-timestamp>
   updatedAt: <server-timestamp>
   updatedBy: "data@is2026.com"
   description: "Automate user account creation"
```

### Quick Add via Firebase Console
1. Click "Add Collection" → Name: `tasks`
2. Click "Add Document" → Set document ID: `TASK-01`
3. Add fields:
   - `taskId` (string): "TASK-01"
   - `title` (string): "Maze Brief Reflection"
   - `detail` (string): "Write a short reflection about the opening session..."
   - `deadline` (string): "Day 3 - 20:00"
   - `isActive` (boolean): true
   - `createdAt` (timestamp): Current timestamp
   - `createdBy` (string): "admin@is2026.com"
4. Repeat for `TASK-02` and `TASK-03`
5. Create `team_tasks` collection and add `T-01` through `T-06` similarly

---

## 🔐 Security Rules Deployment

### Option A: Deploy via Firebase CLI

```bash
# 1. Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Initialize Firebase in project (if not done)
firebase init

# 4. Deploy security rules
firebase deploy --only firestore:rules
```

### Option B: Deploy via Firebase Console

1. Go to **Firestore Database** → **Rules** tab
2. Copy entire content from `firestore.rules` file
3. Click **Edit rules**
4. Replace existing rules with copied content
5. Click **Publish**

### Security Rules Summary

The rules implement:

| Collection | peserta Read | peserta Write | Admin Read | Admin Write |
|-----------|---------|----------|----------|----------|
| `tasks` | Active only | ❌ | ✅ | ✅ |
| `team_tasks` | ❌ | ❌ | ✅ | ✅ |
| `assessments` | Own only | ❌ | ✅ | ✅ |
| `attendance_records` | ❌ | Own | ✅ | ✅ |
| `h1_confirmations` | ❌ | Own | ✅ | ✅ |
| `reflection_*` | ✅ | Own | ✅ | ✅ |
| `event_meta` | ✅ | ❌ | ✅ | ✅ |

---

## 👤 Admin Email Configuration

### Step 1: Create admin_emails Collection
1. In Firebase Console, manually create collection: `admin_emails`
2. Create document with ID: `list`
3. Add field:
   - Field name: `emails` (array)
   - Values (array of emails):
     ```
     "admin@is2026.com"
     "lead@is2026.com"
     "frontend@is2026.com"
     "data@is2026.com"
     ```

### Step 2: Set Environment Variable
Ensure `.env.local` contains:
```env
NEXT_PUBLIC_ADMIN_EMAILS=admin@is2026.com,lead@is2026.com,frontend@is2026.com,data@is2026.com
```

### Step 3: Create Firebase Auth Users
1. Go to Firebase Console → **Build** → **Authentication**
2. Create users with emails from `admin_emails` collection
3. Temporarily set passwords (users will reset on first login)

---

## ✅ Testing Checklist

### Scenario 1: Task Submission Flow
- [ ] Login as peserta (non-admin) user
- [ ] Navigate to `/tasks`
- [ ] Verify **Tasks List** displays sample tasks (TASK-01, TASK-02, TASK-03)
- [ ] Select task and submit with file/note
- [ ] Verify submission appears in real-time
- [ ] Check Firebase `task_submissions` collection shows new document

### Scenario 2: Admin Task Management
- [ ] Login as admin user
- [ ] Navigate to `/admin`
- [ ] Verify **Task Management** section shows existing tasks
- [ ] Create new task "TASK-04" with title and deadline
- [ ] Verify new task appears in Tasks page within seconds
- [ ] Delete one task and verify removal from both pages

### Scenario 3: Team Task Management
- [ ] In `/admin`, go to **Team Task Management**
- [ ] Verify Team Tasks display (T-01 through T-06)
- [ ] Change T-01 status from "In Progress" → "Done"
- [ ] Navigate to `/portal` and verify status updated in real-time
- [ ] Create new team task "T-07" and verify in Portal

### Scenario 4: Team Task Blocking (Peserta)
- [ ] Login as peserta user
- [ ] Try to access Firestore directly (DevTools):
  ```javascript
  // This should be blocked by security rules
  db.collection('team_tasks').getDocs()
  ```
- [ ] Verify error: "Missing or insufficient permissions"
- [ ] Navigate to `/portal` - Team Task Board should NOT display (only admin visible)

### Scenario 5: Assessment/Grading
- [ ] Submit a task as peserta
- [ ] Login as admin
- [ ] Go to `/admin` → **Submissions & Grading**
- [ ] Verify submission appears in list
- [ ] Grade submission (future: add score and feedback)
- [ ] Verify assessment saved to Firestore

### Scenario 6: Real-time Sync Across Tabs
- [ ] Open `/admin` in one browser tab
- [ ] Open `/portal` in another tab (peserta account)
- [ ] Admin creates new team task
- [ ] Verify new task appears instantly in Portal (within 1-2 seconds)

---

## 🐛 Troubleshooting

### Issue: Tasks not showing in `/tasks` page
**Solution:**
- Check Firestore Console: Collection `tasks` exists?
- Verify documents have `isActive: true`
- Check browser console for Firebase errors
- Ensure `.env.local` has correct Firebase config

### Issue: "Missing or insufficient permissions" error
**Solution:**
- Verify security rules deployed (`firebase deploy --only firestore:rules`)
- Check user is authenticated (Firebase Auth)
- Verify user email in `NEXT_PUBLIC_ADMIN_EMAILS` for admin operations
- Peserta should only access public collections

### Issue: Team tasks visible to peserta
**Solution:**
- Deploy security rules from `firestore.rules` file
- Verify rule blocking for `team_tasks` collection
- Check browser Network tab → Firestore calls should fail with 403

### Issue: Real-time updates not working
**Solution:**
- Verify browser console shows no Firebase errors
- Check Network tab for onSnapshot listeners
- Ensure Firestore indexes created (Firebase suggests auto-creation)
- Try hard refresh (Ctrl+Shift+R) to reload listeners

---

## 📚 References
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI Documentation](https://firebase.google.com/docs/cli)
- [Real-time Listeners](https://firebase.google.com/docs/firestore/query-data/listen)

---

## 🚀 Next Steps After Setup
1. ✅ Seed sample tasks and team tasks
2. ✅ Deploy security rules
3. ✅ Configure admin emails
4. ✅ Test all scenarios above
5. 🔄 Implement assessment grading UI (in-progress)
6. 🔄 Add user dashboard for viewing own assessments
7. 🔄 Create bulk user import script
