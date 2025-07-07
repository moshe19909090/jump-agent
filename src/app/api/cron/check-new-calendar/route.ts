import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { getEmbedding } from "@/lib/embedding";
import { getAgentExecutor } from "@/agents";
import { pool } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = res.data.items || [];
  const processed: string[] = [];

  for (const event of events) {
    const summary = event.summary || "No title";
    const description = event.description || "";
    const combined = `${summary} ${description}`;

    const embedding = await getEmbedding(combined);
    const formattedVector = `[${embedding.join(",")}]`;

    const match = await pool.query(
      `SELECT text FROM "InstructionMemoryEmbedding"
       WHERE vector <#> $1::vector < 0.3
       ORDER BY vector <#> $1::vector ASC LIMIT 1`,
      [formattedVector]
    );

    if (match.rowCount) {
      const matchedInstruction = match.rows[0].text;
      const executor = await getAgentExecutor();

      const prompt = `
You are an AI agent executing saved user instructions.

Instruction:
${matchedInstruction}

New calendar event:
Title: ${summary}
Description: ${description}

Respond with the appropriate action.
`.trim();

      const result = await executor.call({ input: prompt });
      console.log("📅 Agent response (Calendar):", result.output);
      processed.push(summary);
    }
  }

  return NextResponse.json({
    message: `✅ Processed ${processed.length} Calendar events`,
    processed,
  });
}
