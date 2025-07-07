import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/google";
import { pool } from "@/lib/db";
import { getEmbedding } from "@/lib/embedding";

export async function GET(req: NextRequest) {
  try {
    const gmail = await getGoogleOAuthClient(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threads: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listRes: any = await gmail.users.threads.list({
        userId: "me",
        maxResults: 50,
        pageToken: nextPageToken,
      });

      const batch = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (listRes.data.threads || []).map(async (t: any) => {
          const fullThread = await gmail.users.threads.get({
            userId: "me",
            id: t.id!,
          });

          const messages = (fullThread.data.messages || []).map((msg) => {
            const parts = msg.payload?.parts || [msg.payload];
            const body = parts
              .map((part) => {
                const data = part?.body?.data;
                if (!data) return "";
                return Buffer.from(data, "base64").toString("utf-8");
              })
              .join("\n");

            const headers = msg.payload?.headers || [];
            const subject =
              headers.find((h) => h.name === "Subject")?.value || "";
            const snippet = msg.snippet || "";
            const sender =
              headers.find((h) => h.name === "From")?.value || "unknown";
            const recipients = headers
              .filter((h) => h.name === "To")
              .map((h) => h.value)
              .filter(Boolean);
            const dateStr = headers.find((h) => h.name === "Date")?.value;
            const receivedAt = dateStr ? new Date(dateStr) : new Date();

            return {
              gmailid: msg.id,
              subject,
              snippet,
              body,
              sender,
              recipients,
              receivedAt,
            };
          });

          for (const msg of messages) {
            try {
              const result = await pool.query(
                `INSERT INTO "Email" (gmailid, subject, snippet, body, sender, recipients, receivedat)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (gmailid) DO NOTHING
                 RETURNING id`,
                [
                  msg.gmailid,
                  msg.subject,
                  msg.snippet,
                  msg.body,
                  msg.sender,
                  msg.recipients,
                  msg.receivedAt,
                ]
              );

              const insertedId = result.rows[0]?.id;
              if (insertedId) {
                const vector = await getEmbedding(
                  `${msg.subject}\n\n${msg.body}`
                );
                await pool.query(
                  `INSERT INTO "EmailEmbedding" (emailid, vector)
                   VALUES ($1, $2::vector)`,
                  [insertedId, `[${vector.join(",")}]`]
                );
                console.log(`✅ Saved + Embedded: ${msg.subject}`);
              }
            } catch (err) {
              console.error(
                `❌ Failed to insert or embed email (${msg.gmailid})`,
                err
              );
            }
          }

          return { id: t.id, messages };
        })
      );

      threads.push(...batch);
      nextPageToken = listRes.data.nextPageToken || undefined;
    } while (nextPageToken);

    return NextResponse.json({ success: true, total: threads.length });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error("🔥 Error fetching Gmail threads:", e);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
