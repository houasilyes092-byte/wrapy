import "server-only";

type SupabaseStorageConfig = {
  baseUrl: string;
  serviceRoleKey: string;
  anonKey: string;
  bucket: string;
  avatarBucket: string;
};

export const uploadTypes: Record<string, { extension: string }> = {
  "image/jpeg": { extension: ".jpg" },
  "image/png": { extension: ".png" },
  "image/webp": { extension: ".webp" },
  "image/gif": { extension: ".gif" },
  "image/svg+xml": { extension: ".svg" },
  "video/mp4": { extension: ".mp4" },
  "video/webm": { extension: ".webm" },
};

function getConfig(): SupabaseStorageConfig | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const avatarBucket = process.env.SUPABASE_AVATAR_BUCKET;

  if (!url || !serviceRoleKey || !anonKey || !bucket || !avatarBucket) return null;

  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("SUPABASE_URL must use HTTPS in production.");
  }

  return {
    baseUrl: parsed.origin,
    serviceRoleKey,
    anonKey,
    bucket,
    avatarBucket,
  };
}

export function hasSupabaseStorageConfig() {
  return getConfig() !== null;
}

export function getUploadSpec(type: unknown, size: unknown, maxBytes: number) {
  if (typeof type !== "string" || !uploadTypes[type]) return null;
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > maxBytes) return null;
  return { type, size, extension: uploadTypes[type].extension };
}

export async function createSignedUpload(path: string, contentType: string, visibility: "public" | "private" = "public") {
  const config = getConfig();
  if (!config) return null;

  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  const bucket = visibility === "public" ? config.bucket : config.avatarBucket;
  const signUrl = `${config.baseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${objectPath}`;
  const response = await fetch(signUrl, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  const result = await response.json().catch(() => null) as { url?: string; signedURL?: string } | null;
  if (!response.ok || typeof result?.url !== "string") {
    throw new Error("Supabase Storage could not create an upload ticket.");
  }

  const signedPath = result.url.startsWith("/storage/v1/")
    ? result.url
    : `/storage/v1${result.url.startsWith("/") ? result.url : `/${result.url}`}`;
  const signedUrl = new URL(signedPath, config.baseUrl).toString();
  const fileUrl = visibility === "public"
    ? `${config.baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`
    : `private-avatar://${path}`;

  return {
    signedUrl,
    url: fileUrl,
    headers: {
      apikey: config.anonKey,
      "x-upsert": "false",
      "content-type": contentType,
      "cache-control": "max-age=31536000",
    },
  };
}

export function isPublicStorageUrl(value: string) {
  const config = getConfig();
  if (!config) return false;

  try {
    const candidate = new URL(value);
    const prefix = `/storage/v1/object/public/${encodeURIComponent(config.bucket)}/`;
    return candidate.origin === config.baseUrl && candidate.pathname.startsWith(prefix);
  } catch {
    return false;
  }
}

export function isPrivateAvatarReference(value: string, userId: string) {
  return new RegExp(`^private-avatar://avatars/${userId}/[A-Za-z0-9._-]+$`).test(value);
}

export async function downloadPrivateAvatar(path: string) {
  const config = getConfig();
  if (!config) throw new Error("Private avatar storage is not configured.");
  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  return fetch(`${config.baseUrl}/storage/v1/object/${encodeURIComponent(config.avatarBucket)}/${objectPath}`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });
}
