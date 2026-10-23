import { renderAuthPage } from "@/lib/auth-page";

export const dynamic = "force-dynamic";

export default function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return renderAuthPage("register", searchParams);
}
