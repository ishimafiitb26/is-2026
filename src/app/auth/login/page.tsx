"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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
      await login(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal. Periksa email dan password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1b1f1d] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#2d1b16]/50 border border-[#7b5a48]/25 rounded-lg p-8">
          <h1 className="font-heading text-3xl text-[#f7f0e8] mb-2">
            INTELLEKTUELLE SCHULE 2026
          </h1>
          <p className="text-[#c8b0a0] mb-8">Maze Runner Operations Portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-600/50 text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-[#c8b0a0] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[#1b1f1d] border border-[#7b5a48]/25 rounded text-[#f7f0e8] placeholder-[#7b5a48]"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#c8b0a0] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[#1b1f1d] border border-[#7b5a48]/25 rounded text-[#f7f0e8] placeholder-[#7b5a48]"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[#c18f63] hover:bg-[#d49d70] disabled:bg-[#7b5a48] text-[#1b1f1d] font-semibold rounded transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="text-center text-[#c8b0a0] text-sm mt-6">
            Use your registered email and password
          </p>
        </div>
      </div>
    </div>
  );
}
