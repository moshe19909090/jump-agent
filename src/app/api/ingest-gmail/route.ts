import { NextResponse } from "next/server";
import { fetchAndStoreGmailMessages } from "@/lib/gmail";
import { getValidGoogleAccessToken } from "../../../../utils/getValidGoogleAccessToken";

export async function GET() {
  const accessToken = await getValidGoogleAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const savedEmails = await fetchAndStoreGmailMessages(accessToken);
  return NextResponse.json({ saved: savedEmails.length });
}
