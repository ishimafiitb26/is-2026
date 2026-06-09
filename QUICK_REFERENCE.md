# IS-2026 Firebase Implementation - Quick Reference

## ✅ What's Ready (No More Changes Needed)

### Code Files
- `src/lib/engagement.ts` - 3 new types + 3 collection refs ✅
- `src/app/tasks/page.tsx` - Real-time Firestore tasks ✅
- `src/app/portal/page.tsx` - Real-time team tasks ✅
- `src/app/admin/page.tsx` - Full task management UI ✅

### Build Status
```
pnpm build        ✅ PASS (all 13 routes)
pnpm lint         ✅ PASS (no errors)
TypeScript        ✅ PASS (no type errors)
```

### Documentation
- `IMPLEMENTATION_SUMMARY.md` - Full details ✅
- `FIRESTORE_SETUP.md` - Setup guide ✅
- `firestore.rules` - Security rules ✅
- `FIRESTORE_SCHEMA.md` - Collection structure ✅

---

## 🚀 Next Steps (DO THESE NEXT)

### Step 1: Seed Sample Data (15 minutes)
**Location**: Firebase Console → Firestore  
**Action**: Create these documents:

```
Collection: tasks
├─ TASK-01: title="Maze Brief Reflection", deadline="Day 3 - 20:00"
├─ TASK-02: title="Group Identity Card", deadline="Day 5 - 18:00"
└─ TASK-03: title="Challenge Submission", deadline="Day 7 - 21:00"

Collection: team_tasks
├─ T-01: owner="Lead", status="In Progress"
├─ T-02: owner="Lead", status="Done"
├─ T-03: owner="Frontend Staff", status="In Progress"
├─ T-04: owner="Frontend Staff", status="Not Started"
├─ T-05: owner="Data Staff", status="In Progress"
└─ T-06: owner="Data Staff", status="Not Started"
```

**Verify**: 
- [ ] `/tasks` shows TASK-01, TASK-02, TASK-03
- [ ] `/portal` shows T-01 through T-06 with status

### Step 2: Deploy Security Rules (10 minutes)
**Option A - Firebase CLI**:
```bash
firebase deploy --only firestore:rules
```

**Option B - Console**:
1. Go to Firestore → Rules tab
2. Copy `firestore.rules` file content
3. Paste into editor
4. Click Publish

**Verify**:
- [ ] Login as peserta → Try `/admin` → Should redirect
- [ ] Peserta cannot access `team_tasks` (security rule blocks)
- [ ] Admin can see everything

### Step 3: Configure Admin Access (5 minutes)
1. **Create `admin_emails` collection** in Firestore
2. **Create `list` document** with field:
   ```
   emails (array): [
     "admin@is2026.com",
     "lead@is2026.com",
     "frontend@is2026.com",
     "data@is2026.com"
   ]
   ```
3. **Set environment variable** in `.env.local`:
   ```env
   NEXT_PUBLIC_ADMIN_EMAILS=admin@is2026.com,lead@is2026.com,frontend@is2026.com,data@is2026.com
   ```
4. **Create users in Firebase Auth** with above emails

**Verify**:
- [ ] Admin can login to `/admin`
- [ ] Non-admin gets "Unauthorized" message

### Step 4: Test Complete Flow (20 minutes)
- [ ] Open `/tasks` → Select task → Submit with file
- [ ] Login as admin → `/admin` → See submission
- [ ] Create new task "TASK-04" → Check `/tasks` updates instantly
- [ ] Change team task T-01 status → Check `/portal` updates
- [ ] Peserta tries to access `team_tasks` in console → Security error

---

## 📁 File Reference

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/engagement.ts` | Types & collection refs | ✅ Ready |
| `src/app/tasks/page.tsx` | Task submission UI | ✅ Ready |
| `src/app/portal/page.tsx` | Team task board | ✅ Ready |
| `src/app/admin/page.tsx` | Management dashboard | ✅ Ready |
| `firestore.rules` | Security rules | 📋 Deploy needed |
| `FIRESTORE_SETUP.md` | Detailed setup guide | 📖 Reference |
| `.env.local` | Admin emails config | ⚙️ Update needed |

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Tasks not showing | Seed TASK-01, TASK-02, TASK-03 in Firebase |
| Peserta sees team tasks | Deploy `firestore.rules` to block access |
| Admin login fails | Add email to `admin_emails/list` document |
| Real-time not updating | Hard refresh browser (Ctrl+Shift+R) |
| Build errors | Run `pnpm install` then `pnpm build` |

---

## 💡 Key Commands

```bash
# Build
pnpm build

# Check lint
pnpm lint

# Deploy security rules
firebase deploy --only firestore:rules

# View Firestore locally
firebase emulators:start

# Start dev server
pnpm dev
```

---

## 📊 Collections Overview

```
tasks/                          [PUBLIC - peserta reads active only]
├─ TASK-01 ← Users submit here
├─ TASK-02
└─ TASK-03

task_submissions/               [INTERNAL - all submissions tracked]
├─ submission-1 (from TASK-01)
├─ submission-2 (from TASK-02)
└─ ...

team_tasks/                     [ADMIN-ONLY - peserta blocked]
├─ T-01 (Lead)
├─ T-02 (Lead)
├─ T-03 (Frontend)
├─ T-04 (Frontend)
├─ T-05 (Data)
└─ T-06 (Data)

assessments/                    [ADMIN writes, peserta sees own]
├─ assessment-1 (score for submission-1)
└─ ...
```

---

## 🎯 Success Criteria

### Setup Complete When:
1. ✅ All 13 Next.js routes build & prerender
2. ✅ `/tasks` displays real task list from Firestore
3. ✅ `/admin` can create/edit tasks and team tasks
4. ✅ `/portal` shows team tasks and updates in real-time
5. ✅ Peserta cannot see `team_tasks` collection (403 error)
6. ✅ Admin users can login; non-admins cannot
7. ✅ All data changes sync across pages within 2 seconds

---

## 📞 Questions?

Refer to:
- **FIRESTORE_SETUP.md** for step-by-step setup
- **FIRESTORE_SCHEMA.md** for collection structure
- **IMPLEMENTATION_SUMMARY.md** for technical details

---

**Status**: Implementation Complete ✅  
**Next Action**: Seed sample data  
**Estimated Time to Full Setup**: ~50 minutes
