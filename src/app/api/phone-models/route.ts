import { db } from "@/db";
import { phoneModels } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const models = await db
    .select({
      id: phoneModels.id,
      brand: phoneModels.brand,
      name: phoneModels.name,
      isActive: phoneModels.isActive,
    })
    .from(phoneModels)
    .where(eq(phoneModels.isActive, true))
    .orderBy(asc(phoneModels.brand), asc(phoneModels.name));

  return Response.json(models);
}
