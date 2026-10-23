import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  burnPasswordCheck,
  createToken,
  findUserByEmail,
  maskEmail,
  postLoginPath,
  dbErrorCode,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

// One message for unknown e-mail and wrong password, so the form does not
// reveal which addresses have an account.
const INVALID_CREDENTIALS = "E-mail ou mot de passe incorrect.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Données invalides." },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);

    if (!user) {
      await burnPasswordCheck(password);
      console.warn("[AUTH_LOGIN_REJECTED]", { reason: "unknown_email", email: maskEmail(email) });
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      console.warn("[AUTH_LOGIN_REJECTED]", { reason: "wrong_password", email: maskEmail(email), role: user.role });
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const token = await createToken({ userId: user.id, role: user.role });
    const redirectTo = postLoginPath(user.role, typeof body?.redirect === "string" ? body.redirect : null);

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      redirectTo,
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    // Never log the error message: Drizzle includes the query parameters.
    console.error("[AUTH_LOGIN_FAILED]", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: dbErrorCode(error),
    });
    return NextResponse.json({ error: "Erreur serveur. Veuillez réessayer." }, { status: 500 });
  }
}
