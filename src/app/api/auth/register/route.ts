import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  hashPassword,
  createToken,
  findUserByEmail,
  maskEmail,
  postLoginPath,
  dbErrorCode,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { registerSchema } from "@/lib/validations";

const EMAIL_TAKEN =
  "Un compte existe déjà avec cet e-mail. Connectez-vous, ou utilisez « Continuer avec Google » si vous l'avez créé avec Google.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Données invalides." },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = parsed.data;

    if (await findUserByEmail(email)) {
      return NextResponse.json({ error: EMAIL_TAKEN }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    let user;
    try {
      [user] = await db
        .insert(users)
        .values({ name, email, phone: phone || null, passwordHash, role: "customer" })
        .returning();
    } catch (error) {
      // Two sign-ups with the same e-mail at the same moment.
      if (dbErrorCode(error) === "23505") {
        return NextResponse.json({ error: EMAIL_TAKEN }, { status: 409 });
      }
      throw error;
    }

    console.info("[AUTH_REGISTERED]", { method: "password", email: maskEmail(email) });

    const token = await createToken({ userId: user.id, role: user.role });
    const redirectTo = postLoginPath(user.role, typeof body?.redirect === "string" ? body.redirect : null);

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      redirectTo,
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    // Never log the error message: Drizzle includes the query parameters,
    // which here contain the password hash.
    console.error("[AUTH_REGISTER_FAILED]", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: dbErrorCode(error),
    });
    return NextResponse.json({ error: "Erreur serveur. Veuillez réessayer." }, { status: 500 });
  }
}
