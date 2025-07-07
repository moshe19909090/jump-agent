import { NextRequest, NextResponse } from "next/server";
import { ingestHubspotNotes } from "@/lib/hubspotIngest";
import { getValidHubspotAccessToken } from "../../../../../utils/readHubspotToken";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_: NextRequest) {
  try {
    const access_token = await getValidHubspotAccessToken();
    const count = await ingestHubspotNotes(access_token);

    return NextResponse.json({
      message: `✅ Ingested ${count} HubSpot notes`,
    });
  } catch (err) {
    console.error("❌ HubSpot ingestion failed:", err);
    return NextResponse.json(
      { error: "Failed to ingest HubSpot notes" },
      { status: 500 }
    );
  }
}
