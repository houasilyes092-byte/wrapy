import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { isPrivateAvatarReference } from "@/lib/storage";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const avatarUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl : "";
  const isLegacyUpload = /^\/uploads\/[A-Za-z0-9._-]+$/.test(avatarUrl);
  if (name.length < 2 || name.length > 255 || phone.length > 50 || avatarUrl.length > 500 || (avatarUrl && !isLegacyUpload && !isPrivateAvatarReference(avatarUrl, session.id)))
    return NextResponse.json({ error: "Informations de profil invalides." }, { status: 400 });
  await db.update(users).set({ name, phone: phone || null, avatarUrl: avatarUrl || null, updatedAt: new Date() }).where(eq(users.id, session.id));
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.currentPassword !== "string" || typeof body?.newPassword !== "string" || body.newPassword.length < 8 || body.newPassword.length > 128)
    return NextResponse.json({ error: "Mot de passe invalide (8 caractères minimum)." }, { status: 400 });
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, session.id)).limit(1);
  if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
  await db.update(users).set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() }).where(eq(users.id, session.id));
  return NextResponse.json({ success: true });
}
