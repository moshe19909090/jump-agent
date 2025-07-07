import { pool } from "@/lib/db";

export async function refreshHubspotToken(refreshToken: string) {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", process.env.HUBSPOT_CLIENT_ID!);
  params.append("client_secret", process.env.HUBSPOT_CLIENT_SECRET!);
  params.append("refresh_token", refreshToken);

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    console.error("❌ Failed to refresh HubSpot token");
    throw new Error(await response.text());
  }

  const data = await response.json();

  await pool.query(
    `UPDATE "HubspotAuth"
     SET access_token = $1,
         refresh_token = $2,
         expires_at = NOW() + INTERVAL '${data.expires_in} seconds'
     WHERE id = 1`,
    [data.access_token, data.refresh_token]
  );
  // await pool.end();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}
