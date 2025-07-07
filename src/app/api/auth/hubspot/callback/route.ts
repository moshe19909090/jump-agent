import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID!;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET!;
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI!;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: HUBSPOT_REDIRECT_URI,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("🔴 HubSpot token exchange failed:", error);
    return NextResponse.json(
      { error: "Token exchange failed", details: error },
      { status: 500 }
    );
  }

  const data = await response.json();
  const { access_token, refresh_token, expires_in } = data;

  await pool.query(
    `INSERT INTO "HubspotAuth" (id, access_token, refresh_token, expires_at)
     VALUES (1, $1, $2, NOW() + INTERVAL '${expires_in} seconds')
     ON CONFLICT (id) DO UPDATE
     SET access_token = $1,
         refresh_token = $2,
         expires_at = NOW() + INTERVAL '${expires_in} seconds'`,
    [access_token, refresh_token]
  );
  // await pool.end();

  console.log("✅ HubSpot token saved to DB:", {
    access_token,
    refresh_token,
    expires_in,
  });

  return NextResponse.redirect("http://localhost:3000/");
}
