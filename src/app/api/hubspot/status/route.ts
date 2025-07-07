// app/api/hubspot/status/route.ts
import { NextResponse } from "next/server";
import { getValidHubspotAccessToken } from "../../../../../utils/readHubspotToken";

export async function GET() {
  try {
    const token = await getValidHubspotAccessToken();

    if (token) {
      return NextResponse.json({ connected: true });
    }

    return NextResponse.json({ connected: false });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
