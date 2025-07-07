import { getEmbedding } from "@/lib/embedding";
import { pool } from "@/lib/db";
import { JSDOM } from "jsdom";

export async function ingestHubspotNotes(accessToken: string) {
  let after: string | undefined = undefined;
  let totalInserted = 0;

  do {
    const url = new URL("https://api.hubapi.com/crm/v3/objects/notes");
    url.searchParams.set("limit", "100");
    url.searchParams.set("properties", "hs_note_body,hs_timestamp");
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    const notes = data.results || [];

    for (const note of notes) {
      const id = note.id;
      const html = note.properties.hs_note_body;
      const createdAt = note.properties.hs_timestamp;

      const dom = new JSDOM(html);
      const content = dom.window.document.body.textContent?.trim() ?? "";
      if (!content) continue;

      const embedding = await getEmbedding(content);

      await pool.query(
        `INSERT INTO "NoteEmbedding" (noteId, content, vector, created_at, source, type)
         VALUES ($1, $2, $3, $4, 'hubspot', 'note')
         ON CONFLICT (noteId) DO NOTHING`,
        [id, content, `[${embedding.join(",")}]`, createdAt]
      );

      totalInserted++;
    }

    after = data.paging?.next?.after;
  } while (after);

  // await pool.end();
  return totalInserted;
}
