"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Reasons sent back by /auth/google/start and /auth/google/callback.
const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured: "La connexion avec Google n'est pas encore activée sur ce site.",
  google_state: "La connexion avec Google a expiré. Veuillez réessayer.",
  google_denied: "La connexion avec Google a été annulée.",
  google_email: "Votre compte Google doit avoir une adresse e-mail vérifiée.",
  google_admin: "Les comptes administrateur se connectent avec leur e-mail et leur mot de passe.",
  google_auth: "La connexion avec Google a échoué. Veuillez réessayer.",
};

type Mode = "login" | "register";

interface AuthFormProps {
  mode: Mode;
  error: string | null;
  redirect: string | null;
  googleEnabled: boolean;
}

function withRedirect(path: string, redirect: string | null, extra?: Record<string, string>) {
  const params = new URLSearchParams(extra);
  if (redirect) params.set("redirect", redirect);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function AuthForm({ mode, error: initialError, redirect, googleEnabled }: AuthFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGoogleHint, setShowGoogleHint] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const shownError = error || (initialError ? GOOGLE_ERRORS[initialError] ?? "" : "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowGoogleHint(false);

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login"
      ? { email: form.email, password: form.password, redirect }
      : { ...form, redirect };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue. Veuillez réessayer.");
        setShowGoogleHint(mode === "login" && res.status === 401 && googleEnabled);
        setLoading(false);
        return;
      }

      // The server decides where to go (role and the page that sent the
      // visitor here), then the router reloads server data for the new session.
      router.replace(data.redirectTo || "/account");
      router.refresh();
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
      setLoading(false);
    }
  }

  const googleHref = withRedirect("/auth/google/start", redirect, { mode });

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
            <Link
              href={withRedirect("/login", redirect)}
              replace
              className={`flex-1 text-center text-sm py-2.5 rounded-lg transition-all ${
                mode === "login" ? "bg-brand text-black font-semibold" : "text-gray-400"
              }`}
              aria-current={mode === "login" ? "page" : undefined}
            >
              Sign In
            </Link>
            <Link
              href={withRedirect("/register", redirect)}
              replace
              className={`flex-1 text-center text-sm py-2.5 rounded-lg transition-all ${
                mode === "register" ? "bg-brand text-black font-semibold" : "text-gray-400"
              }`}
              aria-current={mode === "register" ? "page" : undefined}
            >
              Register
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <a
              href={googleHref}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-dark-border text-sm font-semibold text-white transition-colors hover:border-brand/50"
            >
              <GoogleMark />
              Continuer avec Google
            </a>
            <div className="flex items-center gap-3 text-xs text-dark-muted">
              <span className="h-px flex-1 bg-dark-border" />
              ou avec votre e-mail
              <span className="h-px flex-1 bg-dark-border" />
            </div>

            {mode === "register" && (
              <div>
                <label htmlFor="auth-name" className="text-xs text-dark-muted block mb-1.5">Full Name</label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  minLength={2}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="text-xs text-dark-muted block mb-1.5">Email</label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
                placeholder="you@example.com"
              />
            </div>

            {mode === "register" && (
              <div>
                <label htmlFor="auth-phone" className="text-xs text-dark-muted block mb-1.5">Phone</label>
                <input
                  id="auth-phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
                  placeholder="+216 XX XXX XXX (optional)"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-password" className="text-xs text-dark-muted block mb-1.5">Password</label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={mode === "register" ? 8 : undefined}
                maxLength={mode === "register" ? 72 : undefined}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50"
                placeholder={mode === "register" ? "Min 8 characters" : "Your password"}
              />
            </div>

            {shownError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400" role="alert">
                {shownError}
                {showGoogleHint && (
                  <p className="mt-1.5 text-red-300/80">
                    Compte créé avec Google ? Utilisez « Continuer avec Google ».
                  </p>
                )}
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
