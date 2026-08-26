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
      const finalEmail = nim.includes("@") 
        ? nim.trim() 
        : `${nim.trim()}@mahasiswa.itb.ac.id`;

      await login(finalEmail, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Akses ditolak. Periksa kembali NIM/Email dan Password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] px-4 relative overflow-hidden">
      
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-[#452ABC]/40 blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-[#EC5C2A]/15 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#452ABC]/30 backdrop-blur-md border border-[#E1D9F9]/10 rounded-2xl p-8 shadow-2xl">
          <h1 className="font-heading text-4xl text-[#E1D9F9] mb-2 tracking-wider">
            INTELLEKTUELLE SCHULE 2026
          </h1>
          <p className="text-[#E1D9F9]/70 mb-8 text-sm">
            Welcome! Please log in with your NIM and password to access the dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-[#EC5C2A]/20 border border-[#EC5C2A]/50 text-[#E1D9F9] px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-[#E1D9F9]/70 mb-2 font-medium">NIM</label>
              <input
                type="text"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                className="w-full px-4 py-3 bg-[#0A0A0B]/80 border border-[#E1D9F9]/20 rounded-xl text-[#E1D9F9] placeholder-[#E1D9F9]/40 focus:outline-none focus:border-[#F6C545] transition"
                placeholder="Masukkan NIM..."
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#E1D9F9]/70 mb-2 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0A0A0B]/80 border border-[#E1D9F9]/20 rounded-xl text-[#E1D9F9] placeholder-[#E1D9F9]/40 focus:outline-none focus:border-[#F6C545] transition"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-[#F6C545] hover:bg-[#c49a37] disabled:bg-[#F6C545]/50 text-[#0A0A0B] font-bold rounded-xl transition shadow-[0_0_15px_rgba(246,197,69,0.2)]"
            >
              {loading ? "Authenticating..." : "Log In"}
            </button>
          </form>

          <p className="text-center text-[#E1D9F9]/50 text-xs mt-6">
            Use your registered email and password
          </p>
        </div>
      </div>
    </div>
  );
}
