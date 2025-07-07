import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { pool } from "@/lib/db";
import { getEmbedding } from "@/lib/embedding";
import { getAgentExecutor } from "@/agents";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No Gmail token found" },
      { status: 401 }
    );
  }

  const gmail = google.gmail({ version: "v1", auth: accessToken });

  // Fetch most recent 50 messages (avoid fetching everything)
  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults: 50,
  });

  const messages = listRes.data.messages || [];
  const executor = await getAgentExecutor(); // ✅ Only once

  const processedSubjects: string[] = [];

  const results = await Promise.allSettled(
    messages.map(async (msg) => {
      if (!msg.id) return;

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

        const prompt = `
Follow this instruction: ${matchedInstruction}

New email:
Subject: ${subject}
Snippet: ${snippet}
`.trim();

        const result = await executor.call({ input: prompt });
        console.log("📩 Agent response:", result.output);

        processedSubjects.push(subject);
      }
    })
  );

  // Log any failures
  results.forEach((res) => {
    if (res.status === "rejected") {
      console.error("❌ Failed to process email:", res.reason);
    }
  });

  return NextResponse.json({
    message: `✅ Processed ${processedSubjects.length} Gmail threads`,
    processed: processedSubjects,
  });
}
