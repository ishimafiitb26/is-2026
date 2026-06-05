import type { Metadata } from "next";
import Link from "next/link";
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const headingFont = Bebas_Neue({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
});

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OSJUR IS 2026 Portal",
  description: "Maze Runner-inspired information and assignment portal for OSJUR IS 2026.",
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/journey-map", label: "Journey Map" },
  { href: "/handbook", label: "Handbook" },
  { href: "/reflection-board", label: "Reflection Board" },
  { href: "/help-center", label: "Help Center" },
  { href: "/portal", label: "Portal Access" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-foreground">
        <div className="maze-overlay" aria-hidden />
        <header className="sticky top-0 z-20 border-b border-white/20 bg-[#1f2d26]/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-1">
              <Link href="/" className="font-heading text-4xl leading-none tracking-[0.08em] text-[#f2f1ec]">
                OSJUR IS 2026
              </Link>
              <p className="text-sm text-[#c7c3b8]">Maze Runner Operations Portal</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-chip">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
