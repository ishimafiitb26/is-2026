"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith("/auth")) {
    return null;
  }

  return (
    <footer className="w-full border-t border-[#452ABC]/40 bg-[#0A0A0B] pt-12 pb-6 mt-auto z-10 relative text-[#E1D9F9]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16 mb-12">
          
          <div className="space-y-4">
            <h2 className="font-heading text-2xl sm:text-3xl tracking-wider text-[#E1D9F9]">
              INTELLEKTUELLE SCHULE <span className="text-[#F6C545]">2026</span>
            </h2>
            <p className="text-[#E1D9F9]/50 text-xs leading-relaxed max-w-sm">
              Official website of INTELLEKTUELLE SCHULE 2026. Portal bagi peserta untuk mengakses informasi penting terutama kehadiran, penugasan, dan pengaturan profil.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-[11px] uppercase tracking-widest text-[#E1D9F9]">QUICK LINKS</h3>
            <div className="flex flex-col gap-2.5 max-w-xs">
              <Link href="/" className="flex items-center justify-between border border-[#452ABC]/40 bg-[#0A0A0B]/50 hover:bg-[#452ABC]/30 transition-colors rounded-lg px-4 py-2.5 text-xs text-[#E1D9F9]">
                <span className="font-medium">Home</span>
                <span className="text-[#F6C545] font-bold">↗</span>
              </Link>
              <Link href="/attendance" className="flex items-center justify-between border border-[#452ABC]/40 bg-[#0A0A0B]/50 hover:bg-[#452ABC]/30 transition-colors rounded-lg px-4 py-2.5 text-xs text-[#E1D9F9]">
                <span className="font-medium">Attendance</span>
                <span className="text-[#F6C545] font-bold">↗</span>
              </Link>
              <Link href="/handbook" className="flex items-center justify-between border border-[#452ABC]/40 bg-[#0A0A0B]/50 hover:bg-[#452ABC]/30 transition-colors rounded-lg px-4 py-2.5 text-xs text-[#E1D9F9]">
                <span className="font-medium">Explore Area</span>
                <span className="text-[#F6C545] font-bold">↗</span>
              </Link>
              <Link href="/portal" className="flex items-center justify-between border border-[#452ABC]/40 bg-[#0A0A0B]/50 hover:bg-[#452ABC]/30 transition-colors rounded-lg px-4 py-2.5 text-xs text-[#E1D9F9]">
                <span className="font-medium">Profile Settings</span>
                <span className="text-[#F6C545] font-bold">↗</span>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-[11px] uppercase tracking-widest text-[#E1D9F9]">CONTACT</h3>
            
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#E1D9F9]">Email</p>
              <a href="mailto:webdevishimafiitb@gmail.com" className="text-xs text-[#E1D9F9]/50 hover:text-[#F6C545] transition-colors">
                webdevishimafiitb@gmail.com
              </a>
            </div>

            <div className="space-y-1 pt-2">
              <p className="text-xs font-bold text-[#E1D9F9]">Address</p>
              <p className="text-xs text-[#E1D9F9]/50 leading-relaxed max-w-xs">
                ITB Kampus Ganesha, Jl. Ganesa No. 10, Coblong, Kota Bandung, Jawa Barat 40132
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-[#E1D9F9]">Social Media</p>
              <div className="flex gap-3">
                <a href="https://instagram.com/ppahimafiitb" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-[#452ABC]/40 bg-[#0A0A0B]/50 flex items-center justify-center text-[#E1D9F9]/50 hover:text-[#F6C545] hover:border-[#F6C545] transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a href="mailto:webdevishimafiitb@gmail.com" className="w-8 h-8 rounded-full border border-[#452ABC]/40 bg-[#0A0A0B]/50 flex items-center justify-center text-[#E1D9F9]/50 hover:text-[#F6C545] hover:border-[#F6C545] transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </a>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-[#452ABC]/40 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-[#E1D9F9]/50">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F6C545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>Built for IS HIMAFI ITB 2026</span>
          </div>
          <div>
            © 2026 IS HIMAFI ITB. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
