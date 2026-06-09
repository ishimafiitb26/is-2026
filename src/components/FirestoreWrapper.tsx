"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";

interface FirestoreWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FirestoreWrapper({ children, fallback = null }: FirestoreWrapperProps) {
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen to global Firestore errors
    const handleError = (event: ErrorEvent) => {
      const message = event.message || "Firestore error";
      if (message.includes("permission-denied")) {
        setError("Access denied. You may not have permission to view this data.");
      } else if (message.includes("PERMISSION_DENIED")) {
        setError("You don't have permission to access this collection.");
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-[#c8b0a0]">Loading...</div>;
  }

  if (!user) {
    return <div className="text-center py-8 text-red-400">Please log in first</div>;
  }

  if (error) {
    return (
      fallback ?? (
        <div className="bg-red-900/20 border border-red-600/50 rounded p-4 text-red-200">
          <p>{error}</p>
          <p className="text-sm mt-2">Contact admin if you believe this is a mistake.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
