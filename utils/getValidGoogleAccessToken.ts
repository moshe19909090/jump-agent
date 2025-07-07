import { pool } from "@/lib/db";
import { google } from "googleapis";

export async function getValidGoogleAccessToken(): Promise<string | null> {
  const res = await pool.query(`
    SELECT access_token, refresh_token, expires_at
    FROM "GoogleToken"
    WHERE user_id = '1'
    LIMIT 1
  `);

  if (!res.rowCount) return null;

  let { access_token } = res.rows[0];
  const { refresh_token, expires_at } = res.rows[0];
  const now = Math.floor(Date.now() / 1000);

  // If token is expired or close to it, refresh
  if (!expires_at || now >= expires_at - 60) {
    console.log("🔄 Refreshing expired Google token...");

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({ refresh_token });

    try {
      const { credentials } = await client.refreshAccessToken();
      access_token = credentials.access_token!;

      const newExpiresAt = credentials.expiry_date
        ? Math.floor(credentials.expiry_date / 1000)
        : now + 3600;

      await pool.query(
        `UPDATE "GoogleToken"
         SET access_token = $1,
             expires_at = $2
         WHERE user_id = '1'`,
        [access_token, newExpiresAt]
      );

      console.log("✅ Google token refreshed.");
    } catch (err) {
      console.error("❌ Failed to refresh Google token:", err);
      return null;
    }
  }

  return access_token;
}
