import { pool } from "../db/client";
import { logger } from "../logger";

export async function getPreferences(): Promise<string[]> {
  logger.info("Fetching preferences");
  const { rows } = await pool.query<{ preferences: string[] }>(
    // Assuming that we only have one row in the preferences table
    // for a single user running locally
    "SELECT preferences FROM preferences LIMIT 1",
  );
  return rows[0]?.preferences ?? [];
}

export async function setPreferences(preferences: string[]): Promise<void> {
  logger.info({ preferences }, "Setting preferences");
  await pool.query(
    "INSERT INTO preferences (preferences) VALUES ($1) ON CONFLICT (id) DO UPDATE SET preferences = EXCLUDED.preferences",
    [preferences],
  );
}
