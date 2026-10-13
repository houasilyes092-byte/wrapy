"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark text-white antialiased min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Application Error</h2>
          <p className="text-dark-muted mb-6">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="bg-brand hover:bg-brand-dark text-black font-bold px-6 py-3 rounded-xl text-sm transition-all"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
            <Link
              href="/"
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </div>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-6 text-left text-xs text-dark-muted">
              <summary className="cursor-pointer mb-2">Error Details (Development)</summary>
              <pre className="bg-dark p-3 rounded overflow-x-auto whitespace-pre-wrap">{error.message}</pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}