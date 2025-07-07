import { Pool } from "pg";
import { getEmbedding } from "@/lib/embedding";
import axios from "axios";

export async function ingestHubspotNotes(accessToken: string) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  let hasMore = true;
  let after: string | undefined = undefined;

  while (hasMore) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/notes?limit=100&properties=hs_note_body${
        after ? `&after=${after}` : ""
      }`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const notes = res.data.results;

    for (const note of notes) {
      const content = note.properties.hs_note_body;
      if (!content) continue;

      const embedding = await getEmbedding(content);

      await pool.query(
        `INSERT INTO "NoteEmbedding" (noteId, content, vector)
         VALUES ($1, $2, $3)
         ON CONFLICT (noteId) DO NOTHING`,
        [note.id, content, `[${embedding.join(",")}]`]
      );
    }

    hasMore = !!res.data.paging?.next?.after;
    after = res.data.paging?.next?.after;
  }

  await pool.end();
}
