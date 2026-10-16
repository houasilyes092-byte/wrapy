import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    // Keep diagnostic details in server logs only; never return them publicly.
    console.error("[HEALTH_CHECK_FAILED]", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown database error",
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : undefined,
    });
    return Response.json({ ok: false }, { status: 500 });
  }
}
