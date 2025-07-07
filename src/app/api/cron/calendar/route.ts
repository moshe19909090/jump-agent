import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getEmbedding } from "@/lib/embedding";
import { getAgentExecutor } from "@/agents";
import { pool } from "@/lib/db";
import { getValidGoogleAccessToken } from "../../../../../utils/getValidGoogleAccessToken";
import { sendGmail } from "@/lib/sendGmail";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_: NextRequest) {
  const accessToken = await getValidGoogleAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth });

  let events = [];

  try {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });
    events = res.data.items || [];
  } catch (err) {
    console.error("❌ Failed to fetch calendar events:", err);
    return NextResponse.json(
      { error: "Failed to fetch Google Calendar events" },
      { status: 500 }
    );
  }

  const processed: string[] = [];

  for (const event of events) {
    const eventId = event.id;
    if (!eventId) {
      console.warn("⚠️ Skipping event with no ID");
      continue;
    }

    const { summary = "No title", description = "", attendees = [] } = event;
    const combinedText = `${summary} ${description}`.trim();

    const alreadyProcessed = await pool.query(
      `SELECT 1 FROM "InstructionExecutionLog"
       WHERE source = 'calendar' AND reference_id = $1
       LIMIT 1`,
      [eventId]
    );
    if (alreadyProcessed.rowCount) {
      console.log(`⏭️ Already processed calendar event: ${summary}`);
      continue;
    }

    const embedding = await getEmbedding(combinedText);
    const formattedVector = `[${embedding.join(",")}]`;

    const match = await pool.query(
      `SELECT text FROM "InstructionMemoryEmbedding"
       WHERE vector <#> $1::vector < 0.3
       ORDER BY vector <#> $1::vector ASC
       LIMIT 3`,
      [formattedVector]
    );

    if (match.rowCount === 0) continue;

    const matchedInstruction = match.rows[0].text;
    const executor = await getAgentExecutor();

    const prompt = `
You are an AI agent executing saved user instructions.

Instruction:
${matchedInstruction}

New calendar event:
Title: ${summary}
Description: ${description}

Respond with the appropriate action.`.trim();

    try {
      const result = await executor.call({
        input: prompt,
        skipMemoryUpdate: true,
      });

      console.log("📅 Agent executed for calendar event:", summary);
      console.log("🧠 Agent response:", result.output);

      await pool.query(
        `INSERT INTO "InstructionExecutionLog" (source, reference_id)
         VALUES ('calendar', $1)
         ON CONFLICT DO NOTHING`,
        [eventId]
      );

      processed.push(summary!);

      if (attendees.length > 0) {
        const emailList = attendees.map((a) => a.email).filter(Boolean);
        const emailBody = `Hey, this is a confirmation of our meeting: "${summary}" scheduled for ${event.start?.dateTime}.`;

        await sendGmail({
          accessToken,
          to: emailList[0]!, // or loop if needed
          subject: `Meeting Confirmation: ${summary}`,
          body: emailBody,
        });

        console.log("📧 Sent confirmation email to:", emailList[0]);
      }
    } catch (err) {
      console.error(`❌ Failed to process event "${summary}":`, err);
    }
  }

  return NextResponse.json({
    message: `✅ Processed ${processed.length} Calendar events`,
    processed,
  });
}
