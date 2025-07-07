import { NextRequest, NextResponse } from "next/server";
import { saveGoogleTokensToDB } from "../../../../../utils/saveGoogleTokensToDB";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      throw new Error(`Token exchange failed: ${errorBody}`);
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in, scope, id_token } = tokens;

    // Decode ID token to get user's email
    let userInfo;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userInfo = JSON.parse(
        Buffer.from(id_token.split(".")[1], "base64").toString("utf-8")
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid ID token (could not decode)" },
        { status: 400 }
      );
    }

    const userId = "1"; // temporary hardcoded userId to match cron token lookup
    if (!userId) {
      return NextResponse.json(
        { error: "Email not found in ID token" },
        { status: 400 }
      );
    }
    await saveGoogleTokensToDB({
      userId: "1",
      access_token,
      refresh_token,
      expires_in,
      scope,
    });

    console.log("✅ Token saved:", {
      access_token,
      refresh_token,
      expires_in,
    });

    console.log("✅ Google tokens saved for:", userId);
    console.log("🔍 Scopes granted:", scope);

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/chat`);
  } catch (err) {
    console.error("❌ Error handling Google callback:", err);
    return NextResponse.json(
      { error: "Failed to exchange Google token" },
      { status: 500 }
    );
  }
}
