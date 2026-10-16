import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const databaseSslCa = process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n").trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// Keep TLS options in one place. node-postgres lets SSL parameters embedded in
// the connection string override the explicit "ssl" object, which can silently
// discard the CA certificate supplied above.
const normalizedConnectionString = (() => {
  try {
    const url = new URL(databaseUrl);
    for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert", "sslpassword"]) {
      url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL");
  }
})();

const globalForDb = globalThis as typeof globalThis & {
  __wrapyPostgresPool?: Pool;
};

export const pool =
  globalForDb.__wrapyPostgresPool ??
  new Pool({
    connectionString: normalizedConnectionString,
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
