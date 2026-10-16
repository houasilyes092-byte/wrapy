import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const databaseSslCa = process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n").trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const connectionStringHasSslOptions = (() => {
  try {
    const url = new URL(databaseUrl);
    return ["sslmode", "sslcert", "sslkey", "sslrootcert"].some((key) =>
      url.searchParams.has(key)
    );
  } catch {
    throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL");
  }
})();

if (connectionStringHasSslOptions) {
  throw new Error(
    "Remove SSL query parameters from DATABASE_URL and configure verified TLS with DATABASE_SSL_CA."
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __wrapyPostgresPool?: Pool;
};

export const pool =
  globalForDb.__wrapyPostgresPool ??
  new Pool({
    connectionString: databaseUrl,
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

export const db = drizzle(pool);
