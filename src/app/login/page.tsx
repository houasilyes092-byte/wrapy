"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login"
      ? { email: form.email, password: form.password }
      : form;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Redirect based on role
      if (data.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/account");
      }
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black tracking-tighter text-white inline-block">
            WRAPY<span className="text-brand">.</span>
          </Link>
          <p className="text-sm text-dark-muted mt-2">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <div className="bg-dark-card rounded-2xl p-6 border border-dark-border">
          {/* Toggle */}
          <div className="flex bg-dark rounded-xl p-1 mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 text-sm py-2.5 rounded-lg transition-all ${
                mode === "login" ? "bg-brand text-black font-semibold" : "text-gray-400"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 text-sm py-2.5 rounded-lg transition-all ${
                mode === "register" ? "bg-brand text-black font-semibold" : "text-gray-400"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "login" && <>
              <a href="/auth/google/start" className="flex min-h-12 w-full items-center justify-center rounded-xl border border-dark-border text-sm font-semibold text-white transition-colors hover:border-brand/50">Continuer avec Google</a>
              <div className="flex items-center gap-3 text-xs text-dark-muted"><span className="h-px flex-1 bg-dark-border"/>ou avec votre e-mail<span className="h-px flex-1 bg-dark-border"/></div>
            </>}
            {mode === "register" && (
              <div>
                <label className="text-xs text-dark-muted block mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-dark-muted block mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
                placeholder="you@example.com"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="text-xs text-dark-muted block mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
                  placeholder="+216 XX XXX XXX (optional)"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-dark-muted block mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
                placeholder="Min 6 characters"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark text-black font-bold py-3.5 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
