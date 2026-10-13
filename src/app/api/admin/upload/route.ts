import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSignedUpload, getUploadSpec, hasSupabaseStorageConfig } from "@/lib/storage";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for videos

const ALLOWED_TYPES: Record<string, { ext: string; signatures: number[][] }> = {
  "image/jpeg": { ext: ".jpg", signatures: [[0xff, 0xd8, 0xff]] },
  "image/png": { ext: ".png", signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  "image/webp": { ext: ".webp", signatures: [[0x52, 0x49, 0x46, 0x46]] }, // RIFF header
  "image/gif": { ext: ".gif", signatures: [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]] },
  "image/svg+xml": { ext: ".svg", signatures: [[0x3c, 0x3f, 0x78, 0x6d, 0x6c], [0x3c, 0x73, 0x76, 0x67]] }, // <?xml or <svg
  "video/mp4": { ext: ".mp4", signatures: [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]] }, // ftyp box
  "video/webm": { ext: ".webm", signatures: [[0x1a, 0x45, 0xdf, 0xa3]] }, // EBML header
};

function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const typeInfo = ALLOWED_TYPES[mimeType];
  if (!typeInfo || !typeInfo.signatures) return false;

  for (const signature of typeInfo.signatures) {
    let match = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json().catch(() => null);
      const spec = getUploadSpec(body?.type, body?.size, MAX_FILE_SIZE);
      if (!spec) {
        return NextResponse.json({ success: false, error: "Invalid file type or size. Maximum file size is 50MB." }, { status: 400 });
      }

      if (!hasSupabaseStorageConfig()) {
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ success: false, error: "Persistent image storage is not configured." }, { status: 503 });
        }
        return NextResponse.json({ success: true, mode: "local" });
      }

      const filename = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${spec.extension}`;
      const ticket = await createSignedUpload(`admin/${filename}`, spec.type);
      if (!ticket) {
        return NextResponse.json({ success: false, error: "Persistent image storage is not configured." }, { status: 503 });
      }
      return NextResponse.json({ success: true, ...ticket }, { headers: { "Cache-Control": "no-store" } });
    }

    if (process.env.NODE_ENV === "production" || hasSupabaseStorageConfig()) {
      return NextResponse.json({ success: false, error: "Upload files directly using a signed storage upload." }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate MIME type
    const typeInfo = ALLOWED_TYPES[file.type];
    if (!typeInfo) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Use JPG, PNG, WEBP, GIF, SVG, MP4 or WebM.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File is too large. Maximum size is 50MB.",
        },
        { status: 400 }
      );
    }

    // Read file buffer for signature validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file signature (magic bytes)
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "File content does not match its declared type. Possible malicious file.",
        },
        { status: 400 }
      );
    }

    // Additional check for SVG - validate XML structure
    if (file.type === "image/svg+xml") {
      const svgContent = buffer.toString("utf-8").slice(0, 1000);
      if (!svgContent.includes("<svg") || svgContent.includes("<script")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid SVG file. Script tags are not allowed.",
          },
          { status: 400 }
        );
      }
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads"
    );

    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${crypto
      .randomBytes(8)
      .toString("hex")}${typeInfo.ext}`;

    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}
