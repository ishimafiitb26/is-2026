import type { Metadata } from "next";
import AppFrame from "../components/AppFrame";
import { I18nProvider } from "../components/I18nProvider";
import { AuthProvider } from "../components/AuthProvider";
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
  title: "INTELLEKTUELLE SCHULE 2026 Portal",
  description: "Maze Runner-inspired information and assignment portal for INTELLEKTUELLE SCHULE 2026.",
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/journey-map", label: "Journey Map" },
  { href: "/tasks", label: "Tasks" },
  { href: "/attendance", label: "Attendance" },
  { href: "/h1-confirmation", label: "H-1 Confirm" },
  { href: "/handbook", label: "Handbook" },
  { href: "/reflection-board", label: "Reflection Board" },
  { href: "/help-center", label: "Help Center" },
  { href: "/portal", label: "Portal Access" },
  { href: "/admin", label: "Admin" },
];

// NavWrapper is a client component that renders the hamburger navigation

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
      <body className="relative isolate min-h-full flex flex-col text-foreground">
        <AuthProvider>
          <I18nProvider>
            <AppFrame navItems={navItems}>{children}</AppFrame>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
