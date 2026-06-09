"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
  title?: string;
}

export default function PDFViewer({ fileUrl, fileName, title }: PDFViewerProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = () => {
    setIsLoading(true);
    setIsOpen(true);
  };

  return (
    <div className="space-y-2">
      {title && <p className="text-sm font-medium text-[#d8a75b]">{title}</p>}
      
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpen}
          className="nav-chip inline-flex items-center px-3 py-2 text-sm"
        >
          📄 {fileName || t("View File")}
        </button>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#c18f63] hover:underline"
        >
          {t("Download")}
        </a>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-screen w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/20 bg-[#1b1f1d]">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
              <h3 className="text-sm font-medium text-[#f7f0e8]">
                {fileName || t("Document Viewer")}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-[#aaa391] hover:bg-white/10 hover:text-[#f7f0e8]"
              >
                ✕
              </button>
            </div>

            {/* Viewer */}
            <div className="flex h-full min-h-96 items-center justify-center bg-black/50">
              {isLoading && (
                <p className="text-[#aaa391]">{t("Loading document...")}</p>
              )}
              
              {/* Iframe for PDF */}
              <iframe
                src={`${fileUrl}#toolbar=0`}
                title={fileName || t("Document")}
                className="h-full w-full"
                onLoad={() => setIsLoading(false)}
              />

              {/* Fallback link if iframe doesn't work */}
              <div className="absolute space-y-2 text-center">
                <p className="text-sm text-[#aaa391]">
                  {t("If PDF doesn't display, click below to open in new tab")}
                </p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-btn inline-block px-4 py-2"
                >
                  {t("Open Document")}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
