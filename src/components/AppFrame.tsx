"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import NavWrapper from "./NavWrapper";
import { useI18n } from "./I18nProvider";
import { useAuth } from "./AuthProvider";

export default function AppFrame({
  navItems,
  children,
}: {
  navItems: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if not authenticated (except for login page)
  useEffect(() => {
    if (!loading && !user && !pathname.startsWith("/auth")) {
      router.push("/auth/login");
    }
  }, [user, loading, pathname, router]);

  // Don't show header/nav on login page
  if (pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1b1f1d]">
        <p className="text-[#c8b0a0]">Loading...</p>
      </div>
    );
  }

  // If not logged in, don't render the frame (will redirect via useEffect)
  if (!user) {
    return null;
  }

  // Filter nav items based on role
  const filteredNavItems = navItems.filter((item) => {
    if (item.label === "Admin" && role !== "admin") {
      return false;
    }
    if (item.label === "Portal Access" && role !== "admin") {
      return false;
    }
    return true;
  });

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: "radial-gradient(circle at top left, rgba(8, 77, 88, 0.3), transparent 34%), radial-gradient(circle at top right, rgba(213, 199, 87, 0.1), transparent 28%), linear-gradient(140deg, #0F282F 0%, #0a1b20 50%, #050d10 100%)"
          }}
        />
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-[#084D58]/30 blur-3xl" />
        <div className="absolute right-[-6%] top-[18%] h-80 w-80 rounded-full bg-[#CE4A2D]/15 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[22%] h-96 w-96 rounded-full bg-[#D5C757]/10 blur-3xl" />
        {/* Hapus class "maze-overlay" jika kamu tidak mau ada motif jaring labirin lagi, atau biarkan jika motif titik-titiknya masih cocok */}
      </div>
      <header className="sticky top-0 z-20 border-b border-[#084D58]/50 bg-[#0F282F]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Link href="/" className="font-heading text-6xl leading-none tracking-[0.08em] text-[#F2EDEC]">
                INTELLEKTUELLE SCHULE 2026
              </Link>
              {/* Teks di bawah ini sekalian udah diubah jadi tema baru ya */}
              <p className="text-sm text-[#D7DCD5]" suppressHydrationWarning>{t("Project Hail Mary Operations")}</p>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <p className="text-[#D7DCD5]">{user?.email}</p>
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-[#D5C757] hover:bg-[#b8ac4b] text-[#0F282F] rounded text-sm font-semibold transition"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <NavWrapper items={filteredNavItems} />
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6 sm:px-6">{children}</main>
    </>
  );
}
