// File: src/app/api/cron/check-new-gmail/route.ts

import { NextRequest, NextResponse } from "next/server";
import { google, gmail_v1 } from "googleapis";
import { Pool } from "pg";
import { getEmbedding } from "@/lib/embedding";
import { getAgentExecutor } from "@/agents";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions); // ✅ app dir style (no req/res)
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No Gmail token found" },
      { status: 401 }
    );
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const gmail = google.gmail({ version: "v1", auth: accessToken });

  // eslint-disable-next-line prefer-const
  let messages: gmail_v1.Schema$Message[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await gmail.users.messages.list({
      userId: "me",
      maxResults: 100,
      pageToken: nextPageToken,
    });

    messages.push(...(res.data.messages || []));
    nextPageToken = res.data.nextPageToken;
  } while (nextPageToken);

  const processed: string[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;
    const full = await gmail.users.messages.get({ userId: "me", id: msg.id });

    const snippet = full.data.snippet || "";
    const subject =
      full.data.payload?.headers?.find((h) => h.name === "Subject")?.value ||
      "";

    const combined = `${subject} ${snippet}`;
    const embedding = await getEmbedding(combined);
    const formattedVector = `[${embedding.join(",")}]`;

    const matches = await pool.query(
      `SELECT text FROM "InstructionMemoryEmbedding"
       WHERE vector <#> $1::vector < 0.3
       ORDER BY vector <#> $1::vector ASC LIMIT 1`,
      [formattedVector]
    );

    if (matches.rowCount) {
      const matchedInstruction = matches.rows[0].text;

      const executor = await getAgentExecutor();
      const prompt = `Follow this instruction: ${matchedInstruction}

New email:
Subject: ${subject}
Snippet: ${snippet}`;

      const result = await executor.call({ input: prompt });
      console.log("🟢 Agent response:", result.output);
      processed.push(subject);
    }
  }

  await pool.end();
  return NextResponse.json({
    message: `✅ Processed ${processed.length} Gmail threads`,
    processed,
  });
}
