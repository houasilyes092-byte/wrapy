import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSession, postLoginPath } from "@/lib/auth";
import { googleConfig } from "@/lib/google-oauth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? null : null;

/** Shared server side of /login and /register. */
export async function renderAuthPage(mode: "login" | "register", searchParams: SearchParams) {
  const params = await searchParams;
  const redirectParam = first(params.redirect);

  // A visitor who is already signed in goes straight to where they belong.
  let session = null;
  try {
    session = await getSession();
  } catch (error) {
    // Show the form rather than an error page if the session cannot be read.
    console.error("[AUTH_PAGE_SESSION_FAILED]", { name: error instanceof Error ? error.name : "UnknownError" });
  }
  if (session) redirect(postLoginPath(session.role, redirectParam));

  return (
    <AuthForm
      mode={mode}
      error={first(params.error)}
      redirect={redirectParam}
      googleEnabled={googleConfig() !== null}
    />
  );
}
