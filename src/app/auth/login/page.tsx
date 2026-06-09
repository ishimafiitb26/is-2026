"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";

export default function LoginPage() {
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Trik dummy domain: Gabungkan NIM dengan domain kampus di belakang layar
      const email = `${nim}@mahasiswa.itb.ac.id`;
      await login(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Akses ditolak. Periksa kembali NIM dan Password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F282F] px-4 relative overflow-hidden">
      
      {/* Efek kosmik (Cahaya blur) di background */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-[#084D58]/40 blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-[#CE4A2D]/15 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Panel Login */}
        <div className="bg-[#084D58]/30 backdrop-blur-md border border-[#D7DCD5]/10 rounded-2xl p-8 shadow-2xl">
          <h1 className="font-heading text-4xl text-[#F2EDEC] mb-2 tracking-wider">
            INTELLEKTUELLE SCHULE 2026
          </h1>
          <p className="text-[#D7DCD5] mb-8 text-sm">
            Welcome! Please log in with your NIM and password to access the dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-[#CE4A2D]/20 border border-[#CE4A2D]/50 text-[#F2EDEC] px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-[#D7DCD5] mb-2 font-medium">NIM</label>
              <input
                type="text"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                className="w-full px-4 py-3 bg-[#0F282F]/80 border border-[#D7DCD5]/20 rounded-xl text-[#F2EDEC] placeholder-[#D7DCD5]/40 focus:outline-none focus:border-[#D5C757] transition"
                placeholder="Masukkan NIM..."
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#D7DCD5] mb-2 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0F282F]/80 border border-[#D7DCD5]/20 rounded-xl text-[#F2EDEC] placeholder-[#D7DCD5]/40 focus:outline-none focus:border-[#D5C757] transition"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-[#D5C757] hover:bg-[#e8da6f] disabled:bg-[#D5C757]/50 text-[#0F282F] font-bold rounded-xl transition shadow-[0_0_15px_rgba(213,199,87,0.2)]"
            >
              {loading ? "Authenticating..." : "Log In"}
            </button>
          </form>

          <p className="text-center text-[#D7DCD5]/70 text-xs mt-6">
            Use your registered email and password
          </p>
        </div>
      </div>
    </div>
  );
}