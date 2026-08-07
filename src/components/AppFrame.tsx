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
      <div className="min-h-screen flex items-center justify-center bg-[#1b1f1d]">
        <p className="text-[#c8b0a0]">Loading...</p>
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(8,77,88,0.3),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(213,199,87,0.1),_transparent_28%),linear-gradient(140deg,_#0F282F_0%,_#0a1b20_50%,_#050d10_100%)]" />
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-[#084D58]/30 blur-3xl" />
        <div className="absolute right-[-6%] top-[18%] h-80 w-80 rounded-full bg-[#CE4A2D]/15 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[22%] h-96 w-96 rounded-full bg-[#D5C757]/10 blur-3xl" />
      </div>
     
      <header className="sticky top-0 z-20 border-b border-[#084D58]/30 bg-[#0F282F]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center shrink-0">
              <NavWrapper items={filteredNavItems} />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <Link href="/" className="font-heading text-xl sm:text-4xl leading-none tracking-[0.08em] text-[#F2EDEC] truncate">
                INTELLEKTUELLE SCHULE 2026
              </Link>
              <p className="text-[10px] sm:text-sm text-[#D7DCD5]" suppressHydrationWarning>
                IS HIMAFI ITB 2026
              </p>
            </div>
          </div>
          
          <div className="hidden sm:flex flex-col items-end gap-1 text-sm shrink-0">
            <p className="text-[#D7DCD5] font-medium">{user?.email}</p>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-[#D5C757] hover:bg-[#e8da6f] text-[#0F282F] rounded text-xs font-bold transition shadow-sm"
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