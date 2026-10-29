import { X509Certificate } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

/**
 * Rebuilds PEM from however the certificate was pasted into the host's env UI
 * (real newlines, literal "\n", or everything on one line separated by spaces).
 * Node silently ignores malformed PEM, which would surface later as the
 * misleading SELF_SIGNED_CERT_IN_CHAIN, so an unreadable value fails loudly.
 */
function normalizeCaPem(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const text = raw.replace(/\\n/g, "\n");
  const blocks = [...text.matchAll(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g)];
  if (blocks.length === 0) {
    throw new Error("DATABASE_SSL_CA must contain a PEM certificate (-----BEGIN CERTIFICATE----- ...).");
  }
  const pem = blocks
    .map((block) => {
      const body = block[1].replace(/\s+/g, "");
      const lines = body.match(/.{1,64}/g) ?? [];
      return ["-----BEGIN CERTIFICATE-----", ...lines, "-----END CERTIFICATE-----"].join("\n");
    })
    .join("\n");
  try {
    for (const cert of pem.split(/(?<=-----END CERTIFICATE-----)\n/)) new X509Certificate(cert);
  } catch {
    throw new Error("DATABASE_SSL_CA is not a valid certificate. Paste the Supabase CA file contents again.");
  }
  return pem;
}

const databaseSslCa = normalizeCaPem(process.env.DATABASE_SSL_CA);

const globalForDb = globalThis as typeof globalThis & {
  __wrapyPostgresPool?: Pool;
};

function createDatabase(url: string): { pool: Pool; db: ReturnType<typeof drizzle> } {
  const connectionStringHasSslOptions = (() => {
    try {
      const parsed = new URL(url);
      return ["sslmode", "sslcert", "sslkey", "sslrootcert"].some((key) =>
        parsed.searchParams.has(key)
      );
    } catch {
      throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL");
    }
  })();

  if (!databaseSslCa && process.env.NODE_ENV === "production") {
    // Supabase's pooler certificate chains to Supabase's own root CA; without it
    // every query fails with SELF_SIGNED_CERT_IN_CHAIN.
    console.error("[DATABASE_SSL_CA_MISSING] Set DATABASE_SSL_CA to the Supabase CA certificate (PEM).");
  }

  if (/^db\.[a-z0-9]+\.supabase\.co$/i.test(new URL(url).hostname)) {
    // Supabase direct hosts are IPv6-only; serverless runtimes such as Netlify
    // Functions resolve IPv4 only and fail with ENOTFOUND.
    console.error("[DATABASE_URL_DIRECT_HOST] Use the Supabase pooler connection string (…pooler.supabase.com) on serverless hosts.");
  }

  if (connectionStringHasSslOptions) {
    throw new Error(
      "Remove SSL query parameters from DATABASE_URL and configure verified TLS with DATABASE_SSL_CA."
    );
  }

  const pool =
    globalForDb.__wrapyPostgresPool ??
    new Pool({
      connectionString: url,
      ssl: {
        rejectUnauthorized: true,
        ...(databaseSslCa ? { ca: databaseSslCa } : {}),
      },
      max: 1,
      connectionTimeoutMillis: 10000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__wrapyPostgresPool = pool;
  }

  pool.on("error", (error) => {
    console.error("[POSTGRES_POOL_ERROR]", {
      name: error.name,
      message: error.message,
      code: "code" in error ? error.code : undefined,
    });
  });

  return { pool, db: drizzle(pool) };
}

// Production must keep failing the build when DATABASE_URL is missing.
// Netlify deploy previews and branch deploys do not receive production secrets,
// so there the module loads without a database and any query fails at request time.
if (!databaseUrl && process.env.CONTEXT === "production") {
  throw new Error("DATABASE_URL is required");
}

const database = databaseUrl ? createDatabase(databaseUrl) : null;

const unconfigured = new Proxy({}, {
  get() {
    throw new Error("DATABASE_URL is not configured for this deployment.");
  },
}) as never;

export const pool: Pool = database?.pool ?? unconfigured;
export const db: ReturnType<typeof drizzle> = database?.db ?? unconfigured;
