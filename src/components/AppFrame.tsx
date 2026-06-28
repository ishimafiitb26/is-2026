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
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
        <p className="text-[#E1D9F9]/60">Loading...</p>
      </div>
    );
  }

  // If not logged in, don't render the frame (will redirect via useEffect)
  if (!user) {
    return null;
  }

  // Filter nav items berdasarkan role
  const filteredNavItems = navItems.filter((item) => {
    if (item.label === "Admin" && role !== "admin") {
      return false;
    }
    // Profile Settings (Portal Access) sekarang dibuka untuk semua role
    return true;
  });

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(246,197,69,0.10),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(236,92,42,0.16),_transparent_45%),linear-gradient(140deg,_rgba(10,10,11,0.55)_0%,_rgba(12,10,16,0.60)_50%,_rgba(6,5,7,0.65)_100%)]" />
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-[#F6C545]/10 blur-3xl" />
        <div className="absolute right-[-6%] top-[18%] h-80 w-80 rounded-full bg-[#EC5C2A]/16 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[22%] h-96 w-96 rounded-full bg-[#452ABC]/14 blur-3xl" />
      </div>
     
      <header className="sticky top-0 z-20 border-b border-[#E1D9F9]/[0.08] bg-[#0A0A0B]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          
          {/* Sisi Kiri: Tombol Sparkle & Judul (Aktif Global di Semua Layar) */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center shrink-0">
              <NavWrapper items={filteredNavItems} />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <Link href="/" className="font-heading text-xl sm:text-4xl leading-none tracking-[0.08em] text-[#F6C545] truncate">
                INTELLEKTUELLE SCHULE 2026
              </Link>
              <p className="text-[10px] sm:text-sm text-[#E1D9F9]/50" suppressHydrationWarning>
                Project Hail Mary Operations
              </p>
            </div>
          </div>
          
          {/* Sisi Kanan: Info Akun & Logout Ringkas untuk Desktop */}
          <div className="hidden sm:flex flex-col items-end gap-1 text-sm shrink-0">
            <p className="text-[#E1D9F9] font-medium">{user?.email}</p>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-[#F6C545] hover:bg-[#EC5C2A] text-[#0A0A0B] rounded text-xs font-bold transition shadow-sm"
            >
              Logout
            </button>
          </div>

        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6 sm:px-6">{children}</main>
    </>
  );
}