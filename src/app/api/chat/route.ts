import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { z } from "zod";

import { getEmbedding } from "@/lib/embedding";
import { getAgentExecutor } from "@/agents";

const schema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  accessToken: z.string().optional(), // Optional token for Gmail tool
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { messages, accessToken } = parsed.data;
  const question = messages.at(-1)?.content || "No question";

  // Step 1: Embed user input and retrieve relevant context
  const embedding = await getEmbedding(question);
  const formattedVector = `[${embedding.join(",")}]`;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const rawResults = await pool.query(
    `
    SELECT e.subject, e.snippet, e.body, ee.vector <#> $1::vector AS distance
    FROM "EmailEmbedding" ee
    JOIN "Email" e ON e.id = ee.emailid
    ORDER BY distance ASC
    LIMIT 5
    `,
    [formattedVector]
  );

  const notesResult = await pool.query(
    `
  SELECT content, vector <#> $1::vector AS distance
  FROM "NoteEmbedding"
  ORDER BY distance ASC
  LIMIT 5
  `,
    [formattedVector]
  );

  const noteDocs = notesResult.rows.map(
    (row) => `HubSpot Note:\n${row.content}`
  );

  const emailDocs = rawResults.rows.map(
    (row) => `Email:\n${row.subject}\n${row.snippet}\n${row.body}`
  );

  // Fetch saved memory instructions
  const instructionsResult = await pool.query(
    `
    SELECT text, vector <#> $1::vector AS distance
    FROM "InstructionMemoryEmbedding"
    ORDER BY distance ASC
    LIMIT 5
    `,
    [formattedVector]
  );

  const instructionDocs = instructionsResult.rows.map(
    (row) => `🧠 Ongoing Instruction:\n${row.text}`
  );

  await pool.end();
  const context = [...emailDocs, ...noteDocs, ...instructionDocs].join(
    "\n---\n"
  );

  console.log("📄 Top context emails:\n", context.slice(0, 300));

  // Step 2: Run LangChain agent with tools
  const executor = await getAgentExecutor();
  const systemPrompt = `
You are an AI assistant for financial advisors. You can use tools like Gmail and HubSpot to help your user.

When calling the Gmail tool, always include:
- "accessToken": the OAuth access token
- "to": the recipient's email address
- "subject": the subject of the email
- "body": the plain text body of the email

Use this Gmail access token if needed: ${accessToken || "N/A"}

You also have a tool called "save_instruction" which saves ongoing instructions from the user for future automation.

Here are some examples:

User: When someone emails me about taxes, reply with a meeting link.  
Assistant: [calls save_instruction with instruction="When someone emails me about taxes, reply with a meeting link."]

User: If I add someone to my calendar, send them a summary afterwards.  
Assistant: [calls save_instruction with instruction="If I add someone to my calendar, send them a summary afterwards."]

Here is context from the user's email inbox and HubSpot notes:
${context}

User: ${question}
`.trim();

  const response = await executor.call({
    input: systemPrompt,
  });

  return NextResponse.json({ reply: response.output });
}
