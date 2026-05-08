import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";
import { logger } from "../logger";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(): ReturnType<typeof drizzle<typeof schema>> | null {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    logger.warn("DATABASE_URL not set — running without database persistence");
    return null;
  }

  try {
    const client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    });
    _db = drizzle(client, { schema });
    logger.info("Database connected");
    return _db;
  } catch (err) {
    logger.warn("Database connection failed — running without persistence", {
      errorClass: err instanceof Error ? err.constructor.name : "Unknown",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export type Db = NonNullable<ReturnType<typeof getDb>>;
