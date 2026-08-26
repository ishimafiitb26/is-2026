import type { Metadata } from "next";
import AppFrame from "../components/AppFrame";
import { I18nProvider } from "../components/I18nProvider";
import { AuthProvider } from "../components/AuthProvider";
import Footer from "../components/Footer";
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import Script from "next/script";
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
  { href: "/attendance", label: "Attendance" },
  { href: "/handbook", label: "Explore Area" }, 
  { href: "/portal", label: "Profile Settings" }, 
  { href: "/admin", label: "Admin" },
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
      <head>
        <style>{`
          #google_translate_element, .goog-te-banner-frame, .skiptranslate, #goog-gt-tt {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          body {
            top: 0px !important;
          }
          .goog-text-highlight {
            background-color: transparent !important;
            box-shadow: none !important;
          }
        `}</style>
      </head>
      <body className="relative isolate min-h-full flex flex-col text-foreground">
        <AuthProvider>
          <I18nProvider>
            <div className="flex flex-col min-h-screen">
              <div className="flex-grow">
                <AppFrame navItems={navItems}>{children}</AppFrame>
              </div>
              <Footer />
            </div>
          </I18nProvider>
        </AuthProvider>

        <div id="google_translate_element" />
        
        <Script 
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" 
          strategy="afterInteractive" 
        />
        
        <Script id="google-translate-config" strategy="afterInteractive">
          {`
            function googleTranslateElementInit() {
              new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'id,en,zh-CN,de,ko,ja',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false
              }, 'google_translate_element');
            }
          `}
        </Script>
      </body>
    </html>
  );
}