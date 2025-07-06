// src/app/api/auth/callback/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";
import { fetchAndStoreGmailMessages } from "@/lib/gmail";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  try {
    const emails = await fetchAndStoreGmailMessages(session.accessToken);
    return NextResponse.json({ saved: emails.length });
  } catch (error) {
    console.error("Error during callback ingestion:", error);
    return NextResponse.json(
      { error: "Failed to ingest Gmail" },
      { status: 500 }
    );
  }
}
