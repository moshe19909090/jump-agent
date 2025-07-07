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

  const executor = await getAgentExecutor(); // ✅ Initialize once

  const processed: string[] = [];

  const results = await Promise.allSettled(
    contacts.map(
      async (contact: {
        properties: { firstname: string; lastname: string; email: string };
      }) => {
        const firstName = contact.properties.firstname || "";
        const lastName = contact.properties.lastname || "";
        const email = contact.properties.email || "";

        const content = `New HubSpot contact: ${firstName} ${lastName} (${email})`;

        const embedding = await getEmbedding(content);
        const formattedVector = `[${embedding.join(",")}]`;

        const match = await pool.query(
          `SELECT text FROM "InstructionMemoryEmbedding"
         WHERE vector <#> $1::vector < 0.3
         ORDER BY vector <#> $1::vector ASC LIMIT 1`,
          [formattedVector]
        );

        if (match.rowCount) {
          const matchedInstruction = match.rows[0].text;

          const prompt = `Follow this instruction: ${matchedInstruction}

New HubSpot contact:
${content}`;

          const result = await executor.call({ input: prompt });
          console.log("🧠 Agent response (HubSpot):", result.output);
          processed.push(`${firstName} ${lastName}`);
        }
      }
    )
  );

  results.forEach((res) => {
    if (res.status === "rejected") {
      console.error("❌ Failed to process HubSpot contact:", res.reason);
    }
  });

  return NextResponse.json({
    message: `✅ Processed ${processed.length} HubSpot contacts`,
    processed,
  });
}
