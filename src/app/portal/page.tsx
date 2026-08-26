"use client";

import { useState, useEffect, FormEvent } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useI18n } from "@/components/I18nProvider";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { getCurrentTimestamp } from "@/lib/engagement";

export default function PortalPage() {
  const { t } = useI18n();
  const { role, loading, user } = useAuth();
  
  const [name, setName] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [biodata, setBiodata] = useState<string>("");

  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");

  const [profileMessage, setProfileMessage] = useState<string>("");
  const [passwordMessage, setPasswordMessage] = useState<string>("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const studentNIM = user?.email ? user.email.split("@")[0] : "UNKNOWN";

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || "");
        setNickname(data.nickname || "");
        setBiodata(data.biodata || "");
      }
    }, (error) => {
      console.debug(error.message);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsUpdatingProfile(true);
    setProfileMessage("");

    try {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email || "",
        name: name.trim(),
        nickname: nickname.trim(),
        biodata: biodata.trim(),
        updatedAt: getCurrentTimestamp(),
      }, { merge: true });

      setProfileMessage("Data informasi profil berhasil disimpan ke sistem.");
    } catch (err: unknown) {
      const failMessage = err instanceof Error ? err.message : "Database pipeline error.";
      setProfileMessage(`Gagal menyimpan profil: ${failMessage}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    if (!oldPassword.trim() || !newPassword.trim()) {
      setPasswordMessage("Seluruh kolom verifikasi kata sandi wajib diisi.");
      return;
    }

    if (newPassword.trim().length < 6) {
      setPasswordMessage("Kata sandi baru minimal harus terdiri dari 6 karakter.");
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMessage("");

    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword.trim());
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword.trim());

      setPasswordMessage("Kata sandi akses Anda berhasil diperbarui.");
      setOldPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      const failMessage = err instanceof Error ? err.message : "Authentication network failure.";
      if (failMessage.includes("wrong-password")) {
        setPasswordMessage("Ganti password gagal: Kata sandi lama yang Anda masukkan salah.");
      } else {
        setPasswordMessage(`Ganti password gagal: ${failMessage}`);
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-[#E1D9F9]/50">{t("Loading...")}</div>;

  return (
    <section className="space-y-6">
      <header className="panel p-6">
        <p className="status-pill">{role === "admin" ? "Admin Mode" : "Peserta Mode"}</p>
        <h1 className="mt-2 font-heading text-4xl text-[#E1D9F9] tracking-wider">{t("Profile Settings")}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <article className="panel p-6 space-y-4">
          <h2 className="font-heading text-2xl text-[#F6C545] tracking-wide">Identity Information</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 mb-1">Username / NIM</label>
              <input type="text" value={studentNIM} disabled className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[#E1D9F9] opacity-40 text-sm font-mono font-bold outline-none" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 mb-1">Full Identity Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Lengkap" className="w-full bg-black/20 border border-white/15 rounded-xl px-3 py-2.5 text-[#E1D9F9] text-sm outline-none focus:border-[#F6C545] transition" required />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 mb-1">Nickname</label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nama Panggilan" className="w-full bg-black/20 border border-white/15 rounded-xl px-3 py-2.5 text-[#E1D9F9] text-sm outline-none focus:border-[#F6C545] transition" required />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#E1D9F9]/50 mb-1">Personal Bio</label>
              <textarea value={biodata} onChange={(e) => setBiodata(e.target.value)} placeholder="Tulis bio jika perlu" className="w-full bg-black/20 border border-white/15 rounded-xl px-3 py-2 text-xs text-[#E1D9F9] outline-none focus:border-[#F6C545] transition" rows={3} required />
            </div>
            
            {profileMessage && <p className="text-xs font-mono text-[#F6C545] bg-black/10 p-2 rounded-lg border border-white/5">{profileMessage}</p>}
            
            <button type="submit" disabled={isUpdatingProfile} className="cta-btn w-full py-2.5 text-xs uppercase tracking-wider">
              {isUpdatingProfile ? "Syncing Identity..." : "Save Identity Changes"}
            </button>
          </form>
        </article>

        <article className="panel p-6 space-y-4">
          <h2 className="font-heading text-2xl text-[#EC5C2A] tracking-wide">Security & Password</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <p className="text-xs text-[#E1D9F9]/50 leading-relaxed">
              Masukkan kata sandi lama sebelum membuat kata sandi baru.
            </p>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#EC5C2A] mb-1 font-semibold">Current Password (Kata Sandi Lama)</label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••••" className="w-full bg-black/20 border border-white/15 rounded-xl px-3 py-2.5 text-[#E1D9F9] text-sm outline-none focus:border-[#EC5C2A] transition" required />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#F6C545] mb-1 font-semibold">New Operational Password (Kata Sandi Baru)</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter baru..." className="w-full bg-black/20 border border-white/15 rounded-xl px-3 py-2.5 text-[#E1D9F9] text-sm outline-none focus:border-[#F6C545] transition" required />
            </div>

            {passwordMessage && <p className="text-xs font-mono text-[#F6C545] bg-black/10 p-2.5 rounded-lg border border-white/5">{passwordMessage}</p>}

            <button type="submit" disabled={isUpdatingPassword} className="w-full py-2.5 bg-[#EC5C2A] hover:bg-[#c44a20] disabled:opacity-40 text-[#E1D9F9] font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg">
              {isUpdatingPassword ? "Encrypting Key..." : "Save New Password"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}