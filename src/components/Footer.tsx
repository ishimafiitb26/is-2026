import React from "react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#084D58]/40 bg-[#0F282F]/80 backdrop-blur-md py-8 mt-auto z-10 relative">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-5 text-[#aaa391] text-[11px] sm:text-xs px-4">
        
        {/* KELOMPOK KONTAK & SOSMED */}
        <div className="flex flex-col items-center gap-2.5">
          {/* Instagram Link */}
          <a 
            href="https://instagram.com/ppahimafiitb" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 hover:text-[#D5C757] transition-colors duration-300"
          >
            {/* Icon Instagram SVG Murni (Tanpa install library) */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            <span className="font-medium tracking-wide">@ppahimafiitb</span>
          </a>

          {/* Email Support Link */}
          <a 
            href="mailto:webdevishimafiitb@gmail.com" 
            className="flex items-center gap-2 hover:text-[#D5C757] transition-colors duration-300"
          >
            {/* Icon Email/Mail SVG Murni */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span className="font-medium tracking-wide">webdevishimafiitb@gmail.com</span>
          </a>
        </div>
        
        {/* HAK CIPTA / COPYRIGHT */}
        <div className="pt-2 font-mono font-bold text-[9px] sm:text-[10px] text-center tracking-widest text-[#D5C757]/80 uppercase">
          ©2026Copyright: Divisi Web Development IS HIMAFI ITB 2026
        </div>
        
      </div>
    </footer>
  );
}