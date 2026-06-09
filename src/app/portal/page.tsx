"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { setDoc, doc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { useI18n } from "../../components/I18nProvider";
import { useAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import { getCurrentTimestamp } from "../../lib/engagement";

export default function PortalPage() {
  const { t } = useI18n();
  const { role, loading, user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    biodata: "",
    newPassword: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");

  // Protect: only admin can access this page
  useEffect(() => {
    if (!loading && role !== "admin") {
      router.push("/");
    }
  }, [role, loading, router]);

  if (loading) {
    return <div className="text-center py-8 text-[#c8b0a0]">{t("Loading...")}</div>;
  }

  if (role !== "admin") {
    return (
      <div className="bg-red-900/20 border border-red-600/50 rounded p-4 text-red-200">
        <p>{t("Unauthorized")}</p>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage("");
    
    try {
      if (!user?.uid) {
        setMessage(t("Failed to update profile."));
        setIsUpdating(false);
        return;
      }

      // Update password if provided
      if (formData.newPassword.trim()) {
        if (user) {
          await updatePassword(user, formData.newPassword);
        }
      }

      // Save profile data to Firestore users collection
      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email,
          name: formData.name || "",
          nickname: formData.nickname || "",
          biodata: formData.biodata || "",
          updatedAt: getCurrentTimestamp(),
        },
        { merge: true }
      );

      setMessage(t("Profile updated successfully."));
      setFormData({
        ...formData,
        newPassword: "",
      });
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(t("Failed to update profile."));
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="panel p-6 sm:p-7">
          <p className="status-pill">{t("Committee Access")}</p>
          <h2 className="mt-3 font-heading text-4xl tracking-wider text-[#f2f1ec]">{t("Admin Dashboard")}</h2>
          <p className="mt-3 text-[#ddd8cb]">
            {t("Publish tasks, set deadlines, monitor completion status, and review attendance confirmations.")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/admin" className="cta-btn inline-flex px-4 py-2">
              {t("Admin")}
            </Link>
          </div>
        </article>

        <article className="panel p-6 sm:p-7">
          <p className="status-pill">{t("Account Settings")}</p>
          <h2 className="mt-3 font-heading text-2xl tracking-wider text-[#f2f1ec]">{t("Profile Settings")}</h2>
          <p className="mt-3 text-[#ddd8cb]">
            {t("Update your account information and preferences.")}
          </p>
          
          <form onSubmit={handleUpdateProfile} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm text-[#c8b0a0] mb-2">{t("Email")}</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full bg-white/5 border border-white/15 rounded px-3 py-2 text-[#f2f1ec] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm text-[#c8b0a0] mb-2">{t("Full Name")}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your full name"
                className="w-full bg-white/5 border border-white/15 rounded px-3 py-2 text-[#f2f1ec] placeholder-[#8b7d72]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#c8b0a0] mb-2">Nickname</label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                placeholder="Your nickname"
                className="w-full bg-white/5 border border-white/15 rounded px-3 py-2 text-[#f2f1ec] placeholder-[#8b7d72]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#c8b0a0] mb-2">Biodata</label>
              <textarea
                name="biodata"
                value={formData.biodata}
                onChange={handleInputChange}
                placeholder="Tell us about yourself"
                rows={3}
                className="w-full bg-white/5 border border-white/15 rounded px-3 py-2 text-[#f2f1ec] placeholder-[#8b7d72]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#c8b0a0] mb-2">{t("New Password")}</label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Leave blank to keep current password"
                className="w-full bg-white/5 border border-white/15 rounded px-3 py-2 text-[#f2f1ec] placeholder-[#8b7d72]"
              />
            </div>

            {message && (
              <p className={`text-sm ${message.includes("successfully") ? "text-green-400" : "text-red-400"}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full cta-btn px-4 py-2 disabled:opacity-50"
            >
              {isUpdating ? t("Updating...") : t("Save Changes")}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
