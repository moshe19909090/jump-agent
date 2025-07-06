import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchAndStoreGmailMessages } from "@/lib/gmail";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const savedEmails = await fetchAndStoreGmailMessages(session.accessToken);
  return NextResponse.json({ saved: savedEmails.length });
}
