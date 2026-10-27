import { getActivePhoneModels } from "@/lib/phone-models.server";

export const dynamic = "force-dynamic";

// Active phone models for every selector (product page, product form).
export async function GET() {
  const models = await getActivePhoneModels();
  return Response.json(models.map((model) => ({ ...model, isActive: true })), {
    headers: { "Cache-Control": "no-store" },
  });
}
