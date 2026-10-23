import { renderAuthPage } from "@/lib/auth-page";

export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return renderAuthPage("login", searchParams);
}
