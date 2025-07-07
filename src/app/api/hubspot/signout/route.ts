import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    await pool.query(`DELETE FROM "HubspotAuth"`);

    return NextResponse.redirect(`${process.env.BASE_URL}/`);
  } catch (err) {
    console.error("❌ Failed to delete HubspotAuth row:", err);
    return NextResponse.json(
      { error: "Failed to sign out from HubSpot" },
      { status: 500 }
    );
  }
}
