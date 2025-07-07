// /app/api/cron/hubspot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEmbedding } from "@/lib/embedding";
import { getAgentExecutor } from "@/agents";
import { getValidHubspotAccessToken } from "../../../../../utils/readHubspotToken";
import { pool } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_: NextRequest) {
  const access_token = await getValidHubspotAccessToken();

  const res = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts?limit=10&properties=firstname,lastname,email`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    console.error("❌ Failed to fetch contacts from HubSpot");
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }

  const data = await res.json();
  const contacts = data.results || [];
  const executor = await getAgentExecutor();

  const processed: string[] = [];

  const results = await Promise.allSettled(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contacts.map(async (contact: any) => {
      const firstName = contact.properties?.firstname || "";
      const lastName = contact.properties?.lastname || "";
      const email = contact.properties?.email || "";
      const contactId = contact.id;

      // 💡 Skip if already processed
      const alreadyProcessed = await pool.query(
        `SELECT 1 FROM "InstructionExecutionLog"
         WHERE source = 'hubspot' AND reference_id = $1 LIMIT 1`,
        [contactId]
      );

      if ((alreadyProcessed.rowCount ?? 0) > 0) return;

      const content = `
A new contact was created in HubSpot.
Name: ${firstName} ${lastName}
Email: ${email}
`.trim();

      const embedding = await getEmbedding(content);
      const formattedVector = `[${embedding.join(",")}]`;

      const matches = await pool.query(
        `SELECT text, vector <#> $1::vector AS distance
         FROM "InstructionMemoryEmbedding"
         WHERE vector <#> $1::vector < 0.4
         ORDER BY vector <#> $1::vector ASC
         LIMIT 3`,
        [formattedVector]
      );

      console.log("🔍 HubSpot contact content:", content);
      console.log("🧠 Matched instructions for contact:", matches.rows);

      if (matches.rowCount === 0) return;

      const matchedInstruction = matches.rows[0].text;

      const prompt = `
Follow this instruction: ${matchedInstruction}

New HubSpot contact:
${content}`.trim();

      const result = await executor.call({
        input: prompt,
        skipMemoryUpdate: true,
      });
      console.log("🤖 Agent response (HubSpot):", result.output);

      processed.push(`${firstName} ${lastName}`);

      // 🧾 Log execution to prevent re-processing
      await pool.query(
        `INSERT INTO "InstructionExecutionLog"(source, reference_id)
         VALUES ('hubspot', $1)
         ON CONFLICT DO NOTHING`,
        [contactId]
      );
    })
  );

  // Log failures
  results.forEach((res) => {
    if (res.status === "rejected") {
      console.error("❌ HubSpot contact handling failed:", res.reason);
    }
  });

  return NextResponse.json({
    message: `✅ Processed ${processed.length} HubSpot contacts`,
    processed,
  });
}
