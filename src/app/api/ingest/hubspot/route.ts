import { NextRequest, NextResponse } from "next/server";
import { getEmbedding } from "@/lib/embedding";
import { Pool } from "pg";
import { readHubspotToken } from "../../../../../utils/saveHubspotToken";
import { JSDOM } from "jsdom";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_: NextRequest) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { access_token } = await readHubspotToken();

  let after: string | undefined = undefined;
  let totalInserted = 0;

  do {
    const url = new URL("https://api.hubapi.com/crm/v3/objects/notes");
    url.searchParams.set("limit", "100");
    url.searchParams.set("properties", "hs_note_body");
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("❌ Failed to fetch notes:", err);
      return NextResponse.json(
        { error: "Failed to fetch notes" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const notes = data.results || [];

    for (const note of notes) {
      const id = note.id;
      const html = note.properties.hs_note_body;
      const dom = new JSDOM(html);
      const content = dom.window.document.body.textContent || "";

      if (!content.trim()) continue;

      const embedding = await getEmbedding(content);

      await pool.query(
        `INSERT INTO "NoteEmbedding" (noteId, content, vector)
         VALUES ($1, $2, $3)
         ON CONFLICT (noteId) DO NOTHING`,
        [id, content, `[${embedding.join(",")}]`]
      );

      totalInserted++;
    }

    after = data.paging?.next?.after;
  } while (after);

  await pool.end();

  return NextResponse.json({
    message: `✅ Ingested ${totalInserted} HubSpot notes`,
  });
}
