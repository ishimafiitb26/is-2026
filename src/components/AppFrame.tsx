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

  useEffect(() => {
    if (!loading && !user && !pathname.startsWith("/auth")) {
      router.push("/auth/login");
    }
  }, [user, loading, pathname, router]);

  if (pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
        <p className="text-[#E1D9F9]/60">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredNavItems = navItems.filter((item) => {
    if (item.label === "Admin" && role !== "admin") {
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(246,197,69,0.10),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(236,92,42,0.16),_transparent_45%),linear-gradient(140deg,_#0A0A0B_0%,_#0c0a10_50%,_#060507_100%)]" />
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-[#F6C545]/10 blur-3xl" />
        <div className="absolute right-[-6%] top-[18%] h-80 w-80 rounded-full bg-[#EC5C2A]/16 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[22%] h-96 w-96 rounded-full bg-[#452ABC]/14 blur-3xl" />
      </div>
     
      <header className="sticky top-0 z-20 border-b border-[#E1D9F9]/[0.08] bg-[#0A0A0B]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center shrink-0">
              <NavWrapper items={filteredNavItems} />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <Link href="/" className="font-heading text-xl sm:text-4xl leading-none tracking-[0.08em] text-[#F6C545] truncate">
                INTELLEKTUELLE SCHULE 2026
              </Link>
              <p className="text-[10px] sm:text-sm text-[#E1D9F9]/50" suppressHydrationWarning>
                IS HIMAFI ITB 2026
              </p>
            </div>
          </div>
          
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
