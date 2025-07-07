// app/api/hubspot/status/route.ts
import { NextResponse } from "next/server";
import { readHubspotToken } from "../../../../../utils/saveHubspotToken";

export async function GET() {
  try {
    const token = await readHubspotToken();

    if (token?.access_token) {
      return NextResponse.json({ connected: true });
    }

    return NextResponse.json({ connected: false });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
