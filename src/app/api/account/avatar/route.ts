import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import {
  createSignedUpload,
  downloadPrivateAvatar,
  getUploadSpec,
  hasSupabaseStorageConfig,
  isPrivateAvatarReference,
} from "@/lib/storage";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES: Record<string, { extension: string; signature: number[] }> = {
  "image/jpeg": { extension: ".jpg", signature: [0xff, 0xd8, 0xff] },
  "image/png": { extension: ".png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  "image/webp": { extension: ".webp", signature: [0x52, 0x49, 0x46, 0x46] },
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.avatarUrl || !isPrivateAvatarReference(session.avatarUrl, session.id)) {
      return new NextResponse(null, { status: 404 });
    }

    const storagePath = session.avatarUrl.slice("private-avatar://".length);
    const stored = await downloadPrivateAvatar(storagePath);
    if (!stored.ok) return new NextResponse(null, { status: 404 });

    const contentType = stored.headers.get("content-type") || "application/octet-stream";
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType.split(";")[0])) {
      return new NextResponse(null, { status: 415 });
    }

    return new NextResponse(await stored.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load the profile photo." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json().catch(() => null);
      const spec = getUploadSpec(body?.type, body?.size, MAX_AVATAR_BYTES);
      if (!spec || !AVATAR_TYPES[spec.type]) {
        return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image up to 5 MB." }, { status: 400 });
      }

      if (!hasSupabaseStorageConfig()) {
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ error: "Persistent image storage is not configured." }, { status: 503 });
        }
        return NextResponse.json({ success: true, mode: "local" });
      }

      const filename = `profile-${crypto.randomBytes(16).toString("hex")}${spec.extension}`;
      const storagePath = `avatars/${session.id}/${filename}`;
      const ticket = await createSignedUpload(storagePath, spec.type, "private");
      if (!ticket) {
        return NextResponse.json({ error: "Persistent image storage is not configured." }, { status: 503 });
      }

      return NextResponse.json({ success: true, ...ticket }, { headers: { "Cache-Control": "no-store" } });
    }

    if (process.env.NODE_ENV === "production" || hasSupabaseStorageConfig()) {
      return NextResponse.json({ error: "Upload directly using the signed storage upload." }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_AVATAR_BYTES || !AVATAR_TYPES[file.type]) {
      return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image up to 5 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!AVATAR_TYPES[file.type].signature.every((byte, index) => buffer[index] === byte)) {
      return NextResponse.json({ error: "The file content does not match its declared image type." }, { status: 400 });
    }

    const filename = `profile-${crypto.randomBytes(16).toString("hex")}${AVATAR_TYPES[file.type].extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    return NextResponse.json({ success: true, url: `/uploads/${filename}` });
  } catch {
    return NextResponse.json({ error: "Unable to upload the profile photo." }, { status: 500 });
  }
}
