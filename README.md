# INTELLEKTUELLE SCHULE 2026 Website

Portal terpusat untuk kebutuhan INTELLEKTUELLE SCHULE 2026: informasi kegiatan, panduan, alur perjalanan acara, dan sistem tugas maba-panitia.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Firebase (Auth + Firestore)
- Cloudinary (asset hosting)

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Jalankan development server:

```bash
pnpm dev
```

3. Buka `http://localhost:3000`.

## Environment Variables

Buat `.env.local` di root project:

```env
# FIREBASE CONFIG
NEXT_PUBLIC_FIREBASE_API_KEY="isi_dengan_api_key_kamu"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="is-2026-xxxx.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="is-2026-xxxx"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="is-2026-xxxx.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="isi_angka"
NEXT_PUBLIC_FIREBASE_APP_ID="isi_app_id"

# CLOUDINARY CONFIG
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="isi_cloud_name_kamu"
```

`.env.local` tidak di-commit karena file env sudah di-ignore oleh `.gitignore`.

## Integrasi yang Sudah Disiapkan

- Firebase client init: `src/lib/firebase.ts`
- Cloudinary domain allowlist untuk Next Image: `next.config.ts`

## SOP Git Workflow (Tim Webdev)

1. Selalu tarik update terbaru:

```bash
git pull origin main
```

2. Buat branch fitur:

```bash
git checkout -b feat/nama-fitur
```

3. Kerjakan 1 fokus fitur per branch.

4. Cek kualitas sebelum commit:

```bash
pnpm lint
pnpm build
```

5. Commit dengan pesan jelas (Conventional Commits), contoh:

```bash
git commit -m "feat: add task upload page"
```

6. Push branch:

```bash
git push origin feat/nama-fitur
```

7. Buka Pull Request ke `main`, lakukan review, lalu merge.

## Visual Direction: Maze Runner Vibe

Pendekatan visual: tegang, misterius, survival, tetapi tetap terbaca jelas di layar HP (mobile-first).

### Color Palette (Rekomendasi)

- `Labyrinth Green` (Primary): `#2E4A3D`
- `Moss Shadow` (Secondary): `#4C6B58`
- `Stone Fog` (Surface): `#C7C3B8`
- `Steel Mist` (UI Neutral): `#8A9490`
- `Signal Amber` (Accent/CTA): `#D8A75B`
- `Danger Ember` (Alert): `#A94A3F`
- `Night Ink` (Text gelap): `#1B1F1D`
- `Fog White` (Text terang): `#F2F1EC`

### UX Notes

- Prioritaskan layout satu kolom di mobile.
- Gunakan kontras tinggi untuk teks penting dan deadline.
- Simpan warna accent untuk CTA penting agar fokus pengguna terarah.
- Tambahkan microcopy empatik untuk menurunkan beban psikologis maba.
