// app/api/auth/hubspot/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { saveHubspotToken } from "../../../../../../utils/saveHubspotToken";

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

  // Exchange the code for access token
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
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("🔴 HubSpot token exchange failed:", error);
    return NextResponse.json(
      { error: "Token exchange failed", details: error },
      { status: 500 }
    );
  }

  const tokenData = await response.json();
  await saveHubspotToken(tokenData);
  console.log("✅ HubSpot token data:", tokenData);

  // For now, just return it — later we can save it per-user
  return NextResponse.redirect("http://localhost:3000/");
}
