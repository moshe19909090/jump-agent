import { NextRequest, NextResponse } from "next/server";
import { gmail_v1, google } from "googleapis";
import { getEmbedding } from "@/lib/embedding";
import { getAgentExecutor } from "@/agents";
import { pool } from "@/lib/db";
import { getValidGoogleAccessToken } from "../../../../../utils/getValidGoogleAccessToken";

function getPlainTextBody(payload: gmail_v1.Schema$MessagePart | undefined) {
  const part = payload?.parts?.find((p) => p.mimeType === "text/plain");
  const data = part?.body?.data || payload?.body?.data;
  return data ? Buffer.from(data, "base64").toString("utf-8") : "";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_: NextRequest) {
  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  let threads = [];
  try {
    const res = await gmail.users.threads.list({
      userId: "me",
      maxResults: 10,
      q: "newer_than:2d is:inbox",
    });
    threads = res.data.threads || [];
  } catch (err) {
    console.error("❌ Failed to fetch Gmail threads:", err);
    return NextResponse.json(
      { error: "Failed to fetch Gmail threads" },
      { status: 500 }
    );
  }

  const processed: string[] = [];

  for (const thread of threads) {
    const threadId = thread.id;
    if (!threadId) continue;

    const existing = await pool.query(
      `SELECT 1 FROM "InstructionExecutionLog" WHERE source = 'gmail' AND reference_id = $1 LIMIT 1`,
      [threadId]
    );
    if ((existing.rowCount ?? 0) > 0) {
      console.log(`⏭️ Already processed Gmail thread: ${threadId}`);
      continue;
    }

    const threadRes = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
    });
    const messages = threadRes.data.messages || [];
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) continue;

    const headers = lastMessage.payload?.headers || [];
    const subject =
      headers.find((h) => h.name === "Subject")?.value || "No subject";
    const from =
      headers.find((h) => h.name === "From")?.value || "Unknown sender";
    const body = getPlainTextBody(lastMessage.payload);

    const content = `${subject}\n\n${body}`;
    const embedding = await getEmbedding(content);
    const formattedVector = `[${embedding.join(",")}]`;

    const matches = await pool.query(
      `SELECT text FROM "InstructionMemoryEmbedding" WHERE vector <#> $1::vector < 0.3 ORDER BY vector <#> $1::vector ASC LIMIT 3`,
      [formattedVector]
    );

    if (matches.rowCount === 0) continue;

    const matchedInstruction = matches.rows[0].text;
    const executor = await getAgentExecutor();

    const prompt = `You are an AI agent executing saved user instructions.\n\nInstruction:\n${matchedInstruction}\n\nNew Gmail message:\nFrom: ${from}\nSubject: ${subject}\nBody:\n${body}\n\nRespond with the appropriate action.`;

    try {
      const result = await executor.call({
        input: prompt,
        skipMemoryUpdate: true,
      });
      console.log("📬 Agent response (Gmail):", result.output);

      await pool.query(
        `INSERT INTO "InstructionExecutionLog" (source, reference_id) VALUES ('gmail', $1) ON CONFLICT DO NOTHING`,
        [threadId]
      );

      processed.push(`${subject} ⇨ ${matchedInstruction}`);
    } catch (err) {
      console.error(
        `❌ Agent failed to process Gmail thread ${threadId}:`,
        err
      );
    }
  }

  return NextResponse.json({
    message: `✅ Processed ${processed.length} Gmail threads`,
    processed,
  });
}
