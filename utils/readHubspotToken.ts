import { pool } from "@/lib/db";
import { refreshHubspotToken } from "./refreshHubspotToken";

export async function getValidHubspotAccessToken(): Promise<string> {
  const result = await pool.query(
    `SELECT access_token, refresh_token, expires_at
     FROM "HubspotAuth"
     WHERE id = 1`
  );

  const row = result.rows[0];
  const now = new Date();

  if (!row) throw new Error("❌ No Hubspot token found in DB");

  const expiresAt = new Date(row.expires_at);

  if (now >= expiresAt) {
    console.log("🔁 Hubspot token expired. Refreshing...");
    const refreshed = await refreshHubspotToken(row.refresh_token);
    return refreshed.access_token;
  }

  // await pool.end();
  return row.access_token;
}
